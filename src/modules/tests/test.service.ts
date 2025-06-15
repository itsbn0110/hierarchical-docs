import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Test } from '../../entities/test.entity';

@Injectable()
export class TestService {
  constructor(
    @InjectRepository(Test)
    private readonly testRepository: Repository<Test>,
  ) {}

  async create(name: string): Promise<Test> {
    const test = this.testRepository.create({ name });
    return this.testRepository.save(test);
  }

  async findAll(): Promise<Test[]> {
    return this.testRepository.find();
  }
}
