import { Entity, ObjectIdColumn, Column, CreateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';
import { PermissionLevel } from 'src/common/enums/projects.enum';

@Entity({ name: 'permissions' })
export class Permission {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  userId: ObjectId;

  @Column()
  nodeId: ObjectId;

  @Column({
    type: 'enum',
    enum: PermissionLevel, 
  })
  permission: PermissionLevel;

  @Column()
  grantedBy: ObjectId;

  @CreateDateColumn({ type: 'timestamp' })
  grantedAt: Date;
}