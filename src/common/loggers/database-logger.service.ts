import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseLoggerService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseLoggerService.name);

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit() {
    if (this.dataSource.isInitialized) {
      this.logger.log('Database connection established successfully!');
    } else {
      this.logger.error('Database connection failed to initialize.');
    }
  }
}
