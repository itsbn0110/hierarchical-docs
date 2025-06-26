import { Entity, ObjectIdColumn, Column, CreateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';
import { PermissionLevel } from 'src/common/enums/projects.enum';
import { Expose, Exclude, Transform } from 'class-transformer';
import { transformObjectId } from 'src/common/helpers/transform.helpers';

@Entity({ name: 'permissions' })
@Exclude()
export class Permission {
  @ObjectIdColumn()
  @Transform(transformObjectId)
  @Expose()
    _id: ObjectId;

  @Column()
  @Expose()
  @Transform(transformObjectId)
    userId: ObjectId;

  @Column()
  @Expose()
  @Transform(transformObjectId)
    nodeId: ObjectId;

  @Column({
    type: 'enum',
    enum: PermissionLevel,
  })
  @Expose()
    permission: PermissionLevel;

  @Expose()
  @Column()
  @Transform(transformObjectId)
    grantedBy: ObjectId;

  @CreateDateColumn({ type: 'timestamp' })
  @Expose()
    grantedAt: Date;
}
