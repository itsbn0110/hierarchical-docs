import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

@Injectable()
export class TestQueueService {
  constructor (@InjectQueue('test-queue') private readonly queue: Queue ) {}

  async addTestJob(data: any) {
    await this.queue.add('test-job',data)
  }
}