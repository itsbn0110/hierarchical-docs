// src/permissions/permissions.controller.ts

import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { GrantPermissionDto } from './dto/grant-permissions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post('grant') // Sử dụng route /permissions/grant cho rõ ràng
  @ApiBearerAuth()
  grantPermission(
    @Body() grantPermissionDto: GrantPermissionDto,
    @Request() req,
  ) {
    // req.user chính là người đi cấp quyền (granter)
    return this.permissionsService.grant(grantPermissionDto, req.user);
  }
}