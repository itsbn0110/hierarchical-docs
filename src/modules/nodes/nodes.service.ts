import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, MongoRepository } from "typeorm";
import { ObjectId } from "mongodb";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

import { Node } from "./entities/node.entity";
import { CreateNodeDto } from "./dto/create-node.dto";
import { User } from "../users/entities/user.entity";
import { ActivityAction, NodeType, UserRole } from "src/common/enums/projects.enum";
import { PermissionLevel } from "src/common/enums/projects.enum";
import { PermissionsService } from "../permissions/permissions.service";
import { TreeNodeDto } from "./dto/tree-node.dto";
import { plainToInstance } from "class-transformer";
import { UpdateNodeNameDto } from "./dto/update-node-name.dto";
import { UpdateNodeContentDto } from "./dto/update-node-content.dto";
import { Permission } from "../permissions/entities/permission.entity";
import { AccessRequest } from "../access-requests/entities/access-request.entity";
import { ActivityLogProducerService } from "../activity-log/activity-log-producer.service";
import { MoveNodeDto } from "./dto/move-node.dto";
import { BusinessException } from "src/common/filters/business.exception";
import { ErrorMessages } from "src/common/filters/constants/messages.constant";
import { ErrorCode } from "src/common/filters/constants/error-codes.enum";
import { UsersService } from "../users/users.service";
import { NodeDetailsDto } from "./dto/node-details-dto";
import { TrashedItemDto } from "./dto/trashed-item.dto";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PaginationQueryDto } from "./dto/pagination-query-dto";

type Ancestor = {
  _id: ObjectId;
  name: string;
};

