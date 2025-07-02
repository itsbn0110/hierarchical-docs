import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Permission } from './entities/permission.entity';
import { User } from '../users/entities/user.entity';
import { ActivityAction, UserRole } from 'src/common/enums/projects.enum';
import { PermissionLevel } from 'src/common/enums/projects.enum';
import { GrantPermissionDto } from './dto/grant-permissions.dto';
import { NodesService } from '../nodes/nodes.service';
import { EmailProducerService } from '../email/email-producer.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { ActivityLogProducerService } from '../activity-log/activity-log-producer.service';
import { BusinessException } from 'src/common/filters/business.exception';
import { ErrorCode } from 'src/common/filters/constants/error-codes.enum';
import { ErrorMessages } from 'src/common/filters/constants/messages.constant';
@Injectable()
export class PermissionsService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Permission)
    private readonly permissionRepository: MongoRepository<Permission>,
    @Inject(forwardRef(() => NodesService))
    private readonly nodesService: NodesService,
    @Inject(forwardRef(() => EmailProducerService))
    private readonly emailProducerService: EmailProducerService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ActivityLogProducerService))
    private readonly activityLogProducer: ActivityLogProducerService,
  ) {}

  async getUserPermissionForNode(
    userId: ObjectId,
    nodeObjectId: ObjectId,
  ): Promise<Permission | null> {
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
      throw new BusinessException(
        ErrorCode.ACCESS_DENIED,
        ErrorMessages.CANNOT_CHANGE_OWN_PERMISSION,
        403,
      );
    }

    // --- 1. KIỂM TRA QUYỀN CỦA NGƯỜI ĐI CẤP QUYỀN ---
    // Chỉ Owner hoặc Root Admin mới có quyền cấp quyền cho người khác
    const isOwner = await this.checkUserPermissionForNode(
      granter,
      targetNodeId,
      PermissionLevel.OWNER,
    );
    if (!isOwner) {
      throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.ONLY_OWNER_CAN_GRANT, 403);
    }

    // --- 2. KIỂM TRA XEM PERMISSION ĐÃ TỒN TẠI CHƯA ---
    const existingPermission = await this.permissionRepository.findOne({
      where: { userId: targetUserId, nodeId: targetNodeId },
    });
    // ===== BƯỚC KIỂM TRA MỚI - QUAN TRỌNG =====
    // Nếu người bị tác động đã là Owner, chỉ có RootAdmin mới được phép thay đổi
    if (existingPermission && existingPermission.permission === PermissionLevel.OWNER) {
      if (granter.role !== UserRole.ROOT_ADMIN) {
        throw new BusinessException(
          ErrorCode.ACCESS_DENIED,
          ErrorMessages.CANNOT_CHANGE_OTHER_OWNER,
          403,
        );
      }
    }

    // Nếu tất cả các check đều qua, tiến hành cập nhật hoặc tạo mới
    if (existingPermission) {
      existingPermission.permission = permission;
      existingPermission.grantedBy = granterId;
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
          this.usersService.findById(targetUserId.toHexString()),
          this.nodesService.findById(targetNodeId),
        ]);

        if (targetUser && node) {
          await this.emailProducerService.sendPermissionGrantedEmail({
            targetUserEmail: targetUser.email,
            granterName: granter.username,
            nodeName: node.name,
            permissionLevel: savedPermission.permission,
            loginUrl: this.configService.get<string>('FRONTEND_URL'),
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
      throw new BusinessException(
        ErrorCode.PERMISSION_NOT_FOUND,
        ErrorMessages.PERMISSION_NOT_FOUND,
        404,
      );
    }

    // --- 2. KIỂM TRA QUYỀN CỦA NGƯỜI ĐI THU HỒI ---
    // Chỉ Owner của Node đó (hoặc RootAdmin) mới có quyền thu hồi quyền của người khác
    const canRevoke = await this.checkUserPermissionForNode(
      revoker,
      permissionToRevoke.nodeId,
      PermissionLevel.OWNER,
    );
    if (!canRevoke) {
      throw new BusinessException(
        ErrorCode.ACCESS_DENIED,
        ErrorMessages.ONLY_OWNER_CAN_REVOKE,
        403,
      );
    }

    if (permissionToRevoke.permission === PermissionLevel.OWNER) {
      // Nếu người thu hồi không phải RootAdmin, không cho phép
      if (revoker.role !== UserRole.ROOT_ADMIN) {
        // Cho phép Owner tự thu hồi quyền của chính mình (nhưng sẽ bị chặn bởi logic Owner cuối cùng ở dưới)
        // Nhưng không cho phép thu hồi quyền của Owner khác.
        if (!permissionToRevoke.userId.equals(revoker._id)) {
          throw new BusinessException(
            ErrorCode.ACCESS_DENIED,
            ErrorMessages.CANNOT_REVOKE_OTHER_OWNER,
            403,
          );
        }
      }
    }
    // --- 3. (QUAN TRỌNG) KIỂM TRA ĐỂ TRÁNH 'MỒ CÔI' NODE ---
    // Nếu quyền sắp bị thu hồi là quyền OWNER
    if (permissionToRevoke.permission === PermissionLevel.OWNER) {
      // Đếm xem node này còn lại bao nhiêu Owner khác
      const otherOwnersCount = await this.permissionRepository.count({
        where: {
          nodeId: permissionToRevoke.nodeId,
          permission: PermissionLevel.OWNER,
          _id: { $ne: permissionObjectId }, // Đếm những owner khác, không tính cái sắp xóa
        },
      });

      // Nếu không còn owner nào khác, không cho phép xóa owner cuối cùng
      if (otherOwnersCount === 0) {
        throw new BusinessException(
          ErrorCode.ACCESS_DENIED,
          ErrorMessages.CANNOT_DELETE_LAST_OWNER,
          403,
        );
      }
    }

    const node = await this.nodesService.findById(permissionToRevoke.nodeId);
    const targetUser = await this.usersService.findById(permissionToRevoke.userId.toHexString());
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
    // --- 4. THỰC HIỆN XÓA ---
    await this.permissionRepository.delete(permissionObjectId);
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
      select: ['userId'],
    });

    return permissions.map((p) => p.userId);
  }

  /**
   * CẤP QUYỀN OWNER HÀNG LOẠT CHO NHIỀU USER
   */
  async grantOwnerPermissionToUsers(
    userIds: ObjectId[],
    nodeId: ObjectId,
    granterId: ObjectId,
  ): Promise<void> {
    const newPermissions: Partial<Permission>[] = userIds.map((userId: ObjectId) => ({
      userId: userId,
      nodeId: nodeId,
      permission: PermissionLevel.OWNER,
      grantedBy: granterId,
      grantedAt: new Date(),
    }));

    if (newPermissions.length > 0) {
      // Dùng upsert để tránh tạo bản ghi trùng lặp nếu đã có
      // (Tuy nhiên, để đơn giản, insertMany cũng đã đủ tốt ở bước này)
      await this.permissionRepository.insertMany(newPermissions);
    }
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
    parentNodeId: ObjectId,
    targetUserId: ObjectId,
    permission: PermissionLevel,
    granterId: ObjectId,
  ): Promise<void> {
    // 1. Tìm tất cả các node con cháu
    const descendantNodes = await this.nodesService.findAllDescendants(parentNodeId);
    const allNodeIds = [parentNodeId, ...descendantNodes.map((n) => n._id)];

    // 2. Dùng bulkWrite để cấp quyền hàng loạt một cách hiệu quả
    // upsert: true sẽ tạo mới nếu chưa có, hoặc cập nhật quyền nếu đã có
    const operations = allNodeIds.map((nodeId) => ({
      updateOne: {
        filter: { userId: targetUserId, nodeId: nodeId },
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
}
