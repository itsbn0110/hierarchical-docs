import {
  Controller,
  Post,
  UseGuards,
  Get,
  Request,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login-response.dto';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from 'src/common/enums/projects.enum';
import { RolesGuard } from './guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Public } from './decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LoginDto } from './dto/login-request.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Chức năng đăng nhập hệ thống' })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công, trả về access token.',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Sai thông tin đăng nhập',
  })
  @UseGuards(AuthGuard('local'))
  @Public()
  @Post('login')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async login(
    @Request() req: { user: User },
    @Body() loginDto: LoginDto,
  ): Promise<LoginResponseDto> {
    const tokenInfo = await this.authService.login(req.user);
    const response: LoginResponseDto = {
      access_token: tokenInfo.accessToken,
      refreshToken: tokenInfo.refreshToken,
      user: req.user,
    };
    return response;
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Lấy thông tin profile của người dùng hiện tại' })
  @Get('profile')
  getProfile(@Request() req: { user: User }): User {
    return req.user;
  }

  @Post('refresh')
  @Public()
  @UseGuards(JwtRefreshGuard)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async refreshTokens(@Request() req, @Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.login(req.user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Request() req) {
    await this.authService.logout(req.user._id);
  }
}