@Injectable()
export class NodesService {
  logger: any;
  constructor(
    @InjectRepository(Node)
    private readonly nodesRepository: MongoRepository<Node>,

    @Inject(forwardRef(() => PermissionsService))
    private readonly permissionsService: PermissionsService,

    @Inject(forwardRef(() => ActivityLogProducerService))
    private readonly activityLogProducer: ActivityLogProducerService,

    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @InjectConnection() private readonly connection: Connection,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createNodeDto: CreateNodeDto, user: User): Promise<Node> {
    const { name, type, parentId, content } = createNodeDto;
    let parentNode: Node | null = null;
    let ancestors: Ancestor[] = [];
    let parentOwnerIds: ObjectId[] = [];
    let level = 0; // Giá trị mặc định cho node gốc
    // --- 1. KIỂM TRA THƯ MỤC CHA VÀ LẤY OWNER CỦA CHA ---
    if (parentId) {
      parentNode = await this.nodesRepository.findOne({ where: { _id: new ObjectId(parentId) } });
      if (!parentNode) {
        throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.FOLDER_NOT_FOUND, 404);
      }
      if (parentNode.type !== NodeType.FOLDER) {
        throw new BusinessException(ErrorCode.NODE_INVALID_TYPE, ErrorMessages.INVALID_DOCUMENT_TYPE, 400);
      }
      const canCreate = await this.permissionsService.checkUserPermissionForNode(
        user,
        parentNode._id,
        PermissionLevel.EDITOR,
      );
      if (!canCreate && user.role !== UserRole.ROOT_ADMIN) {
        throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.INSUFFICIENT_PERMISSIONS, 403);
      }
      // Dùng hàm mới để lấy tất cả ID của Owner từ cha
      parentOwnerIds = await this.permissionsService.findOwnerIdsOfNode(parentNode._id);
      ancestors = [...parentNode.ancestors, { _id: parentNode._id, name: parentNode.name }];
      level = parentNode.level + 1; // <-- TÍNH TOÁN LEVEL MỚI
    } // --- 2. TẠO VÀ LƯU NODE MỚI ---

    const nodeToCreate = this.nodesRepository.create({
      name,
      type,
      content: content || undefined,
      parentId: parentNode ? parentNode._id : null,
      ancestors,
      level,
      createdBy: user._id,
    });
    const newNode = await this.nodesRepository.save(nodeToCreate); // --- 3. KẾ THỪA VÀ GÁN QUYỀN OWNER HÀNG LOẠT ---

    const ownerIdSet = new Set<string>();
    ownerIdSet.add(user._id.toHexString()); // Thêm người tạo
    // các ownerIds của th cha,
    parentOwnerIds.forEach((id) => ownerIdSet.add(id.toHexString())); // Thêm các owner kế thừa từ cha

    const finalOwnerIds = Array.from(ownerIdSet).map((id) => new ObjectId(id));

    // Dùng hàm mới để gán quyền hàng loạt
    await this.permissionsService.grantOwnerPermissionToUsers(
      finalOwnerIds,
      newNode._id,
      user._id, // Ghi nhận người thực hiện hành động này là người tạo
    ); // --- TÍCH HỢP GHI LOG ---

    await this.activityLogProducer.logActivity({
      userId: user._id,
      action: ActivityAction.NODE_CREATED,
      targetId: newNode._id,
      details: {
        name: newNode.name,
        type: newNode.type,
        parentId: newNode.parentId,
        createdBy: user.username,
        createdAt: newNode.createdAt,
      },
    });
    // Invalidate cache cho parent folder
    await this.invalidateChildrenCache(createNodeDto.parentId, user._id.toString());
    return newNode;
  }

  // async getTreeForUser(rootNodeId: string, user: User): Promise<TreeNodeDto[]> {
  //   // console.time(`MONGO_QUERY_${rootNodeId}`);
  //   const rootObjectId = new ObjectId(rootNodeId);
  //   const userId = user._id;

  //   const aggregationPipeline: any[] = [
  //     // Giai đoạn 1: Match
  //     {
  //       $match: {
  //         $or: [{ _id: rootObjectId }, { "ancestors._id": rootObjectId }],
  //         deletedAt: null,
  //       },
  //     },
  //     // Giai đoạn 2: Lookup Permissions
  //     {
  //       $lookup: {
  //         from: "permissions",
  //         let: { nodeId: "$_id" },
  //         pipeline: [
  //           {
  //             $match: {
  //               $expr: {
  //                 $and: [{ $eq: ["$nodeId", "$$nodeId"] }, { $eq: ["$userId", userId] }],
  //               },
  //             },
  //           },
  //         ],
  //         as: "userPermissionInfo",
  //       },
  //     },
  //     // Giai đoạn 3: Lookup Users
  //     {
  //       $lookup: {
  //         from: "users",
  //         localField: "createdBy",
  //         foreignField: "_id",
  //         as: "creatorInfo",
  //       },
  //     },
  //     // Giai đoạn 4: AddFields
  //     {
  //       $addFields: {
  //         userPermission: { $ifNull: [{ $first: "$userPermissionInfo.permission" }, null] },
  //         creatorUsername: { $ifNull: [{ $first: "$creatorInfo.username" }, "Người dùng cũ"] },
  //       },
  //     },
  //   ];

  //   if (user.role !== UserRole.ROOT_ADMIN) {
  //     aggregationPipeline.push({
  //       $match: {
  //         userPermission: { $ne: null },
  //       },
  //     });
  //   }

  //   // GIAI ĐOẠN ĐÃ ĐƯỢC SỬA LỖI
  //   aggregationPipeline.push({
  //     $project: {
  //       // Chỉ định rõ các trường muốn giữ lại
  //       _id: 1,
  //       name: 1,
  //       type: 1,
  //       parentId: 1,
  //       level: 1,
  //       userPermission: 1,
  //       createdBy: "$creatorUsername", // Sử dụng trường đã tính toán
  //     },
  //   });

  //   // 3. Thực thi pipeline và lấy về danh sách phẳng
  //   const flatList = await this.nodesRepository.aggregate(aggregationPipeline).toArray();
  //   if (flatList.length === 0) {
  //     return [];
  //   }

  //   // 4. Tái cấu trúc danh sách phẳng thành dạng cây
  //   const treeNodeDtos = this.buildTreeFromFlatList(flatList, rootObjectId);
  //   // console.timeEnd(`MONGO_QUERY_${rootNodeId}`);

  //   return treeNodeDtos;
  // }

  /**
   * Hàm trợ giúp: Tái cấu trúc một danh sách các node phẳng thành cấu trúc cây.
   * @param nodes Danh sách node từ database
   * @param rootId ID của node gốc để bắt đầu xây dựng cây
   * @returns Mảng các TreeNodeDto cấp cao nhất
   */
  // private buildTreeFromFlatList(nodes: any[], rootId: ObjectId): TreeNodeDto[] {
  //   const map = new Map<string, TreeNodeDto>();

  //   // Khởi tạo tất cả các node vào map để tra cứu nhanh
  //   nodes.forEach((node) => {
  //     // Chuyển đổi object thô từ aggregation thành DTO
  //     const nodeDto = plainToInstance(TreeNodeDto, { ...node, id: node._id, children: [] });
  //     map.set(node._id.toHexString(), nodeDto);
  //   });

  //   const tree: TreeNodeDto[] = [];
  //   for (const node of nodes) {
  //     const nodeIdStr = node._id.toHexString();
  //     const parentIdStr = node.parentId?.toHexString();

  //     if (parentIdStr && map.has(parentIdStr)) {
  //       // Nếu có cha, thêm node này vào mảng children của cha
  //       map.get(parentIdStr)?.children.push(map.get(nodeIdStr)!);
  //     } else if (node._id.equals(rootId)) {
  //       // Nếu là node gốc của cây con đang xét, thêm vào kết quả cuối cùng
  //       tree.push(map.get(nodeIdStr)!);
  //     }
  //   }

  //   // Nếu cây rỗng nhưng map có node gốc (trường hợp thư mục rỗng)
  //   if (tree.length === 0 && map.has(rootId.toHexString())) {
  //     return [map.get(rootId.toHexString())!];
  //   }

  //   return tree;
  // }

  async getTreeForUser(parentId: string | null, user: User): Promise<TreeNodeDto[]> {
    const parentObjectId = parentId ? new ObjectId(parentId) : null;
    let nodes: Node[];

    // --- BƯỚC 1: KIỂM TRA QUYỀN TRUY CẬP VÀO THƯ MỤC CHA ---
    // (Bỏ qua nếu là Root Admin hoặc đang xem ở cấp gốc)

    if (user.role !== UserRole.ROOT_ADMIN && parentObjectId) {
      const canViewParent = await this.permissionsService.checkUserPermissionForNode(
        user,
        parentObjectId,
        PermissionLevel.VIEWER, // Chỉ cần ít nhất quyền xem
      );

      // Nếu không có quyền xem thư mục cha, ném lỗi Forbidden ngay lập tức.
      if (!canViewParent) {
        throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.ACCESS_DENIED, 403);
      }
    }
    // --- 1. Lấy danh sách Node con mà User có quyền xem ---
    if (user.role === UserRole.ROOT_ADMIN) {
      nodes = await this.nodesRepository.find({ where: { parentId: parentObjectId } });
    } else {
      // Lấy tất cả các quyền của user
      const userPermissions = await this.permissionsService.findAllForUser(user._id);
      const accessibleNodeIds = userPermissions.map((p) => p.nodeId);

      // Tìm các node con của parentId VÀ user có quyền truy cập
      nodes = await this.nodesRepository.find({
        where: {
          parentId: parentObjectId,
          _id: { $in: accessibleNodeIds },
        },
      });
    }
    if (nodes.length === 0) return []; // --- 2. Kiểm tra `hasChildren` và lấy quyền chi tiết hàng loạt ---

    const nodeIds = nodes.map((n) => n._id); // Query để tìm những node nào trong danh sách trên có con

    const nodesWithChildren = await this.nodesRepository.distinct("parentId", {
      parentId: { $in: nodeIds },
    });
    const parentIdsWithChildren = new Set(nodesWithChildren.map((id) => id.toHexString())); // Lấy quyền chi tiết của user trên các node này

    const permissions = await this.permissionsService.findUserPermissionsForNodes(user._id, nodeIds);
    const permissionMap = new Map<string, PermissionLevel>();
    permissions.forEach((p) => permissionMap.set(p.nodeId.toHexString(), p.permission)); // --- 3. Chuyển đổi sang DTO để trả về ---

    const treeDtos = nodes.map(async (node) => {
      const nodeIdString = node._id.toHexString();

      let createdByUser;

      if (node.createdBy) {
        createdByUser = await this.usersService.findUserById(node.createdBy.toHexString());
      }

      return plainToInstance(TreeNodeDto, {
        // Dùng plainToInstance để áp dụng decorator của DTO
        id: node._id,
        name: node.name,
        type: node.type,
        level: node.level,
        hasChildren: parentIdsWithChildren.has(nodeIdString),
        userPermission: permissionMap.get(nodeIdString) || null,
        createdBy: node.createdBy ? createdByUser.username : "Người dùng cũ",
      });
    });

    return await Promise.all(treeDtos);
  }

  async getSubtreeForUserOptimized(rootNodeId: string, user: User): Promise<TreeNodeDto[]> {
    const rootObjectId = new ObjectId(rootNodeId);
    const userId = user._id;

    const aggregationPipeline: any[] = [
      {
        $match: {
          $or: [{ _id: rootObjectId }, { "ancestors._id": rootObjectId }],
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: "permissions",
          let: { nodeId: "$_id" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$nodeId", "$$nodeId"] }, { $eq: ["$userId", userId] }] } } }],
          as: "userPermissionInfo",
        },
      },
      { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "creatorInfo" } },
      {
        $addFields: {
          userPermission: { $ifNull: [{ $first: "$userPermissionInfo.permission" }, null] },
          creatorUsername: { $ifNull: [{ $first: "$creatorInfo.username" }, "Người dùng cũ"] },
        },
      },
    ];

    if (user.role !== UserRole.ROOT_ADMIN) {
      aggregationPipeline.push({ $match: { userPermission: { $ne: null } } });
    }

    aggregationPipeline.push({
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        parentId: 1,
        level: 1,
        userPermission: 1,
        createdBy: "$creatorUsername",
      },
    });

    const flatList = await this.nodesRepository.aggregate(aggregationPipeline).toArray();
    console.log("check flatList: ", flatList);
    if (flatList.length === 0) {
      return [];
    }

    // Tái cấu trúc danh sách phẳng thành cây
    return this.buildTreeFromFlatList(flatList, rootObjectId);
  }

  /**
   * Hàm trợ giúp: Tái cấu trúc danh sách phẳng thành cây.
   */
  private buildTreeFromFlatList(nodes: any[], rootId: ObjectId): TreeNodeDto[] {
    const map = new Map<string, TreeNodeDto>();
    const tree: TreeNodeDto[] = [];

    nodes.forEach((node) => {
      const nodeDto = plainToInstance(TreeNodeDto, { ...node, id: node._id, children: [] });
      map.set(node._id.toHexString(), nodeDto);
    });

    for (const node of nodes) {
      const nodeIdStr = node._id.toHexString();
      const parentIdStr = node.parentId?.toHexString();

      if (parentIdStr && map.has(parentIdStr)) {
        map.get(parentIdStr)?.children.push(map.get(nodeIdStr)!);
      } else if (node._id.equals(rootId)) {
        tree.push(map.get(nodeIdStr)!);
      }
    }

    if (tree.length === 0 && map.has(rootId.toHexString())) {
      return [map.get(rootId.toHexString())!];
    }

    return tree;
  }

  async getChildrenNodeDirectly(parentId: string | null, user: User): Promise<any[]> {
    console.time("getChildrentime: ");
    const parentObjectId = parentId ? new ObjectId(parentId) : null;
    const userId = user._id;

    // --- BƯỚC 1: CHẠY AGGREGATION CHÍNH ĐỂ LẤY DỮ LIỆU NODE ---
    const aggregationPipeline: any[] = [
      // Các giai đoạn $match, $lookup, $addFields, $project giữ nguyên như trước...
      { $match: { parentId: parentObjectId, deletedAt: null } },
      {
        $lookup: {
          from: "permissions",
          let: { nodeId: "$_id" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$nodeId", "$$nodeId"] }, { $eq: ["$userId", userId] }] } } }],
          as: "userPermissionInfo",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creatorInfo",
        },
      },
      {
        $addFields: {
          userPermission: { $ifNull: [{ $first: "$userPermissionInfo.permission" }, null] },
          creatorUsername: { $ifNull: [{ $first: "$creatorInfo.username" }, "Người dùng cũ"] },
        },
      },
    ];

    if (user.role !== UserRole.ROOT_ADMIN) {
      aggregationPipeline.push({ $match: { userPermission: { $ne: null } } });
    }

    aggregationPipeline.push({
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        parentId: 1,
        level: 1,
        userPermission: 1,
        createdBy: "$creatorUsername",
      },
    });

    const children = await this.nodesRepository.aggregate(aggregationPipeline).toArray();

    if (children.length === 0) {
      return [];
    }

    // --- BƯỚC 2: TÌM XEM NODE NÀO TRONG KẾT QUẢ CÓ CON ---

    // Lấy ra tất cả ID của các node con vừa tìm được
    const childrenIds = children.map((c) => c._id);

    // Thực hiện 1 query phụ, rất nhanh để tìm tất cả các node là thư mục cha
    const nodesThatAreParents = await this.nodesRepository.distinct("parentId", {
      parentId: { $in: childrenIds },
    });

    // Chuyển kết quả thành một Set để tra cứu nhanh (O(1))
    const parentIdsWithChildren = new Set(nodesThatAreParents.map((id) => id.toHexString()));

    // --- BƯỚC 3: KẾT HỢP DỮ LIỆU ---

    // Map qua kết quả và thêm trường `hasChildren`
    const treeNodeDtos = children.map((c) => ({
      ...c,
      id: c._id,
      // Nếu type là FILE thì chắc chắn không có con
      // Nếu là FOLDER, kiểm tra xem ID của nó có trong Set ở trên không
      hasChildren: c.type === NodeType.FOLDER && parentIdsWithChildren.has(c._id.toHexString()),
    }));
    console.timeEnd("getChildrentime: ");
    return plainToInstance(TreeNodeDto, treeNodeDtos);
  }

  async getChildrenWithPagination(
    parentId: string | null,
    user: User,
    paginationQuery: PaginationQueryDto,
  ): Promise<{ data: any; metadata: any }> {
    // Tạo cache key dựa trên các tham số
    const cacheKey = `children:${parentId}:${user._id}:${paginationQuery.page}:${paginationQuery.limit}`;

    // Kiểm tra cache
    const cachedData = await this.cacheManager.get<{ data: any; metadata: any } | null>(cacheKey);
    if (cachedData !== undefined) {
      // Thay đổi điều kiện để bao gồm cả null
      return cachedData;
    }

    const { page, limit } = paginationQuery;
    const parentObjectId = parentId ? new ObjectId(parentId) : null;
    const userId = user._id;
    const skipAmount = (page - 1) * limit;

    // --- BƯỚC 1: XÂY DỰNG PIPELINE CHÍNH ---
    const aggregationPipeline: any[] = [
      // Các giai đoạn lọc và join ban đầu
      { $match: { parentId: parentObjectId, deletedAt: null } },
      // ... các bước $lookup và $addFields để lấy quyền và tên người tạo như cũ ...
      {
        $lookup: {
          from: "permissions",
          let: { nodeId: "$_id" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$nodeId", "$$nodeId"] }, { $eq: ["$userId", userId] }] } } }],
          as: "userPermissionInfo",
        },
      },
      { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "creatorInfo" } },
      {
        $addFields: {
          userPermission: { $ifNull: [{ $first: "$userPermissionInfo.permission" }, null] },
          creatorUsername: { $ifNull: [{ $first: "$creatorInfo.username" }, "Người dùng cũ"] },
        },
      },
    ];

    // Thêm bộ lọc quyền nếu không phải Root Admin
    if (user.role !== UserRole.ROOT_ADMIN) {
      aggregationPipeline.push({ $match: { userPermission: { $ne: null } } });
    }

    // --- BƯỚC 2: THÊM GIAI ĐOẠN $facet ĐỂ PHÂN TRANG VÀ ĐẾM ---
    aggregationPipeline.push({
      $facet: {
        // Nhánh 1: Lấy dữ liệu cho trang hiện tại
        data: [
          { $sort: { type: 1, name: 1 } }, // Sắp xếp thư mục lên trước, rồi theo tên
          { $skip: skipAmount },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              name: 1,
              type: 1,
              parentId: 1,
              level: 1,
              userPermission: 1,
              createdBy: "$creatorUsername",
            },
          },
        ],
        // Nhánh 2: Lấy tổng số document
        metadata: [{ $count: "total" }],
      },
    });

    const results = await this.nodesRepository.aggregate(aggregationPipeline).toArray();
    const paginatedResult = results[0]; // Kết quả nằm trong phần tử đầu tiên

    if (!paginatedResult || paginatedResult.data.length === 0) {
      const emptyResult = { data: [], metadata: { total: 0, page, limit } };
      // Cache kết quả rỗng với thời gian ngắn hơn (ví dụ: 5 phút)
      await this.cacheManager.set(cacheKey, emptyResult, 300); // 300 seconds = 5 minutes
      return emptyResult;
    }

    // --- BƯỚC 3: LẤY `hasChildren` CHO DỮ LIỆU CỦA TRANG HIỆN TẠI ---
    const currentPageData = paginatedResult.data;
    const currentPageIds = currentPageData.map((c) => c._id);
    const nodesThatAreParents = await this.nodesRepository.distinct("parentId", { parentId: { $in: currentPageIds } });
    const parentIdsWithChildren = new Set(nodesThatAreParents.map((id) => id.toHexString()));

    // --- BƯỚC 4: KẾT HỢP VÀ TRẢ VỀ ---
    const finalData = currentPageData.map((node) => ({
      ...node,
      id: node._id,
      hasChildren: node.type === NodeType.FOLDER && parentIdsWithChildren.has(node._id.toHexString()),
    }));

    const metadata = {
      total: paginatedResult.metadata[0]?.total || 0,
      page,
      limit,
    };

    const finalResult = {
      data: plainToInstance(TreeNodeDto, finalData),
      metadata,
    };

    // Lưu kết quả vào cache
    await this.cacheManager.set(cacheKey, finalResult, 1800);

    return finalResult;
  }

  /**
   *  Thử lấy metadata từ cache để biết tổng số bản ghi
      Tính toán chính xác số trang cần xóa dựa trên tổng số bản ghi
      Nếu không có metadata (cache đã hết hạn), xóa 100 trang đầu tiên cho mỗi limit
      Thêm xử lý lỗi để đảm bảo luôn xóa được cache
      Tăng số trang mặc định từ 10 lên 100 để an toàn hơn
   */
  // Thêm method để xóa cache khi có thay đổi
  private async invalidateChildrenCache(parentId: string | null, userId: string): Promise<void> {
    const pattern = `children:${parentId}:${userId}:`;
    const possibleLimits = [10, 20, 50, 100];

    try {
      // Đầu tiên, thử lấy metadata từ trang đầu tiên với limit nhỏ nhất
      // để biết tổng số bản ghi
      const cacheKey = `children:${parentId}:${userId}:1:10`;
      const cachedData = await this.cacheManager.get<{ data: any; metadata: any }>(cacheKey);

      if (cachedData?.metadata?.total) {
        // Nếu có metadata, tính toán số trang tối đa cho mỗi limit
        for (const limit of possibleLimits) {
          const maxPages = Math.ceil(cachedData.metadata.total / limit);
          for (let page = 1; page <= maxPages; page++) {
            const key = `children:${parentId}:${userId}:${page}:${limit}`;
            await this.cacheManager.del(key);
          }
        }
      } else {
        // Nếu không có metadata (có thể cache đã hết hạn),
        // xóa một số lượng trang an toàn (ví dụ: 100 trang đầu)
        for (const limit of possibleLimits) {
          for (let page = 1; page <= 100; page++) {
            const key = `children:${parentId}:${userId}:${page}:${limit}`;
            await this.cacheManager.del(key);
          }
        }
      }
    } catch (error) {
      // Nếu có lỗi khi truy cập cache, log lỗi và xóa một số lượng trang an toàn
      console.error("Error while invalidating cache:", error);
      for (const limit of possibleLimits) {
        for (let page = 1; page <= 100; page++) {
          const key = `children:${parentId}:${userId}:${page}:${limit}`;
          await this.cacheManager.del(key).catch(() => {}); // Ignore individual deletion errors
        }
      }
    }
  }

  // Cập nhật các methods khác để xóa cache khi có thay đổi
  // f

  // Rename original move to existingMoveMethod
  private async existingMoveMethod(nodeId: string, dto: MoveNodeDto, user: User): Promise<Node> {
    const { newParentId } = dto;
    const nodeToMoveId = new ObjectId(nodeId);
    const newParentObjectId = newParentId ? new ObjectId(newParentId) : null;

    // --- 1. LẤY DỮ LIỆU VÀ KIỂM TRA QUYỀN BAN ĐẦU ---
    const [nodeToMove, newParentNode] = await Promise.all([
      this.nodesRepository.findOne({ where: { _id: nodeToMoveId } }),
      newParentObjectId ? this.nodesRepository.findOne({ where: { _id: newParentObjectId } }) : null,
    ]);

    if (!nodeToMove) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.DOCUMENT_NOT_FOUND, 404);
    }

    if (newParentId && !newParentNode) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.FOLDER_NOT_FOUND, 404);
    }

    if (newParentNode?.type !== NodeType.FOLDER) {
      throw new BusinessException(ErrorCode.NODE_INVALID_TYPE, ErrorMessages.INVALID_DOCUMENT_TYPE, 400);
    }

    // Kiểm tra quyền trên node bị di chuyển (phải là Owner)
    const canMove = await this.permissionsService.checkUserPermissionForNode(
      user,
      nodeToMove._id,
      PermissionLevel.OWNER,
    );

    if (!canMove) {
      throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.ONLY_OWNER_CAN_REVOKE, 403);
    }

    // Kiểm tra quyền trên thư mục đích (phải là Editor)
    if (newParentNode) {
      const canDrop = await this.permissionsService.checkUserPermissionForNode(
        user,
        newParentNode._id,
        PermissionLevel.EDITOR,
      );
      if (!canDrop) {
        throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.INSUFFICIENT_PERMISSIONS, 403);
      }
    }

    // --- 2. NGĂN CHẶN DI CHUYỂN VÒNG LẶP ---
    if (newParentNode) {
      const isMovingIntoSelfOrDescendant =
        newParentNode._id.equals(nodeToMoveId) ||
        newParentNode.ancestors.some((ancestor) => ancestor._id.equals(nodeToMoveId));
      if (isMovingIntoSelfOrDescendant) {
        throw new BusinessException(
          ErrorCode.NODE_CANNOT_MOVE,
          "Không thể di chuyển một thư mục vào chính nó hoặc thư mục con của nó.",
          400,
        );
      }
    } // --- 3. CẬP NHẬT CẤU TRÚC CÂY ---

    const oldAncestors = nodeToMove.ancestors;
    const newAncestors = newParentNode
      ? [...newParentNode.ancestors, { _id: newParentNode._id, name: newParentNode.name }]
      : [];
    const newLevel = newParentNode ? newParentNode.level + 1 : 0;

    // Cập nhật node gốc được di chuyển
    await this.nodesRepository.updateOne(
      { _id: nodeToMoveId },
      { $set: { parentId: newParentObjectId, ancestors: newAncestors, level: newLevel } },
    );

    // Cập nhật tất cả con cháu nếu node được di chuyển là một thư mục
    if (nodeToMove.type === NodeType.FOLDER) {
      const descendants = await this.nodesRepository.find({ where: { "ancestors._id": nodeToMoveId } });
      if (descendants.length > 0) {
        const bulkUpdateOps = descendants.map((descendant) => {
          const newDescendantAncestors = [
            ...newAncestors,
            { _id: nodeToMove._id, name: nodeToMove.name },
            ...descendant.ancestors.slice(oldAncestors.length + 1),
          ];
          const newDescendantLevel = newLevel + (descendant.level - nodeToMove.level);
          return {
            updateOne: {
              filter: { _id: descendant._id },
              update: { $set: { ancestors: newDescendantAncestors, level: newDescendantLevel } },
            },
          };
        });
        await this.nodesRepository.bulkWrite(bulkUpdateOps);
      }
    }

    // Ghi log hoạt động
    await this.activityLogProducer.logActivity({
      userId: user._id,
      action: ActivityAction.NODE_MOVED,
      targetId: nodeToMoveId,
      details: {
        nodeName: nodeToMove.name,
        type: nodeToMove.type,
        oldParentId: nodeToMove.parentId,
        newParentId: newParentObjectId,
        movedBy: user.username,
        movedAt: new Date(),
      },
    });

    return this.nodesRepository.findOne({ where: { _id: nodeToMoveId } });
  }

  // Wrapper move method that calls existingMoveMethod
  async move(nodeId: string, dto: MoveNodeDto, user: User): Promise<Node> {
    const result = await this.existingMoveMethod(nodeId, dto, user);
    await this.invalidateChildrenCache(result.parentId?.toString(), user._id.toString());
    await this.invalidateChildrenCache(dto.newParentId, user._id.toString());
    return result;
  }

  /**
   * Finds all descendant nodes of a given node
   * @param parentId The ObjectId of the parent node
   * @returns Promise<Node[]> Array of descendant nodes
   */
  async findAllDescendants(parentId: ObjectId): Promise<Node[]> {
    if (!parentId) {
      return [];
    }

    return this.nodesRepository.find({
      where: {
        "ancestors._id": parentId,
        deletedAt: null,
      },
      order: {
        level: "ASC",
        name: "ASC",
      },
    });
  }

  /**
   * Finds a node by its ID
   * @param nodeId The ID of the node to find
   * @returns Promise<Node|null> The found node or null
   */
  async findNodeById(nodeId: ObjectId | string): Promise<Node | null> {
    const objectId = typeof nodeId === "string" ? new ObjectId(nodeId) : nodeId;
    return this.nodesRepository.findOne({
      where: { _id: objectId },
    });
  }

  /**
   * Hàm trợ giúp: Tái cấu trúc một danh sách các node phẳng thành cấu trúc cây.
   * @param nodes Danh sách node từ database
   * @param rootId ID của node gốc để bắt đầu xây dựng cây
   * @returns Mảng các TreeNodeDto cấp cao nhất
   */
  // private buildTreeFromFlatList(nodes: any[], rootId: ObjectId): TreeNodeDto[] {
  //   const map = new Map<string, TreeNodeDto>();

  //   // Khởi tạo tất cả các node vào map để tra cứu nhanh
  //   nodes.forEach((node) => {
  //     // Chuyển đổi object thô từ aggregation thành DTO
  //     const nodeDto = plainToInstance(TreeNodeDto, { ...node, id: node._id, children: [] });
  //     map.set(node._id.toHexString(), nodeDto);
  //   });

  //   const tree: TreeNodeDto[] = [];
  //   for (const node of nodes) {
  //     const nodeIdStr = node._id.toHexString();
  //     const parentIdStr = node.parentId?.toHexString();

  //     if (parentIdStr && map.has(parentIdStr)) {
  //       // Nếu có cha, thêm node này vào mảng children của cha
  //       map.get(parentIdStr)?.children.push(map.get(nodeIdStr)!);
  //     } else if (node._id.equals(rootId)) {
  //       // Nếu là node gốc của cây con đang xét, thêm vào kết quả cuối cùng
  //       tree.push(map.get(nodeIdStr)!);
  //     }
  //   }

  //   // Nếu cây rỗng nhưng map có node gốc (trường hợp thư mục rỗng)
  //   if (tree.length === 0 && map.has(rootId.toHexString())) {
  //     return [map.get(rootId.toHexString())!];
  //   }

  //   return tree;
  // }

  // async getTreeForUser(parentId: string | null, user: User): Promise<TreeNodeDto[]> {
  //   const parentObjectId = parentId ? new ObjectId(parentId) : null;
  //   let nodes: Node[];

  //   // --- BƯỚC 1: KIỂM TRA QUYỀN TRUY CẬP VÀO THƯ MỤC CHA ---
  //   // (Bỏ qua nếu là Root Admin hoặc đang xem ở cấp gốc)

  //   if (user.role !== UserRole.ROOT_ADMIN && parentObjectId) {
  //     const canViewParent = await this.permissionsService.checkUserPermissionForNode(
  //       user,
  //       parentObjectId,
  //       PermissionLevel.VIEWER, // Chỉ cần ít nhất quyền xem
  //     );

  //     // Nếu không có quyền xem thư mục cha, ném lỗi Forbidden ngay lập tức.
  //     if (!canViewParent) {
  //       throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.ACCESS_DENIED, 403);
  //     }
  //   }
  //   // --- 1. Lấy danh sách Node con mà User có quyền xem ---
  //   if (user.role === UserRole.ROOT_ADMIN) {
  //     nodes = await this.nodesRepository.find({ where: { parentId: parentObjectId } });
  //   } else {
  //     // Lấy tất cả các quyền của user
  //     const userPermissions = await this.permissionsService.findAllForUser(user._id);
  //     const accessibleNodeIds = userPermissions.map((p) => p.nodeId);

  //     // Tìm các node con của parentId VÀ user có quyền truy cập
  //     nodes = await this.nodesRepository.find({
  //       where: {
  //         parentId: parentObjectId,
  //         _id: { $in: accessibleNodeIds },
  //       },
  //     });
  //   }
  //   if (nodes.length === 0) return []; // --- 2. Kiểm tra `hasChildren` và lấy quyền chi tiết hàng loạt ---

  //   const nodeIds = nodes.map((n) => n._id); // Query để tìm những node nào trong danh sách trên có con

  //   const nodesWithChildren = await this.nodesRepository.distinct("parentId", {
  //     parentId: { $in: nodeIds },
  //   });
  //   const parentIdsWithChildren = new Set(nodesWithChildren.map((id) => id.toHexString())); // Lấy quyền chi tiết của user trên các node này

  //   const permissions = await this.permissionsService.findUserPermissionsForNodes(user._id, nodeIds);
  //   const permissionMap = new Map<string, PermissionLevel>();
  //   permissions.forEach((p) => permissionMap.set(p.nodeId.toHexString(), p.permission)); // --- 3. Chuyển đổi sang DTO để trả về ---

  //   const treeDtos = nodes.map(async (node) => {
  //     const nodeIdString = node._id.toHexString();

  //     let createdByUser;

  //     if (node.createdBy) {
  //       createdByUser = await this.usersService.findUserById(node.createdBy.toHexString());
  //     }

  //     return plainToInstance(TreeNodeDto, {
  //       // Dùng plainToInstance để áp dụng decorator của DTO
  //       id: node._id,
  //       name: node.name,
  //       type: node.type,
  //       level: node.level,
  //       hasChildren: parentIdsWithChildren.has(nodeIdString),
  //       userPermission: permissionMap.get(nodeIdString) || null,
  //       createdBy: node.createdBy ? createdByUser.username : "Người dùng cũ",
  //     });
  //   });

  //   return await Promise.all(treeDtos);
  // }

  // async getChildrenNodeDirectly(parentId: string | null, user: User): Promise<any[]> {
  //   console.time("getChildrentime: ");
  //   const parentObjectId = parentId ? new ObjectId(parentId) : null;
  //   const userId = user._id;

  //   // --- BƯỚC 1: CHẠY AGGREGATION CHÍNH ĐỂ LẤY DỮ LIỆU NODE ---
  //   const aggregationPipeline: any[] = [
  //     // Các giai đoạn $match, $lookup, $addFields, $project giữ nguyên như trước...
  //     { $match: { parentId: parentObjectId, deletedAt: null } },
  //     {
  //       $lookup: {
  //         from: "permissions",
  //         let: { nodeId: "$_id" },
  //         pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$nodeId", "$$nodeId"] }, { $eq: ["$userId", userId] }] } } }],
  //         as: "userPermissionInfo",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "users",
  //         localField: "createdBy",
  //         foreignField: "_id",
  //         as: "creatorInfo",
  //       },
  //     },
  //     {
  //       $addFields: {
  //         userPermission: { $ifNull: [{ $first: "$userPermissionInfo.permission" }, null] },
  //         creatorUsername: { $ifNull: [{ $first: "$creatorInfo.username" }, "Người dùng cũ"] },
  //       },
  //     },
  //   ];

  //   if (user.role !== UserRole.ROOT_ADMIN) {
  //     aggregationPipeline.push({ $match: { userPermission: { $ne: null } } });
  //   }

  //   aggregationPipeline.push({
  //     $project: {
  //       _id: 1,
  //       name: 1,
  //       type: 1,
  //       parentId: 1,
  //       level: 1,
  //       userPermission: 1,
  //       createdBy: "$creatorUsername",
  //     },
  //   });

  //   const children = await this.nodesRepository.aggregate(aggregationPipeline).toArray();

  //   if (children.length === 0) {
  //     return [];
  //   }

  //   // --- BƯỚC 2: TÌM XEM NODE NÀO TRONG KẾT QUẢ CÓ CON ---

  //   // Lấy ra tất cả ID của các node con vừa tìm được
  //   const childrenIds = children.map((c) => c._id);

  //   // Thực hiện 1 query phụ, rất nhanh để tìm tất cả các node là thư mục cha
  //   const nodesThatAreParents = await this.nodesRepository.distinct("parentId", {
  //     parentId: { $in: childrenIds },
  //   });

  //   // Chuyển kết quả thành một Set để tra cứu nhanh (O(1))
  //   const parentIdsWithChildren = new Set(nodesThatAreParents.map((id) => id.toHexString()));

  //   // --- BƯỚC 3: KẾT HỢP DỮ LIỆU ---

  //   // Map qua kết quả và thêm trường `hasChildren`
  //   const treeNodeDtos = children.map((c) => ({
  //     ...c,
  //     id: c._id,
  //     // Nếu type là FILE thì chắc chắn không có con
  //     // Nếu là FOLDER, kiểm tra xem ID của nó có trong Set ở trên không
  //     hasChildren: c.type === NodeType.FOLDER && parentIdsWithChildren.has(c._id.toHexString()),
  //   }));
  //   console.timeEnd("getChildrentime: ");
  //   return plainToInstance(TreeNodeDto, treeNodeDtos);
  // }

  // async getChildrenWithPagination(
  //   parentId: string | null,
  //   user: User,
  //   paginationQuery: PaginationQueryDto,
  // ): Promise<{ data: any; metadata: any }> {
  //   // Tạo cache key dựa trên các tham số
  //   const cacheKey = `children:${parentId}:${user._id}:${paginationQuery.page}:${paginationQuery.limit}`;

  //   // Kiểm tra cache
  //   const cachedData = await this.cacheManager.get<{ data: any; metadata: any }>(cacheKey);
  //   if (cachedData) {
  //     return cachedData;
  //   }

  //   const { page, limit } = paginationQuery;
  //   const parentObjectId = parentId ? new ObjectId(parentId) : null;
  //   const userId = user._id;
  //   const skipAmount = (page - 1) * limit;

  //   // --- BƯỚC 1: XÂY DỰNG PIPELINE CHÍNH ---
  //   const aggregationPipeline: any[] = [
  //     // Các giai đoạn lọc và join ban đầu
  //     { $match: { parentId: parentObjectId, deletedAt: null } },
  //     // ... các bước $lookup và $addFields để lấy quyền và tên người tạo như cũ ...
  //     {
  //       $lookup: {
  //         from: "permissions",
  //         let: { nodeId: "$_id" },
  //         pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$nodeId", "$$nodeId"] }, { $eq: ["$userId", userId] }] } } }],
  //         as: "userPermissionInfo",
  //         let: { nodeId: "$_id" },
  //         pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$nodeId", "$$nodeId"] }, { $eq: ["$userId", userId] }] } } }],
  //         as: "userPermissionInfo",
  //       },
  //     },
  //     { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "creatorInfo" } },
  //     {
  //       $addFields: {
  //         userPermission: { $ifNull: [{ $first: "$userPermissionInfo.permission" }, null] },
  //         creatorUsername: { $ifNull: [{ $first: "$creatorInfo.username" }, "Người dùng cũ"] },
  //       },
  //     },
  //   ];

  //   // Thêm bộ lọc quyền nếu không phải Root Admin
  //   if (user.role !== UserRole.ROOT_ADMIN) {
  //     aggregationPipeline.push({ $match: { userPermission: { $ne: null } } });
  //   }

  //   // --- BƯỚC 2: THÊM GIAI ĐOẠN $facet ĐỂ PHÂN TRANG VÀ ĐẾM ---
  //   aggregationPipeline.push({
  //     $facet: {
  //       // Nhánh 1: Lấy dữ liệu cho trang hiện tại
  //       data: [
  //         { $sort: { type: 1, name: 1 } }, // Sắp xếp thư mục lên trước, rồi theo tên
  //         { $skip: skipAmount },
  //         { $limit: limit },
  //         {
  //           $project: {
  //             _id: 1,
  //             name: 1,
  //             type: 1,
  //             parentId: 1,
  //             level: 1,
  //             userPermission: 1,
  //             createdBy: "$creatorUsername",
  //           },
  //         },
  //       ],
  //       // Nhánh 2: Lấy tổng số document
  //       metadata: [{ $count: "total" }],
  //     },
  //   });

  //   const results = await this.nodesRepository.aggregate(aggregationPipeline).toArray();
  //   const paginatedResult = results[0]; // Kết quả nằm trong phần tử đầu tiên

  //   if (!paginatedResult || paginatedResult.data.length === 0) {
  //     const emptyResult = { data: [], metadata: { total: 0, page, limit } };
  //     await this.cacheManager.set(cacheKey, emptyResult);
  //     return emptyResult;
  //   }

  //   // --- BƯỚC 3: LẤY `hasChildren` CHO DỮ LIỆU CỦA TRANG HIỆN TẠI ---
  //   const currentPageData = paginatedResult.data;
  //   const currentPageIds = currentPageData.map((c) => c._id);
  //   const nodesThatAreParents = await this.nodesRepository.distinct("parentId", { parentId: { $in: currentPageIds } });
  //   const parentIdsWithChildren = new Set(nodesThatAreParents.map((id) => id.toHexString()));

  //   // --- BƯỚC 4: KẾT HỢP VÀ TRẢ VỀ ---
  //   const finalData = currentPageData.map((node) => ({
  //     ...node,
  //     id: node._id,
  //     hasChildren: node.type === NodeType.FOLDER && parentIdsWithChildren.has(node._id.toHexString()),
  //   }));

  //   const metadata = {
  //     total: paginatedResult.metadata[0]?.total || 0,
  //     page,
  //     limit,
  //   };

  //   const finalResult = {
  //     data: plainToInstance(TreeNodeDto, finalData),
  //     metadata,
  //   };

  //   // Lưu kết quả vào cache
  //   await this.cacheManager.set(cacheKey, finalResult);

  //   return finalResult;
  // }

  // /**
  //  * [MỚI] Lấy thông tin chi tiết của một node (folder hoặc file)
  //  * Hàm này dùng cho cả trang xem folder và trang xem file để lấy breadcrumb và content.
  //  * @param nodeId ID của node cần lấy
  //  * @param user User đang thực hiện yêu cầu
  //  * @returns Toàn bộ entity Node
  //  */
  async getNodeDetails(nodeId: string, user: User): Promise<NodeDetailsDto> {
    const nodeObjectId = new ObjectId(nodeId);

    // 1. Kiểm tra quyền xem (VIEWER) của user trên node này
    if (user.role !== UserRole.ROOT_ADMIN) {
      const canView = await this.permissionsService.checkUserPermissionForNode(
        user,
        nodeObjectId,
        PermissionLevel.VIEWER,
      );
      if (!canView) {
        throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.INSUFFICIENT_PERMISSIONS, 403);
      }
    }

    // 2. Lấy thông tin node gốc từ DB
    const node = await this.nodesRepository.findOne({ where: { _id: nodeObjectId } });

    if (!node) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.DOCUMENT_NOT_FOUND, 404);
    }

    // 3. Lấy thông tin người tạo từ UsersService
    let creator = null;

    if (node.createdBy) {
      creator = await this.usersService.findUserById(node.createdBy.toHexString());
    }

    //4. Lấy quyền của người dùng hiện tại trên node này
    const currentUserPermission = await this.permissionsService.getUserPermissionForNode(user._id, nodeObjectId);

    // 5. Cập nhật trường lastAccessedAt
    this.permissionsService.updateLastAccessed(user._id, nodeObjectId);

    // 5. Kết hợp dữ liệu và chuyển đổi sang DTO
    // Dùng plainToInstance để đảm bảo chỉ các trường có @Expose() trong DTO mới được trả về
    const nodeDetailData = plainToInstance(NodeDetailsDto, {
      ...node, // Lấy tất cả các thuộc tính của node gốc
      createdBy: creator ? creator.username : "Người dùng cũ", // Ghi đè `createdBy` bằng username
      userPermission: currentUserPermission ? currentUserPermission.permission : null,
    });

    return nodeDetailData;
  }

  async findTrashedNodes(user: User): Promise<TrashedItemDto[]> {
    const ownerPermissions = await this.permissionsService.findAllOwnedByUser(user._id);
    const ownedNodeIds = ownerPermissions.map((p) => p.nodeId);

    if (ownedNodeIds.length === 0) {
      return [];
    }

    const results = await this.nodesRepository
      .aggregate([
        {
          $match: {
            _id: { $in: ownedNodeIds },
            deletedAt: { $ne: null }, // Sử dụng toán tử native của MongoDB
          },
        },
        {
          $lookup: {
            from: "nodes",
            localField: "parentId",
            foreignField: "_id",
            as: "parentDetails",
          },
        },
        {
          $match: {
            $or: [{ parentDetails: [] }, { "parentDetails.deletedAt": null }],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "ownerInfo",
          },
        },
        { $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: 1,
            type: 1,
            deletedAt: 1,
            owner: "$ownerInfo.username",
          },
        },
        { $sort: { deletedAt: -1 } },
      ])
      .toArray();

    return plainToInstance(TrashedItemDto, results);
  }

  async findAllTrashedNodesForAdmin(): Promise<TrashedItemDto[]> {
    // Pipeline này tương tự như `findTrashedNodes` nhưng không lọc theo owner.
    const results = await this.nodesRepository
      .aggregate([
        // Bước 1: Lấy tất cả các node có `deletedAt` (đang trong thùng rác)
        {
          $match: {
            deletedAt: { $ne: null },
          },
        },
        // Bước 2: Kiểm tra xem thư mục cha của chúng có bị xóa không.
        // Nếu cha cũng bị xóa, không hiển thị mục con này (vì nó sẽ được khôi phục/xóa cùng cha)
        {
          $lookup: {
            from: "nodes",
            localField: "parentId",
            foreignField: "_id",
            as: "parentDetails",
          },
        },
        {
          $match: {
            $or: [{ parentDetails: [] }, { "parentDetails.deletedAt": null }],
          },
        },
        // Bước 3: Lấy thông tin người tạo để hiển thị cột "Chủ sở hữu"
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "ownerInfo",
          },
        },
        { $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true } },
        // Bước 4: Định hình dữ liệu trả về
        {
          $project: {
            _id: 1,
            name: 1,
            type: 1,
            deletedAt: 1,
            owner: "$ownerInfo.username", // Lấy username của chủ sở hữu
          },
        },
        { $sort: { deletedAt: -1 } },
      ])
      .toArray();

    return plainToInstance(TrashedItemDto, results);
  }

  async updateName(nodeId: string, dto: UpdateNodeNameDto, user: User): Promise<Node> {
    const nodeObjectId = new ObjectId(nodeId);
    const { name: newName } = dto; // 1. Tìm node và kiểm tra quyền Editor

    const nodeToUpdate = await this.nodesRepository.findOne({ where: { _id: nodeObjectId } });
    if (!nodeToUpdate) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.DOCUMENT_NOT_FOUND, 404);
    }
    const canEdit = await this.permissionsService.checkUserPermissionForNode(
      user,
      nodeObjectId,
      PermissionLevel.EDITOR,
    );
    if (!canEdit) {
      throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.INSUFFICIENT_PERMISSIONS, 403);
    } // 2. Cập nhật tên của chính node đó

    const oldName = nodeToUpdate.name; // Lưu lại tên cũ để ghi log
    nodeToUpdate.name = newName;
    await this.nodesRepository.save(nodeToUpdate); // 3. Cập nhật tên trong mảng ancestors của tất cả con cháu

    if (nodeToUpdate.type === NodeType.FOLDER) {
      await this.nodesRepository.updateMany(
        { "ancestors._id": nodeObjectId },
        { $set: { "ancestors.$.name": newName } },
      );
    }

    await this.activityLogProducer.logActivity({
      userId: user._id,
      action: ActivityAction.NODE_RENAMED,
      targetId: nodeToUpdate._id,
      details: {
        oldName: oldName, // cần lưu lại tên cũ trước khi đổi
        newName: nodeToUpdate.name,
        type: nodeToUpdate.type,
        parentId: nodeToUpdate.parentId,
        renamedBy: user.username,
        renamedAt: new Date(),
      },
    });

    // Invalidate cache cho parent folder
    if (nodeToUpdate.parentId) {
      await this.invalidateChildrenCache(nodeToUpdate.parentId.toString(), user._id.toString());
    }

    return nodeToUpdate;
  }

  async updateContent(nodeId: string, dto: UpdateNodeContentDto, user: User): Promise<Node> {
    const nodeObjectId = new ObjectId(nodeId); // 1. Tìm node

    const nodeToUpdate = await this.nodesRepository.findOne({ where: { _id: nodeObjectId } });
    if (!nodeToUpdate) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.DOCUMENT_NOT_FOUND, 404);
    } // 2. KIỂM TRA ĐIỀU KIỆN: Chỉ cho phép update content của FILE

    if (nodeToUpdate.type !== NodeType.FILE) {
      throw new BusinessException(ErrorCode.NODE_INVALID_TYPE, ErrorMessages.INVALID_DOCUMENT_TYPE, 400);
    } // 3. Kiểm tra quyền Editor

    const canEdit = await this.permissionsService.checkUserPermissionForNode(
      user,
      nodeObjectId,
      PermissionLevel.EDITOR,
    );
    if (!canEdit) {
      throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.INSUFFICIENT_PERMISSIONS, 403);
    } // 4. Cập nhật và lưu

    nodeToUpdate.content = dto.content;
    return this.nodesRepository.save(nodeToUpdate);
  }

  async deletePermanently(nodeId: string, user: User): Promise<{ deletedCount: number }> {
    const nodeObjectId = new ObjectId(nodeId);

    const nodeToDelete = await this.nodesRepository.findOne({
      where: { _id: nodeObjectId },
      withDeleted: true,
    });
    if (!nodeToDelete) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.DOCUMENT_NOT_FOUND, 404);
    }
    const isOwner = await this.permissionsService.checkUserPermissionForNode(
      user,
      nodeToDelete._id,
      PermissionLevel.OWNER,
    );
    if (!isOwner) {
      throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.ONLY_OWNER_CAN_DELETE, 403);
    }

    const descendants = await this.nodesRepository.find({
      where: { "ancestors._id": nodeObjectId },
      withDeleted: true,
    });
    const idsToDelete = [nodeToDelete._id, ...descendants.map((d) => d._id)];

    await this.connection.transaction(async (transactionalEntityManager) => {
      const nodeRepo = transactionalEntityManager.getMongoRepository(Node);
      const permissionRepo = transactionalEntityManager.getMongoRepository(Permission);
      const accessRequestRepo = transactionalEntityManager.getMongoRepository(AccessRequest);

      await permissionRepo.deleteMany({ nodeId: { $in: idsToDelete } });
      await accessRequestRepo.deleteMany({ nodeId: { $in: idsToDelete } });
      await nodeRepo.deleteMany({ _id: { $in: idsToDelete } });
    });

    // TODO: Ghi log xóa vĩnh viễn
    await this.activityLogProducer.logActivity({
      userId: user._id,
      action: ActivityAction.NODE_DELETED,
      targetId: nodeObjectId,
      details: {
        deletedAt: new Date(),
        deletedBy: user.username,
        nodeName: nodeToDelete.name,
        type: nodeToDelete.type,
      },
    }); // Trả về số lượng mục đã bị xóa để front-end có thể hiển thị thông báo

    // Invalidate cache cho parent folder
    if (nodeToDelete.parentId) {
      await this.invalidateChildrenCache(nodeToDelete.parentId.toString(), user._id.toString());
    }

    return { deletedCount: idsToDelete.length };
  }
  async softDelete(nodeId: string, user: User): Promise<{ deletedCount: number }> {
    const nodeObjectId = new ObjectId(nodeId);
    const nodeToDelete = await this.nodesRepository.findOne({
      where: { _id: nodeObjectId, deletedAt: null },
    });
    if (!nodeToDelete) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, ErrorMessages.DOCUMENT_NOT_FOUND, 404);
    }
    const isOwner = await this.permissionsService.checkUserPermissionForNode(
      user,
      nodeToDelete._id,
      PermissionLevel.OWNER,
    );
    if (!isOwner) {
      throw new BusinessException(ErrorCode.NODE_FORBIDDEN, ErrorMessages.ONLY_OWNER_CAN_DELETE, 403);
    }

    const descendants = await this.nodesRepository.find({
      where: { "ancestors._id": nodeObjectId, deletedAt: null },
    });
    const idsToSoftDelete = [nodeToDelete._id, ...descendants.map((d) => d._id)];
    const deletionDate = new Date();

    await this.nodesRepository.updateMany(
      { _id: { $in: idsToSoftDelete } }, // Dùng $in của MongoDB native driver
      { $set: { deletedAt: deletionDate } },
    );

    await this.activityLogProducer.logActivity({
      userId: user._id,
      action: ActivityAction.NODE_DELETED,
      targetId: nodeObjectId,
      details: {
        deletedAt: deletionDate,
        deletedBy: user.username,
        nodeName: nodeToDelete.name,
        type: nodeToDelete.type,
      },
    });

    // Invalidate cache cho parent folder của các node bị xóa
    if (nodeToDelete.parentId) {
      await this.invalidateChildrenCache(nodeToDelete.parentId.toString(), user._id.toString());
    }

    return { deletedCount: idsToSoftDelete.length };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleEmptyTrashCron() {
    this.logger.log("Bắt đầu tác vụ tự động dọn dẹp thùng rác...");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Tìm tất cả các mục trong thùng rác cũ hơn 30 ngày
    const oldItems = await this.nodesRepository.find({
      where: {
        deletedAt: { $lt: thirtyDaysAgo } as any,
      },
      withDeleted: true, // Quan trọng: Phải tìm cả trong thùng rác
    });

    if (oldItems.length === 0) {
      this.logger.log("Không có mục nào cũ cần xóa.");
      return;
    }

    this.logger.log(`Phát hiện ${oldItems.length} mục cần xóa vĩnh viễn.`);

    for (const item of oldItems) {
      try {
        await this._deletePermanentlyInternal(item._id);
        this.logger.log(`Đã xóa vĩnh viễn mục: ${item.name} (ID: ${item._id})`);
      } catch (error) {
        this.logger.error(`Lỗi khi xóa vĩnh viễn mục ${item._id}:`, error.stack);
      }
    }

    this.logger.log("Đã hoàn tất tác vụ dọn dẹp thùng rác.");
  }

  /**
   * HÀM NỘI BỘ: Chứa logic xóa cứng cốt lõi.
   */
  private async _deletePermanentlyInternal(nodeId: ObjectId): Promise<{ deletedCount: number }> {
    const descendants = await this.nodesRepository.find({
      where: { "ancestors._id": nodeId },
      withDeleted: true,
    });
    const idsToDelete = [nodeId, ...descendants.map((d) => d._id)];

    await this.connection.transaction(async (transactionalEntityManager) => {
      const nodeRepo = transactionalEntityManager.getMongoRepository(Node);
      const permissionRepo = transactionalEntityManager.getMongoRepository(Permission);
      const accessRequestRepo = transactionalEntityManager.getMongoRepository(AccessRequest);

      await permissionRepo.deleteMany({ nodeId: { $in: idsToDelete } });
      await accessRequestRepo.deleteMany({ nodeId: { $in: idsToDelete } });
      await nodeRepo.deleteMany({ _id: { $in: idsToDelete } });
    });

    return { deletedCount: idsToDelete.length };
  }

  async restore(nodeId: string, user: User): Promise<Node> {
    const nodeObjectId = new ObjectId(nodeId);

    const nodeToRestore = await this.nodesRepository.findOne({
      where: { _id: nodeObjectId },
      withDeleted: true,
    });

    if (!nodeToRestore || !nodeToRestore.deletedAt) {
      throw new BusinessException(ErrorCode.NODE_NOT_FOUND, "Mục không có trong thùng rác.", 404);
    }

    const isOwner = await this.permissionsService.checkUserPermissionForNode(user, nodeObjectId, PermissionLevel.OWNER);
    if (!isOwner) {
      throw new BusinessException(ErrorCode.NODE_FORBIDDEN, "Bạn không có quyền khôi phục mục này.", 403);
    }

    const descendants = await this.nodesRepository.find({
      where: { "ancestors._id": nodeObjectId, deletedAt: nodeToRestore.deletedAt },
      withDeleted: true,
    });
    const idsToRestore = [nodeToRestore._id, ...descendants.map((d) => d._id)];

    // SỬA LỖI: Thay thế .restore() bằng .updateMany() để tương thích với MongoDB
    await this.nodesRepository.updateMany(
      { _id: { $in: idsToRestore } }, // Dùng $in của MongoDB native driver
      { $set: { deletedAt: null } },
    );
    const restoredAt = new Date();
    // TODO: Ghi log khôi phục
    await this.activityLogProducer.logActivity({
      userId: user._id,
      action: ActivityAction.NODE_TRASHED, // Có thể đổi tên thành NODE_TRASHED
      targetId: nodeObjectId,
      details: {
        restoredAt,
        retoredBy: user.username,
        nodeName: nodeToRestore.name,
        type: nodeToRestore.type,
      },
    });

    // Invalidate cache cho parent folder
    if (nodeToRestore.parentId) {
      await this.invalidateChildrenCache(nodeToRestore.parentId.toString(), user._id.toString());
    }

    return this.nodesRepository.findOne({ where: { _id: nodeObjectId } });
  }
}
