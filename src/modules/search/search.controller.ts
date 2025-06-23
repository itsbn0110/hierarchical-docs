import { Controller, Get, Query, Request, UseGuards, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchResultDto } from './dto/search-result.dto';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') query: string,
    @Request() req,
  ): Promise<SearchResultDto[]> {
    return this.searchService.search(query, req.user);
  }
}