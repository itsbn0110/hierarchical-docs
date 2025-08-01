import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from "typeorm";
import { NodeType } from "src/common/enums/projects.enum";
import { ObjectId } from "mongodb";
import { IsInt, Min } from "class-validator";
import { Exclude, Expose, Transform, Type } from "class-transformer";
import { exposeBasedOnNodeType, transformObjectId } from "src/common/helpers/transform.helpers";

export class Ancestor {
  @Transform(transformObjectId)
  @Expose()
  _id: ObjectId;

  @Expose()
  @Column()
  name: string;
}

@Exclude()
@Entity({ name: "nodes" })
export class Node {
  @Expose()
  @ObjectIdColumn()
  @Transform(transformObjectId)
  _id: ObjectId;

  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column({ type: "enum", enum: NodeType })
  type: NodeType;

  @Expose()
  @Column({ nullable: true })
  @Transform((params) => exposeBasedOnNodeType(NodeType.FILE, params))
  content?: string;

  @Index()
  @Expose()
  @Column({ nullable: true })
  @Transform(transformObjectId)
  parentId: ObjectId | null;

  @Index()
  @Expose()
  @Column({ default: [] })
  @Type(() => Ancestor)
  ancestors: { _id: ObjectId; name: string }[];

  @Expose()
  @Column({ type: "number", default: 0 })
  @IsInt()
  @Min(0)
  level: number;

  @Expose()
  @Column()
  @Transform(transformObjectId)
  createdBy: ObjectId;

  @Expose()
  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @Expose()
  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamp", nullable: true })
  deletedAt?: Date;
}
