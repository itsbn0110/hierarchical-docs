import { Injectable, ConflictException, BadRequestException, HttpStatus } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ObjectId } from 'mongodb';
import { Repository, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { BusinessException } from 'src/common/filters/business.exception';
import { ErrorCode } from 'src/common/filters/constants/error-codes.enum';
import { ErrorMessages } from 'src/common/filters/constants/messages.constant';

@Injectable()
export class UsersService {

  constructor ( 
    @InjectRepository(User) private readonly userRepository: Repository<User>
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    
    if (existingUser) {
      throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS, ErrorMessages.EMAIL_ALREADY_EXISTS, HttpStatus.BAD_REQUEST);
    }
    
    const existingUsername = await this.userRepository.findOne({ where: { username: createUserDto.username } });
    if (existingUsername) {
      throw new BusinessException(ErrorCode.USERNAME_AREADY_EXISTS, ErrorMessages.USERNAME_AREADY_EXISTS, HttpStatus.BAD_REQUEST);
    }
    
    const hashPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      email: createUserDto.email,
      username: createUserDto.username,
      hashPassword,
      role: createUserDto.role,
      isActive: createUserDto.isActive ?? true,
      mustChangePassword: true,
    });
    try {
      const savedUser = await this.userRepository.save(user);
      const { hashPassword, ...result } = savedUser;
      return result;
    } catch (error) {
      throw new BusinessException(ErrorCode.CANNOT_CREATE_USER, ErrorMessages.CANNOT_CREATE_USER, HttpStatus.BAD_REQUEST);
    }
  }

  findAll() {
    return this.userRepository.find();
  }

  findOne(id: string) {
    return this.userRepository.findOne({ where: { _id: new ObjectId(id) } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (!ObjectId.isValid(id)) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    // Không cho phép cập nhật email/username trùng
    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findOne({ where: { email: updateUserDto.email, _id: Not(new ObjectId(id)) } });
      if (existingUser) {
        throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS, ErrorMessages.EMAIL_ALREADY_EXISTS, HttpStatus.BAD_REQUEST);
      }
    }
    if (updateUserDto.username) {
      const existingUser = await this.userRepository.findOne({ where: { username: updateUserDto.username, _id: Not(new ObjectId(id)) } });
      if (existingUser) {
        throw new BusinessException(ErrorCode.USERNAME_AREADY_EXISTS, ErrorMessages.USERNAME_AREADY_EXISTS, HttpStatus.BAD_REQUEST);
      }
    }
    
    let updateData: any = { ...updateUserDto };
    if (updateUserDto.password) {
      updateData.hashPassword = await bcrypt.hash(updateUserDto.password, 10);
      delete updateData.password;
    }
    // Cập nhật user
    const result = await this.userRepository.update({ _id: new ObjectId(id) }, updateData);
    if (result.affected === 0) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    // Lấy lại user sau khi update
    const updatedUser = await this.userRepository.findOne({ where: { _id: new ObjectId(id) } });
    if (!updatedUser) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const { hashPassword, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async updateStatus(id: string, isActive: boolean): Promise<Omit<User, 'hashPassword'>> {
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
    const { hashPassword, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
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
  
  async findByUserName ( username: string ) : Promise<User|null> {
    return this.userRepository.findOne({
      where: { username }
    });
  }
  
  async findByEmail ( email: string ) : Promise<User|null> {
    return this.userRepository.findOne({
      where: { email }
    });
  }
}
