import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginResponseDto } from '../auth/dto/login-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from 'src/common/enums/projects.enum';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { IsChangePasswordRoute } from '../auth/decorators/change-password.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from './entities/user.entity';

@Controller('users')
@UseGuards(RolesGuard)
@ApiBearerAuth()
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Root Admin tạo mới người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Tạo người dùng thành công',
    type: LoginResponseDto,
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
    return this.usersService.findById(id);
  }

  @ApiOperation({ summary: 'Root Admin cập nhật người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật người dùng thành công',
  })
  @Roles(UserRole.ROOT_ADMIN)
  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    console.log('hello');
    const user = await this.usersService.updateProfile(id, updateUserDto);
    return {
      success: true,
      message: 'Cập nhật người dùng thành công',
      data: user,
    };
  }

  @ApiOperation({ summary: 'Root Admin xóa người dùng' })
  @Roles(UserRole.ROOT_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() admin: User) {
    return this.usersService.remove(id, admin);
  }

  @Patch(':id/status')
  @Roles(UserRole.ROOT_ADMIN)
  updateStatus(@Param('id') id: string, @Body() updateUserStatusDto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, updateUserStatusDto.isActive);
  }

  @Patch('/me/password')
  @IsChangePasswordRoute()
  changeMyPassword(@Req() req, @Body() changePasswordDto: ChangePasswordDto) {
    console.log(req.user);
    return this.usersService.changePassword(req.user._id, changePasswordDto);
  }
}
