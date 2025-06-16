import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";

@Processor('test-queue')
export class TestQueueProcessor {
  @Process('test-job')
  async handleTestJob( job: Job<any> ) {
    console.log('Received job', job.data);
    return {};
  }
}