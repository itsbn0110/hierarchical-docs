import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessRequestsService } from '../access-requests/access-requests.service';
import { AccessRequestsController } from '../access-requests/access-requests.controller';
import { AccessRequest } from '../access-requests/entities/access-request.entity';
import { NodesModule } from '../nodes/nodes.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessRequest]),
    forwardRef(() => NodesModule),
    forwardRef(() => PermissionsModule),
  ],
  controllers: [AccessRequestsController],
  providers: [AccessRequestsService],
  exports: [AccessRequestsService],
})
export class AccessRequestsModule {}