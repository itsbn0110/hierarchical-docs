import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AccessRequest } from './entities/access-request.entity';
import { User } from '../users/entities/user.entity';
import { CreateAccessRequestDto } from './dto/create-access-request.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { NodesService } from '../nodes/nodes.service';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { PermissionLevel, RequestStatus, UserRole } from 'src/common/enums/projects.enum';
import { EmailProducerService } from '../email/email-producer.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { TasksProducerService } from '../tasks/tasks-producer.service';
import { BusinessException } from 'src/common/filters/business.exception';
import { ErrorCode } from 'src/common/filters/constants/error-codes.enum';
import { ErrorMessages } from 'src/common/filters/constants/messages.constant';
import { plainToInstance } from 'class-transformer';
import { PendingRequestDto } from './dto/access-request-response.dto';
@Injectable()
export class AccessRequestsService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => PermissionsService))
    private readonly permissionService: PermissionsService,
    @Inject(forwardRef(() => NodesService))
    private readonly nodeService: NodesService,
    @Inject(forwardRef(() => EmailProducerService))
    private readonly emailProducerService: EmailProducerService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => TasksProducerService))
    private readonly tasksProducerService: TasksProducerService,
    @InjectRepository(AccessRequest)
    private readonly accessRequestRepository: MongoRepository<AccessRequest>,
  ) {}

  async createAccessRequest(dto: CreateAccessRequestDto, requester: User): Promise<AccessRequest> {
    const { nodeId, requestedPermission, message, isRecursive } = dto;
    const targetNodeId = new ObjectId(nodeId);

    // --- 1. KIỂM TRA CÁC ĐIỀU KIỆN HỢP LỆ ---
    // 1a. Kiểm tra xem Node có tồn tại không
    const node = await this.nodeService.findById(targetNodeId);
    if (!node) {
      throw new BusinessException(
        ErrorCode.DOCUMENT_NOT_FOUND,
        ErrorMessages.DOCUMENT_NOT_FOUND,
        404,
      );
    }
    // 1b. Kiểm tra xem người dùng đã có quyền cao hơn hoặc bằng quyền đang xin chưa
    const hasSufficentPermission = await this.permissionService.checkUserPermissionForNode(
      requester,
      targetNodeId,
      requestedPermission,
    );
    if (hasSufficentPermission) {
      throw new BusinessException(
        ErrorCode.ACCESS_DENIED,
        ErrorMessages.ALREADY_HAS_PERMISSION,
        409,
      );
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
      throw new BusinessException(
        ErrorCode.ACCESS_DENIED,
        ErrorMessages.PENDING_REQUEST_EXISTS,
        409,
      );
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

    try {
      const ownerIds = await this.permissionService.findOwnerIdsOfNode(new ObjectId(dto.nodeId));
      const owners = await this.usersService.findByIds(ownerIds);

      const loginUrl = this.configService.get<string>('FRONTEND_URL');
      for (const owner of owners) {
        if (owner.email) {
          await this.emailProducerService.sendNewAccessRequestEmail({
            ownerEmail: owner.email,
            requesterName: requester.username,
            nodeName: node.name,
            loginUrl: loginUrl,
          });
        }
      }
    } catch (error) {
      // Nếu có lỗi khi kết nối hoặc thêm job vào Redis,
      // chúng ta sẽ ghi lại log lỗi nhưng không làm sập request chính.
      console.error('LỖI HÀNG ĐỢI: Không thể thêm job gửi email vào queue.', error.message);
    }
    return savedRequest;
  }

  /**
   * [SỬA LẠI] Tìm tất cả các yêu cầu đang chờ xử lý mà một Owner có quyền xem xét,
   * và trả về dữ liệu đã được làm giàu.
   */
  async findPendingRequestsForOwner(owner: User): Promise<PendingRequestDto[]> {
    let matchCondition: any = { status: RequestStatus.PENDING };

    if (owner.role !== UserRole.ROOT_ADMIN) {
      const ownerPermissions = await this.permissionService.findAllOwnedByUser(owner._id);
      const ownedNodeIds = ownerPermissions.map((p) => p.nodeId);

      if (ownedNodeIds.length === 0) {
        return [];
      }
      matchCondition.nodeId = { $in: ownedNodeIds };
    }

    const pendingRequests = await this.accessRequestRepository
      .aggregate([
        { $match: matchCondition },
        { $lookup: { from: 'nodes', localField: 'nodeId', foreignField: '_id', as: 'nodeInfo' } },
        {
          $lookup: {
            from: 'users',
            localField: 'requesterId',
            foreignField: '_id',
            as: 'requesterInfo',
          },
        },
        { $unwind: '$nodeInfo' },
        { $unwind: '$requesterInfo' },
        {
          // [SỬA] Bổ sung thêm isRecursive vào đây
          $project: {
            _id: 1,
            requestedPermission: 1,
            message: 1,
            createdAt: 1,
            isRecursive: 1, // Thêm trường này
            node: {
              _id: '$nodeInfo._id',
              name: '$nodeInfo.name',
              type: '$nodeInfo.type',
            },
            requester: {
              _id: '$requesterInfo._id',
              username: '$requesterInfo.username',
            },
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();

    return plainToInstance(PendingRequestDto, pendingRequests);
  }

  async findProcessedRequestsForOwner(owner: User): Promise<any[]> {
    // Sử dụng DTO phù hợp sau
    let matchCondition: any = {
      status: { $in: [RequestStatus.APPROVED, RequestStatus.DENIED] },
    };

    // Nếu không phải RootAdmin, chỉ lấy các yêu cầu cho node mà họ sở hữu
    if (owner.role !== UserRole.ROOT_ADMIN) {
      const ownerPermissions = await this.permissionService.findAllOwnedByUser(owner._id);
      const ownedNodeIds = ownerPermissions.map((p) => p.nodeId);

      if (ownedNodeIds.length === 0) {
        return []; // Nếu không sở hữu node nào, không có lịch sử để xem
      }
      matchCondition.nodeId = { $in: ownedNodeIds };
    }

    const processedRequests = await this.accessRequestRepository
      .aggregate([
        { $match: matchCondition },
        { $sort: { reviewedAt: -1 } }, // Sắp xếp theo ngày xử lý mới nhất
        { $limit: 100 }, // Giới hạn kết quả để tránh quá tải
        { $lookup: { from: 'nodes', localField: 'nodeId', foreignField: '_id', as: 'nodeInfo' } },
        {
          $lookup: {
            from: 'users',
            localField: 'requesterId',
            foreignField: '_id',
            as: 'requesterInfo',
          },
        },
        // Join thêm một lần nữa để lấy thông tin người đã xử lý yêu cầu
        {
          $lookup: {
            from: 'users',
            localField: 'reviewerId',
            foreignField: '_id',
            as: 'reviewerInfo',
          },
        },
        // Dùng preserveNullAndEmptyArrays để không loại bỏ các bản ghi cũ chưa có reviewerId
        { $unwind: { path: '$nodeInfo', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$requesterInfo', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$reviewerInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            requestedPermission: 1,
            status: 1,
            isRecursive: 1,
            createdAt: 1,
            reviewedAt: 1,
            node: {
              _id: '$nodeInfo._id',
              name: '$nodeInfo.name',
              type: '$nodeInfo.type',
            },
            requester: {
              _id: '$requesterInfo._id',
              username: '$requesterInfo.username',
            },
            // Thêm thông tin người xử lý vào kết quả trả về
            reviewer: {
              _id: '$reviewerInfo._id',
              username: '$reviewerInfo.username',
            },
          },
        },
      ])
      .toArray();

    // TODO: Tạo một ProcessedRequestDto và chuyển đổi dữ liệu
    return processedRequests;
  }

  async approve(requestId: string, reviewer: User): Promise<AccessRequest> {
    const request = await this.findRequestAndCheckReviewerPermission(requestId, reviewer);

    // Kiểm tra nếu yêu cầu là đệ quy
    if (request.isRecursive) {
      // THÊM JOB VÀO HÀNG ĐỢI, KHÔNG XỬ LÝ TRỰC TIẾP
      await this.tasksProducerService.addRecursivePermissionJob({
        parentNodeId: request.nodeId,
        targetUserId: request.requesterId,
        permission: request.requestedPermission,
        granterId: reviewer._id,
      });
    } else {
      // Cấp quyền cho một node duy nhất
      await this.permissionService.grant(
        {
          userId: request.requesterId.toHexString(),
          nodeId: request.nodeId.toHexString(),
          permission: request.requestedPermission,
        },
        reviewer,
      );
    }

    // Cập nhật trạng thái yêu cầu
    request.status = RequestStatus.APPROVED;
    request.reviewerId = reviewer._id;
    request.reviewedAt = new Date();

    const savedRequest = await this.accessRequestRepository.save(request);

    // TODO: Thêm job vào queue để gửi email thông báo cho người yêu cầu
    await this.sendResultNotification(savedRequest);

    return savedRequest;
  }

  /**
   * Từ chối một yêu cầu truy cập.
   */
  async deny(requestId: string, reviewer: User): Promise<AccessRequest> {
    const request = await this.findRequestAndCheckReviewerPermission(requestId, reviewer);

    request.status = RequestStatus.DENIED;
    request.reviewerId = reviewer._id;
    request.reviewedAt = new Date();

    const savedRequest = await this.accessRequestRepository.save(request);
    // TODO: Thêm job vào queue để gửi email thông báo cho người yêu cầu
    await this.sendResultNotification(savedRequest);
    return savedRequest;
  }

  /**
   * Hàm helper private để tìm yêu cầu và kiểm tra quyền của người xử lý.
   */
  private async findRequestAndCheckReviewerPermission(
    requestId: string,
    reviewer: User,
  ): Promise<AccessRequest> {
    const request = await this.accessRequestRepository.findOne({
      where: { _id: new ObjectId(requestId) },
    });
    if (!request)
      throw new BusinessException(
        ErrorCode.REQUEST_NOT_FOUND,
        ErrorMessages.REQUEST_NOT_FOUND,
        404,
      );
    if (request.status !== RequestStatus.PENDING) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        ErrorMessages.REQUEST_ALREADY_PROCESSED,
        400,
      );
    }

    const canReview = await this.permissionService.checkUserPermissionForNode(
      reviewer,
      request.nodeId,
      PermissionLevel.OWNER,
    );
    if (!canReview)
      throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.ACCESS_DENIED, 403);

    return request;
  }

  private async sendResultNotification(request: AccessRequest) {
    try {
      const [requester, node] = await Promise.all([
        this.usersService.findById(request.requesterId.toHexString()),
        this.nodeService.findById(request.nodeId),
      ]);

      console.log('request', request);
      if (requester && node) {
        await this.emailProducerService.sendRequestProcessedEmail({
          requesterEmail: requester.email,
          nodeName: node.name,
          status: request.status as unknown as 'APPROVED' | 'DENIED',
          loginUrl: this.configService.get<string>('FRONTEND_URL'),
        });
      }
    } catch (error) {
      console.error(`Không thể gửi email thông báo kết quả cho yêu cầu ${request._id}:`, error);
    }
  }
}
