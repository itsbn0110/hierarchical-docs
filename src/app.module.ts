import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { TestModule } from './modules/tests/test.module';
import { DatabaseLoggerService } from './common/database-logger.service';
import { BullModule } from '@nestjs/bull';
import { bullConfig } from './config/queue.config';
import { TestQueueModule } from './queue/test-queue/test-queue.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:true,
      envFilePath: '.env'
    }),
    TypeOrmModule.forRootAsync ({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "mongodb",
        url: config.get<string>('MONGODB_URI'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
        database: config.get<string>('MONGODB_DBNAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true
      })
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConfig
    }),
    UsersModule,
    AuthModule,
    TestModule,
    TestQueueModule
  ],

  providers: [
    DatabaseLoggerService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter
    },
  ],
})
export class AppModule {}
