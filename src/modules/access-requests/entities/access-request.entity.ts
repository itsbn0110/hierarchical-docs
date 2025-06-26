// src/access-requests/entities/access-request.entity.ts

import { Entity, ObjectIdColumn, Column, CreateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';
import { PermissionLevel, RequestStatus } from 'src/common/enums/projects.enum';
import { Exclude, Expose, Transform } from 'class-transformer';
import { transformObjectId } from 'src/common/helpers/transform.helpers';

@Exclude()
@Entity({ name: 'access_requests' })
export class AccessRequest {
  @ObjectIdColumn()
  @Expose()
  @Transform(transformObjectId)
    _id: ObjectId;

  @Expose()
  @Column()
  @Transform(transformObjectId)
    requesterId: ObjectId;

  @Expose()
  @Column()
  @Transform(transformObjectId)
    nodeId: ObjectId;

  @Expose()
  @Column({
    type: 'enum',
    enum: [PermissionLevel.VIEWER, PermissionLevel.EDITOR],
  })
    requestedPermission: PermissionLevel;

  @Expose()
  @Column({ default: false })
    isRecursive: boolean;

  @Expose()
  @Column({ nullable: true })
    message?: string;

  @Expose()
  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
    status: RequestStatus;

  @Expose()
  @Column({ nullable: true })
  @Transform(transformObjectId)
    reviewerId?: ObjectId;

  @Expose()
  @Column({ type: 'timestamp', nullable: true })
    reviewedAt?: Date;

  @Expose()
  @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;
}
