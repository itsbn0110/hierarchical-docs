import { Controller, Post, Body, Req, Get, Query, Patch, Param, Delete } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { Node } from './entities/node.entity';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TreeNodeDto } from './dto/tree-node.dto';
import { UpdateNodeNameDto } from './dto/update-node-name.dto';
import { UpdateNodeContentDto } from './dto/update-node-content.dto';
import { MoveNodeDto } from './dto/move-node.dto';
import { NodeDetailsDto } from './dto/node-details-dto';

@Controller('nodes')
@ApiBearerAuth()
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy các node con để hiển thị cây thư mục (lazy-loading)' })
  @ApiResponse({ status: 200, description: 'Danh sách các node con.', type: [TreeNodeDto] })
  getTree(@Query('parentId') parentId: string | null = null, @Req() req): Promise<TreeNodeDto[]> {
    return this.nodesService.getTreeForUser(parentId, req.user);
  }

  @Get('trash')
  @ApiOperation({ summary: 'Lấy các mục trong thùng rác của người dùng' })
  findTrash(@Req() req) {
    return this.nodesService.findTrashedNodes(req.user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết của một node (dùng cho breadcrumb và xem file)',
  })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết của node.', type: Node })
  getNodeDetails(@Param('id') id: string, @Req() req): Promise<NodeDetailsDto> {
    // Gọi hàm service mới và trả về toàn bộ entity Node
    return this.nodesService.getNodeDetails(id, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo một node mới (thư mục hoặc file)' })
  @ApiResponse({ status: 201, description: 'Node đã được tạo thành công.', type: Node })
  async create(@Body() createNodeDto: CreateNodeDto, @Req() req: any): Promise<Node> {
    return this.nodesService.create(createNodeDto, req.user);
  }
  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục một mục từ thùng rác' })
  restore(@Param('id') id: string, @Req() req) {
    return this.nodesService.restore(id, req.user);
  }

  @Patch(':id/name')
  @ApiOperation({ summary: 'Đổi tên một node' })
  @ApiResponse({ status: 200, description: 'Node đã được đổi tên thành công.', type: Node })
  updateName(@Param('id') id: string, @Body() updateNodeNameDto: UpdateNodeNameDto, @Req() req) {
    return this.nodesService.updateName(id, updateNodeNameDto, req.user);
  }

  @Patch(':id/content')
  @ApiOperation({ summary: 'Cập nhật nội dung của một file' })
  @ApiResponse({ status: 200, description: 'Nội dung file đã được cập nhật.', type: Node })
  updateContent(
    @Param('id') id: string,
    @Body() updateNodeContentDto: UpdateNodeContentDto,
    @Req() req,
  ) {
    return this.nodesService.updateContent(id, updateNodeContentDto, req.user);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Di chuyển một node đến vị trí mới' })
  @ApiResponse({ status: 200, description: 'Node đã được di chuyển thành công.', type: Node })
  moveNode(@Param('id') id: string, @Body() moveNodeDto: MoveNodeDto, @Req() req) {
    return this.nodesService.move(id, moveNodeDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Di chuyển một node vào thùng rác (Soft Delete)' })
  @ApiResponse({ status: 200, description: 'Di chuyển vào thùng rác thành công.' })
  softDelete(@Param('id') id: string, @Req() req) {
    return this.nodesService.softDelete(id, req.user);
  }

  @Delete(':id/permanently')
  @ApiOperation({ summary: 'Xóa vĩnh viễn một mục khỏi thùng rác' })
  @ApiResponse({ status: 200, description: 'Xóa vĩnh viễn thành công.' })
  deletePermanently(@Param('id') id: string, @Req() req) {
    return this.nodesService.deletePermanently(id, req.user);
  }
}
