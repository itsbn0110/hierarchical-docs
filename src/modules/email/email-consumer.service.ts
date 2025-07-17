import { Processor, Process, OnQueueActive, OnQueueError, OnQueueCompleted } from "@nestjs/bull";
import { Job } from "bullmq";
import * as nodemailer from "nodemailer";
import { ConfigService } from "@nestjs/config";
import { NewAccessRequestJobData, PermissionGrantedJobData, RequestProcessedJobData, WelcomeEmailJobData } from "./email-producer.service";

@Processor("email")
export class EmailConsumerService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>("EMAIL_HOST"),
      port: this.configService.get<number>("EMAIL_PORT"),
      secure: this.configService.get<string>("EMAIL_SECURE") === "true",
      auth: {
        user: this.configService.get<string>("EMAIL_USER"),
        pass: this.configService.get<string>("EMAIL_PASSWORD"),
      },
    });
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(`[Email Worker] Đang xử lý job ${job.id} của loại ${job.name}...`);
  }

  @OnQueueError()
  onError(error: Error) {
    console.error("[Email Worker] Gặp lỗi với hàng đợi email:", error);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: unknown) {
    console.log(`[Email Worker] Hoàn thành job ${job.id}. Kết quả:`, result);
  }

  @Process("new-access-request")
  async handleNewAccessRequestEmail(job: Job<NewAccessRequestJobData>) {
    const { ownerEmail, requesterName, nodeName, loginUrl } = job.data;

    console.log(`[Email Worker] Đang gửi email thực tế tới ${ownerEmail}...`);

    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>("EMAIL_FROM"),
        to: ownerEmail,
        subject: `[Yêu cầu mới] Xin quyền truy cập vào: ${nodeName}`,
        // Sử dụng HTML để tạo một cái nút có thể click được
        html: `<p>Xin chào,</p>
               <p>Người dùng <b>${requesterName}</b> vừa gửi một yêu cầu xin quyền truy cập vào mục <b>${nodeName}</b> của bạn.</p>
               <p>Vui lòng đăng nhập vào hệ thống để xem xét và xử lý.</p>
               <br/>
               <a href="${loginUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Đến trang đăng nhập</a>
               <br/>
               <p>Trân trọng,<br/>Hệ thống Quản lý Tài liệu</p>`,
      });

      return { messageId: info.messageId };
    } catch (error) {
      console.error(`[Email Worker] Gửi email thất bại cho ${ownerEmail}:`, error);
      throw error;
    }
  }

  @Process("request-processed")
  async handleRequestProcessedEmail(job: Job<RequestProcessedJobData>) {
    console.log(`[Email Worker] Bắt đầu xử lý job thông báo kết quả:`, job.id);
    const { requesterEmail, nodeName, status, loginUrl } = job.data;

    const isApproved = status === "APPROVED";
    const subject = `Yêu cầu truy cập của bạn đã được ${isApproved ? "phê duyệt" : "từ chối"}`;
    const htmlContent = `
      <p>Xin chào,</p>
      <p>Yêu cầu truy cập của bạn cho mục <b>${nodeName}</b> đã được <b>${isApproved ? "PHÊ DUYỆT" : "TỪ CHỐI"}</b>.</p>
      ${
        isApproved
          ? `<p>Bây giờ bạn có thể truy cập vào tài nguyên này.</p>
      <br/>
      <a href="${loginUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Truy cập ngay
      </a>`
          : ""
      }
      <br/>
      <p>Trân trọng,<br/>Hệ thống Quản lý Tài liệu</p>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>("EMAIL_FROM"),
        to: requesterEmail,
        subject: subject,
        html: htmlContent,
      });
      console.log(`[Email Worker] ĐÃ GỬI XONG email thông báo kết quả cho: ${requesterEmail}`);
      return { messageId: info.messageId };
    } catch (error) {
      console.error(`[Email Worker] Gửi email thất bại cho ${requesterEmail}:`, error);
      throw error;
    }
  }

  /**
   * Xử lý job gửi email thông báo khi người dùng được cấp quyền trực tiếp.
   */
  @Process("permission-granted")
  async handlePermissionGrantedEmail(job: Job<PermissionGrantedJobData>) {
    console.log(`[Email Worker] Bắt đầu xử lý job thông báo cấp quyền:`, job.id);
    const { targetUserEmail, granterName, nodeName, permissionLevel, loginUrl } = job.data;

    const subject = `Bạn đã được cấp quyền mới cho: ${nodeName}`;
    const htmlContent = `
      <p>Xin chào,</p>
      <p>Bạn vừa được người dùng <b>${granterName}</b> cấp quyền <b>${permissionLevel}</b> cho mục <b>${nodeName}</b>.</p>
      <p>Bạn có thể truy cập vào hệ thống để xem ngay bây giờ.</p>
      <br/>
      <a href="${loginUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Đến trang đăng nhập</a>
      <br/>
      <p>Trân trọng,<br/>Hệ thống Quản lý Tài liệu</p>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>("EMAIL_FROM"),
        to: targetUserEmail,
        subject: subject,
        html: htmlContent,
      });
      console.log(`[Email Worker] ĐÃ GỬI XONG email thông báo cấp quyền cho: ${targetUserEmail}`);
      return { messageId: info.messageId };
    } catch (error) {
      console.error(`[Email Worker] Gửi email thất bại cho ${targetUserEmail}:`, error);
      throw error;
    }
  }

  @Process("welcome-email")
  async handleWelcomeEmail(job: Job<WelcomeEmailJobData>) {
    const { to, username, temporaryPassword, loginUrl } = job.data;
    const subject = "Chào mừng bạn đến với Hệ thống Quản lý Tài liệu";
    const htmlContent = `
          <p>Xin chào ${username},</p>
          <p>Một tài khoản đã được tạo cho bạn trên hệ thống của chúng tôi.</p>
          <p>Vui lòng sử dụng thông tin dưới đây để đăng nhập lần đầu:</p>
          <ul>
              <li>Email: <b>${to}</b></li>
              <li>Mật khẩu tạm thời: <b>${temporaryPassword}</b></li>
          </ul>
          <p>Bạn sẽ được yêu cầu đổi mật khẩu ngay sau khi đăng nhập.</p>
          <a href="${loginUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Đăng nhập ngay</a>
      `;
    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>("EMAIL_FROM"),
        to: to,
        subject: subject,
        html: htmlContent,
      });
      console.log(`[Email Worker] ĐÃ GỬI XONG email chào mừng user mới cho: ${to}`);
      return { messageId: info.messageId };
    } catch (error) {
      console.error(`[Email Worker] Gửi email thất bại cho ${to}:`, error);
      throw error;
    }
  }
}
