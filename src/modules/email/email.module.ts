import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailProducerService } from './email-producer.service';
import { EmailConsumerService } from './email-consumer.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'email', 
    }),
  ],
  providers: [EmailProducerService, EmailConsumerService],
  exports: [EmailProducerService], 
})
export class EmailModule {}
