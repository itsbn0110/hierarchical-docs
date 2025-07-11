import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksProducerService } from './tasks-producer.service';
import { TasksConsumerService } from './tasks-consumer.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { TasksService } from './tasks.service';
import { AccessRequest } from '../access-requests/entities/access-request.entity';

@Module({
  imports: [
    // Cấu hình cho hàng đợi (BullMQ) để xử lý các job nền
    BullModule.registerQueue({
      name: 'tasks',
    }),
    // Cung cấp AccessRequestRepository cho TasksService (dùng cho cronjob)
    TypeOrmModule.forFeature([AccessRequest]),
    // Cần PermissionsModule để Consumer có thể gọi đến service quyền
    forwardRef(() => PermissionsModule),
  ],
  providers: [TasksProducerService, TasksConsumerService, TasksService],
  exports: [TasksProducerService, TasksService],
})
export class TasksModule {}
