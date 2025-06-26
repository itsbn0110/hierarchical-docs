import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bullmq';
import { PermissionsService } from '../permissions/permissions.service';
import { RecursivePermissionJobData } from './tasks-producer.service';

@Processor('tasks')
export class TasksConsumerService {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Process('process-recursive-permission')
  async handleRecursivePermission(job: Job<RecursivePermissionJobData>) {
    console.log(`[Tasks Worker] Bắt đầu xử lý job cấp quyền đệ quy:`, job.id);
    const { parentNodeId, targetUserId, permission, granterId } = job.data;

    try {
      // Gọi lại đúng hàm grantRecursive mà chúng ta đã viết
      await this.permissionsService.grantRecursive(
        parentNodeId,
        targetUserId,
        permission,
        granterId,
      );
      console.log(`[Tasks Worker] ĐÃ XỬ LÝ XONG job cấp quyền đệ quy:`, job.id);
    } catch (error) {
      console.error(`[Tasks Worker] Xử lý job ${job.id} thất bại:`, error);
      throw error; // Ném lỗi để BullMQ biết và thử lại
    }
  }
}