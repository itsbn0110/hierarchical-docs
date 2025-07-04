import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { Permission } from './entities/permission.entity';
import { NodesModule } from '../nodes/nodes.module';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { ActivityLog } from '../activity-log/entities/activity-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, ActivityLog]),
    forwardRef(() => NodesModule),
    forwardRef(() => EmailModule),
    forwardRef(() => UsersModule),
    forwardRef(() => ActivityLogModule),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
