import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodesService } from './nodes.service';
import { NodesController } from './nodes.controller';
import { Node } from './entities/node.entity';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Node]),
    forwardRef(() => PermissionsModule),
  ],
  controllers: [NodesController],
  providers: [NodesService],
  exports: [NodesService],
})
export class NodesModule {}