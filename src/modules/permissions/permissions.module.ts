import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { Permission } from './entities/permission.entity';
import { NodesModule } from '../nodes/nodes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission]),
    forwardRef(() => NodesModule),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}