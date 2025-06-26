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
import { EmailProducerService } from '../email/email-producer.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { TasksProducerService } from '../tasks/tasks-producer.service';
@Injectable()
export class AccessRequestsService {
  constructor (
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
      // THÊM JOB VÀO HÀNG ĐỢI, KHÔNG XỬ LÝ TRỰC TIẾP
      await this.tasksProducerService.addRecursivePermissionJob({
        parentNodeId: request.nodeId,
        targetUserId: request.requesterId,
        permission: request.requestedPermission,
        granterId: reviewer._id,
      });
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
  private async findRequestAndCheckReviewerPermission(requestId: string, reviewer: User): Promise<AccessRequest> {
    const request = await this.accessRequestRepository.findOne({ where: { _id: new ObjectId(requestId) } });
    if (!request) throw new NotFoundException('Yêu cầu không tồn tại.');
    if (request.status !== RequestStatus.PENDING) throw new BadRequestException('Yêu cầu này đã được xử lý.');

    const canReview = await this.permissionService.checkUserPermissionForNode(reviewer, request.nodeId, PermissionLevel.OWNER);
    if (!canReview) throw new ForbiddenException('Bạn không có quyền xử lý yêu cầu cho mục này.');

    return request;
  }


  private async sendResultNotification(request: AccessRequest) {
    try {
      const [requester, node] = await Promise.all([
        this.usersService.findById(request.requesterId.toHexString()),
        this.nodeService.findById(request.nodeId),
      ]);

      console.log("request", request);
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
