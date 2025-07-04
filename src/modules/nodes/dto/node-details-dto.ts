import { Expose } from 'class-transformer';
import { Node } from '../entities/node.entity';
import { OmitType } from '@nestjs/mapped-types'; // Hoặc from '@nestjs/swagger'

// Sử dụng OmitType để tạo một class mới kế thừa từ Node nhưng loại bỏ trường 'createdBy' gốc.
// Điều này cho phép chúng ta định nghĩa lại trường 'createdBy' với một kiểu dữ liệu mới.
export class NodeDetailsDto extends OmitType(Node, ['createdBy'] as const) {
  // Ghi đè kiểu dữ liệu của createdBy thành string.
  @Expose()
  createdBy: string;
}
