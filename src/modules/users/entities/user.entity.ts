// src/users/entities/user.entity.ts

import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ObjectId } from 'mongodb';
import { UserRole } from 'src/common/enums/projects.enum';
import { Exclude, Expose, Transform } from 'class-transformer';
import { transformObjectId } from 'src/common/helpers/transform.helpers';

@Exclude()
@Entity('users')
export class User {
  @Expose()
  @Transform(transformObjectId)
  @ObjectIdColumn()
  _id: ObjectId;

  @Expose()
  @Column()
  @Index({ unique: true })
  email: string;
  
  @Expose()
  @Column()
  username: string;
  
  @Column()
  hashPassword: string;
  
  @Expose()
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;
  
  @Expose()
  @Column({ default: true })
  isActive: boolean;
  
  @Expose()
  @Column({ default: true })
  mustChangePassword: boolean;

  @Expose()
  @CreateDateColumn()
  createdAt: Date;

  @Expose()
  @UpdateDateColumn()
  updatedAt: Date;
}