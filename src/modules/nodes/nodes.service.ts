// src/nodes/nodes.service.ts

import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';

import { Node, Ancestor } from './entities/node.entity';
import { CreateNodeDto } from './dto/create-node.dto';
import { User } from '../users/entities/user.entity';
import { NodeType, UserRole } from 'src/common/enums/projects.enum';
import { PermissionLevel } from 'src/common/enums/projects.enum';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class NodesService {
  constructor(
    @InjectRepository(Node)
    private readonly nodesRepository: MongoRepository<Node>,

    @Inject(forwardRef(() => PermissionsService))
    private readonly permissionsService: PermissionsService,
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
}