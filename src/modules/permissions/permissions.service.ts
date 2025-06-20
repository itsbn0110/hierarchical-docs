// src/permissions/permissions.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';

import { Permission } from './entities/permission.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from 'src/common/enums/projects.enum';
import { PermissionLevel } from 'src/common/enums/projects.enum';
@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: MongoRepository<Permission>,
  ) {}

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

  /**
   * Cấp một quyền cụ thể
   */
  async grant(permissionData: Partial<Permission>): Promise<Permission> {
    // Logic này có thể cần kiểm tra xem bản ghi đã tồn tại chưa để tránh trùng lặp
    const newPermission = this.permissionRepository.create(permissionData);
    return this.permissionRepository.save(newPermission);
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

    return permissions.map(p => p.userId);
  }

  /**
   * CẤP QUYỀN OWNER HÀNG LOẠT CHO NHIỀU USER
   */
  async grantOwnerPermissionToUsers(
    userIds: ObjectId[],
    nodeId: ObjectId,
    granterId: ObjectId,
  ): Promise<void> {
    const newPermissions = userIds.map(userId => ({
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
        nodeId: { $in: nodeIds } as any,
      });
    }
  }
}