import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { Node } from '../nodes/entities/node.entity';
import { User } from '../users/entities/user.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { SearchResultDto, AccessStatus } from './dto/search-result.dto';
import { PermissionLevel } from 'src/common/enums/projects.enum';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Node)
    private readonly nodesRepository: MongoRepository<Node>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async search(query: string, user: User): Promise<SearchResultDto[]> {
    if (!query) {
      return [];
    }

    // --- 1. THỰC HIỆN FULL-TEXT SEARCH ---
    const nodesFound = await this.nodesRepository.find({
      where: {
        $text: { $search: query },
      },
      // Lấy các trường cần thiết, có thể thêm score để sắp xếp độ liên quan
      select: ['_id', 'name', 'type'], 
    });

    if (nodesFound.length === 0) {
      return [];
    }
    
    // --- 2. "LÀM GIÀU" KẾT QUẢ VỚI THÔNG TIN QUYỀN (Application-Side Join) ---
    const nodeIds = nodesFound.map(node => node._id);
    
    // Lấy tất cả các quyền mà user có trên danh sách node tìm được
    const permissions = await this.permissionsService.findUserPermissionsForNodes(user._id, nodeIds);
    
    // Tạo một Map để tra cứu quyền nhanh
    const permissionMap = new Map<string, PermissionLevel>();
    permissions.forEach(p => permissionMap.set(p.nodeId.toHexString(), p.permission));

    // --- 3. TẠO DTO TRẢ VỀ ---
    const searchResults = nodesFound.map(node => {
      const accessStatus: AccessStatus = permissionMap.get(node._id.toHexString()) || 'NO_ACCESS';
      
      return plainToInstance(SearchResultDto, {
        nodeId: node._id,
        name: node.name,
        type: node.type,
        accessStatus: accessStatus,
      });
    });

    return searchResults;
  }
}