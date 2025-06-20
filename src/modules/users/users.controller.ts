import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginResponseDto } from '../auth/dto/login-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from 'src/common/enums/projects.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
@Controller('users')
@UseGuards(JwtAuthGuard,RolesGuard)
@ApiBearerAuth() 
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Root Admin tạo mới người dùng' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tạo người dùng thành công',
    type: LoginResponseDto, // Nếu muốn mô tả response cụ thể hơn
  })
  @Roles(UserRole.ROOT_ADMIN)
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return {
      success: true,
      message: 'Tạo người dùng thành công',
      data: user,
    };
  }

  @ApiOperation({ summary: 'Root Admin xem danh sách người dùng' })
  @Roles(UserRole.ROOT_ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({ summary: 'Root Admin xem chi tiết người dùng' })
  @Roles(UserRole.ROOT_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: 'Root Admin cập nhật người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật người dùng thành công',
  })
  @Roles(UserRole.ROOT_ADMIN)
  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return {
      success: true,
      message: 'Cập nhật người dùng thành công',
      data: user,
    };
  }

  @ApiOperation({ summary: 'Root Admin xóa người dùng' })
  @Roles(UserRole.ROOT_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }


  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard) 
  @Roles(UserRole.ROOT_ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, updateUserStatusDto.isActive);
  }
}
