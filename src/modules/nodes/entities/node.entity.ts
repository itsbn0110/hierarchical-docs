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
export class Ancestor {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;
}

@Entity({ name: 'nodes' })
export class Node {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: NodeType,
  })
  type: NodeType;

  @Column({ nullable: true })
  content?: string;

  @Column({nullable: true})
  parentId: ObjectId | null;

  @Column({default : []})
  ancestors: Ancestor[];

  @Column({ type: 'number', default: 0 })
  @IsInt()
  @Min(0)
  level: number;

  @Column()
  createdBy: ObjectId;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}