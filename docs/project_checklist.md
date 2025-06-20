# Tài liệu Kế hoạch Triển khai – Hệ thống Quản lý Tài liệu Phân cấp

**Phiên bản:** 1.0
**Ngày:** 20/06/2025

## 1. Tổng quan & Kiến trúc đã chọn

Tài liệu này vạch ra các bước cần thiết để triển khai dự án "Hệ thống Quản lý Tài liệu Phân cấp" dựa trên các yêu cầu đã được định nghĩa.

**Kiến trúc kỹ thuật cốt lõi đã được thống nhất:**
- **CSDL:** MongoDB
- **Framework:** NestJS với TypeORM
- **Mô hình cây:** Sử dụng pattern **Array of Ancestors** để lưu trữ và truy vấn cấu trúc thư mục đa cấp hiệu quả.
- **Mô hình phân quyền:** Sử dụng mô hình **Tham chiếu (Access Control List - ACL)** với collection `Permissions` riêng biệt để đáp ứng yêu cầu phân quyền chi tiết, không kế thừa.
- **Tối ưu truy vấn:** Sử dụng pattern **"Gộp dữ liệu ở tầng ứng dụng" (Application-Side Join)** thay vì `$lookup` để đảm bảo hiệu năng cao.
- **Bảo mật:** Sử dụng **Guards** tập trung (`JwtAuthGuard`, `RolesGuard`, `PermissionGuard`) để bảo vệ các endpoint.

---

## 2. Lộ trình Triển khai theo Giai đoạn & Checklist

### Giai đoạn 0: Nền tảng & Quản lý Người dùng (EPIC 0)

- [x] Setup dự án NestJS, TypeORM, kết nối MongoDB.
- [x] Hoàn thiện `User` Entity.
- [x] Hoàn thiện các DTOs cơ bản cho User (Create, Update).
- [x] Hoàn thiện `UsersService` và `UsersController` cho các thao tác CRUD cơ bản.
- [ ] **(Cần hoàn thiện)** Triển khai `AuthModule` với `LocalStrategy` và `JwtStrategy`.
- [ ] **(Cần hoàn thiện)** Trong `LocalStrategy`, đảm bảo đã có logic kiểm tra `user.isActive` để chặn người dùng bị vô hiệu hóa đăng nhập.
- [ ] **(Cần hoàn thiện)** Triển khai endpoint `PATCH /users/:id/status` và `RolesGuard` để `Root Admin` có thể vô hiệu hóa/kích hoạt tài khoản.

### Giai đoạn 1: Xây dựng Cây thư mục (EPIC 1)

- [ ] **Task 1.1: Tạo `Node` Entity.**
  - Tạo file `src/nodes/entities/node.entity.ts` với đầy đủ các trường: `_id`, `name`, `type`, `content`, `parentId`, `createdBy`, và `ancestors: Ancestor[]`.

- [ ] **Task 1.2: Tạo DTOs cho `Node`.**
  - Tạo thư mục `src/nodes/dto`.
  - Tạo `create-node.dto.ts` (chứa `name`, `type`, `parentId`).
  - Tạo `update-node.dto.ts` (chứa `name`, `content`).

- [ ] **Task 1.3: Triển khai `NodesService`.**
  - Tạo `src/nodes/nodes.service.ts`.
  - Viết phương thức `create(dto, user)` với logic tính toán `ancestors` và tự động cấp quyền `Owner` cho người tạo.
  - Viết các phương thức `update(nodeId, dto, user)`, `findOne(nodeId)`, và `findChildren(parentId)`.

- [ ] **Task 1.4: Triển khai `NodesController`.**
  - Tạo `src/nodes/nodes.controller.ts`.
  - Tạo các endpoint cơ bản: `POST /nodes`, `GET /nodes?parentId=...`, `GET /nodes/:id`, `PATCH /nodes/:id`. (Chưa cần Guard).

### Giai đoạn 2: Tích hợp Phân quyền Linh hoạt (EPIC 2)

- [ ] **Task 2.1: Tạo `Permission` Entity.**
  - Tạo file `src/permissions/entities/permission.entity.ts` với các trường cần thiết.

- [ ] **Task 2.2: Triển khai `PermissionsService`.**
  - Tạo `src/permissions/permissions.service.ts`.
  - Viết các phương thức `grant(dto, granter)`, `revoke(permissionId, revoker)`, và hàm lõi `checkUserPermissionForNode(...)`.

- [ ] **Task 2.3: Xây dựng Guard Phân quyền.**
  - Tạo `PermissionGuard` và decorator `@RequiredPermission(...)`.

- [ ] **Task 2.4: Áp dụng Guards vào các Controllers.**
  - Quay lại `NodesController`, `UsersController` và áp dụng các Guard (`JwtAuthGuard`, `RolesGuard`, `PermissionGuard`) vào các route cần bảo vệ.

- [ ] **Task 2.5: Hoàn thiện `NodesService` (Move, Delete).**
  - Triển khai phương thức `move(nodeId, newParentId, user)` với logic tối ưu `updateMany`.
  - Triển khai phương thức `delete(nodeId, user)` với logic xóa các `permissions` liên quan.

### Giai đoạn 3: Tìm kiếm, Khám phá và Yêu cầu Truy cập (EPIC 3 & 4)

- [ ] **Task 3.1: Triển khai Full-text Search.**
  - Tạo Text Index trong MongoDB.
  - Tạo `SearchService` và `SearchController`.
  - Áp dụng pattern Application-Side Join để gán `trạng thái truy cập` vào kết quả tìm kiếm.

- [ ] **Task 3.2: Tạo `AccessRequest` Module.**
  - Triển khai đầy đủ Entity, DTO, Service, Controller.
  - Viết logic `approveRequest` (sẽ gọi `PermissionsService.grant`) và `denyRequest`.
  - Viết logic `grantRecursivePermission` cho các yêu cầu đệ quy.

### Giai đoạn 4: Thông báo và Hoàn thiện (EPIC 5)

- [ ] **Task 4.1: Tích hợp BullMQ và Redis.**
- [ ] **Task 4.2: Gửi email thông báo.**
  - Tích hợp việc thêm job vào queue trong `AccessRequestsService` và `UsersService`.
- [ ] **(Tùy chọn)** Task 4.3: Triển khai Lịch sử thay đổi (R18).