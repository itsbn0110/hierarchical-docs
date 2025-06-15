import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Test } from '../../entities/test.entity';
import { TestService } from './test.service';
import { TestController } from './test.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Test])],
  providers: [TestService],
  controllers: [TestController],
})
export class TestModule {}
