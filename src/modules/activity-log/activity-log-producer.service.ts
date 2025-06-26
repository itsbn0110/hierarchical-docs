import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { ActivityAction } from 'src/common/enums/projects.enum';
import { ObjectId } from 'mongodb';

export interface LogActivityData {
  userId: ObjectId;
  action: ActivityAction;
  targetId: ObjectId;
  details?: Record<string, any>;
}

@Injectable()
export class ActivityLogProducerService {
  constructor(@InjectQueue('activity-log') private activityLogQueue: Queue) {}

  async logActivity(data: LogActivityData) {
    await this.activityLogQueue.add('log-activity', data, {
      removeOnComplete: true,
      removeOnFail: 1000,
    });
  }
}