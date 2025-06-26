import { Entity, ObjectIdColumn, Column, CreateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';
// Định nghĩa các hành động có thể được ghi lại
import { ActivityAction } from 'src/common/enums/projects.enum';
import { Expose,Exclude } from 'class-transformer';

@Exclude()
@Entity({ name: 'activity_logs' })
export class ActivityLog {
  @ObjectIdColumn()
  @Expose()
  _id: ObjectId;

  @Expose()
  @Column()
  userId: ObjectId; // Người thực hiện hành động

  @Expose()
  @Column({ type: 'enum', enum: ActivityAction })
  action: ActivityAction; // Loại hành động

  @Expose()
  @Column()
  targetId: ObjectId; // ID của đối tượng bị tác động (ví dụ: Node ID)

  // Lưu chi tiết của hành động dưới dạng object để linh hoạt
  @Expose()
  @Column()
  details: Record<string, any>; // Ví dụ: { oldName: 'A', newName: 'B' }

  @Expose()
  @CreateDateColumn({ type: 'timestamp' })
  timestamp: Date;
}
