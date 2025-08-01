// src/cli.ts
import { NestFactory } from "@nestjs/core";
import { CommandModule, CommandService } from "nestjs-command";
import { AppModule } from "./app.module";

async function bootstrap() {
  // Tạo một ứng dụng "headless" không chạy server
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"], // Chỉ hiện các log cần thiết
  });

  try {
    // Lấy CommandService và thực thi lệnh từ các tham số dòng lệnh
    await app.select(CommandModule).get(CommandService).exec();
    await app.close();
  } catch (error) {
    console.error("Lỗi khi thực thi command:", error);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
