import { Entity, ObjectIdColumn, Column, CreateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';
// Định nghĩa các hành động có thể được ghi lại
import { ActivityAction } from 'src/common/enums/projects.enum';
import { Expose, Exclude } from 'class-transformer';

@Exclude()
@Entity({ name: 'activity_logs' })
export class ActivityLog {
  @ObjectIdColumn()
  @Expose()
  _id: ObjectId;

  @Expose()
  @Column()
  userId: ObjectId;

  @Expose()
  @Column({ type: 'enum', enum: ActivityAction })
  action: ActivityAction;

  @Expose()
  @Column()
  targetId: ObjectId;

  @Expose()
  @Column()
  details: Record<string, any>;

  @Expose()
  @CreateDateColumn({ type: 'timestamp' })
  timestamp: Date;
}
