import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { LogActivityData } from './activity-log-producer.service';

@Processor('activity-log')
export class ActivityLogConsumerService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: MongoRepository<ActivityLog>,
  ) {}

  @Process('log-activity')
  async handleLogActivity(job: Job<LogActivityData>) {
    console.log(`[Activity Log Worker] Ghi lại hoạt động: ${job.data.action}`);
    try {
      const logEntry = this.activityLogRepository.create(job.data);
      await this.activityLogRepository.save(logEntry);
      console.log(`[Activity Log Worker] Một Activity mới đã được thêm vào kho hẹ hẹ: ${job.data.action}`);
    } catch (error) {
      console.error(`[Activity Log Worker] Lỗi khi ghi log:`, error);
      throw error;
    }
  }
}