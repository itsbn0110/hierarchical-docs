// src/permissions/permissions.controller.ts

import { Controller, Post, Body, Request, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { GrantPermissionDto } from './dto/grant-permissions.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post('grant') 
  @ApiBearerAuth()
  grantPermission(
    @Body() grantPermissionDto: GrantPermissionDto,
    @Request() req,
  ) {
    return this.permissionsService.grant(grantPermissionDto, req.user);
  }


  @Delete(':id')
  async revokePermission(@Param('id') id: string, @Request() req) {
    await this.permissionsService.revoke(id, req.user);
    return {
      statusCode: 200,
      message: 'Thu hồi quyền thành công.'
    };
  }
}