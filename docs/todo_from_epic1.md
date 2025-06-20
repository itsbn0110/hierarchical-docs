# Checklist & Solution Chi tiết Triển khai từ User Story 1 trở đi (EPIC 1+)

## Tổng quan & Nguyên tắc
- Dùng chung 1 collection `node` cho cả folder/document, phân biệt qua trường `type`.
- API CRUD node kiểm tra type để xử lý logic đặc thù (ví dụ: content chỉ cho document, không xóa folder nếu còn con).
- Quyền truy cập không kế thừa, kiểm tra tường minh từng node.
- Tìm kiếm toàn văn cho phép user thấy tài liệu chưa có quyền, nhưng chỉ trả về tiêu đề và trạng thái truy cập.
- Khi gửi yêu cầu truy cập, Owner sẽ duyệt và hệ thống tự động cấp quyền nếu được duyệt.
- Tích hợp queue (BullMQ/Redis) để gửi email thông báo các sự kiện quan trọng.

---

## EPIC 1: Quản lý Cấu trúc Thư mục & Tài liệu
- [ ] Thiết kế, hoàn thiện Node entity (dùng chung cho folder/document, phân biệt qua type)
- [ ] API tạo node mới (validate type, cập nhật ancestors, kiểm tra quyền Editor/Owner)
- [ ] API xem cây thư mục (chỉ trả về node user có quyền truy cập)
- [ ] API sửa node (đổi tên, cập nhật nội dung, kiểm tra quyền)
- [ ] API xóa node (kiểm tra quyền, không xóa folder nếu còn con)
- [ ] API di chuyển node (cập nhật parentId, ancestors, kiểm tra quyền)
- [ ] Test unit/integration cho Node module
- [ ] Tài liệu hóa API Node (Swagger)

### Gợi ý giải pháp & logic:
- Khi tạo node mới, nếu là document thì cần trường content, nếu là folder thì không cần.
- Khi lấy cây thư mục, user chỉ thấy các node mình có quyền, Root Admin thấy toàn bộ (xem logic lazy-loading và đệ quy trong solution.md).
- Khi xóa folder, kiểm tra không còn node con mới cho xóa.
- Khi di chuyển node, cập nhật lại ancestors cho node và toàn bộ con cháu.

---

## EPIC 2: Hệ thống Phân quyền
- [ ] Thiết kế, hoàn thiện Permission entity/module
- [ ] API cấp quyền (Owner cấp quyền Viewer/Editor cho user khác)
- [ ] API thu hồi/thay đổi quyền
- [ ] API lấy danh sách quyền của user trên từng node
- [ ] Guard kiểm tra quyền tường minh cho từng API thao tác node
- [ ] Logic Root Admin luôn có quyền truy cập toàn hệ thống
- [ ] Test unit/integration cho Permission module
- [ ] Tài liệu hóa API Permission (Swagger)

### Gợi ý giải pháp & logic:
- Quyền được gán tường minh trên từng node, không kế thừa từ cha.
- Khi cấp quyền đệ quy, cần lặp qua toàn bộ cây con (xem ví dụ assignRecursivePermission trong question.md).
- Root Admin bypass mọi kiểm tra quyền.

---

## EPIC 3: Tìm kiếm & Yêu cầu Truy cập
- [ ] API tìm kiếm toàn văn, theo tiêu đề (chỉ trả về tiêu đề, trạng thái truy cập)
- [ ] API gửi yêu cầu truy cập (AccessRequest)
- [ ] API duyệt/từ chối yêu cầu truy cập (Owner xử lý)
- [ ] Khi duyệt, tự động cấp quyền tương ứng
- [ ] API lấy danh sách yêu cầu đã gửi/đang chờ xử lý
- [ ] Test unit/integration cho Search & AccessRequest
- [ ] Tài liệu hóa API Search & AccessRequest (Swagger)

### Gợi ý giải pháp & logic:
- Tạo chỉ mục text index trên các trường cần tìm kiếm (xem solution.md).
- Khi user tìm kiếm, trả về cả tài liệu chưa có quyền, chỉ hiển thị tiêu đề và trạng thái truy cập.
- Cho phép gửi yêu cầu truy cập ngay trên kết quả tìm kiếm nếu chưa có quyền.

---

## EPIC 4: Thông báo & Queue (Optional)
- [ ] Tích hợp BullMQ/Redis cho queue gửi email
- [ ] Xây dựng email service, template, retry, tracking
- [ ] Gửi email khi có yêu cầu truy cập mới, khi được duyệt/từ chối, khi tạo user mới
- [ ] (Optional) Ghi nhận lịch sử thao tác (audit trail)
- [ ] Test cho queue/email

### Gợi ý giải pháp & logic:
- Khi có yêu cầu truy cập mới, thêm job vào queue gửi email cho Owner (xem solution.md về BullMQ + Brevo).
- Worker xử lý job gửi email qua API Brevo.

---

## Testing & DevOps
- [ ] Viết unit test, integration test, e2e test cho các module mới
- [ ] Đảm bảo coverage cao, CI/CD pipeline, logging, monitoring

---

**Lưu ý thực thi:**
- Mỗi API đều cần kiểm tra quyền, validate đầu vào, chuẩn hóa response, tài liệu hóa Swagger.
- Ưu tiên hoàn thiện từng EPIC theo đúng thứ tự ưu tiên của tài liệu.
- Tham khảo thêm các đoạn code mẫu, giải thích logic, best practice trong file solution.md và question.md để tối ưu quá trình phát triển.
