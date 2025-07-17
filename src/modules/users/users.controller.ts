import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, HttpCode, HttpStatus } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "src/common/enums/projects.enum";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { IsChangePasswordRoute } from "../auth/decorators/change-password.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UserResponseDto } from "./dto/user-response.dto";

@Controller("users")
@ApiBearerAuth()
@ApiTags("Users - Quản lý Người dùng")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ROOT_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Root Admin tạo mới người dùng" })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: "Tạo người dùng thành công.", type: UserResponseDto })
  @ApiResponse({ status: 400, description: "Email hoặc username đã tồn tại." })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền thực hiện hành động này." })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ROOT_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Root Admin xem danh sách người dùng" })
  @ApiResponse({ status: 200, description: "Danh sách tất cả người dùng.", type: [UserResponseDto] })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền thực hiện hành động này." })
  findAll() {
    return this.usersService.findAllUsers();
  }

  @Get(":id")
  @Roles(UserRole.ROOT_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Root Admin xem chi tiết người dùng" })
  @ApiParam({ name: "id", description: "ID của người dùng cần xem" })
  @ApiResponse({ status: 200, description: "Thông tin chi tiết người dùng.", type: UserResponseDto })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền thực hiện hành động này." })
  @ApiResponse({ status: 404, description: "Không tìm thấy người dùng." })
  findOne(@Param("id") id: string) {
    return this.usersService.findUserById(id);
  }

  @Patch(":id")
  @Roles(UserRole.ROOT_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Root Admin cập nhật thông tin người dùng" })
  @ApiParam({ name: "id", description: "ID của người dùng cần cập nhật" })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: "Cập nhật người dùng thành công.", type: UserResponseDto })
  @ApiResponse({ status: 400, description: "Username đã tồn tại." })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền thực hiện hành động này." })
  @ApiResponse({ status: 404, description: "Không tìm thấy người dùng." })
  async updateUser(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.updateProfile(id, updateUserDto);
  }

  @Patch(":id/status")
  @Roles(UserRole.ROOT_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Cập nhật trạng thái hoạt động của người dùng" })
  @ApiParam({ name: "id", description: "ID của người dùng cần cập nhật trạng thái" })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiResponse({ status: 200, description: "Cập nhật trạng thái thành công.", type: UserResponseDto })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền thực hiện hành động này." })
  @ApiResponse({ status: 404, description: "Không tìm thấy người dùng." })
  updateStatus(@Param("id") id: string, @Body() updateUserStatusDto: UpdateUserStatusDto): Promise<UserResponseDto> {
    return this.usersService.updateStatus(id, updateUserStatusDto.isActive);
  }

  @Patch("/me/password")
  @IsChangePasswordRoute() // Custom decorator
  @ApiOperation({ summary: "Người dùng tự thay đổi mật khẩu" })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: "Đổi mật khẩu thành công." })
  @ApiResponse({ status: 401, description: "Mật khẩu cũ không đúng." })
  @ApiResponse({ status: 404, description: "Không tìm thấy người dùng (lỗi token)." })
  changeMyPassword(@Req() req, @Body() changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    return this.usersService.changePassword(req.user._id, changePasswordDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ROOT_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Root Admin xóa người dùng" })
  @ApiParam({ name: "id", description: "ID của người dùng cần xóa" })
  @ApiResponse({ status: 204, description: "Xóa người dùng thành công." })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền xóa người dùng này (ví dụ: tự xóa chính mình)." })
  @ApiResponse({ status: 404, description: "Không tìm thấy người dùng." })
  remove(@Param("id") id: string, @Req() req) {
    return this.usersService.remove(id, req.user);
  }
}
