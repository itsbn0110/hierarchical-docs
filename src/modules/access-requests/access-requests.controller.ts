import { Controller, Post, Body, Request, Get, Param } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiParam } from "@nestjs/swagger";
import { AccessRequestsService } from "./access-requests.service";
import { CreateAccessRequestDto } from "./dto/create-access-request.dto";
import { AccessRequest } from "./entities/access-request.entity";
import { PendingRequestDto } from "./dto/access-request-response.dto";
import { ProcessedRequestDto } from "./dto/processed-request.response.dto";

@ApiTags("Access Requests")
@ApiBearerAuth()
@Controller("access-requests")
export class AccessRequestsController {
  constructor(private readonly accessRequestsService: AccessRequestsService) {}

  @Post()
  @ApiOperation({ summary: "Tạo một yêu cầu xin quyền truy cập mới" })
  @ApiBody({ type: CreateAccessRequestDto })
  @ApiResponse({ status: 201, description: "Tạo yêu cầu thành công.", type: PendingRequestDto })
  @ApiResponse({ status: 400, description: "Dữ liệu không hợp lệ (ví dụ: thiếu nodeId)." })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 404, description: "Không tìm thấy tài liệu (Node) với ID đã cung cấp." })
  @ApiResponse({
    status: 409,
    description: "Xung đột: Đã có quyền cao hơn hoặc đã có yêu cầu đang chờ xử lý.",
  })
  create(@Body() createAccessRequestDto: CreateAccessRequestDto, @Request() req): Promise<AccessRequest> {
    return this.accessRequestsService.createAccessRequest(createAccessRequestDto, req.user);
  }

  @Get("pending")
  @ApiOperation({ summary: "Lấy các yêu cầu đang chờ xử lý mà người dùng có quyền xem" })
  @ApiResponse({
    status: 200,
    description: "Lấy danh sách yêu cầu đang chờ thành công.",
    type: [PendingRequestDto],
  })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  findPending(@Request() req) {
    return this.accessRequestsService.findPendingRequestsForOwner(req.user);
  }

  @Get("processed")
  @ApiOperation({ summary: "Lấy lịch sử các yêu cầu đã xử lý mà người dùng có quyền xem" })
  @ApiResponse({ status: 200, description: "Lấy lịch sử yêu cầu đã xử lý thành công.", type: [ProcessedRequestDto] })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  findProcessed(@Request() req) {
    return this.accessRequestsService.findProcessedRequestsForOwner(req.user);
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Phê duyệt một yêu cầu truy cập" })
  @ApiParam({ name: "id", description: "ID của yêu cầu truy cập cần phê duyệt", type: String })
  @ApiResponse({ status: 201, description: "Phê duyệt yêu cầu thành công.", type: ProcessedRequestDto })
  @ApiResponse({ status: 400, description: "Yêu cầu này đã được xử lý trước đó." })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền phê duyệt yêu cầu cho tài liệu này." })
  @ApiResponse({ status: 404, description: "Không tìm thấy yêu cầu với ID đã cho." })
  approveRequest(@Param("id") id: string, @Request() req) {
    return this.accessRequestsService.approve(id, req.user);
  }

  @Post(":id/deny")
  @ApiOperation({ summary: "Từ chối một yêu cầu truy cập" })
  @ApiParam({ name: "id", description: "ID của yêu cầu truy cập cần từ chối", type: String })
  @ApiResponse({ status: 201, description: "Từ chối yêu cầu thành công.", type: ProcessedRequestDto })
  @ApiResponse({ status: 400, description: "Yêu cầu này đã được xử lý trước đó." })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @ApiResponse({ status: 403, description: "Không có quyền từ chối yêu cầu cho tài liệu này." })
  @ApiResponse({ status: 404, description: "Không tìm thấy yêu cầu với ID đã cho." })
  denyRequest(@Param("id") id: string, @Request() req) {
    return this.accessRequestsService.deny(id, req.user);
  }
}
