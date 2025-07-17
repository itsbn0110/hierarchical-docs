import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NodesService } from "./nodes.service";
import { NodesController } from "./nodes.controller";
import { Node } from "./entities/node.entity";
import { PermissionsModule } from "../permissions/permissions.module";
import { ActivityLogModule } from "../activity-log/activity-log.module";
import { UsersModule } from "../users/users.module";
@Module({
  imports: [
    TypeOrmModule.forFeature([Node]),
    forwardRef(() => PermissionsModule),
    forwardRef(() => ActivityLogModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [NodesController],
  providers: [NodesService],
  exports: [NodesService],
})
export class NodesModule {}
