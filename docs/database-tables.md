# Danh sách các bảng (collections) cần có trong dự án Hierarchical Document Management System

Dựa trên thiết kế cơ sở dữ liệu (ERD) và yêu cầu nghiệp vụ, hệ thống cần các bảng/collection chính sau:

## 1. USERS
- id (ObjectId, PK)
- email (string)
- username (string)
- hashPassword (string)
- role (enum: root_admin, user)
- isActive (boolean)
- mustChangePassword (boolean)
- createdAt (datetime)
- updatedAt (datetime)

## 2. EMAIL_QUEUE
- id (ObjectId, PK)
- to (string)
- subject (string)
- body (string)
- status (enum: pending, sent, failed)
- retryCount (int)
- scheduleAt (datetime, nullable)
- errorMessage (string, nullable)
- createdAt (datetime)

## 3. NODES
- id (ObjectId, PK)
- name (string)
- type (enum: folder, file)
- parentId (ObjectId, nullable, self-reference)
- path (array, ObjectId)
- level (int)
- content (string, nullable, for files)
- fileSize (int, nullable, for files)
- version (int, for files, default 1)
- permissions (array, embedded permissions)
- createdBy (ObjectId)
- createdAt (datetime)
- updatedAt (datetime)

## 4. PERMISSIONS_EMBEDDED
- userId (ObjectId)
- type (enum: viewer, editor, owner)
- grantedBy (ObjectId)

## 5. ACCESS_REQUESTS
- id (ObjectId, PK)
- nodeId (ObjectId)
- requesterId (ObjectId)
- type (enum: viewer, editor)
- includeChildren (boolean)
- status (enum: pending, approved, rejected)
- reviewedBy (ObjectId, nullable)
- reviewedAt (datetime, nullable)
- createdAt (datetime)
- updatedAt (datetime)

## 6. ACTIVITY_LOGS
- id (ObjectId, PK)
- nodeId (ObjectId, nullable)
- userId (ObjectId)
- action (enum: create, update, delete, move, grant_permission, revoke_permission, ...)
- details (string, action details)
- createdAt (datetime)

---

**Ghi chú:**
- Một số bảng như `PERMISSIONS_EMBEDDED` có thể được nhúng trực tiếp trong bảng `NODES` (embedded document).
- Các bảng này có thể được triển khai dưới dạng collection trong MongoDB.
- Có thể mở rộng thêm bảng/collection nếu phát sinh nghiệp vụ mới.
