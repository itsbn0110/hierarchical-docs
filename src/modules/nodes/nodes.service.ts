import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, In, IsNull, MongoRepository, Not } from "typeorm";
import { ObjectId } from "mongodb";

import { Node } from "./entities/node.entity";
import { CreateNodeDto } from "./dto/create-node.dto";
import { User } from "../users/entities/user.entity";
import { ActivityAction, NodeType, UserRole } from "src/common/enums/projects.enum";
import { PermissionLevel } from "src/common/enums/projects.enum";
import { PermissionsService } from "../permissions/permissions.service";
import { TreeNodeDto } from "./dto/tree-node.dto";
import { plainToInstance } from "class-transformer";
import { UpdateNodeNameDto } from "./dto/update-node-name.dto";
import { UpdateNodeContentDto } from "./dto/update-node-content.dto";
import { Permission } from "../permissions/entities/permission.entity";
import { AccessRequest } from "../access-requests/entities/access-request.entity";
import { ActivityLogProducerService } from "../activity-log/activity-log-producer.service";
import { MoveNodeDto } from "./dto/move-node.dto";
import { BusinessException } from "src/common/filters/business.exception";
import { ErrorMessages } from "src/common/filters/constants/messages.constant";
import { ErrorCode } from "src/common/filters/constants/error-codes.enum";
import { UsersService } from "../users/users.service";
import { NodeDetailsDto } from "./dto/node-details-dto";
import { TrashedItemDto } from "./dto/trashed-item.dto";
import { Cron, CronExpression } from "@nestjs/schedule";

type Ancestor = {
  _id: ObjectId;
  name: string;
};

@Injectable()
export class NodesService {
  logger: any;
  constructor(
    @InjectRepository(Node)
    private readonly nodesRepository: MongoRepository<Node>,

    @Inject(forwardRef(() => PermissionsService))
    private readonly permissionsService: PermissionsService,

    @Inject(forwardRef(() => ActivityLogProducerService))
    private readonly activityLogProducer: ActivityLogProducerService,

    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // ... (Các hàm create, update, delete, move giữ nguyên)
  async create(createNodeDto: CreateNodeDto, user: User): Promise<Node> {
    const { name, type, parentId, content } = createNodeDto;
    let parentNode: Node | null = null;
    let ancestors: Ancestor[] = [];
    let parentOwnerIds: ObjectId[] = [];
    let level = 0; // Giá trị mặc định cho node gốc
    // --- 1. KIỂM TRA THƯ MỤC CHA VÀ LẤY OWNER CỦA CHA ---
    if (parentId) {
      parentNode = await this.nodesRepository.findOne({ where: { _id: new ObjectId(parentId) } });
      if (!parentNode) {
        throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.FOLDER_NOT_FOUND, 404);
      }
      if (parentNode.type !== NodeType.FOLDER) {
        throw new BusinessException(ErrorCode.NODE_INVALID_TYPE, ErrorMessages.INVALID_DOCUMENT_TYPE, 400);
      }
      const canCreate = await this.permissionsService.checkUserPermissionForNode(
        user,
        parentNode._id,
        PermissionLevel.EDITOR,
      );
      if (!canCreate && user.role !== UserRole.ROOT_ADMIN) {
        throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.INSUFFICIENT_PERMISSIONS, 403);
      } 
      // Dùng hàm mới để lấy tất cả ID của Owner từ cha
      parentOwnerIds = await this.permissionsService.findOwnerIdsOfNode(parentNode._id);
      ancestors = [...parentNode.ancestors, { _id: parentNode._id, name: parentNode.name }];
      level = parentNode.level + 1; // <-- TÍNH TOÁN LEVEL MỚI
    } // --- 2. TẠO VÀ LƯU NODE MỚI ---

    const nodeToCreate = this.nodesRepository.create({
      name,
      type,
      content: content || undefined,
      parentId: parentNode ? parentNode._id : null,
      ancestors,
      level,
      createdBy: user._id,
    });
    const newNode = await this.nodesRepository.save(nodeToCreate); // --- 3. KẾ THỪA VÀ GÁN QUYỀN OWNER HÀNG LOẠT ---

    const ownerIdSet = new Set<string>();
    ownerIdSet.add(user._id.toHexString()); // Thêm người tạo
    // các ownerIds của th cha,
    parentOwnerIds.forEach((id) => ownerIdSet.add(id.toHexString())); // Thêm các owner kế thừa từ cha

