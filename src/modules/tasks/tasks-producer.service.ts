import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { ObjectId } from 'mongodb';
import { PermissionLevel } from 'src/common/enums/projects.enum';

export interface RecursivePermissionJobData {
  parentNodeId: ObjectId;
  targetUserId: ObjectId;
  permission: PermissionLevel;
  granterId: ObjectId;
}

@Injectable()
export class TasksProducerService {
  constructor(@InjectQueue('tasks') private tasksQueue: Queue) {}

  async addRecursivePermissionJob(data: RecursivePermissionJobData) {
    await this.tasksQueue.add('process-recursive-permission', data, {
      removeOnComplete: true,
      removeOnFail: {
        count: 5, // Giữ lại 5 job lỗi gần nhất để debug
      },
      attempts: 3, // Tự động thử lại 3 lần nếu thất bại
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s, 10s, 20s
      },
    });

    console.log('check data', data);
    console.log(`Đã thêm job xử lý quyền đệ quy vào hàng đợi 'tasks'.`);
  }
}
