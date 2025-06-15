Chi tiết triển khai theo User Story - Hệ thống Quản lý Tài liệu Phân cấp
🏗️ Setup Project Foundation (Ngày 0)
Pre-development Setup

NestJS Project Initialization (2h)

nest new hierarchical-document-system
Setup TypeScript configuration
Configure ESLint + Prettier theo Google TypeScript Style Guide
Setup Git hooks với husky


MongoDB & TypeORM Setup (2h)

Cài đặt dependencies: @nestjs/typeorm, typeorm, mongodb
Cấu hình TypeORM module với MongoDB
Setup environment configuration
Docker compose cho MongoDB (optional)


Project Structure (2h)
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── nodes/
│   ├── permissions/
│   └── queue/
├── entities/
├── dto/
├── guards/
├── decorators/
├── utils/
└── database/
    └── seeders/

Base Infrastructure (2h)

Setup Swagger documentation
Configure global pipes (validation, transform)
Setup global exception filters
Create base response DTOs




EPIC 0: Quản lý Người dùng và Xác thực (5 ngày)
Story 0.1: Khởi tạo Root Admin (1 ngày)
Task 0.1.1: Setup User Entity & Database (4h)
Deliverables:

✅ User entity với validation
✅ Database connection
✅ Seeder script
✅ Unit tests

Implementation:
typescript// src/entities/user.entity.ts
@Entity('users')
export class User {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column({ unique: true })
  @Length(3, 50)
  username: string;

  @Column()
  hashedPassword: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  mustChangePassword: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
Files to create:

src/entities/user.entity.ts
src/database/seeders/root-admin.seeder.ts
src/modules/users/users.module.ts
test/unit/entities/user.entity.spec.ts

Task 0.1.2: Authentication Foundation (4h)
Deliverables:

✅ JWT strategy setup
✅ Auth module structure
✅ Password utilities
✅ Integration tests

Files to create:

src/modules/auth/auth.module.ts
src/modules/auth/jwt.strategy.ts
src/utils/password.util.ts
src/guards/jwt-auth.guard.ts
test/integration/auth/auth.spec.ts

Story 0.2 & 0.3: Authentication & User Management (2 ngày)
Task 0.2.1: User Service Implementation (1 ngày)
Deliverables:

✅ Complete User CRUD operations
✅ Password hashing integration
✅ Role-based validation
✅ Comprehensive unit tests

Implementation Details:
typescript// src/modules/users/users.service.ts
@Injectable()
export class UsersService {
  async createUser(createUserDto: CreateUserDto): Promise<User>
  async findById(id: string): Promise<User>
  async findByEmail(email: string): Promise<User>
  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User>
  async deleteUser(id: string): Promise<void>
  async toggleUserStatus(id: string): Promise<User>
  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void>
}
Files to create:

src/modules/users/users.service.ts
src/modules/users/users.controller.ts
src/modules/users/dto/create-user.dto.ts
src/modules/users/dto/update-user.dto.ts
src/modules/users/dto/change-password.dto.ts
test/unit/users/users.service.spec.ts

Task 0.2.2: Authentication APIs (1 ngày)
Deliverables:

✅ Login/Logout endpoints
✅ JWT token management
✅ Role-based guards
✅ Integration tests

API Endpoints:
typescriptPOST /auth/login
POST /auth/logout
GET /auth/profile
POST /auth/change-password
Files to create:

src/modules/auth/auth.service.ts
src/modules/auth/auth.controller.ts
src/modules/auth/dto/login.dto.ts
src/guards/roles.guard.ts
src/decorators/roles.decorator.ts
test/integration/auth/auth.controller.spec.ts

Story 0.4 & 0.5: User Account Management (2 ngày)
Task 0.4.1: Account Status Management (1 ngày)
Deliverables:

✅ Toggle user status API
✅ Event system for status changes
✅ Email notifications setup
✅ Unit tests

Files to create:

src/modules/users/users.controller.ts (extended)
src/modules/users/events/user-status-changed.event.ts
src/modules/users/listeners/user-status.listener.ts
test/unit/users/user-status.spec.ts

Task 0.4.2: First Login Flow (1 ngày)
Deliverables:

✅ Force password change logic
✅ First login detection
✅ Security validations
✅ Integration tests

Files to create:

src/guards/first-login.guard.ts
src/modules/auth/dto/first-login.dto.ts
test/integration/auth/first-login.spec.ts


EPIC 1: Quản lý Cấu trúc Thư mục và Tài liệu (7 ngày)
Story 1.1: Xem cấu trúc cây thư mục (3 ngày)
Task 1.1.1: Node Entity & Schema Design (1 ngày)
Deliverables:

✅ Node entity (folders + files)
✅ Permission embedding structure
✅ Tree relationship setup
✅ Schema validation tests

Implementation:
typescript// src/entities/node.entity.ts
@Entity('nodes')
export class Node {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  @Length(1, 255)
  name: string;