    const finalOwnerIds = Array.from(ownerIdSet).map((id) => new ObjectId(id)); 

    // Dùng hàm mới để gán quyền hàng loạt
    await this.permissionsService.grantOwnerPermissionToUsers(
      finalOwnerIds,
      newNode._id,
      user._id, // Ghi nhận người thực hiện hành động này là người tạo
    ); // --- TÍCH HỢP GHI LOG ---

    await this.activityLogProducer.logActivity({
      userId: user._id,
      action: ActivityAction.NODE_CREATED,
      targetId: newNode._id,
      details: {
        name: newNode.name,
        type: newNode.type,
        parentId: newNode.parentId,
        createdBy: user.username,
        createdAt: newNode.createdAt,
      },
    });
    return newNode;
  }

  async getTreeForUser(parentId: string | null, user: User): Promise<TreeNodeDto[]> {
    const parentObjectId = parentId ? new ObjectId(parentId) : null;
    let nodes: Node[]; 
    
    // --- BƯỚC 1: KIỂM TRA QUYỀN TRUY CẬP VÀO THƯ MỤC CHA ---
    // (Bỏ qua nếu là Root Admin hoặc đang xem ở cấp gốc)

    if (user.role !== UserRole.ROOT_ADMIN && parentObjectId) {
      const canViewParent = await this.permissionsService.checkUserPermissionForNode(
        user,
        parentObjectId,
        PermissionLevel.VIEWER, // Chỉ cần ít nhất quyền xem
      ); 
      
      // Nếu không có quyền xem thư mục cha, ném lỗi Forbidden ngay lập tức.
      if (!canViewParent) {
        throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.ACCESS_DENIED, 403);
      }
    } 
    // --- 1. Lấy danh sách Node con mà User có quyền xem ---
    if (user.role === UserRole.ROOT_ADMIN) {
      nodes = await this.nodesRepository.find({ where: { parentId: parentObjectId } });
    } else {
      // Lấy tất cả các quyền của user
      const userPermissions = await this.permissionsService.findAllForUser(user._id);
      const accessibleNodeIds = userPermissions.map((p) => p.nodeId); 

      // Tìm các node con của parentId VÀ user có quyền truy cập
      nodes = await this.nodesRepository.find({
        where: {
          parentId: parentObjectId,
          _id: { $in: accessibleNodeIds },
        },
      });
    }
    if (nodes.length === 0) return []; // --- 2. Kiểm tra `hasChildren` và lấy quyền chi tiết hàng loạt ---

    const nodeIds = nodes.map((n) => n._id); // Query để tìm những node nào trong danh sách trên có con

    const nodesWithChildren = await this.nodesRepository.distinct("parentId", {
      parentId: { $in: nodeIds },
    });
    const parentIdsWithChildren = new Set(nodesWithChildren.map((id) => id.toHexString())); // Lấy quyền chi tiết của user trên các node này

    const permissions = await this.permissionsService.findUserPermissionsForNodes(user._id, nodeIds);
    const permissionMap = new Map<string, PermissionLevel>();
    permissions.forEach((p) => permissionMap.set(p.nodeId.toHexString(), p.permission)); // --- 3. Chuyển đổi sang DTO để trả về ---

    const treeDtos = nodes.map(async (node) => {
      const nodeIdString = node._id.toHexString();

      let createdByUser

      if (node.createdBy) {
         createdByUser = await this.usersService.findUserById(node.createdBy.toHexString());
      }
      
      return plainToInstance(TreeNodeDto, {
        // Dùng plainToInstance để áp dụng decorator của DTO
        id: node._id,
        name: node.name,
        type: node.type,
        level: node.level,
        hasChildren: parentIdsWithChildren.has(nodeIdString),
        userPermission: permissionMap.get(nodeIdString) || null,
        createdBy: node.createdBy ? createdByUser.username : "Người dùng cũ",
      });
    });

    return await Promise.all(treeDtos);
  }

  /**
   * [MỚI] Lấy thông tin chi tiết của một node (folder hoặc file)
   * Hàm này dùng cho cả trang xem folder và trang xem file để lấy breadcrumb và content.
   * @param nodeId ID của node cần lấy
   * @param user User đang thực hiện yêu cầu
   * @returns Toàn bộ entity Node
   */
  async getNodeDetails(nodeId: string, user: User): Promise<NodeDetailsDto> {
    const nodeObjectId = new ObjectId(nodeId);

    // 1. Kiểm tra quyền xem (VIEWER) của user trên node này
    if (user.role !== UserRole.ROOT_ADMIN) {
      const canView = await this.permissionsService.checkUserPermissionForNode(
        user,
        nodeObjectId,
        PermissionLevel.VIEWER,
      );
      if (!canView) {
        throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.INSUFFICIENT_PERMISSIONS, 403);
      }
    }

    // 2. Lấy thông tin node gốc từ DB
    const node = await this.nodesRepository.findOne({ where: { _id: nodeObjectId } });

    if (!node) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.DOCUMENT_NOT_FOUND, 404);
    }

    // 3. Lấy thông tin người tạo từ UsersService
    let creator = null;

    if (node.createdBy) {
      creator = await this.usersService.findUserById(node.createdBy.toHexString());
    }
    
    //4. Lấy quyền của người dùng hiện tại trên node này
    const currentUserPermission = await this.permissionsService.getUserPermissionForNode(user._id, nodeObjectId);

    // 5. Cập nhật trường lastAccessedAt
    this.permissionsService.updateLastAccessed(user._id, nodeObjectId);

    // 5. Kết hợp dữ liệu và chuyển đổi sang DTO
    // Dùng plainToInstance để đảm bảo chỉ các trường có @Expose() trong DTO mới được trả về
    const nodeDetailData = plainToInstance(NodeDetailsDto, {
      ...node, // Lấy tất cả các thuộc tính của node gốc
      createdBy: creator ? creator.username : "Người dùng cũ", // Ghi đè `createdBy` bằng username
      userPermission: currentUserPermission ? currentUserPermission.permission : null,
    });


    return nodeDetailData;
  }

  async findTrashedNodes(user: User): Promise<TrashedItemDto[]> {
    const ownerPermissions = await this.permissionsService.findAllOwnedByUser(user._id);
    const ownedNodeIds = ownerPermissions.map((p) => p.nodeId);

    if (ownedNodeIds.length === 0) {
      return [];
    }

    const results = await this.nodesRepository
      .aggregate([
        {
          $match: {
            _id: { $in: ownedNodeIds },
            deletedAt: { $ne: null }, // Sử dụng toán tử native của MongoDB
          },
        },
        {
          $lookup: {
            from: "nodes",
            localField: "parentId",
            foreignField: "_id",
            as: "parentDetails",
          },
        },
        {
          $match: {
            $or: [{ parentDetails: [] }, { "parentDetails.deletedAt": null }],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "ownerInfo",
          },
        },
        { $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: 1,
            type: 1,
            deletedAt: 1,
            owner: "$ownerInfo.username",
          },
        },
        { $sort: { deletedAt: -1 } },
      ])
      .toArray();

    return plainToInstance(TrashedItemDto, results);
  }

  async findAllTrashedNodesForAdmin(): Promise<TrashedItemDto[]> {
    // Pipeline này tương tự như `findTrashedNodes` nhưng không lọc theo owner.
    const results = await this.nodesRepository
      .aggregate([
        // Bước 1: Lấy tất cả các node có `deletedAt` (đang trong thùng rác)
        {
          $match: {
            deletedAt: { $ne: null },
          },
        },
        // Bước 2: Kiểm tra xem thư mục cha của chúng có bị xóa không.
        // Nếu cha cũng bị xóa, không hiển thị mục con này (vì nó sẽ được khôi phục/xóa cùng cha)
        {
          $lookup: {
            from: "nodes",
            localField: "parentId",
            foreignField: "_id",
            as: "parentDetails",
          },
        },
        {
          $match: {
            $or: [{ parentDetails: [] }, { "parentDetails.deletedAt": null }],
          },
        },
        // Bước 3: Lấy thông tin người tạo để hiển thị cột "Chủ sở hữu"
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "ownerInfo",
          },
        },
        { $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true } },
        // Bước 4: Định hình dữ liệu trả về
        {
          $project: {
            _id: 1,
            name: 1,
            type: 1,
            deletedAt: 1,
            owner: "$ownerInfo.username", // Lấy username của chủ sở hữu
          },
        },
        { $sort: { deletedAt: -1 } },
      ])
      .toArray();

    return plainToInstance(TrashedItemDto, results);
  }

  async updateName(nodeId: string, dto: UpdateNodeNameDto, user: User): Promise<Node> {
    const nodeObjectId = new ObjectId(nodeId);
    const { name: newName } = dto; // 1. Tìm node và kiểm tra quyền Editor

    const nodeToUpdate = await this.nodesRepository.findOne({ where: { _id: nodeObjectId } });
    if (!nodeToUpdate) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.DOCUMENT_NOT_FOUND, 404);
    }
    const canEdit = await this.permissionsService.checkUserPermissionForNode(
      user,
      nodeObjectId,
      PermissionLevel.EDITOR,
    );
    if (!canEdit) {
      throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.INSUFFICIENT_PERMISSIONS, 403);
    } // 2. Cập nhật tên của chính node đó

    const oldName = nodeToUpdate.name; // Lưu lại tên cũ để ghi log
    nodeToUpdate.name = newName;
    await this.nodesRepository.save(nodeToUpdate); // 3. Cập nhật tên trong mảng ancestors của tất cả con cháu

    if (nodeToUpdate.type === NodeType.FOLDER) {
      await this.nodesRepository.updateMany(
        { "ancestors._id": nodeObjectId },
        { $set: { "ancestors.$.name": newName } },
      );
    }

    await this.activityLogProducer.logActivity({
      userId: user._id,
      action: ActivityAction.NODE_RENAMED,
      targetId: nodeToUpdate._id,
      details: {
        oldName: oldName, // cần lưu lại tên cũ trước khi đổi
        newName: nodeToUpdate.name,
        type: nodeToUpdate.type,
        parentId: nodeToUpdate.parentId,
        renamedBy: user.username,
        renamedAt: new Date(),
      },
    });

    return nodeToUpdate;
  }

  async updateContent(nodeId: string, dto: UpdateNodeContentDto, user: User): Promise<Node> {
    const nodeObjectId = new ObjectId(nodeId); // 1. Tìm node

    const nodeToUpdate = await this.nodesRepository.findOne({ where: { _id: nodeObjectId } });
    if (!nodeToUpdate) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.DOCUMENT_NOT_FOUND, 404);
    } // 2. KIỂM TRA ĐIỀU KIỆN: Chỉ cho phép update content của FILE

    if (nodeToUpdate.type !== NodeType.FILE) {
      throw new BusinessException(ErrorCode.NODE_INVALID_TYPE, ErrorMessages.INVALID_DOCUMENT_TYPE, 400);
    } // 3. Kiểm tra quyền Editor

    const canEdit = await this.permissionsService.checkUserPermissionForNode(
      user,
      nodeObjectId,
      PermissionLevel.EDITOR,
    );
    if (!canEdit) {
      throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.INSUFFICIENT_PERMISSIONS, 403);
    } // 4. Cập nhật và lưu

    nodeToUpdate.content = dto.content;
    return this.nodesRepository.save(nodeToUpdate);
  }

  async deletePermanently(nodeId: string, user: User): Promise<{ deletedCount: number }> {
    const nodeObjectId = new ObjectId(nodeId);

    const nodeToDelete = await this.nodesRepository.findOne({
      where: { _id: nodeObjectId },
      withDeleted: true,
    });
    if (!nodeToDelete) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.DOCUMENT_NOT_FOUND, 404);
    }
    const isOwner = await this.permissionsService.checkUserPermissionForNode(
      user,
      nodeToDelete._id,
      PermissionLevel.OWNER,
    );
    if (!isOwner) {
      throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.ONLY_OWNER_CAN_DELETE, 403);
    }

    const descendants = await this.nodesRepository.find({
      where: { "ancestors._id": nodeObjectId },
      withDeleted: true,
    });
    const idsToDelete = [nodeToDelete._id, ...descendants.map((d) => d._id)];

    await this.connection.transaction(async (transactionalEntityManager) => {
      const nodeRepo = transactionalEntityManager.getMongoRepository(Node);
      const permissionRepo = transactionalEntityManager.getMongoRepository(Permission);
      const accessRequestRepo = transactionalEntityManager.getMongoRepository(AccessRequest);

      await permissionRepo.deleteMany({ nodeId: { $in: idsToDelete } });
      await accessRequestRepo.deleteMany({ nodeId: { $in: idsToDelete } });
      await nodeRepo.deleteMany({ _id: { $in: idsToDelete } });
    });

    // TODO: Ghi log xóa vĩnh viễn
    await this.activityLogProducer.logActivity({
      userId: user._id,
      action: ActivityAction.NODE_DELETED,
      targetId: nodeObjectId,
      details: {
        deletedAt: new Date(),
        deletedBy: user.username,
        nodeName: nodeToDelete.name,
        type: nodeToDelete.type,
      },
    }); // Trả về số lượng mục đã bị xóa để front-end có thể hiển thị thông báo

    return { deletedCount: idsToDelete.length };
  }
  async softDelete(nodeId: string, user: User): Promise<{ deletedCount: number }> {
    const nodeObjectId = new ObjectId(nodeId);
    const nodeToDelete = await this.nodesRepository.findOne({
      where: { _id: nodeObjectId, deletedAt: null },
    });
    if (!nodeToDelete) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.DOCUMENT_NOT_FOUND, 404);
    }
    const isOwner = await this.permissionsService.checkUserPermissionForNode(
      user,
      nodeToDelete._id,
      PermissionLevel.OWNER,
    );
    if (!isOwner) {
      throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.ONLY_OWNER_CAN_DELETE, 403);
    }

    const descendants = await this.nodesRepository.find({
      where: { "ancestors._id": nodeObjectId, deletedAt: null },
    });
    const idsToSoftDelete = [nodeToDelete._id, ...descendants.map((d) => d._id)];
    const deletionDate = new Date();

    await this.nodesRepository.updateMany(
      { _id: { $in: idsToSoftDelete } }, // Dùng $in của MongoDB native driver
      { $set: { deletedAt: deletionDate } },
    );

    await this.activityLogProducer.logActivity({
      userId: user._id,
      action: ActivityAction.NODE_DELETED,
      targetId: nodeObjectId,
      details: {
        deletedAt: deletionDate,
        deletedBy: user.username,
        nodeName: nodeToDelete.name,
        type: nodeToDelete.type,
      },
    });

    return { deletedCount: idsToSoftDelete.length };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleEmptyTrashCron() {
    this.logger.log("Bắt đầu tác vụ tự động dọn dẹp thùng rác...");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Tìm tất cả các mục trong thùng rác cũ hơn 30 ngày
    const oldItems = await this.nodesRepository.find({
      where: {
        deletedAt: { $lt: thirtyDaysAgo } as any,
      },
      withDeleted: true, // Quan trọng: Phải tìm cả trong thùng rác
    });

    if (oldItems.length === 0) {
      this.logger.log("Không có mục nào cũ cần xóa.");
      return;
    }

    this.logger.log(`Phát hiện ${oldItems.length} mục cần xóa vĩnh viễn.`);

    for (const item of oldItems) {
      try {
        await this._deletePermanentlyInternal(item._id);
        this.logger.log(`Đã xóa vĩnh viễn mục: ${item.name} (ID: ${item._id})`);
      } catch (error) {
        this.logger.error(`Lỗi khi xóa vĩnh viễn mục ${item._id}:`, error.stack);
      }
    }

    this.logger.log("Đã hoàn tất tác vụ dọn dẹp thùng rác.");
  }

  /**
   * HÀM NỘI BỘ: Chứa logic xóa cứng cốt lõi.
   */
  private async _deletePermanentlyInternal(nodeId: ObjectId): Promise<{ deletedCount: number }> {
    const descendants = await this.nodesRepository.find({
      where: { "ancestors._id": nodeId },
      withDeleted: true,
    });
    const idsToDelete = [nodeId, ...descendants.map((d) => d._id)];

    await this.connection.transaction(async (transactionalEntityManager) => {
      const nodeRepo = transactionalEntityManager.getMongoRepository(Node);
      const permissionRepo = transactionalEntityManager.getMongoRepository(Permission);
      const accessRequestRepo = transactionalEntityManager.getMongoRepository(AccessRequest);

      await permissionRepo.deleteMany({ nodeId: { $in: idsToDelete } });
      await accessRequestRepo.deleteMany({ nodeId: { $in: idsToDelete } });
      await nodeRepo.deleteMany({ _id: { $in: idsToDelete } });
    });

    return { deletedCount: idsToDelete.length };
  }

  async restore(nodeId: string, user: User): Promise<Node> {
    const nodeObjectId = new ObjectId(nodeId);

    const nodeToRestore = await this.nodesRepository.findOne({
      where: { _id: nodeObjectId },
      withDeleted: true,
    });

    if (!nodeToRestore || !nodeToRestore.deletedAt) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, "Mục không có trong thùng rác.", 404);
    }

    const isOwner = await this.permissionsService.checkUserPermissionForNode(user, nodeObjectId, PermissionLevel.OWNER);
    if (!isOwner) {
      throw new BusinessException(ErrorCode.NODE_FORBIDDEN, "Bạn không có quyền khôi phục mục này.", 403);
    }

    const descendants = await this.nodesRepository.find({
      where: { "ancestors._id": nodeObjectId, deletedAt: nodeToRestore.deletedAt },
      withDeleted: true,
    });
    const idsToRestore = [nodeToRestore._id, ...descendants.map((d) => d._id)];

    // SỬA LỖI: Thay thế .restore() bằng .updateMany() để tương thích với MongoDB
    await this.nodesRepository.updateMany(
      { _id: { $in: idsToRestore } }, // Dùng $in của MongoDB native driver
      { $set: { deletedAt: null } },
    );
    const restoredAt = new Date();
    // TODO: Ghi log khôi phục
    await this.activityLogProducer.logActivity({
      userId: user._id,
      action: ActivityAction.NODE_TRASHED, // Có thể đổi tên thành NODE_TRASHED
      targetId: nodeObjectId,
      details: {
        restoredAt,
        retoredBy: user.username,
        nodeName: nodeToRestore.name,
        type: nodeToRestore.type,
      },
    });
    return this.nodesRepository.findOne({ where: { _id: nodeObjectId } });
  }

  async move(nodeId: string, dto: MoveNodeDto, user: User): Promise<Node> {
    const { newParentId } = dto;
    const nodeToMoveId = new ObjectId(nodeId);
    const newParentObjectId = newParentId ? new ObjectId(newParentId) : null; 
    
    // --- 1. LẤY DỮ LIỆU VÀ KIỂM TRA QUYỀN BAN ĐẦU ---
    const [nodeToMove, newParentNode] = await Promise.all([
      this.nodesRepository.findOne({ where: { _id: nodeToMoveId } }),
      newParentObjectId ? this.nodesRepository.findOne({ where: { _id: newParentObjectId } }) : null,
    ]);
    if (!nodeToMove) throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.DOCUMENT_NOT_FOUND, 404);

    if (newParentId && !newParentNode)
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.FOLDER_NOT_FOUND, 404);

    if (newParentNode?.type !== NodeType.FOLDER) {
      throw new BusinessException(ErrorCode.NODE_INVALID_TYPE, ErrorMessages.INVALID_DOCUMENT_TYPE, 400);
    } // Kiểm tra quyền trên node bị di chuyển (phải là Owner)

    const canMove = await this.permissionsService.checkUserPermissionForNode(
      user,
      nodeToMove._id,
      PermissionLevel.OWNER,
    );

    if (!canMove) throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.ONLY_OWNER_CAN_REVOKE, 403); // Kiểm tra quyền trên thư mục đích (phải là Editor)

    if (newParentNode) {
      const canDrop = await this.permissionsService.checkUserPermissionForNode(
        user,
        newParentNode._id,
        PermissionLevel.EDITOR,
      );
      if (!canDrop) throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.INSUFFICIENT_PERMISSIONS, 403);
    }

    // --- 2. NGĂN CHẶN DI CHUYỂN VÒNG LẶP ---
    if (newParentNode) {
      const isMovingIntoSelfOrDescendant =
        newParentNode._id.equals(nodeToMoveId) ||
        newParentNode.ancestors.some((ancestor) => ancestor._id.equals(nodeToMoveId));
      if (isMovingIntoSelfOrDescendant) {
        throw new BusinessException(
          ErrorCode.NODE_CANNOT_MOVE,
          "Không thể di chuyển một thư mục vào chính nó hoặc thư mục con của nó.",
          400,
        );
      }
    } // --- 3. BẮT ĐẦU TRANSACTION ---

    await this.connection.transaction(async (transactionalEntityManager) => {
      const nodeRepo = transactionalEntityManager.getMongoRepository(Node);
      const permissionRepo = transactionalEntityManager.getMongoRepository(Permission); // --- 4. CẬP NHẬT CẤU TRÚC CÂY ---

      const oldAncestors = nodeToMove.ancestors;
      const newAncestors = newParentNode
        ? [...newParentNode.ancestors, { _id: newParentNode._id, name: newParentNode.name }]
        : [];
      const newLevel = newParentNode ? newParentNode.level + 1 : 0; // Cập nhật node gốc được di chuyển

      await nodeRepo.updateOne(
        { _id: nodeToMoveId },
        { $set: { parentId: newParentObjectId, ancestors: newAncestors, level: newLevel } },
      ); // Cập nhật tất cả con cháu nếu node được di chuyển là một thư mục

      if (nodeToMove.type === NodeType.FOLDER) {
        const descendants = await nodeRepo.find({ where: { "ancestors._id": nodeToMoveId } });
        if (descendants.length > 0) {
          const bulkUpdateOps = descendants.map((descendant) => {
            // Xây dựng lại mảng ancestors mới cho từng con cháu
            const newDescendantAncestors = [
              ...newAncestors,
              { _id: nodeToMove._id, name: nodeToMove.name },
              ...descendant.ancestors.slice(oldAncestors.length + 1),
            ];
            const newDescendantLevel = newLevel + (descendant.level - nodeToMove.level);
            return {
              updateOne: {
                filter: { _id: descendant._id },
                update: { $set: { ancestors: newDescendantAncestors, level: newDescendantLevel } },
              },
            };
          });
          await nodeRepo.bulkWrite(bulkUpdateOps);
        }
      } // --- 5. TÍNH TOÁN VÀ CẬP NHẬT LẠI QUYỀN OWNER KẾ THỪA ---

      const nodesToUpdatePermissions = await nodeRepo.find({
        where: { $or: [{ _id: nodeToMoveId }, { "ancestors._id": nodeToMoveId }] },
      });
      const newParentOwnerIds = newParentNode
        ? await this.permissionsService.findOwnerIdsOfNode(newParentNode._id)
        : [];

      for (const node of nodesToUpdatePermissions) {
        // Xóa tất cả quyền Owner cũ được kế thừa (giữ lại người tạo gốc)
        await permissionRepo.deleteMany({
          nodeId: node._id,
          permission: PermissionLevel.OWNER,
          userId: { $ne: node.createdBy },
        }); // Gán lại quyền Owner mới từ cha
        // Lọc ra những owner mới mà chưa phải là người tạo gốc

        const ownersToGrant = newParentOwnerIds.filter((ownerId) => !ownerId.equals(node.createdBy));
        if (ownersToGrant.length > 0) {
          const grantPermissions = ownersToGrant.map((ownerId) => ({
            userId: ownerId,
            nodeId: node._id,
            permission: PermissionLevel.OWNER,
            grantedBy: user._id, // Người thực hiện hành động move
            grantedAt: new Date(),
          }));
          await permissionRepo.insertMany(grantPermissions);
        }
      }
    });

    const movedNode = await this.nodesRepository.findOne({ where: { _id: nodeToMoveId } });

    console.log("Chuẩn bị ghi log hoạt động...");
    await this.activityLogProducer.logActivity({
      userId: user._id,
      action: ActivityAction.NODE_MOVED,
      targetId: movedNode._id,
      details: {
        nodeName: movedNode.name,
        type: movedNode.type,
        fromParentId: nodeToMove.parentId,
        toParentId: newParentId,
        movedBy: user.username,
        movedAt: new Date(),
      },
    }); // Trả về node đã được cập nhật thành công
    console.log("Đã ghi log hoạt động thành công!");

    return movedNode;
  }
  async findNodeById(nodeId: ObjectId): Promise<Node | null> {
    return this.nodesRepository.findOne({ where: { _id: new ObjectId(nodeId) } });
  }

  async findAllDescendants(parentNodeId: string | ObjectId): Promise<Node[]> {
    // Bước 1: Chuyển đổi an toàn parentNodeId sang kiểu ObjectId
    // Dù đầu vào là string hay ObjectId, đầu ra luôn là ObjectId.
    const parentObjectId = new ObjectId(parentNodeId);

    // Bước 2: Thực hiện truy vấn với kiểu dữ liệu đã được đảm bảo
    return this.nodesRepository.find({
      where: { "ancestors._id": parentObjectId },
    });
  }
}
