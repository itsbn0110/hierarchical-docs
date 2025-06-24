import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  ClassSerializerInterceptor,
  Get,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { AccessRequestsService } from './access-requests.service';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessRequest } from './entities/access-request.entity';

@ApiTags('Access Requests') // Gom các API vào nhóm "Access Requests" trên Swagger
@ApiBearerAuth() // Báo cho Swagger biết các API này cần token
@Controller('access-requests')
@UseGuards(JwtAuthGuard)
export class AccessRequestsController {
  constructor(private readonly accessRequestsService: AccessRequestsService) {}

  /**
   * Endpoint để người dùng gửi một yêu cầu xin quyền truy cập mới.
   */
  @Post()
  @ApiOperation({ summary: 'Tạo một yêu cầu xin quyền truy cập mới' })
  @UseInterceptors(ClassSerializerInterceptor) // Áp dụng để response được định dạng đẹp
  create(
    @Body() createAccessRequestDto: CreateAccessRequestDto,
    @Request() req, // Dùng để lấy thông tin người đang gửi yêu cầu
  ): Promise<AccessRequest> {
    // req.user được gắn vào từ JwtAuthGuard
    return this.accessRequestsService.createAccessRequest(createAccessRequestDto, req.user);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Lấy danh sách các yêu cầu đang chờ xử lý cho Owner' })
  findPendingRequests(@Request() req) {
    // req.user là Owner đang đăng nhập
    return this.accessRequestsService.findPendingRequestsForOwner(req.user);
  }


  @Post(':id/approve')
  @ApiOperation({ summary: 'Phê duyệt một yêu cầu truy cập' })
  approveRequest(@Param('id') id: string, @Request() req) {
    return this.accessRequestsService.approve(id, req.user);
  }

  @Post(':id/deny')
  @ApiOperation({ summary: 'Từ chối một yêu cầu truy cập' })
  denyRequest(@Param('id') id: string, @Request() req) {
    return this.accessRequestsService.deny(id, req.user);
  }
}