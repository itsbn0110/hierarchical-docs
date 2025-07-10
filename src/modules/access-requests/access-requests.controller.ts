import { Controller, Post, Body, Request, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccessRequestsService } from './access-requests.service';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { AccessRequest } from './entities/access-request.entity';
import { PendingRequestDto } from './dto/access-request-response.dto';
import { ProcessedRequestDto } from './dto/processed-request.response.dto';

@ApiTags('Access Requests')
@ApiBearerAuth()
@Controller('access-requests')
export class AccessRequestsController {
  constructor(private readonly accessRequestsService: AccessRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo một yêu cầu xin quyền truy cập mới' })
  create(
    @Body() createAccessRequestDto: CreateAccessRequestDto,
    @Request() req,
  ): Promise<AccessRequest> {
    return this.accessRequestsService.createAccessRequest(createAccessRequestDto, req.user);
  }


  @Get('pending')
  @ApiOperation({ summary: 'Lấy các yêu cầu đang chờ xử lý cho người dùng hiện tại' })
  @ApiResponse({ status: 200, type: [PendingRequestDto] })
  findPending(@Request() req) {
    return this.accessRequestsService.findPendingRequestsForOwner(req.user);
  }

    
  @Get('processed')
  @ApiOperation({ summary: 'Lấy lịch sử các yêu cầu đã xử lý cho người dùng hiện tại' })
  @ApiResponse({ status: 200, type: [ProcessedRequestDto] })
  findProcessed(@Request() req) {
    return this.accessRequestsService.findProcessedRequestsForOwner(req.user);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Phê duyệt một yêu cầu truy cập' })
  approveRequest(@Param('id') id: string, @Request() req) {
    console.log('Approving request with ID:', id);
    return this.accessRequestsService.approve(id, req.user);
  }

  @Post(':id/deny')
  @ApiOperation({ summary: 'Từ chối một yêu cầu truy cập' })
  denyRequest(@Param('id') id: string, @Request() req) {
    return this.accessRequestsService.deny(id, req.user);
  }


}
