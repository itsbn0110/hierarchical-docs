import { Controller, Post, Body, Request, Delete, Param, Get, UseGuards, Query, DefaultValuePipe, ParseIntPipe } from "@nestjs/common";
import { PermissionsService } from "./permissions.service";
import { GrantPermissionDto } from "./dto/grant-permissions.dto";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { PermissionResponseDto } from "./dto/permission.response.dto";
import { ActivityLogResponseDto } from "../activity-log/dto/activity-log.response.dto";
import { InvitePermissionDto } from "./dto/invite-permission.dto";
import { SharedNodeDto } from "./dto/shared.dto";
import { RecentItemDto } from "./dto/recent.response.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "src/common/enums/projects.enum";
import { RolesGuard } from "../auth/guards/roles.guard";

@ApiBearerAuth()
@Controller("permissions")
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get("node/:nodeId")
  @ApiOperation({ summary: "Lấy danh sách người dùng và quyền của họ trên một node" })
  @ApiParam({ name: "nodeId", description: "ID của node cần lấy danh sách quyền" })
  @ApiResponse({ status: 200, description: "Lấy danh sách quyền thành công.", type: [PermissionResponseDto] })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền xem danh sách quyền của node này." })
  async getPermissionsForNode(@Param("nodeId") nodeId: string): Promise<PermissionResponseDto[]> {
    return this.permissionsService.getPermissionsForNode(nodeId);
  }

  @Get("activity/:nodeId")
  @ApiOperation({ summary: "Lấy lịch sử hoạt động cho một node" })
  @ApiParam({ name: "nodeId", description: "ID của node cần lấy lịch sử hoạt động" })
  @ApiResponse({ status: 200, description: "Lấy lịch sử hoạt động thành công.", type: [ActivityLogResponseDto] })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền xem lịch sử hoạt động của node này." })
  async getActivityForNode(@Param("nodeId") nodeId: string): Promise<ActivityLogResponseDto[]> {
    return this.permissionsService.getActivityForNode(nodeId);
  }

  @Get("shared-with-me")
  @ApiOperation({ summary: "Lấy các mục đã được chia sẻ với người dùng hiện tại" })
  @ApiResponse({ status: 200, description: "Danh sách các mục được chia sẻ.", type: [SharedNodeDto] })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  findSharedWithMe(@Request() req): Promise<SharedNodeDto[]> {
    return this.permissionsService.findSharedWithUser(req.user);
  }

  @Get("management")
  @Roles(UserRole.ROOT_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Lấy tất cả các quyền trong hệ thống (chỉ Admin)" })
  @ApiResponse({ status: 200, description: "Danh sách tất cả các quyền trong hệ thống." })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền truy cập (chỉ dành cho Root Admin)." })
  @ApiQuery({ name: "page", required: false, type: Number, description: "Số trang, mặc định là 1" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Số lượng trên mỗi trang, mặc định là 10" })
  @ApiQuery({ name: "search", required: false, type: String, description: "Tìm kiếm theo tên người dùng, email hoặc tên node" })
  findAllPermissions(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("search", new DefaultValuePipe("")) search: string,
  ) {
    return this.permissionsService.findAllPermissions({ page, limit, search });
  }

  @Get("recent")
  @ApiOperation({ summary: "Lấy các mục đã truy cập gần đây" })
  @ApiResponse({ status: 200, description: "Danh sách các mục đã truy cập gần đây.", type: [RecentItemDto] })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  findRecent(@Request() req): Promise<RecentItemDto[]> {
    return this.permissionsService.findRecentForUser(req.user);
  }

  @Post("grant")
  @ApiOperation({ summary: "Cấp hoặc cập nhật quyền cho người dùng trên một node" })
  @ApiBody({ type: GrantPermissionDto })
  @ApiResponse({ status: 200, description: "Cấp/cập nhật quyền thành công.", type: PermissionResponseDto })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({
    status: 403,
    description:
      "Không có quyền thực hiện hành động này (ví dụ: không phải Owner, tự thay đổi quyền của mình, thay đổi quyền của Owner khác).",
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy người dùng hoặc node." })
  grantPermission(@Body() grantPermissionDto: GrantPermissionDto, @Request() req) {
    return this.permissionsService.grant(grantPermissionDto, req.user);
  }

  @Post("invite")
  @ApiOperation({ summary: "Mời một người dùng vào node bằng email" })
  @ApiBody({ type: InvitePermissionDto })
  @ApiResponse({ status: 201, description: "Mời thành công.", type: PermissionResponseDto })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền mời người khác vào node này." })
  @ApiResponse({ status: 404, description: "Người dùng với email này không tồn tại." })
  inviteByEmail(@Body() invitePermissionDto: InvitePermissionDto, @Request() req) {
    return this.permissionsService.inviteByEmail(invitePermissionDto, req.user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Thu hồi quyền truy cập của một người dùng khỏi node" })
  @ApiParam({ name: "id", description: "ID của bản ghi quyền cần thu hồi" })
  @ApiResponse({ status: 204, description: "Thu hồi quyền thành công. Không có nội dung trả về." })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({
    status: 403,
    description: "Không có quyền thu hồi quyền này (ví dụ: không phải Owner, cố gắng thu hồi quyền của Owner khác).",
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy bản ghi quyền với ID đã cho." })
  async revokePermission(@Param("id") id: string, @Request() req) {
    await this.permissionsService.revoke(id, req.user);
    return {
      statusCode: 200,
      message: "Thu hồi quyền thành công.",
    };
  }
}
