import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Node } from '../nodes/entities/node.entity';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Node]), PermissionsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
