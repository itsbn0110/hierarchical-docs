import { Controller, Get, Query, Request, UseInterceptors, ClassSerializerInterceptor } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SearchResultDto } from "./dto/search-result.dto";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Search - Tìm kiếm")
@ApiBearerAuth()
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: "Thực hiện tìm kiếm toàn văn (full-text search)" })
  @ApiQuery({ name: "q", description: "Nội dung tìm kiếm", required: true, type: String })
  @ApiResponse({ status: 200, description: "Trả về danh sách kết quả tìm kiếm.", type: [SearchResultDto] })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @UseInterceptors(ClassSerializerInterceptor)
  fullSearch(@Query("q") query: string, @Request() req): Promise<SearchResultDto[]> {
    return this.searchService.fullSearch(query, req.user);
  }

  @Get("suggest")
  @ApiOperation({ summary: "Lấy gợi ý tìm kiếm nhanh (live search)" })
  @ApiQuery({ name: "q", description: "Nội dung đang gõ để tìm gợi ý", required: true, type: String })
  @ApiResponse({ status: 200, description: "Trả về danh sách các gợi ý (tối đa 10).", type: [SearchResultDto] })
  @ApiResponse({ status: 401, description: "Chưa xác thực hoặc token không hợp lệ." })
  @UseInterceptors(ClassSerializerInterceptor)
  getSuggestions(@Query("q") query: string, @Request() req): Promise<SearchResultDto[]> {
    return this.searchService.getSuggestions(query, req.user);
  }
}
