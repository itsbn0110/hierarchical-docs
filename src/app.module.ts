import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { TestModule } from './modules/tests/test.module';
import { DatabaseLoggerService } from './common/database-logger.service';
import { BullModule } from '@nestjs/bull';
import { bullConfig } from './config/queue.config';
import { TestQueueModule } from './queue/test-queue/test-queue.module';


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
    TestModule,
    TestQueueModule
  ],

  controllers: [AppController],
  providers: [AppService, DatabaseLoggerService],
})
export class AppModule {}
