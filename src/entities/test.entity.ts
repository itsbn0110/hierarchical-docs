import { Entity, ObjectIdColumn, ObjectId, Column } from 'typeorm';

@Entity()
export class Test {
  @ObjectIdColumn()
  id: ObjectId;

  @Column()
  name: string;
}
