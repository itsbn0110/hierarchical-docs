import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { APP_FILTER } from "@nestjs/core";

// --- BƯỚC 1: IMPORT TƯỜNG MINH TẤT CẢ CÁC ENTITY ---
import { User } from "./modules/users/entities/user.entity";
import { Node } from "./modules/nodes/entities/node.entity";
import { Permission } from "./modules/permissions/entities/permission.entity";
import { AccessRequest } from "./modules/access-requests/entities/access-request.entity";
import { ActivityLog } from "./modules/activity-log/entities/activity-log.entity";
// ----------------------------------------------------

import { UsersModule } from "./modules/users/users.module";
import { AuthModule } from "./modules/auth/auth.module";
import { NodesModule } from "./modules/nodes/nodes.module";
import { PermissionsModule } from "./modules/permissions/permissions.module";
import { AccessRequestsModule } from "./modules/access-requests/access-requests.module";
import { bullConfig } from "./config/queue.config";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { SearchModule } from "./modules/search/search.module";
import { ActivityLogModule } from "./modules/activity-log/activity-log.module";
import { ScheduleModule } from "@nestjs/schedule";
import { TasksModule } from "./modules/tasks/tasks.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "mongodb",
        url: config.get<string>("MONGODB_URI"),
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
        database: config.get<string>("MONGODB_DBNAME"),
        entities: [User, Node, Permission, AccessRequest, ActivityLog],
        // -----------------------------------------------------------

        synchronize: true, // Chỉ nên dùng trong môi trường dev
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConfig,
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    AuthModule,
    NodesModule,
    PermissionsModule,
    AccessRequestsModule,
    SearchModule,
    ActivityLogModule,
    TasksModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
