import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessRequestsService } from '../access-requests/access-requests.service';
import { AccessRequestsController } from '../access-requests/access-requests.controller';
import { AccessRequest } from '../access-requests/entities/access-request.entity';
import { NodesModule } from '../nodes/nodes.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessRequest]),
    forwardRef(() => NodesModule),
    forwardRef(() => PermissionsModule),
    forwardRef(() => EmailModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TasksModule),
  ],
  controllers: [AccessRequestsController],
  providers: [AccessRequestsService],
  exports: [AccessRequestsService],
})
export class AccessRequestsModule {}
