import { Injectable, HttpStatus } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { ObjectId } from "mongodb";
import { Repository, In, Connection, DeepPartial } from "typeorm";
import * as bcrypt from "bcrypt";
import { BusinessException } from "src/common/filters/business.exception";
import { ErrorCode } from "src/common/filters/constants/error-codes.enum";
import { ErrorMessages } from "src/common/filters/constants/messages.constant";
import { randomBytes } from "crypto";
import { EmailProducerService } from "../email/email-producer.service";
import { ConfigService } from "@nestjs/config";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { Permission } from "../permissions/entities/permission.entity";
import { AccessRequest } from "../access-requests/entities/access-request.entity";
import { ActivityLog } from "../activity-log/entities/activity-log.entity";
import { User } from "./entities/user.entity";
import { Node } from "../nodes/entities/node.entity";
import { UserResponseDto } from "./dto/user-response.dto";
import { plainToInstance } from "class-transformer";
import { UserRole } from "src/common/enums/projects.enum";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly emailProducerService: EmailProducerService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existingUser) {
      throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS, ErrorMessages.EMAIL_ALREADY_EXISTS, HttpStatus.BAD_REQUEST);
    }

    const existingUsername = await this.userRepository.findOne({ where: { username: createUserDto.username } });
    if (existingUsername) {
      throw new BusinessException(ErrorCode.USERNAME_AREADY_EXISTS, ErrorMessages.USERNAME_AREADY_EXISTS, HttpStatus.BAD_REQUEST);
    }

    const temporaryPassword = randomBytes(8).toString("hex");
    const hashPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      hashPassword,
      role: UserRole.USER,
      isActive: createUserDto.isActive ?? true,
      mustChangePassword: true,
    });

    const savedUser = await this.userRepository.save(user);

    await this.emailProducerService.sendWelcomeEmail({
      to: savedUser.email,
      username: savedUser.username,
      temporaryPassword: temporaryPassword,
      loginUrl: this.configService.get<string>("FRONTEND_URL"),
    });

    return plainToInstance(UserResponseDto, savedUser);
  }

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { _id: new ObjectId(userId) } });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (dto.username && dto.username !== user.username) {
      const existing = await this.userRepository.findOne({ where: { username: dto.username } });
      if (existing) {
        throw new BusinessException(ErrorCode.USERNAME_AREADY_EXISTS, ErrorMessages.USERNAME_AREADY_EXISTS, HttpStatus.BAD_REQUEST);
      }
    }

    await this.userRepository.update({ _id: new ObjectId(userId) }, dto);
    const updatedUser = await this.userRepository.findOne({ where: { _id: new ObjectId(userId) } });
    return plainToInstance(UserResponseDto, updatedUser);
  }

  async updateStatus(id: string, isActive: boolean): Promise<UserResponseDto> {
    if (!ObjectId.isValid(id)) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const result = await this.userRepository.update({ _id: new ObjectId(id) }, { isActive });
    if (result.affected === 0) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const updatedUser = await this.userRepository.findOne({ where: { _id: new ObjectId(id) } });
    if (!updatedUser) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return plainToInstance(UserResponseDto, updatedUser);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { _id: new ObjectId(userId) } });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const isPasswordMatching = await bcrypt.compare(dto.oldPassword, user.hashPassword);
    if (!isPasswordMatching) {
      throw new BusinessException(ErrorCode.UNAUTHORIZED, ErrorMessages.INVALID_OLD_PASSWORD, HttpStatus.UNAUTHORIZED);
    }

    const newHashPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.update(
      { _id: new ObjectId(userId) },
      {
        hashPassword: newHashPassword,
        mustChangePassword: false,
      },
    );

    return { message: "Đổi mật khẩu thành công." };
  }

  async remove(userIdToDelete: string, performingAdmin: User): Promise<{ message: string }> {
    const userObjectId = new ObjectId(userIdToDelete);
    // Không cho phép RootAdmin tự xóa chính mình
    if (userObjectId.equals(performingAdmin._id)) {
      throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.CANNOT_DELETE_SELF, HttpStatus.FORBIDDEN);
    }

    // Bắt đầu một transaction để đảm bảo an toàn, không bị mất duwxl liệu
    await this.connection.transaction(async (transactionalEntityManager) => {
      const userRepo = transactionalEntityManager.getMongoRepository(User);
      const nodeRepo = transactionalEntityManager.getMongoRepository(Node);
      const permissionRepo = transactionalEntityManager.getMongoRepository(Permission);
      const accessRequestRepo = transactionalEntityManager.getMongoRepository(AccessRequest);
      const activityLogRepo = transactionalEntityManager.getMongoRepository(ActivityLog);

      // --- BƯỚC 1: DỌN DẸP DỮ LIỆU LIÊN QUAN ---
      // Xóa tất cả các quyền của người này
      await permissionRepo.deleteMany({ userId: userObjectId });
      // Xóa tất cả các yêu cầu do người này tạo
      await accessRequestRepo.deleteMany({ requesterId: userObjectId });
      // Ẩn danh trong Activity Log
      await activityLogRepo.updateMany({ userId: userObjectId }, { $set: { userId: null } });
      // Ẩn danh trong các node do người này tạo
      await nodeRepo.updateMany({ createdBy: userObjectId }, { $set: { createdBy: null } });

      // --- BƯỚC 2: XÓA NGƯỜI DÙNG ---
      const deleteResult = await userRepo.delete({ _id: userObjectId });
      if (deleteResult.affected === 0) {
        throw new BusinessException(ErrorCode.USER_NOT_FOUND, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
    });

    return { message: "Người dùng và các dữ liệu liên quan đã được xóa thành công." };
  }

  /**
   * Hàm update chung để cập nhật các trường của user.
   * Hàm này sẽ được gọi bởi AuthService để cập nhật 'hashedRefreshToken'.
   * Không bao giờ update email qua hàm này.
   */
  async update(userId: ObjectId, updatePayload: DeepPartial<User>): Promise<void> {
    if ((updatePayload as any).email) {
      delete (updatePayload as any).email;
    }
    await this.userRepository.update({ _id: userId }, updatePayload);
  }


  async findUserById(userId: string): Promise<User | null> {
    if (!ObjectId.isValid(userId)) {
      return null;
    }

    return this.userRepository.findOne({
      where: { _id: new ObjectId(userId) },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findUsersByIds(ids: ObjectId[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.userRepository.find({
      where: {
        _id: { $in: ids } as any,
      },
    });
  }

  async findAllUsers() {
    return this.userRepository.find();
  }
}
