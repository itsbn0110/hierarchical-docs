import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bullmq";
import { PermissionLevel } from "src/common/enums/projects.enum";

export interface NewAccessRequestJobData {
  ownerEmail: string;
  requesterName: string;
  nodeName: string;
  loginUrl: string;
}

export interface RequestProcessedJobData {
  requesterEmail: string;
  nodeName: string;
  status: "APPROVED" | "DENIED";
  loginUrl: string;
}

export interface PermissionGrantedJobData {
  targetUserEmail: string;
  granterName: string;
  nodeName: string;
  permissionLevel: PermissionLevel;
  loginUrl: string;
}

export interface WelcomeEmailJobData {
  to: string;
  username: string;
  temporaryPassword: string;
  loginUrl: string;
}

@Injectable()
export class EmailProducerService {
  constructor(@InjectQueue("email") private emailQueue: Queue) {}

  async sendNewAccessRequestEmail(data: NewAccessRequestJobData) {
    await this.emailQueue.add("new-access-request", data, {
      removeOnComplete: true,
      removeOnFail: true,
    });
    console.log(`Đã thêm job gửi email cho ${data.ownerEmail} vào hàng đợi.`);
  }

  async sendRequestProcessedEmail(data: RequestProcessedJobData) {
    await this.emailQueue.add("request-processed", data, {
      removeOnComplete: true,
      removeOnFail: true,
    });
    console.log(`Đã thêm job thông báo kết quả cho ${data.requesterEmail} vào hàng đợi.`);
  }

  async sendPermissionGrantedEmail(data: PermissionGrantedJobData) {
    await this.emailQueue.add("permission-granted", data, {
      removeOnComplete: true,
      removeOnFail: true,
    });
    console.log(`Đã thêm job thông báo cấp quyền cho ${data.targetUserEmail} vào hàng đợi.`);
  }

  async sendWelcomeEmail(data: WelcomeEmailJobData) {
    await this.emailQueue.add("welcome-email", data, { removeOnComplete: true });
  }
}
