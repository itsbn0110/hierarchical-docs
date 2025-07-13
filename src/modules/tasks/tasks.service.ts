import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { AccessRequest } from '../access-requests/entities/access-request.entity';
import { RequestStatus } from 'src/common/enums/projects.enum';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(AccessRequest)
    private readonly accessRequestRepository: MongoRepository<AccessRequest>,
  ) {}

  /**
   * Cronjob này sẽ tự động chạy vào lúc 2 giờ sáng mỗi ngày.
   * Nó sẽ tìm và xóa các yêu cầu đã được xử lý (APPROVED/DENIED)
   * và cũ hơn 30 ngày.
   */
  @Cron(CronExpression.EVERY_DAY_AT_11AM)
  async handleCron() {
    this.logger.log('Bắt đầu tác vụ dọn dẹp các yêu cầu truy cập cũ...');
    // 1. Tính toán ngày giới hạn (30 ngày trước)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // 2. Tìm và xóa các bản ghi cũ
      const deleteResult = await this.accessRequestRepository.deleteMany({
        status: { $in: [RequestStatus.APPROVED, RequestStatus.DENIED] },
        reviewedAt: { $lt: thirtyDaysAgo }, // Sử dụng toán tử $lt của MongoDB
      });

      if (deleteResult.deletedCount > 0) {
        this.logger.log(`Đã dọn dẹp thành công ${deleteResult.deletedCount} yêu cầu cũ.`);
      } else {
        this.logger.log('Không có yêu cầu cũ nào cần dọn dẹp.');
      }
    } catch (error) {
      this.logger.error('Đã xảy ra lỗi trong quá trình dọn dẹp yêu cầu cũ:', error.stack);
    }
  }
}
