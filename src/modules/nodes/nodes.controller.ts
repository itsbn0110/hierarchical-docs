import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { Node } from './entities/node.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';



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
}
  