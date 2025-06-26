import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TasksProducerService } from './tasks-producer.service';
import { TasksConsumerService } from './tasks-consumer.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'tasks', // Đặt tên cho hàng đợi mới
    }),
    // Cần PermissionsModule để Consumer có thể gọi đến service quyền
    forwardRef(() => PermissionsModule),
  ],
  providers: [TasksProducerService, TasksConsumerService],
  exports: [TasksProducerService],
})
export class TasksModule {}
