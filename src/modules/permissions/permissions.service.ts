import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MongoRepository } from "typeorm";
import { ObjectId } from "mongodb";
import { Permission } from "./entities/permission.entity";
import { User } from "../users/entities/user.entity";
import { ActivityAction, UserRole } from "src/common/enums/projects.enum";
import { PermissionLevel } from "src/common/enums/projects.enum";
import { GrantPermissionDto } from "./dto/grant-permissions.dto";
import { NodesService } from "../nodes/nodes.service";
import { EmailProducerService } from "../email/email-producer.service";
import { UsersService } from "../users/users.service";
import { ConfigService } from "@nestjs/config";
import { ActivityLogProducerService } from "../activity-log/activity-log-producer.service";
import { BusinessException } from "src/common/filters/business.exception";
import { ErrorCode } from "src/common/filters/constants/error-codes.enum";
import { ErrorMessages } from "src/common/filters/constants/messages.constant";
import { ActivityLog } from "../activity-log/entities/activity-log.entity";
import { PermissionResponseDto } from "./dto/permission.response.dto";
import { plainToInstance } from "class-transformer";
import { ActivityLogResponseDto } from "../activity-log/dto/activity-log.response.dto";
import { InvitePermissionDto } from "./dto/invite-permission.dto";
import { SharedNodeDto } from "./dto/shared.dto";
import { RecentItemDto } from "./dto/recent.response.dto";
import { FindAllPermissionsOptions, PermissionDetailsDto } from "./dto/permission-details.dto";
@Injectable()
export class PermissionsService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Permission)
    private readonly permissionRepository: MongoRepository<Permission>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: MongoRepository<ActivityLog>,
    @Inject(forwardRef(() => NodesService))
    private readonly nodesService: NodesService,
    @Inject(forwardRef(() => EmailProducerService))
    private readonly emailProducerService: EmailProducerService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ActivityLogProducerService))
    private readonly activityLogProducer: ActivityLogProducerService,
  ) {}

  async getPermissionsForNode(nodeId: string): Promise<PermissionResponseDto[]> {
    const nodeObjectId = new ObjectId(nodeId);

    // Sử dụng Aggregation Pipeline của MongoDB để join với collection 'users'
    const results = await this.permissionRepository
      .aggregate([
        {
          // Bước 1: Tìm tất cả các bản ghi quyền khớp với nodeId
          $match: { nodeId: nodeObjectId },
        },
        {
          // Bước 2: Join với collection 'users'
          $lookup: {
            from: "users", // Tên collection cần join
            localField: "userId", // Trường trong collection 'permissions'
            foreignField: "_id", // Trường trong collection 'users'
            as: "userDetails", // Tên của mảng mới chứa kết quả join
          },
        },
        {
          // Bước 3: "Mở" mảng userDetails (vì mỗi quyền chỉ có 1 user)
          $unwind: "$userDetails",
        },
        {
          // Bước 4: Định hình lại dữ liệu trả về cho gọn gàng
          $project: {
            _id: 1, // Giữ lại ID của bản ghi permission
            permission: 1,
            user: {
              _id: "$userDetails._id",
              username: "$userDetails.username",
              email: "$userDetails.email",
              isActive: "$userDetails.isActive",
            },
          },
        },
      ])
      .toArray();
    const transformedData = plainToInstance(PermissionResponseDto, results);
    return transformedData;
  }

  // --- [MỚI] HÀM ĐỂ LẤY LỊCH SỬ HOẠT ĐỘNG CHO MỘT NODE ---
  async getActivityForNode(nodeId: string): Promise<ActivityLogResponseDto[]> {
    // Không chuyển đổi nodeId thành ObjectId ở đây vì nó là string trong DB

    const results = await this.activityLogRepository
      .aggregate([
        // 1. $match: So sánh string với string
        { $match: { targetId: nodeId } },
        { $sort: { timestamp: -1 } },
        {
          // 2. $addFields: Thêm một trường tạm 'convertedUserId'
          // bằng cách chuyển đổi trường 'userId' (string) sang ObjectId
          $addFields: {
            convertedUserId: { $toObjectId: "$userId" },
          },
        },
        {
          // 3. $lookup: Join bằng trường ObjectId vừa được tạo
          $lookup: {
            from: "users",
            localField: "convertedUserId", // Dùng trường đã chuyển đổi
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          // 4. $project: Giữ nguyên, không cần thay đổi
          $project: {
            _id: 1,
            action: 1,
            details: 1,
            timestamp: 1,
            user: {
              _id: "$userDetails._id",
              username: "$userDetails.username",
            },
          },
        },
      ])
      .toArray();

    // Dùng plainToInstance để đảm bảo dữ liệu trả về được chuyển đổi đúng cách
    return plainToInstance(ActivityLogResponseDto, results);
  }

  async findAllPermissions(
    options: FindAllPermissionsOptions,
  ): Promise<{ data: PermissionDetailsDto[]; total: number }> {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      { $sort: { grantedAt: -1 } },
      // Join với users để lấy thông tin người được cấp quyền
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      // Join với nodes để lấy thông tin tài nguyên
      { $lookup: { from: "nodes", localField: "nodeId", foreignField: "_id", as: "node" } },
      // Join với users lần nữa để lấy thông tin người cấp quyền
      { $lookup: { from: "users", localField: "grantedBy", foreignField: "_id", as: "grantedBy" } },
      // Mở mảng kết quả (vì lookup trả về mảng)
      // Thêm preserveNullAndEmptyArrays để không loại bỏ bản ghi nếu không tìm thấy kết quả join
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$node", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$grantedBy", preserveNullAndEmptyArrays: true } },
    ];

    // Thêm bước lọc nếu có tham số tìm kiếm
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "user.username": { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
            { "node.name": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Sử dụng $facet để thực hiện phân trang và đếm tổng số bản ghi cùng lúc
    const results = await this.permissionRepository
      .aggregate([
        ...pipeline,
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .next();

    const rawData = results?.data || [];
    const total = results?.totalCount[0]?.count || 0;

    // SỬA LỖI: Tách biệt các bước và khai báo kiểu tường minh để giúp TypeScript hiểu đúng.
    const data = rawData.map((item) => plainToInstance(PermissionDetailsDto, item));

    return {
      data,
      total,
    };
  }

  async inviteByEmail(inviteDto: InvitePermissionDto, granter: User): Promise<PermissionResponseDto> {
    const { email, nodeId, permission } = inviteDto;

    const targetUser = await this.usersService.findUserByEmail(email);
    if (!targetUser) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, `Người dùng với email '${email}' không tồn tại.`, 404);
    }

    // Tạo một GrantPermissionDto để tái sử dụng logic của hàm grant()
    const grantDto: GrantPermissionDto = {
      userId: targetUser._id.toHexString(),
      nodeId,
      permission,
    };

    // Gọi hàm grant hiện có và chuyển đổi kết quả trả về
    const savedPermission = await this.grant(grantDto, granter);
    // Trả về dữ liệu đã được định dạng để client có thể sử dụng ngay
    return plainToInstance(PermissionResponseDto, {
      ...savedPermission,
      user: targetUser,
    });
  }

  async getUserPermissionForNode(userId: ObjectId, nodeObjectId: ObjectId): Promise<Permission | null> {
    // Tìm permission của user trên node cụ thể
    const permission = await this.permissionRepository.findOne({
      where: { userId, nodeId: nodeObjectId },
    });

    // Nếu không tìm thấy, trả về null
    if (!permission) {
      return null;
    }

    // Trả về permission nếu tìm thấy
    return permission;
  }

  /**
   * KIỂM TRA QUYỀN CỦA USER TRÊN MỘT NODE
   * Đây là hàm bạn đang bị thiếu.
   * @param user Object người dùng đang thực hiện hành động
   * @param nodeId ID của node cần kiểm tra quyền
   * @param requiredPermission Cấp độ quyền yêu cầu (ví dụ: EDITOR)
   * @returns `true` nếu người dùng có quyền, `false` nếu không.
   */
  async checkUserPermissionForNode(
    user: User,
    nodeId: ObjectId,
    requiredPermission: PermissionLevel,
  ): Promise<boolean> {
    // Quy tắc 1: Root Admin luôn có mọi quyền
    if (user.role === UserRole.ROOT_ADMIN) {
      return true;
    }

    // Quy tắc 2: Tìm bản ghi quyền tường minh trong database
    const permissionRecord = await this.permissionRepository.findOne({
      where: { userId: user._id, nodeId: nodeId },
    });

    // Nếu không có bản ghi nào, người dùng không có quyền
    if (!permissionRecord) {
      return false;
    }

    // Quy tắc 3: Kiểm tra xem cấp độ quyền của người dùng có đủ cao không
    // Ví dụ: Owner (3) sẽ có quyền của Editor (2) và Viewer (1).
    const permissionHierarchy = {
      [PermissionLevel.VIEWER]: 1,
      [PermissionLevel.EDITOR]: 2,
      [PermissionLevel.OWNER]: 3,
    };

    const userPermissionLevel = permissionHierarchy[permissionRecord.permission];
    const requiredPermissionLevel = permissionHierarchy[requiredPermission];

    return userPermissionLevel >= requiredPermissionLevel;
  }

  async findAllForUser(userId: ObjectId): Promise<Permission[]> {
    return this.permissionRepository.find({ where: { userId } });
  }

  async findUserPermissionsForNodes(userId: ObjectId, nodeIds: ObjectId[]): Promise<Permission[]> {
    if (nodeIds.length === 0) return [];
    return this.permissionRepository.find({
      where: {
        userId,
        nodeId: { $in: nodeIds },
      },
    });
  }

  // Thêm vào PermissionsService
  async findAllOwnedByUser(userId: ObjectId): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { userId, permission: PermissionLevel.OWNER },
    });
  }

  /**
   * Cấp một quyền cụ thể
   */
  async grant(grantDto: GrantPermissionDto, granter: User): Promise<Permission> {
    const { userId, nodeId, permission } = grantDto;
    const granterId = granter._id;
    const targetNodeId = new ObjectId(nodeId);
    const targetUserId = new ObjectId(userId);

    // ===== BƯỚC SỬA LỖI - THÊM VÀO ĐÂY =====
    // Quy tắc: Ngăn chặn người dùng tự thay đổi quyền của chính mình.
    if (targetUserId.equals(granterId)) {
      throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.CANNOT_CHANGE_OWN_PERMISSION, 403);
    }

    // --- 1. KIỂM TRA QUYỀN CỦA NGƯỜI ĐI CẤP QUYỀN ---
    // Chỉ Owner hoặc Root Admin mới có quyền cấp quyền cho người khác
    const havePermission = await this.checkUserPermissionForNode(granter, targetNodeId, PermissionLevel.EDITOR);
    if (!havePermission) {
      throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.INSUFFICIENT_PERMISSIONS, 403);
    }

    // --- 2. KIỂM TRA XEM PERMISSION ĐÃ TỒN TẠI CHƯA ---
    const existingPermission = await this.permissionRepository.findOne({
      where: { userId: targetUserId, nodeId: targetNodeId },
    });
    // ===== BƯỚC KIỂM TRA MỚI - QUAN TRỌNG =====
    // Nếu người bị tác động đã là Owner, chỉ có RootAdmin mới được phép thay đổi
    if (existingPermission && existingPermission.permission === PermissionLevel.OWNER) {
      if (granter.role !== UserRole.ROOT_ADMIN) {
        throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.CANNOT_CHANGE_OTHER_OWNER, 403);
      }
    }

    // Nếu tất cả các check đều qua, tiến hành cập nhật hoặc tạo mới
    if (existingPermission) {
      existingPermission.permission = permission;
      existingPermission.grantedBy = granterId;
      existingPermission.grantedAt = new Date();
      return this.permissionRepository.save(existingPermission);
    } else {
      const newPermission = this.permissionRepository.create({
        userId: targetUserId,
        nodeId: targetNodeId,
        permission: permission,
        grantedBy: granterId,
      });

      const savedPermission = await this.permissionRepository.save(newPermission);

      // --- THÊM LOGIC GỬI EMAIL THÔNG BÁO ---
      try {
        const [targetUser, node] = await Promise.all([
          this.usersService.findUserById(targetUserId.toHexString()),
          this.nodesService.findNodeById(targetNodeId),
        ]);

        if (targetUser && node) {
          await this.emailProducerService.sendPermissionGrantedEmail({
            targetUserEmail: targetUser.email,
            granterName: granter.username,
            nodeName: node.name,
            permissionLevel: savedPermission.permission,
            loginUrl: this.configService.get<string>("FRONTEND_URL"),
          });
        }

        await this.activityLogProducer.logActivity({
          userId: targetUserId,
          action: ActivityAction.PERMISSION_GRANTED,
          targetId: targetNodeId,
          details: {
            grantedBy: granter.username,
            grantedFor: targetUser.username,
            permissionLevel: savedPermission.permission,
            type: node.type,
            grantedAt: savedPermission.grantedAt,
          },
        });
      } catch (error) {
        console.error(`Không thể gửi email thông báo cấp quyền cho user ${userId}:`, error);
      }

      return savedPermission;
    }
  }

  /**
   * Thu hồi một quyền đã được cấp
   * @param permissionId ID của bản ghi quyền cần xóa
   * @param revoker Người đang thực hiện hành động thu hồi
   */
  async revoke(permissionId: string, revoker: User): Promise<void> {
    const permissionObjectId = new ObjectId(permissionId);

    // --- 1. TÌM BẢN GHI PERMISSION CẦN XÓA ---
    const permissionToRevoke = await this.permissionRepository.findOne({
      where: { _id: permissionObjectId },
    });
    if (!permissionToRevoke) {
      throw new BusinessException(ErrorCode.PERMISSION_NOT_FOUND, ErrorMessages.PERMISSION_NOT_FOUND, 404);
    }

    // --- 2. KIỂM TRA QUYỀN CỦA NGƯỜI ĐI THU HỒI ---
    // Chỉ Owner của Node đó (hoặc RootAdmin) mới có quyền thu hồi quyền của người khác
    const canRevoke = await this.checkUserPermissionForNode(revoker, permissionToRevoke.nodeId, PermissionLevel.EDITOR);
    if (!canRevoke) {
      throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.INSUFFICIENT_PERMISSIONS, 403);
    }

    // --- 3. ÁP DỤNG CÁC QUY TẮC THU HỒI MỚI ---
    const isRevokingOwner = permissionToRevoke.permission === PermissionLevel.OWNER;
    const isRevokerRootAdmin = revoker.role === UserRole.ROOT_ADMIN;

    // Nếu quyền bị thu hồi là OWNER
    if (isRevokingOwner) {
      // Quy tắc 3a: Chỉ RootAdmin mới có quyền thu hồi quyền OWNER
      if (!isRevokerRootAdmin) {
        throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.CANNOT_REVOKE_OTHER_OWNER, 403);
      }
    }

    // --- 4. GHI LOG VÀ THỰC HIỆN XÓA ---
    const node = await this.nodesService.findNodeById(permissionToRevoke.nodeId);
    const targetUser = await this.usersService.findUserById(permissionToRevoke.userId.toHexString());
    await this.activityLogProducer.logActivity({
      userId: revoker._id,
      action: ActivityAction.PERMISSION_REVOKED,
      targetId: permissionToRevoke.nodeId,
      details: {
        revokedBy: revoker.username,
        revokedFor: targetUser.username,
        permissionLevel: permissionToRevoke.permission,
        type: node?.type,
        revokedAt: new Date(),
      },
    });

    await this.permissionRepository.delete(permissionObjectId);
  }

  async findSharedWithUser(currentUser: User): Promise<SharedNodeDto[]> {
    const results = await this.permissionRepository
      .aggregate([
        // 1. Tìm tất cả các quyền của user hiện tại, nhưng KHÔNG PHẢI là Owner
        {
          $match: {
            userId: currentUser._id,
            permission: { $ne: PermissionLevel.OWNER },
          },
        },
        // 2. Join với collection 'nodes' để lấy thông tin của file/folder
        {
          $lookup: {
            from: "nodes",
            localField: "nodeId",
            foreignField: "_id",
            as: "nodeDetails",
          },
        },
        // 3. Mở mảng nodeDetails (mỗi quyền chỉ có 1 node)
        { $unwind: "$nodeDetails" },
        // 4. Join với collection 'users' để tìm người đã tạo ra node đó (chủ sở hữu)
        {
          $lookup: {
            from: "users",
            localField: "nodeDetails.createdBy",
            foreignField: "_id",
            as: "ownerDetails",
          },
        },
        // 5. Mở mảng ownerDetails
        { $unwind: "$ownerDetails" },
        // 6. Định dạng lại dữ liệu trả về
        {
          $project: {
            _id: "$nodeDetails._id", // ID của node
            name: "$nodeDetails.name",
            type: "$nodeDetails.type",
            yourPermission: "$permission", // Quyền của bạn trên node này
            sharedBy: "$ownerDetails.username", // Người đã chia sẻ (chủ sở hữu)
            sharedAt: "$grantedAt", // Ngày được cấp quyền
          },
        },
        { $sort: { sharedAt: -1 } }, // Sắp xếp theo ngày chia sẻ mới nhất
      ])
      .toArray();

    return plainToInstance(SharedNodeDto, results);
  }

  /**
   * TÌM TẤT CẢ ID CỦA OWNER TRÊN MỘT NODE
   */
  async findOwnerIdsOfNode(nodeId: ObjectId): Promise<ObjectId[]> {
    const permissions = await this.permissionRepository.find({
      where: {
        nodeId: nodeId,
        permission: PermissionLevel.OWNER,
      },
      select: ["userId"],
    });

    return permissions.map((p) => p.userId);
  }

  /**
   * CẤP QUYỀN OWNER HÀNG LOẠT CHO NHIỀU USER
   */
  async grantOwnerPermissionToUsers(userIds: ObjectId[], nodeId: ObjectId, granterId: ObjectId): Promise<void> {
    if (!userIds || userIds.length === 0) {
      return;
    }

    const operations = userIds.map((userId) => ({
      updateOne: {
        filter: { userId: userId, nodeId: nodeId },
        update: {
          $set: {
            permission: PermissionLevel.OWNER,
            grantedBy: granterId,
            grantedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    await this.permissionRepository.bulkWrite(operations);
  }

  /**
   * Xóa tất cả các bản ghi quyền liên quan đến một danh sách các node
   */
  async deletePermissionsForNodes(nodeIds: ObjectId[]): Promise<void> {
    if (nodeIds.length > 0) {
      await this.permissionRepository.deleteMany({
        nodeId: { $in: nodeIds },
      });
    }
  }

  async grantRecursive(
    parentNodeId: string | ObjectId, // Cho phép đầu vào là string hoặc ObjectId
    targetUserId: ObjectId,
    permission: PermissionLevel,
    granterId: ObjectId,
  ): Promise<void> {
    // --- SỬA LỖI Ở ĐÂY ---
    // Bước 1: Chuyển đổi ID của node cha thành ObjectId để đảm bảo kiểu dữ liệu
    const parentObjectId = new ObjectId(parentNodeId);
    const targetUserIdObjectId = new ObjectId(targetUserId);
    // 2. Tìm tất cả các node con cháu
    const descendantNodes = await this.nodesService.findAllDescendants(parentObjectId);

    // 3. Kết hợp node cha (đã là ObjectId) và các node con
    const allNodeIds = [parentObjectId, ...descendantNodes.map((n) => n._id)];

    console.log("allNodeIds:", allNodeIds);
    // 4. Dùng bulkWrite để cấp quyền hàng loạt một cách hiệu quả
    const operations = allNodeIds.map((nodeId) => ({
      updateOne: {
        filter: { userId: targetUserIdObjectId, nodeId: nodeId }, // Bây giờ tất cả nodeId đều là ObjectId
        update: {
          $set: {
            permission: permission,
            grantedBy: granterId,
            grantedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await this.permissionRepository.bulkWrite(operations);
    }
  }

  async updateLastAccessed(userId: ObjectId, nodeId: ObjectId): Promise<void> {
    // Không cần chờ (await) để không làm chậm request chính của người dùng
    this.permissionRepository.updateOne({ userId, nodeId }, { $set: { lastAccessedAt: new Date() } }).catch((err) => {
      // Ghi log lỗi nếu có nhưng không làm ảnh hưởng đến luồng chính
      console.error(`Failed to update lastAccessedAt for user ${userId} on node ${nodeId}`, err);
    });
  }

  async findRecentForUser(currentUser: User): Promise<RecentItemDto[]> {
    const results = await this.permissionRepository
      .aggregate([
        // 1. Tìm tất cả quyền của user, có lastAccessedAt và không phải là Owner
        {
          $match: {
            userId: currentUser._id,
            lastAccessedAt: { $exists: true },
          },
        },
        // 2. Sắp xếp theo thời gian truy cập mới nhất
        { $sort: { lastAccessedAt: -1 } },
        // 3. Giới hạn 50 kết quả gần nhất
        { $limit: 50 },
        // 4. Join với 'nodes' để lấy thông tin
        {
          $lookup: {
            from: "nodes",
            localField: "nodeId",
            foreignField: "_id",
            as: "nodeInfo",
          },
        },
        { $unwind: "$nodeInfo" },
        // 5. Join với 'users' để lấy tên chủ sở hữu
        {
          $lookup: {
            from: "users",
            localField: "nodeInfo.createdBy",
            foreignField: "_id",
            as: "ownerInfo",
          },
        },
        { $unwind: "$ownerInfo" },
        // 6. Định dạng lại dữ liệu
        {
          $project: {
            _id: "$nodeInfo._id",
            name: "$nodeInfo.name",
            type: "$nodeInfo.type",
            owner: "$ownerInfo.username",
            lastAccessedAt: "$lastAccessedAt",
          },
        },
      ])
      .toArray();

    return plainToInstance(RecentItemDto, results);
  }
}
