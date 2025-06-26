import {
  Injectable,
  ConflictException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ObjectId } from 'mongodb';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { BusinessException } from 'src/common/filters/business.exception';
import { ErrorCode } from 'src/common/filters/constants/error-codes.enum';
import { ErrorMessages } from 'src/common/filters/constants/messages.constant';
import { randomBytes } from 'crypto';
import { EmailProducerService } from '../email/email-producer.service';
import { ConfigService } from '@nestjs/config';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly emailProducerService: EmailProducerService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BusinessException(
          ErrorCode.EMAIL_ALREADY_EXISTS,
          ErrorMessages.EMAIL_ALREADY_EXISTS,
          HttpStatus.BAD_REQUEST,
      );
    }

    const existingUsername = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });
    if (existingUsername) {
      throw new BusinessException(
          ErrorCode.USERNAME_AREADY_EXISTS,
          ErrorMessages.USERNAME_AREADY_EXISTS,
          HttpStatus.BAD_REQUEST,
      );
    }

    // Tự động tạo một mật khẩu tạm thời an toàn
    const temporaryPassword = randomBytes(8).toString('hex'); // Tạo ra một chuỗi 16 ký tự ngẫu nhiên
    const hashPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      hashPassword,
      isActive: createUserDto.isActive ?? true,
      mustChangePassword: true,
    });

    const savedUser = await this.userRepository.save(user);

    // --- GỌI ĐẾN HÀNG ĐỢI EMAIL ---
    // Thêm job gửi email chào mừng với mật khẩu tạm thời
    await this.emailProducerService.sendWelcomeEmail({
      to: savedUser.email,
      username: savedUser.username,
      temporaryPassword: temporaryPassword, // Gửi mật khẩu chưa băm đi
      loginUrl: this.configService.get<string>('FRONTEND_URL'),
    });
    // -----------------------------

    return savedUser;
  }

  findAll() {
    return this.userRepository.find();
  }

  findById(id: string) {
    return this.userRepository.findOne({ where: { _id: new ObjectId(id) } });
  }

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { _id: new ObjectId(userId) } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    // Kiểm tra username trùng lặp nếu có thay đổi
    if (dto.username && dto.username !== user.username) {
      const existing = await this.userRepository.findOne({ where: { username: dto.username } });
      if (existing) {
        throw new ConflictException('Username đã được sử dụng.');
      }
    }

    await this.userRepository.update({ _id: new ObjectId(userId) }, dto);
    return this.userRepository.findOne({ where: { _id: new ObjectId(userId) } });
  }

  async updateStatus(id: string, isActive: boolean): Promise<Omit<User, 'hashPassword'>> {
    if (!ObjectId.isValid(id)) {
      throw new BusinessException(
          ErrorCode.USER_NOT_FOUND,
          ErrorMessages.USER_NOT_FOUND,
          HttpStatus.NOT_FOUND,
      );
    }
    const result = await this.userRepository.update({ _id: new ObjectId(id) }, { isActive });
    if (result.affected === 0) {
      throw new BusinessException(
          ErrorCode.USER_NOT_FOUND,
          ErrorMessages.USER_NOT_FOUND,
          HttpStatus.NOT_FOUND,
      );
    }
    const updatedUser = await this.userRepository.findOne({ where: { _id: new ObjectId(id) } });
    if (!updatedUser) {
      throw new BusinessException(
          ErrorCode.USER_NOT_FOUND,
          ErrorMessages.USER_NOT_FOUND,
          HttpStatus.NOT_FOUND,
      );
    }
    return updatedUser;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { _id: new ObjectId(userId) } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    const isPasswordMatching = await bcrypt.compare(dto.oldPassword, user.hashPassword);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Mật khẩu cũ không chính xác.');
    }

    const newHashPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.update(
        { _id: new ObjectId(userId) },
        {
          hashPassword: newHashPassword,
          mustChangePassword: false,
        },
    );

    return { message: 'Đổi mật khẩu thành công.' };
  }

  remove(id: string) {
    // TODO: Xóa user theo id
    return this.userRepository.delete({ _id: new ObjectId(id) });
  }

  async findUserById(userId: string): Promise<User | null> {
    if (!ObjectId.isValid(userId)) {
      return null;
    }

    return this.userRepository.findOne({
      where: {
        _id: new ObjectId(userId),
      },
    });
  }

  async findByUserName(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findByIds(ids: ObjectId[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.userRepository.find({ where: { _id: In(ids) } });
  }
}
