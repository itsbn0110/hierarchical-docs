import { Command, Positional } from "nestjs-command";
import { Injectable } from "@nestjs/common";
import { SeedingService } from "./seeding.service";

@Injectable()
export class SeedingCommand {
  constructor(private readonly seedingService: SeedingService) {}

  @Command({
    command: "seed:deep-chain",
    describe: "Tạo một chuỗi node lồng nhau để test cây sâu",
  })
  async create(
    @Positional({
      name: "depth",
      describe: "Độ sâu của chuỗi (số lượng node lồng nhau)",
      type: "number",
      default: 100,
    })
    depth: number,
  ) {
    await this.seedingService.seedDeepChain(depth);
  }
}
