import { Controller, Post, Body, Request, Delete, Param, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { GrantPermissionDto } from './dto/grant-permissions.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('node/:nodeId')
  @ApiOperation({ summary: 'Lấy danh sách quyền truy cập cho một node' })
  @ApiResponse({ status: 200, description: 'Danh sách quyền truy cập.' })
  getPermissionsForNode(@Param('nodeId') nodeId: string) {
    return this.permissionsService.getPermissionsForNode(nodeId);
  }

  @Get('activity/:nodeId')
  @ApiOperation({ summary: 'Lấy lịch sử hoạt động cho một node' })
  @ApiResponse({ status: 200, description: 'Danh sách các hoạt động.' })
  getActivityForNode(@Param('nodeId') nodeId: string) {
    return this.permissionsService.getActivityForNode(nodeId);
  }

  @Post('grant')
  @ApiBearerAuth()
  grantPermission(@Body() grantPermissionDto: GrantPermissionDto, @Request() req) {
    return this.permissionsService.grant(grantPermissionDto, req.user);
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
