import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { NodesService } from "../nodes/nodes.service";
import { User } from "../users/entities/user.entity";
import { NodeType } from "src/common/enums/projects.enum";
import { ObjectId } from "mongodb";

@Injectable()
export class SeedingService {
  constructor(
    private readonly usersService: UsersService,
    private readonly nodesService: NodesService,
  ) {}

  /**
   * Tạo một chuỗi node lồng nhau với độ sâu cho trước.
   * @param depth Số lượng node lồng nhau cần tạo.
   */
  async seedDeepChain(depth: number) {
    console.log(`Bắt đầu tạo chuỗi ${depth} node lồng nhau...`);

    const rootAdmin = await this.usersService.findUserByEmail("itsbn610@gmail.com");
    if (!rootAdmin) {
      console.error("Lỗi: Không tìm thấy tài khoản root admin.");
      return;
    }

    let currentParentId: ObjectId | null = null;

    // Vòng lặp để tạo chuỗi node
    for (let i = 0; i < depth; i++) {
      const newNode = await this.nodesService.create(
        {
          name: `Node Lồng nhau Cấp ${i + 1}`,
          type: NodeType.FOLDER, // Tạo thư mục để có thể chứa node tiếp theo
          parentId: currentParentId?.toHexString(),
        },
        rootAdmin,
      );

      // Cập nhật parentId cho vòng lặp tiếp theo
      currentParentId = newNode._id;

      console.log(` -> Đã tạo node cấp ${i + 1} với ID: ${newNode._id}`);
    }

    console.log(`✅ Hoàn tất! Đã tạo một chuỗi ${depth} node lồng nhau.`);
  }
}
