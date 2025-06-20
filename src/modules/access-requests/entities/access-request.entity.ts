// src/access-requests/entities/access-request.entity.ts

import { Entity, ObjectIdColumn, Column, CreateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';
import { PermissionLevel, RequestStatus } from 'src/common/enums/projects.enum';

@Entity({ name: 'access_requests' })
export class AccessRequest {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  requesterId: ObjectId;

  @Column()
  nodeId: ObjectId;

  @Column({
    type: 'enum',
    enum: [PermissionLevel.VIEWER, PermissionLevel.EDITOR],
  })
  requestedPermission: PermissionLevel;

  @Column({ default: false })
  isRecursive: boolean;

  @Column({ nullable: true })
  message?: string;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @Column({ nullable: true })
  reviewerId?: ObjectId;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}