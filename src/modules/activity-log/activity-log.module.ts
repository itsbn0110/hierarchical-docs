import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { ActivityLogProducerService } from './activity-log-producer.service';
import { ActivityLogConsumerService } from './activity-log-consumer.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([ActivityLog]),
    BullModule.registerQueue({
      name: 'activity-log',
    }),
  ],
  providers: [ActivityLogProducerService, ActivityLogConsumerService],
  exports: [ActivityLogProducerService],
})
export class ActivityLogModule {}