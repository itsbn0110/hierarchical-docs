import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessRequestsService } from './access-requests.service';
import { AccessRequestsController } from './access-requests.controller';
import { AccessRequest } from './entities/access-request.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { NodesModule } from '../nodes/nodes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessRequest]),
    PermissionsModule, 
    NodesModule,       
  ],
  controllers: [AccessRequestsController],
  providers: [AccessRequestsService],
})
export class AccessRequestsModule {}