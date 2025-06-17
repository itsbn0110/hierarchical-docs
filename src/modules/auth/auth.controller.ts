import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BusinessException } from 'src/common/filters/business.exception';
import { ErrorCode } from 'src/common/filters/constants/error-codes.enum';
import { ErrorMessages } from 'src/common/filters/constants/messages.constant';
import { ApiOperation, ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({summary: 'Chức năng đăng nhập hệ thống'})
  @ApiResponse({ 
    status: 200, 
    description: 'Đăng nhập thành công, trả về access token.',
    type: LoginResponseDto, // Chỉ định DTO cho response để Swagger biết cấu trúc
  })
  @ApiResponse({
    status: 401,
    description: 'Sai thông tin đăng nhập'
  })
  @Post('login')
  async login(@Body() loginDto : LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new BusinessException(ErrorCode.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED );
    }
    return this.authService.login(user);
  }

  @ApiBearerAuth() 
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy thông tin profile của người dùng hiện tại' })
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
