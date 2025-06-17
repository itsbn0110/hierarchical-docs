import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ObjectId, Repository } from 'typeorm';

@Injectable()
export class UsersService {

  constructor ( 
    @InjectRepository(User) private readonly userRepository: Repository<User>
  ) {}

  async findUserById(userId: string): Promise<User | null> {
    console.log(userId);
    if (!ObjectId.isValid(userId)) {
      return null; 
    }

    return this.userRepository.findOne({
      where: {
        _id: new ObjectId(userId) , 
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
  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
