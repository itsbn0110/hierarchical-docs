import { Controller, Get, Post, Body } from '@nestjs/common';
import { TestService } from './test.service';

@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post()
  async create(@Body('name') name: string) {
    return this.testService.create(name);
  }

  @Get()
  async findAll() {
    return this.testService.findAll();
  }
}
