import { Controller, Post, UseGuards, Get, Request, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { ApiOperation, ApiTags, ApiResponse, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { LoginResponseDto } from "./dto/login-response.dto";
import { Roles } from "./decorators/roles.decorator";
import { UserRole } from "src/common/enums/projects.enum";
import { RolesGuard } from "./guards/roles.guard";
import { AuthGuard } from "@nestjs/passport";
import { Public } from "./decorators/public.decorator";
import { User } from "../users/entities/user.entity";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { LoginDto } from "./dto/login-request.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(AuthGuard("local"))
  @ApiOperation({ summary: "Chức năng đăng nhập hệ thống" })
  @ApiBody({ type: LoginDto, description: "Thông tin đăng nhập của người dùng" })
  @ApiResponse({
    status: 200,
    description: "Đăng nhập thành công, trả về access token.",
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad Request - Invalid input data (e.g., missing username/password)." })
  @ApiResponse({ status: 401, description: "Sai thông tin đăng nhập" })
  @Post("login")
  async login(@Request() req: { user: User }, @Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const tokenInfo = await this.authService.login(req.user);
    const response: LoginResponseDto = {
      accessToken: tokenInfo.accessToken,
      refreshToken: tokenInfo.refreshToken,
      user: req.user,
    };
    return response;
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.USER)
  @ApiOperation({ summary: "Lấy thông tin profile của người dùng hiện tại" })
  @Get("profile")
  getProfile(@Request() req: { user: User }): User {
    return req.user;
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: "Làm mới access token bằng refresh token" })
  @ApiBody({ type: RefreshTokenDto, description: "Nội dung chứa refresh token để yêu cầu cấp token mới" })
  @ApiResponse({
    status: 200,
    description: "Làm mới token thành công, trả về cặp access token và refresh token mới.",
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: "Không có quyền - Refresh token không hợp lệ hoặc đã hết hạn." })
  @Post("refresh")
  async refreshTokens(@Request() req, @Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.login(req.user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Đăng xuất khỏi hệ thống" })
  @ApiResponse({
    status: 204,
    description: "Đăng xuất thành công. Không có nội dung trả về.",
  })
  @ApiResponse({ status: 401, description: "Không có quyền - Token không hợp lệ hoặc đã hết hạn." })
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Request() req) {
    await this.authService.logout(req.user._id);
  }
}
