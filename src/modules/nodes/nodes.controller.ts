import { Controller, Post, Body, Req, UseGuards, UseInterceptors, ClassSerializerInterceptor, Get, Query, Patch, Param, Delete } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { Node } from './entities/node.entity';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TreeNodeDto } from './dto/tree-node.dto';
import { UpdateNodeNameDto } from './dto/update-node-name.dto';
import { UpdateNodeContentDto } from './dto/update-node-content.dto';
import { MoveNodeDto } from './dto/move-node.dto';


@Controller('nodes')
@ApiBearerAuth() 
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}
  
  @Post()
  async create(
    @Body() createNodeDto: CreateNodeDto,
    @Req() req: any
  ): Promise<Node> {
    return this.nodesService.create(createNodeDto, req.user);
  }

  @Get()
  getTree(
    @Query('parentId') parentId: string | null = null,
    @Req() req,
  ): Promise<TreeNodeDto[]> {
    return this.nodesService.getTreeForUser(parentId, req.user);
  }

  @Patch(':id/name')
  updateName(
    @Param('id') id: string,
    @Body() updateNodeNameDto: UpdateNodeNameDto,
    @Req() req,
  ) {
    return this.nodesService.updateName(id, updateNodeNameDto, req.user);
  }

  @Patch(':id/content')
  updateContent(
    @Param('id') id: string,
    @Body() updateNodeContentDto: UpdateNodeContentDto,
    @Req() req,
  ) {
    return this.nodesService.updateContent(id, updateNodeContentDto, req.user);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Di chuyển một node đến vị trí mới' })
  moveNode(
    @Param('id') id: string,
    @Body() moveNodeDto: MoveNodeDto,
    @Req() req,
  ) {
    return this.nodesService.move(id, moveNodeDto, req.user);
  }


  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    const deletedNode = await this.nodesService.delete(id, req.user)
    return {
      statusCode: 200,
      message: 'Xóa thành công.',
      deletedCount: deletedNode.deletedCount
    };
  }
}
