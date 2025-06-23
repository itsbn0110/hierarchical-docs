// src/nodes/nodes.service.ts

import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';

import { Node } from './entities/node.entity';
import { CreateNodeDto } from './dto/create-node.dto';
import { User } from '../users/entities/user.entity';
import { NodeType, UserRole } from 'src/common/enums/projects.enum';
import { PermissionLevel } from 'src/common/enums/projects.enum';
import { PermissionsService } from '../permissions/permissions.service';
import { TreeNodeDto } from './dto/tree-node.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateNodeNameDto } from './dto/update-node-name.dto';
import { UpdateNodeContentDto } from './dto/update-node-content.dto';
import { Permission } from '../permissions/entities/permission.entity';
import { AccessRequest } from '../access-requests/entities/access-request.entity';

type Ancestor = {
  _id: ObjectId;
  name: string;
};

@Injectable()
export class NodesService {
  constructor(
    @InjectRepository(Node)
    private readonly nodesRepository: MongoRepository<Node>,

    @Inject(forwardRef(() => PermissionsService))
    private readonly permissionsService: PermissionsService,

    @InjectConnection() private readonly connection: Connection
  ) {}

  /**
   * Tạo một node mới với logic kế thừa quyền Owner
   */
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
        throw new NotFoundException(`Thư mục cha với ID "${parentId}" không tồn tại.`);
      }

      if (parentNode.type !== NodeType.FOLDER) {
        throw new BadRequestException('Không thể tạo mục mới bên trong một file.');
      }

      const canCreate = await this.permissionsService.checkUserPermissionForNode(
        user,
        parentNode._id,
        PermissionLevel.EDITOR,
      );
      
      if (!canCreate && user.role !== UserRole.ROOT_ADMIN) {
        throw new ForbiddenException('Bạn không có quyền tạo mục mới trong thư mục này.');
      }
      
      // Dùng hàm mới để lấy tất cả ID của Owner từ cha
      parentOwnerIds = await this.permissionsService.findOwnerIdsOfNode(parentNode._id);
      ancestors = [...parentNode.ancestors, { _id: parentNode._id, name: parentNode.name }];
      level = parentNode.level + 1; // <-- TÍNH TOÁN LEVEL MỚI
    }

    // --- 2. TẠO VÀ LƯU NODE MỚI ---
    const nodeToCreate = this.nodesRepository.create({
      name,
      type,
      content: content || undefined,
      parentId: parentNode ? parentNode._id : null,
      ancestors,
      level,
      createdBy: user._id,
    });
    const newNode = await this.nodesRepository.save(nodeToCreate);

    // --- 3. KẾ THỪA VÀ GÁN QUYỀN OWNER HÀNG LOẠT ---
    const ownerIdSet = new Set<string>();
    ownerIdSet.add(user._id.toHexString()); // Thêm người tạo
    // các ownerIds của th cha, 
    parentOwnerIds.forEach(id => ownerIdSet.add(id.toHexString())); // Thêm các owner kế thừa từ cha

    const finalOwnerIds = Array.from(ownerIdSet).map(id => new ObjectId(id));
    
    // Dùng hàm mới để gán quyền hàng loạt
    await this.permissionsService.grantOwnerPermissionToUsers(
      finalOwnerIds,
      newNode._id,
      user._id // Ghi nhận người thực hiện hành động này là người tạo
    );

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
        throw new ForbiddenException('Bạn không có quyền truy cập vào thư mục này.');
      }
    }


    // --- 1. Lấy danh sách Node con mà User có quyền xem ---
    if (user.role === UserRole.ROOT_ADMIN) {
      nodes = await this.nodesRepository.find({ where: { parentId: parentObjectId } });
    } else {
      // Lấy tất cả các quyền của user
      const userPermissions = await this.permissionsService.findAllForUser(user._id);
      const accessibleNodeIds = userPermissions.map(p => p.nodeId);

      // Tìm các node con của parentId VÀ user có quyền truy cập
      nodes = await this.nodesRepository.find({
        where: {
          parentId: parentObjectId,
          _id: { $in: accessibleNodeIds } as any,
        },
      });
    }
    if (nodes.length === 0) return [];

    // --- 2. Kiểm tra `hasChildren` và lấy quyền chi tiết hàng loạt ---
    const nodeIds = nodes.map(n => n._id);

    // Query để tìm những node nào trong danh sách trên có con
    const nodesWithChildren = await this.nodesRepository.distinct('parentId', { parentId: { $in: nodeIds } });
    console.log("nodesWithChildren: ",nodesWithChildren);
    const parentIdsWithChildren = new Set(nodesWithChildren.map(id => id.toHexString()));

    console.log("parentIdsWithChildren: ",parentIdsWithChildren);

    // Lấy quyền chi tiết của user trên các node này
    const permissions = await this.permissionsService.findUserPermissionsForNodes(user._id, nodeIds);
    const permissionMap = new Map<string, PermissionLevel>();
    permissions.forEach(p => permissionMap.set(p.nodeId.toHexString(), p.permission));

    // --- 3. Chuyển đổi sang DTO để trả về ---
    const treeDtos = nodes.map(node => {
      const nodeIdString = node._id.toHexString();
      return plainToInstance(TreeNodeDto, { // Dùng plainToInstance để áp dụng decorator của DTO
        id: node._id,
        name: node.name,
        type: node.type,
        level: node.level,
        hasChildren: parentIdsWithChildren.has(nodeIdString),
        userPermission: permissionMap.get(nodeIdString) || null,
      });
    });

    return treeDtos;
  }

  async updateName(nodeId: string, dto: UpdateNodeNameDto, user: User): Promise<Node> {
    const nodeObjectId = new ObjectId(nodeId);
    const { name: newName } = dto;

    // 1. Tìm node và kiểm tra quyền Editor
    const nodeToUpdate = await this.nodesRepository.findOne({ where: { _id: nodeObjectId } });
    if (!nodeToUpdate) {
      throw new NotFoundException('Node không tồn tại.');
    }
    const canEdit = await this.permissionsService.checkUserPermissionForNode(
      user, nodeObjectId, PermissionLevel.EDITOR,
    );
    if (!canEdit) {
      throw new ForbiddenException('Bạn không có quyền sửa mục này.');
    }

    // 2. Cập nhật tên của chính node đó
    nodeToUpdate.name = newName;
    await this.nodesRepository.save(nodeToUpdate);

    // 3. Cập nhật tên trong mảng ancestors của tất cả con cháu
    if (nodeToUpdate.type === NodeType.FOLDER) {
      await this.nodesRepository.updateMany(
        { 'ancestors._id': nodeObjectId },
        { $set: { 'ancestors.$.name': newName } }
      );
    }
    
    return nodeToUpdate;
  }

  async updateContent(nodeId: string, dto: UpdateNodeContentDto, user: User): Promise<Node> {
  const nodeObjectId = new ObjectId(nodeId);

  // 1. Tìm node
  const nodeToUpdate = await this.nodesRepository.findOne({ where: { _id: nodeObjectId } });
    if (!nodeToUpdate) {
      throw new NotFoundException('File không tồn tại.');
    }

    // 2. KIỂM TRA ĐIỀU KIỆN: Chỉ cho phép update content của FILE
    if (nodeToUpdate.type !== NodeType.FILE) {
      throw new BadRequestException('Chỉ có thể cập nhật nội dung cho file.');
    }

    // 3. Kiểm tra quyền Editor
    const canEdit = await this.permissionsService.checkUserPermissionForNode(
      user, nodeObjectId, PermissionLevel.EDITOR,
    );
    if (!canEdit) {
      throw new ForbiddenException('Bạn không có quyền sửa nội dung file này.');
    }

    // 4. Cập nhật và lưu
    nodeToUpdate.content = dto.content;
    return this.nodesRepository.save(nodeToUpdate);
  }

  async delete(nodeId: string, user: User): Promise<{ deletedCount: number }> {
    const nodeObjectId = new ObjectId(nodeId);

    // --- BƯỚC 1: TÌM NODE VÀ KIỂM TRA QUYỀN OWNER (Thực hiện trước transaction) ---
    const nodeToDelete = await this.nodesRepository.findOne({ where: { _id: nodeObjectId } });
    if (!nodeToDelete) {
      throw new NotFoundException('Mục cần xóa không tồn tại.');
    }

    const isOwner = await this.permissionsService.checkUserPermissionForNode(
      user,
      nodeToDelete._id,
      PermissionLevel.OWNER,
    );
    if (!isOwner) { // checkUserPermissionForNode đã xử lý cho RootAdmin
      throw new ForbiddenException('Chỉ chủ sở hữu mới có quyền xóa mục này.');
    }

    // --- BƯỚC 2: TÌM TẤT CẢ CÁC NODE CON CHÁU CẦN XÓA THEO ---
    // Dùng pattern "Array of Ancestors" để tìm tất cả các descendant một cách hiệu quả
    const descendants = await this.nodesRepository.find({
      where: { 'ancestors._id': nodeObjectId }
    });
    
    // Tạo một mảng chứa ID của node chính và tất cả con cháu của nó
    const idsToDelete = [nodeToDelete._id, ...descendants.map(d => d._id)];

    // --- BƯỚC 3: THỰC HIỆN XÓA HÀNG LOẠT TRONG MỘT TRANSACTION ĐỂ ĐẢM BẢO AN TOÀN ---
    await this.connection.transaction(async transactionalEntityManager => {
      const nodeRepo = transactionalEntityManager.getMongoRepository(Node);
      const permissionRepo = transactionalEntityManager.getMongoRepository(Permission);
      const accessRequestRepo = transactionalEntityManager.getMongoRepository(AccessRequest);

      // 3.1. Xóa các permissions liên quan
      await permissionRepo.deleteMany({ nodeId: { $in: idsToDelete } as any });
      
      // 3.2. Xóa các access requests liên quan
      await accessRequestRepo.deleteMany({ nodeId: { $in: idsToDelete } as any });

      // 3.3. Cuối cùng, xóa chính các node đó
      await nodeRepo.deleteMany({ _id: { $in: idsToDelete } as any });
    });

    // Trả về số lượng mục đã bị xóa để front-end có thể hiển thị thông báo
    return { deletedCount: idsToDelete.length };
  }

}