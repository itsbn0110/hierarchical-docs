import {
  Controller,
  Get,
  Query,
  Request,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchResultDto } from './dto/search-result.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  fullSearch(@Query('q') query: string, @Request() req): Promise<SearchResultDto[]> {
    return this.searchService.fullSearch(query, req.user);
  }

  @Get('suggest')
  @UseInterceptors(ClassSerializerInterceptor)
  getSuggestions(@Query('q') query: string, @Request() req): Promise<SearchResultDto[]> {
    return this.searchService.getSuggestions(query, req.user);
  }
}
