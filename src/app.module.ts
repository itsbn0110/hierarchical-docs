import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { TestModule } from './modules/tests/test.module';
import { DatabaseLoggerService } from './common/database-logger.service';



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
    UsersModule,
    TestModule
  ],

  controllers: [AppController],
  providers: [AppService, DatabaseLoggerService],
})
export class AppModule {}