  @Column({ type: 'enum', enum: NodeType })
  type: NodeType;

  @Column({ nullable: true })
  parentId: ObjectId | null;

  @Column({ default: [] })
  path: ObjectId[]; // Materialized path

  @Column({ default: 0 })
  level: number;

  // File-specific fields
  @Column({ nullable: true })
  content: string | null;

  @Column({ nullable: true })
  mimeType: string | null;

  @Column({ nullable: true })
  fileSize: number | null;

  @Column({ default: 1 })
  version: number;

  // Embedded permissions
  @Column({ default: [] })
  permissions: Permission[];

  @Column()
  createdBy: ObjectId;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
Files to create:

src/entities/node.entity.ts
src/entities/permission.interface.ts
src/modules/nodes/nodes.module.ts
test/unit/entities/node.entity.spec.ts

Task 1.1.2: Tree Service & Query Optimization (2 ngày)
Deliverables:

✅ Efficient tree traversal logic
✅ Permission-aware queries
✅ Caching implementation
✅ Performance tests

Implementation:
typescript// src/modules/nodes/services/tree.service.ts
@Injectable()
export class TreeService {
  async getNodeTree(rootId: string, userId: ObjectId, user: User): Promise<TreeNode[]>
  async getNodePath(nodeId: string): Promise<Node[]>
  async getNodeChildren(parentId: string, userId: ObjectId): Promise<Node[]>
  async getNodeAncestors(nodeId: string): Promise<Node[]>
  async getNodeDescendants(nodeId: string): Promise<Node[]>
  async moveNode(nodeId: string, newParentId: string): Promise<Node>
  private updateChildrenPaths(node: Node): Promise<void>
}
Files to create:

src/modules/nodes/services/tree.service.ts
src/modules/nodes/dto/tree-node.dto.ts
src/modules/nodes/services/cache.service.ts
test/unit/nodes/tree.service.spec.ts
test/performance/tree-queries.spec.ts

Story 1.2: CRUD Operations (4 ngày)
Task 1.2.1: Directory Operations (2 ngày)
Deliverables:

✅ Complete folder CRUD APIs
✅ Tree manipulation logic
✅ Permission validation
✅ Transaction handling

API Endpoints:
typescriptPOST /nodes/folders                    // Create folder
GET /nodes/folders/:id                 // Get folder details
GET /nodes/folders/:id/children        // Get folder contents
PUT /nodes/folders/:id                 // Update folder
DELETE /nodes/folders/:id              // Delete folder
POST /nodes/folders/:id/move           // Move folder
Files to create:

src/modules/nodes/services/folder.service.ts
src/modules/nodes/controllers/folder.controller.ts
src/modules/nodes/dto/create-folder.dto.ts
src/modules/nodes/dto/update-folder.dto.ts
src/modules/nodes/dto/move-node.dto.ts
test/integration/nodes/folder.controller.spec.ts

Task 1.2.2: Document Operations (2 ngày)
Deliverables:

✅ Complete file CRUD APIs
✅ Content management
✅ Version tracking
✅ File metadata handling

API Endpoints:
typescriptPOST /nodes/files                      // Create file
GET /nodes/files/:id                   // Get file content
PUT /nodes/files/:id                   // Update file
DELETE /nodes/files/:id                // Delete file
GET /nodes/files/:id/versions          // Get file versions
POST /nodes/files/:id/move             // Move file
Files to create:

src/modules/nodes/services/file.service.ts
src/modules/nodes/controllers/file.controller.ts
src/modules/nodes/dto/create-file.dto.ts
src/modules/nodes/dto/update-file.dto.ts
test/integration/nodes/file.controller.spec.ts


EPIC 2: Hệ thống Phân quyền (5 ngày)
Story 2.1 & 2.2: Permission Management (3 ngày)
Task 2.1.1: Permission System Core (2 ngày)
Deliverables:

✅ Permission service implementation
✅ Grant/revoke APIs
✅ Permission inheritance logic
✅ Comprehensive unit tests

Implementation:
typescript// src/modules/permissions/permissions.service.ts
@Injectable()
export class PermissionsService {
  async grantPermission(nodeId: string, userId: string, permission: PermissionType, grantedBy: ObjectId): Promise<void>
  async revokePermission(nodeId: string, userId: string): Promise<void>
  async checkPermission(nodeId: string, userId: ObjectId, requiredPermission: PermissionType): Promise<boolean>
  async getUserPermissions(userId: string): Promise<NodePermission[]>
  async getNodePermissions(nodeId: string): Promise<Permission[]>
  async bulkGrantPermissions(requests: BulkPermissionRequest[]): Promise<void>
}
Files to create:

src/modules/permissions/permissions.module.ts
src/modules/permissions/permissions.service.ts
src/modules/permissions/permissions.controller.ts
src/modules/permissions/dto/grant-permission.dto.ts
src/modules/permissions/dto/bulk-permission.dto.ts
test/unit/permissions/permissions.service.spec.ts

Task 2.1.2: Permission Guards & Validation (1 ngày)
Deliverables:

✅ Custom permission guards
✅ Permission caching system
✅ Integration tests

Files to create:

src/guards/permissions.guard.ts
src/decorators/require-permission.decorator.ts
src/modules/permissions/services/permission-cache.service.ts
test/integration/permissions/permissions.guard.spec.ts

Story 2.3-2.5: Advanced Permission Features (2 ngày)
Task 2.3.1: Root Admin Global Access (1 ngày)
Deliverables:

✅ Root admin bypass logic
✅ Override mechanisms
✅ Security tests

Files to create:

src/guards/root-admin.guard.ts
src/modules/permissions/services/admin-override.service.ts
test/unit/permissions/admin-override.spec.ts

Task 2.3.2: Permission Query Optimization (1 ngày)
Deliverables:

✅ Optimized permission queries
✅ Caching strategies
✅ Performance benchmarks

Files to create:

src/modules/permissions/services/permission-optimizer.service.ts
test/performance/permission-queries.spec.ts


EPIC 3: Search & Discovery (3 ngày)
Story 3.1 & 3.2: Search Implementation
Task 3.1.1: Full-text Search Service (2 ngày)
Deliverables:

✅ MongoDB text search setup
✅ Search API implementation
✅ Permission-aware filtering
✅ Search result optimization

Implementation:
typescript// src/modules/search/search.service.ts
@Injectable()
export class SearchService {
  async searchNodes(query: string, userId: ObjectId, user: User): Promise<SearchResult[]>
  async searchInFolder(folderId: string, query: string, userId: ObjectId): Promise<SearchResult[]>
  async advancedSearch(criteria: SearchCriteria, userId: ObjectId): Promise<SearchResult[]>
  private filterByPermissions(results: Node[], userId: ObjectId, user: User): Promise<SearchResult[]>
  private buildSearchQuery(criteria: SearchCriteria): any
}
API Endpoints:
typescriptGET /search?q=keyword                  // Basic search
POST /search/advanced                  // Advanced search
GET /search/folder/:id?q=keyword       // Search in folder
Files to create:

src/modules/search/search.module.ts
src/modules/search/search.service.ts
src/modules/search/search.controller.ts
src/modules/search/dto/search.dto.ts
src/modules/search/dto/search-result.dto.ts
test/unit/search/search.service.spec.ts

Task 3.1.2: Search Result Processing (1 ngày)
Deliverables:

✅ Result formatting service
✅ Permission status calculation
✅ Integration tests

Files to create:

src/modules/search/services/result-processor.service.ts
test/integration/search/search.controller.spec.ts


EPIC 4: Access Request System (4 ngày)
Story 4.1-4.4: Request Management
Task 4.1.1: Access Request Entity & Service (2 ngày)
Deliverables:

✅ AccessRequest entity
✅ Request workflow service
✅ Email notification integration
✅ Unit tests

Files to create:

src/entities/access-request.entity.ts
src/modules/access-requests/access-requests.module.ts
src/modules/access-requests/access-requests.service.ts
src/modules/access-requests/dto/create-request.dto.ts
src/modules/access-requests/dto/review-request.dto.ts

Task 4.1.2: Request Management APIs (2 ngày)
Deliverables:

✅ Complete request management APIs
✅ Approval/rejection workflow
✅ Auto-permission granting
✅ Integration tests

API Endpoints:
typescriptPOST /access-requests                  // Create request
GET /access-requests                   // Get user's requests
GET /access-requests/pending           // Get pending requests for review
PUT /access-requests/:id/approve       // Approve request
PUT /access-requests/:id/reject        // Reject request

EPIC 5: Notifications & Background Jobs (3 ngày)
Story 5.1-5.4: Queue & Email System
Task 5.1.1: Queue System Setup (1 ngày)
Deliverables:

✅ BullMQ integration
✅ Queue configuration
✅ Job processors
✅ Monitoring setup

Files to create:

src/modules/queue/queue.module.ts
src/modules/queue/services/queue.service.ts
src/modules/queue/processors/email.processor.ts
src/modules/queue/dto/email-job.dto.ts

Task 5.1.2: Email Service Implementation (2 ngày)
Deliverables:

✅ Email service with templates
✅ Queue integration
✅ Retry mechanism
✅ Email tracking

Files to create:

src/modules/email/email.module.ts
src/modules/email/email.service.ts
src/modules/email/templates/
src/modules/email/dto/send-email.dto.ts


📋 Testing Strategy
Unit Tests (Parallel với development)

Coverage Target: 90%+
Tools: Jest, @nestjs/testing
Focus: Services, utilities, guards

Integration Tests

Database: MongoDB Memory Server
API: Supertest
Focus: Controllers, workflows

E2E Tests

Environment: Docker containers
Focus: Complete user journeys


🚀 Deployment & DevOps
CI/CD Pipeline
yaml# .github/workflows/ci.yml
- Build & Test
- Security Scan
- Docker Build
- Deploy to Staging
- E2E Tests
- Deploy to Production
Monitoring Setup

Health Checks: /health
Metrics: Prometheus + Grafana
Logging: Winston + ELK Stack
Error Tracking: Sentry


📊 Timeline Summary
EpicDurationDependenciesSetup1 ngàyNoneEPIC 05 ngàySetupEPIC 17 ngàyEPIC 0EPIC 25 ngàyEPIC 1EPIC 33 ngàyEPIC 2EPIC 44 ngàyEPIC 2, 3EPIC 53 ngàyAll EPICs
Tổng thời gian: 28 ngày làm việc (~6 tuần)

🎯 Success Criteria
Technical Metrics

✅ 90%+ test coverage
✅ API response time < 200ms
✅ Search queries < 100ms
✅ 99.9% uptime target

Functional Requirements

✅ All user stories completed
✅ Permission system working correctly
✅ Search functionality accurate
✅ Email notifications delivered
✅ Audit trail complete

Code Quality

✅ ESLint violations: 0
✅ TypeScript strict mode
✅ API documentation complete
✅ Error handling comprehensive