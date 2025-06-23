import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from 'src/common/enums/projects.enum';
import { RolesGuard } from './guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';


@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({summary: 'Chức năng đăng nhập hệ thống'})
  @ApiResponse({ 
    status: 200, 
    description: 'Đăng nhập thành công, trả về access token.',
    type: LoginResponseDto, 
  })
  @ApiResponse({
    status: 401,
    description: 'Sai thông tin đăng nhập'
  })
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req: any, @Body() login: LoginDto) {
    const tokenInfo = await this.authService.login(req.user);
    const response : LoginResponseDto = {
      access_token: tokenInfo.access_token,
      user: req.user
    };
    return response;
  } 

  @ApiBearerAuth() 
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN)
  @ApiOperation({ summary: 'Lấy thông tin profile của người dùng hiện tại' })
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
