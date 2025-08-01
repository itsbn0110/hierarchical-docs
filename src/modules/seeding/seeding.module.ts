// src/seeding/seeding.module.ts
import { Module } from "@nestjs/common";
import { SeedingService } from "./seeding.service";
import { UsersModule } from "../users/users.module";
import { NodesModule } from "../nodes/nodes.module";
import { PermissionsModule } from "../permissions/permissions.module";

@Module({
  imports: [UsersModule, NodesModule, PermissionsModule], // Import các module cần thiết
  providers: [SeedingService],
  exports: [SeedingService],
})
export class SeedingModule {}
