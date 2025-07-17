import { forwardRef, Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { AdminInitService } from "./users.admin-init-service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { EmailModule } from "../email/email.module";
@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => EmailModule)],
  controllers: [UsersController],
  providers: [UsersService, AdminInitService],
  exports: [UsersService],
})
export class UsersModule {}
