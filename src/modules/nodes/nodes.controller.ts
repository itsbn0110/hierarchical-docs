import { Controller, Post, Body, Req, UseGuards, UseInterceptors, ClassSerializerInterceptor, Get, Query } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { Node } from './entities/node.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TreeNodeDto } from './dto/tree-node.dto';


@UseInterceptors(ClassSerializerInterceptor)
@Controller('nodes')
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard)
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
}
  