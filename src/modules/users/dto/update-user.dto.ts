import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// PartialType sẽ lấy tất cả các thuộc tính và validation rule của CreateUserDto
// và làm cho chúng trở nên không bắt buộc (@IsOptional())
export class UpdateUserDto extends PartialType(CreateUserDto) {}