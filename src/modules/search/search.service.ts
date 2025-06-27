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

  async fullSearch(query: string, user: User): Promise<SearchResultDto[]> {
    if (!query) return [];

    const nodesFound = await this.nodesRepository.find({
      where: { $text: { $search: query } },
      select: ['_id', 'name', 'type'],
      // Thêm điểm số để có thể sắp xếp theo độ liên quan
      score: { $meta: 'textScore' },
      order: { score: { $meta: 'textScore' } },
    });

    return this.enrichResultsWithPermissions(nodesFound, user);
  }

  /**
   * Chức năng 2: GỢI Ý LIVE SEARCH (Khi người dùng đang gõ)
   * Sử dụng Regex, linh hoạt nhưng có thể chậm với dữ liệu lớn.
   */
  async getSuggestions(query: string, user: User): Promise<SearchResultDto[]> {
    if (!query) return [];

    // CẢNH BÁO: Query này sẽ gây ra Full Collection Scan trên dữ liệu lớn.
    const searchPattern = new RegExp(query, 'i');

    const nodesFound = await this.nodesRepository.find({
      where: { name: { $regex: searchPattern } },
      take: 10, // Rất quan trọng: Luôn giới hạn số lượng gợi ý trả về
      select: ['_id', 'name', 'type'],
    });

    return this.enrichResultsWithPermissions(nodesFound, user);
  }

  /**
   * Hàm helper private để "làm giàu" kết quả với thông tin quyền
   */
  private async enrichResultsWithPermissions(
    nodes: Node[],
    user: User,
  ): Promise<SearchResultDto[]> {
    if (nodes.length === 0) return [];

    const nodeIds = nodes.map((node) => node._id);
    const permissions = await this.permissionsService.findUserPermissionsForNodes(
      user._id,
      nodeIds,
    );
    const permissionMap = new Map<string, PermissionLevel>();
    permissions.forEach((p) => permissionMap.set(p.nodeId.toHexString(), p.permission));

    const searchResults = nodes.map((node) => {
      const accessStatus: AccessStatus = permissionMap.get(node._id.toHexString()) || 'NO_ACCESS';
      return plainToInstance(SearchResultDto, {
        nodeId: node._id,
        name: node.name,
        type: node.type,
        accessStatus: accessStatus,
        score: (node as any).score,
      });
    });

    return searchResults;
  }
}
