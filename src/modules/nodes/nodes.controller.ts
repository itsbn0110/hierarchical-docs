import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Query,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { NodesService } from "./nodes.service";
import { CreateNodeDto } from "./dto/create-node.dto";
import { Node } from "./entities/node.entity";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery, ApiBody } from "@nestjs/swagger";
import { TreeNodeDto } from "./dto/tree-node.dto";
import { UpdateNodeNameDto } from "./dto/update-node-name.dto";
import { UpdateNodeContentDto } from "./dto/update-node-content.dto";
import { MoveNodeDto } from "./dto/move-node.dto";
import { NodeDetailsDto } from "./dto/node-details-dto";
import { TrashedItemDto } from "./dto/trashed-item.dto";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "src/common/enums/projects.enum";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("Nodes - Quản lý Tài liệu & Thư mục")
@ApiBearerAuth()
@Controller("nodes")
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Get()
  @ApiOperation({ summary: "Lấy các node con để hiển thị cây thư mục (lazy-loading)" })
  @ApiQuery({
    name: "parentId",
    required: false,
    description: "ID của thư mục cha. Để trống để lấy các node ở cấp gốc.",
  })
  @ApiResponse({ status: 200, description: "Danh sách các node con.", type: [TreeNodeDto] })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền xem thư mục cha." })
  getTree(@Query("parentId") parentId: string | null = null, @Req() req): Promise<TreeNodeDto[]> {
    return this.nodesService.getTreeForUser(parentId, req.user);
  }

  @Get("trash")
  @ApiOperation({ summary: "Lấy các mục trong thùng rác của người dùng" })
  @ApiResponse({ status: 200, description: "Danh sách các mục trong thùng rác.", type: [TrashedItemDto] })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  findTrash(@Req() req): Promise<TrashedItemDto[]> {
    return this.nodesService.findTrashedNodes(req.user);
  }

  @Get("admin/trash")
  @UseGuards(RolesGuard) // <-- SỬ DỤNG GUARD ĐỂ BẢO VỆ
  @Roles(UserRole.ROOT_ADMIN) // <-- CHỈ CHO PHÉP ROOT_ADMIN
  @ApiOperation({ summary: "Lấy TẤT CẢ các mục trong thùng rác (dành cho Admin)" })
  @ApiResponse({ status: 200, description: "Danh sách tất cả các mục trong thùng rác.", type: [TrashedItemDto] })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền truy cập. Yêu cầu quyền RootAdmin." })
  findAllTrashForAdmin(): Promise<TrashedItemDto[]> {
    return this.nodesService.findAllTrashedNodesForAdmin();
  }

  @Get(":id")
  @ApiOperation({ summary: "Lấy thông tin chi tiết của một node (dùng cho breadcrumb và xem file)" })
  @ApiParam({ name: "id", description: "ID của node cần lấy chi tiết" })
  @ApiResponse({ status: 200, description: "Thông tin chi tiết của node.", type: NodeDetailsDto })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền xem tài liệu này." })
  @ApiResponse({ status: 404, description: "Không tìm thấy tài liệu với ID đã cung cấp." })
  getNodeDetails(@Param("id") id: string, @Req() req): Promise<NodeDetailsDto> {
    return this.nodesService.getNodeDetails(id, req.user);
  }

  @Post()
  @ApiOperation({ summary: "Tạo một node mới (thư mục hoặc file)" })
  @ApiBody({ type: CreateNodeDto })
  @ApiResponse({ status: 201, description: "Node đã được tạo thành công.", type: Node })
  @ApiResponse({ status: 400, description: "Loại tài liệu không hợp lệ (ví dụ: tạo con trong một file)." })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền tạo trong thư mục này." })
  @ApiResponse({ status: 404, description: "Không tìm thấy thư mục cha." })
  async create(@Body() createNodeDto: CreateNodeDto, @Req() req: any): Promise<Node> {
    return this.nodesService.create(createNodeDto, req.user);
  }

  @Post(":id/restore")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Khôi phục một mục từ thùng rác" })
  @ApiParam({ name: "id", description: "ID của node cần khôi phục" })
  @ApiResponse({ status: 200, description: "Khôi phục thành công.", type: Node })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền khôi phục mục này (chỉ Owner)." })
  @ApiResponse({ status: 404, description: "Mục không tồn tại hoặc không có trong thùng rác." })
  restore(@Param("id") id: string, @Req() req): Promise<Node> {
    return this.nodesService.restore(id, req.user);
  }

  @Patch(":id/name")
  @ApiOperation({ summary: "Đổi tên một node" })
  @ApiParam({ name: "id", description: "ID của node cần đổi tên" })
  @ApiBody({ type: UpdateNodeNameDto })
  @ApiResponse({ status: 200, description: "Node đã được đổi tên thành công.", type: Node })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền sửa (cần quyền Editor)." })
  @ApiResponse({ status: 404, description: "Không tìm thấy node." })
  updateName(@Param("id") id: string, @Body() updateNodeNameDto: UpdateNodeNameDto, @Req() req): Promise<Node> {
    return this.nodesService.updateName(id, updateNodeNameDto, req.user);
  }

  @Patch(":id/content")
  @ApiOperation({ summary: "Cập nhật nội dung của một file" })
  @ApiParam({ name: "id", description: "ID của file cần cập nhật nội dung" })
  @ApiBody({ type: UpdateNodeContentDto })
  @ApiResponse({ status: 200, description: "Nội dung file đã được cập nhật.", type: Node })
  @ApiResponse({ status: 400, description: "Không thể cập nhật nội dung cho thư mục." })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền sửa (cần quyền Editor)." })
  @ApiResponse({ status: 404, description: "Không tìm thấy file." })
  updateContent(
    @Param("id") id: string,
    @Body() updateNodeContentDto: UpdateNodeContentDto,
    @Req() req,
  ): Promise<Node> {
    return this.nodesService.updateContent(id, updateNodeContentDto, req.user);
  }

  @Patch(":id/move")
  @ApiOperation({ summary: "Di chuyển một node đến vị trí mới" })
  @ApiParam({ name: "id", description: "ID của node cần di chuyển" })
  @ApiBody({ type: MoveNodeDto })
  @ApiResponse({ status: 200, description: "Node đã được di chuyển thành công.", type: Node })
  @ApiResponse({ status: 400, description: "Không thể di chuyển thư mục vào chính nó hoặc con của nó." })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({
    status: 403,
    description: "Không có quyền di chuyển (cần quyền Owner trên node) hoặc không có quyền sửa ở thư mục đích.",
  })
  @ApiResponse({ status: 404, description: "Không tìm thấy node cần di chuyển hoặc thư mục đích." })
  moveNode(@Param("id") id: string, @Body() moveNodeDto: MoveNodeDto, @Req() req): Promise<Node> {
    return this.nodesService.move(id, moveNodeDto, req.user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Di chuyển một node vào thùng rác (Soft Delete)" })
  @ApiParam({ name: "id", description: "ID của node cần chuyển vào thùng rác" })
  @ApiResponse({
    status: 200,
    description: "Di chuyển vào thùng rác thành công. Trả về số lượng mục bị ảnh hưởng.",
    schema: { example: { deletedCount: 5 } },
  })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền xóa (chỉ Owner)." })
  @ApiResponse({ status: 404, description: "Không tìm thấy node." })
  softDelete(@Param("id") id: string, @Req() req): Promise<{ deletedCount: number }> {
    return this.nodesService.softDelete(id, req.user);
  }

  @Delete(":id/permanently")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Xóa vĩnh viễn một mục khỏi thùng rác" })
  @ApiParam({ name: "id", description: "ID của node cần xóa vĩnh viễn" })
  @ApiResponse({
    status: 200,
    description: "Xóa vĩnh viễn thành công. Trả về số lượng mục bị ảnh hưởng.",
    schema: { example: { deletedCount: 5 } },
  })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền xóa vĩnh viễn (chỉ Owner)." })
  @ApiResponse({ status: 404, description: "Không tìm thấy node." })
  deletePermanently(@Param("id") id: string, @Req() req): Promise<{ deletedCount: number }> {
    return this.nodesService.deletePermanently(id, req.user);
  }
}
