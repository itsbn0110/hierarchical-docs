import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "./types/user-role.type";
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminInitService implements OnModuleInit {
  private readonly logger = new Logger(AdminInitService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService
  ) {}

  async onModuleInit() {
    const rootAdmin = await this.userRepository.findOne({
      where: { role: UserRole.ROOT_ADMIN },
    });

    if (!rootAdmin) {
      const email = this.configService.get<string>('ROOT_ADMIN_EMAIL');
      const username = this.configService.get<string>('ROOT_ADMIN_USERNAME');
      const password = this.configService.get<string>('ROOT_ADMIN_PASSWORD');

      if (!password) {
        throw new Error('ROOT_ADMIN_PASSWORD is not defined in environment variables');
      }

      const hashPassword = await bcrypt.hash(password, 10);

      const user = this.userRepository.create({
        email,
        username,
        hashPassword,
        role: UserRole.ROOT_ADMIN,
        isActive: true,
        mustChangePassword: true,
      });

      await this.userRepository.save(user);
      this.logger.log('Root Admin account created successfully!')
    } else {
      this.logger.log('Root admin account already exists.')
    }
  }
}