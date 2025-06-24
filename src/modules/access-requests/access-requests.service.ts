import { BadRequestException, ConflictException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccessRequest } from './entities/access-request.entity';
import { User } from '../users/entities/user.entity';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { NodesService } from '../nodes/nodes.service';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { PermissionLevel, RequestStatus } from 'src/common/enums/projects.enum';

@Injectable()
export class AccessRequestsService {
  constructor (
    @Inject(forwardRef(() => PermissionsService))
    private readonly permissionService: PermissionsService,
    @Inject(forwardRef(() => NodesService))
    private readonly nodeService: NodesService,
    @InjectRepository(AccessRequest)
    private readonly accessRequestRepository: MongoRepository <AccessRequest>,
  ) {}

  async createAccessRequest (dto: CreateAccessRequestDto, requester: User) : Promise <AccessRequest> {
    const {nodeId,requestedPermission, message, isRecursive } = dto;
    const targetNodeId = new ObjectId(nodeId);
    
    // --- 1. KIỂM TRA CÁC ĐIỀU KIỆN HỢP LỆ ---
    // 1a. Kiểm tra xem Node có tồn tại không
    const node = await this.nodeService.findById(targetNodeId);
    if (!node) {
      throw new NotFoundException('Tài nguyên bạn yêu cầu không tồn tại.');
    }
    // 1b. Kiểm tra xem người dùng đã có quyền cao hơn hoặc bằng quyền đang xin chưa
    const hasSufficentPermission = await this.permissionService.checkUserPermissionForNode(
      requester,
      targetNodeId,
      requestedPermission
    );
    if (hasSufficentPermission) {
      throw new ConflictException('Bạn đã có quyền truy cập vào mục này rồi.');
    } 
    // 1c. Kiểm tra xem đã có một yêu cầu đang chờ xử lý (PENDING) từ user này cho node này chưa
    const existingPendingRequest = await this.accessRequestRepository.findOne({
      where: {
        requesterId: requester._id,
        nodeId: targetNodeId,
        status: RequestStatus.PENDING,
      },
    });
    if (existingPendingRequest) {
      throw new ConflictException('Bạn đã gửi một yêu cầu cho mục này và đang chờ xử lý.');
    }

    const newRequest = this.accessRequestRepository.create({
      requesterId: requester._id,
      nodeId: targetNodeId,
      requestedPermission,
      isRecursive: isRecursive || false, // Đặt giá trị mặc định là false nếu không được cung cấp
      message: message || '',
      status: RequestStatus.PENDING,
    });

    const savedRequest = await this.accessRequestRepository.save(newRequest);

     // --- 3. GỬI THÔNG BÁO CHO CÁC OWNER (Sẽ tích hợp BullMQ sau) ---
    // TODO: Thêm job vào hàng đợi (queue) để gửi email cho các Owner của node
    console.log(`ĐÃ TẠO YÊU CẦU: Gửi thông báo cho các Owner của Node ${nodeId}`);

    return savedRequest;
  }


  /**
   * Tìm tất cả các yêu cầu đang chờ xử lý mà một Owner có quyền xem xét.
   */
  async findPendingRequestsForOwner(owner: User): Promise<AccessRequest[]> {
    // 1. Tìm tất cả các quyền Owner của người dùng này
    const ownerPermissions = await this.permissionService.findAllOwnedByUser(owner._id);
    const ownedNodeIds = ownerPermissions.map(p => p.nodeId);

    if (ownedNodeIds.length === 0) {
      return []; // Nếu không sở hữu node nào, không có yêu cầu nào để xem
    }

    // 2. Tìm tất cả các yêu cầu đang ở trạng thái PENDING trên các node mà họ sở hữu
    return this.accessRequestRepository.find({
      where: {
        nodeId: { $in: ownedNodeIds } as any,
        status: RequestStatus.PENDING,
      },
      order: { createdAt: 'ASC' }, // Ưu tiên xử lý yêu cầu cũ trước
    });
  }

  async approve(requestId: string, reviewer: User): Promise<AccessRequest> {
    const request = await this.findRequestAndCheckReviewerPermission(requestId, reviewer);

    // Kiểm tra nếu yêu cầu là đệ quy
    if (request.isRecursive) {
      // Gọi logic cấp quyền đệ quy (chúng ta sẽ hoàn thiện hàm này sau)
      await this.permissionService.grantRecursive(request.nodeId, request.requesterId, request.requestedPermission, reviewer._id);
    } else {
      // Cấp quyền cho một node duy nhất
      await this.permissionService.grant({
        userId: request.requesterId.toHexString(),
        nodeId: request.nodeId.toHexString(),
        permission: request.requestedPermission,
      }, reviewer);
    }

    // Cập nhật trạng thái yêu cầu
    request.status = RequestStatus.APPROVED;
    request.reviewerId = reviewer._id;
    request.reviewedAt = new Date();

    // TODO: Thêm job vào queue để gửi email thông báo cho người yêu cầu

    return this.accessRequestRepository.save(request);
  }

  /**
   * Từ chối một yêu cầu truy cập.
   */
  async deny(requestId: string, reviewer: User): Promise<AccessRequest> {
    const request = await this.findRequestAndCheckReviewerPermission(requestId, reviewer);

    request.status = RequestStatus.DENIED;
    request.reviewerId = reviewer._id;
    request.reviewedAt = new Date();

    // TODO: Thêm job vào queue để gửi email thông báo cho người yêu cầu

    return this.accessRequestRepository.save(request);
  }

  /**
   * Hàm helper private để tìm yêu cầu và kiểm tra quyền của người xử lý.
   */
  private async findRequestAndCheckReviewerPermission(requestId: string, reviewer: User): Promise<AccessRequest> {
    const request = await this.accessRequestRepository.findOne({ where: { _id: new ObjectId(requestId) } });
    if (!request) throw new NotFoundException('Yêu cầu không tồn tại.');
    if (request.status !== RequestStatus.PENDING) throw new BadRequestException('Yêu cầu này đã được xử lý.');

    const canReview = await this.permissionService.checkUserPermissionForNode(reviewer, request.nodeId, PermissionLevel.OWNER);
    if (!canReview) throw new ForbiddenException('Bạn không có quyền xử lý yêu cầu cho mục này.');

    return request;
  }
}
