import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { TestQueueProcessor } from './test-queue.processor';
import { TestQueueService } from "./test-queue.service";
import { TestQueueController } from './test-queue.controller'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'test-queue'
    }),
  ],
  providers: [ TestQueueProcessor, TestQueueService ],
  controllers: [TestQueueController],
  exports: [TestQueueService],
})

export class TestQueueModule {}

