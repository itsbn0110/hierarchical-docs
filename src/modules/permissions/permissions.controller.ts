import { Controller, Post, Body, Request, Delete, Param, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { GrantPermissionDto } from './dto/grant-permissions.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PermissionResponseDto } from './dto/permission.response.dto';
import { ActivityLogResponseDto } from '../activity-log/dto/activity-log.response.dto';
import { InvitePermissionDto } from './dto/invite-permission.dto';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('node/:nodeId')
  @ApiOperation({ summary: 'Lấy danh sách quyền truy cập cho một node' })
  @ApiResponse({ status: 200, description: 'Danh sách quyền truy cập.' })
  async getPermissionsForNode(@Param('nodeId') nodeId: string): Promise<PermissionResponseDto[]> {
    // <--- QUAN TRỌNG NHẤT
    // Service vẫn trả về dữ liệu thô, Interceptor sẽ tự động xử lý phần còn lại
    return this.permissionsService.getPermissionsForNode(nodeId);
  }

  @Get('activity/:nodeId')
  @ApiOperation({ summary: 'Lấy lịch sử hoạt động cho một node' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các hoạt động.',
    type: [ActivityLogResponseDto],
  })
  async getActivityForNode(@Param('nodeId') nodeId: string): Promise<ActivityLogResponseDto[]> {
    return this.permissionsService.getActivityForNode(nodeId);
  }

  @Post('grant')
  @ApiBearerAuth()
  grantPermission(@Body() grantPermissionDto: GrantPermissionDto, @Request() req) {
    return this.permissionsService.grant(grantPermissionDto, req.user);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Mời một người dùng vào node bằng email' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Mời thành công.', type: PermissionResponseDto })
  inviteByEmail(@Body() invitePermissionDto: InvitePermissionDto, @Request() req) {
    return this.permissionsService.inviteByEmail(invitePermissionDto, req.user);
  }

  @Delete(':id')
  async revokePermission(@Param('id') id: string, @Request() req) {
    await this.permissionsService.revoke(id, req.user);
    return {
      statusCode: 200,
      message: 'Thu hồi quyền thành công.',
    };
  }
}
