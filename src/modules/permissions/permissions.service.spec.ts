import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';

import { PermissionsService } from './permissions.service';
import { Permission } from './entities/permission.entity';
import { PermissionLevel } from 'src/common/enums/projects.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from 'src/common/enums/projects.enum';
import { ConfigService } from '@nestjs/config';
import { NodesService } from '../nodes/nodes.service';
import { EmailProducerService } from '../email/email-producer.service';
import { UsersService } from '../users/users.service';
import { ActivityLogProducerService } from '../activity-log/activity-log-producer.service';

// Tạo một đối tượng user giả để test
const mockUser: User = {
  _id: new ObjectId(),
  role: UserRole.USER,
  // ... các trường khác không cần thiết cho test này
} as User;

const mockRootAdmin: User = {
  _id: new ObjectId(),
  role: UserRole.ROOT_ADMIN,
} as User;

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionRepositoryMock: { findOne: jest.Mock };

  // Thiết lập môi trường test trước mỗi bài test
  beforeEach(async () => {
    // Tạo một đối tượng giả cho permissionRepository
    permissionRepositoryMock = {
      findOne: jest.fn(), // jest.fn() tạo ra một hàm giả lập
    };

    // Tạo một module test của NestJS
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(Permission), // Cung cấp token của repository
          useValue: permissionRepositoryMock, // Thay thế repository thật bằng đối tượng giả
        },
        { provide: ConfigService, useValue: {} },
        { provide: NodesService, useValue: {} },
        { provide: EmailProducerService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: ActivityLogProducerService, useValue: {} },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== Bắt đầu các bài test cho hàm checkUserPermissionForNode =====

  it('should return true for RootAdmin regardless of permissions', async () => {
    const result = await service.checkUserPermissionForNode(
      mockRootAdmin,
      new ObjectId(),
      PermissionLevel.OWNER,
    );
    expect(result).toBe(true);
    // Đảm bảo rằng nó không cần phải query database
    expect(permissionRepositoryMock.findOne).not.toHaveBeenCalled();
  });

  it('should return false if no permission record is found for a regular user', async () => {
    permissionRepositoryMock.findOne.mockResolvedValue(null); // Giả lập không tìm thấy gì

    const result = await service.checkUserPermissionForNode(
      mockUser,
      new ObjectId(),
      PermissionLevel.VIEWER,
    );
    expect(result).toBe(false);
  });

  it('should return true if user has the exact required permission', async () => {
    const mockPermission = { permission: PermissionLevel.EDITOR };
    permissionRepositoryMock.findOne.mockResolvedValue(mockPermission);

    const result = await service.checkUserPermissionForNode(
      mockUser,
      new ObjectId(),
      PermissionLevel.EDITOR,
    );
    expect(result).toBe(true);
  });

  it('should return true if user has a higher permission level', async () => {
    const mockPermission = { permission: PermissionLevel.OWNER };
    permissionRepositoryMock.findOne.mockResolvedValue(mockPermission);

    // Yêu cầu quyền Editor, nhưng user là Owner
    const result = await service.checkUserPermissionForNode(
      mockUser,
      new ObjectId(),
      PermissionLevel.EDITOR,
    );
    expect(result).toBe(true);
  });

  it('should return false if user has a lower permission level', async () => {
    const mockPermission = { permission: PermissionLevel.VIEWER };
    permissionRepositoryMock.findOne.mockResolvedValue(mockPermission);

    // Yêu cầu quyền Editor, nhưng user chỉ là Viewer
    const result = await service.checkUserPermissionForNode(
      mockUser,
      new ObjectId(),
      PermissionLevel.EDITOR,
    );
    expect(result).toBe(false);
  });
});
