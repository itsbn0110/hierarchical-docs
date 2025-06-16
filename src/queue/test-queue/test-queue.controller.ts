import { Controller, Post, Body } from '@nestjs/common';
import { TestQueueService } from './test-queue.service';


@Controller('test-queue')
export class TestQueueController {
  constructor ( private readonly testQueueService: TestQueueService ) {}
  
  @Post('add')
  async addJob (@Body() body: any) {
    await this.testQueueService.addTestJob(body);
    return { message: 'Job added to queue' };
  }
}