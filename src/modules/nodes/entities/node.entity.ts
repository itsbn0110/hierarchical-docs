import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NodeType } from 'src/common/enums/projects.enum';
import { ObjectId } from 'mongodb';
import { IsInt, Min } from 'class-validator';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { exposeBasedOnNodeType, transformObjectId } from 'src/common/helpers/transform.helpers';

export class Ancestor {
  @Transform(transformObjectId)
  @ObjectIdColumn()
  @Expose()
  _id: ObjectId;

  @Expose()
  @Column()
  name: string;
}

@Exclude() 
@Entity({ name: 'nodes' })
export class Node {
  @Expose()
  @Transform(transformObjectId)
  @ObjectIdColumn()
  _id: ObjectId;

  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column({
    type: 'enum',
    enum: NodeType,
  })
  type: NodeType;

  @Expose()
  @Transform(params => exposeBasedOnNodeType(NodeType.FILE, params))
  @Column({ nullable: true })
  content?: string;

  @Expose()
  @Transform(transformObjectId)
  @Column({nullable: true})
  parentId: ObjectId | null;

  @Expose()
  @Column({ default: [] })
  @Type(() => Ancestor)
  ancestors: {
    _id: ObjectId;
    name: string;
  }[]

  @Expose()
  @Column({ type: 'number', default: 0 })
  @IsInt()
  @Min(0)
  level: number;

  @Transform(transformObjectId)
  @Expose()
  @Column()
  createdBy: ObjectId;

  @Expose()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Expose()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}