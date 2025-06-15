# Giải thích các công việc (task) trong dự án Hệ thống Quản lý Tài liệu Phân cấp

## EPIC 0: Quản lý Người dùng và Xác thực
- **Task 0.1: Khởi tạo Root Admin**
  - Tạo migration và seed dữ liệu để sinh user Root Admin mặc định khi deploy.
- **Task 0.2: Trang đăng nhập**
  - Xây dựng API và giao diện đăng nhập, xác thực JWT.
- **Task 0.3: Quản lý người dùng (CRUD)**
  - API cho Root Admin tạo, sửa, vô hiệu hóa/kích hoạt user.
  - Giao diện quản lý user.
- **Task 0.4: Vô hiệu hóa/Kích hoạt user**
  - API toggle status, cập nhật trạng thái active/inactive.
- **Task 0.5: Đổi mật khẩu lần đầu**
  - Logic kiểm tra first login, bắt buộc đổi mật khẩu.

## EPIC 1: Quản lý Cấu trúc Thư mục và Tài liệu
- **Task 1.1: Xem cây thư mục**
  - API trả về cây thư mục theo quyền truy cập.
  - Giao diện hiển thị dạng tree.
- **Task 1.2: CRUD Thư mục**
  - API tạo, đổi tên, di chuyển, xóa thư mục.
- **Task 1.3: CRUD Tài liệu**
  - API tạo, xem, sửa, xóa, di chuyển tài liệu.
- **Task 1.4: Version tracking tài liệu**
  - Lưu lịch sử chỉnh sửa, cho phép xem lại các phiên bản.

## EPIC 2: Hệ thống Phân quyền Linh hoạt
- **Task 2.1: Gán quyền cho user**
  - API cho Owner cấp quyền Viewer/Editor cho user khác.
- **Task 2.2: Thu hồi/chỉnh sửa quyền**
  - API thay đổi hoặc thu hồi quyền đã cấp.
- **Task 2.3: Kiểm tra quyền truy cập**
  - Logic kiểm tra quyền tường minh, không kế thừa.
- **Task 2.4: Quyền Root Admin**
  - Cho phép Root Admin truy cập toàn bộ hệ thống.

## EPIC 3: Tìm kiếm, Khám phá và Yêu cầu Truy cập
- **Task 3.1: Tìm kiếm tài liệu**
  - API tìm kiếm toàn văn và theo tiêu đề.
  - Giao diện thanh tìm kiếm.
- **Task 3.2: Hiển thị kết quả tìm kiếm**
  - Chỉ trả về tiêu đề và trạng thái truy cập.
- **Task 3.3: Gửi yêu cầu truy cập**
  - API và form gửi yêu cầu quyền truy cập.
- **Task 3.4: Chọn phạm vi yêu cầu quyền**
  - Cho phép chọn chỉ thư mục này hoặc cả thư mục con.

## EPIC 4: Quản lý và Phê duyệt Yêu cầu
- **Task 4.1: Nhận thông báo yêu cầu mới**
  - Gửi email/notification cho Owner khi có yêu cầu mới.
- **Task 4.2: Quản lý yêu cầu truy cập**
  - Giao diện và API xem, xử lý các yêu cầu.
- **Task 4.3: Phê duyệt/Từ chối yêu cầu**
  - API cập nhật trạng thái yêu cầu, cấp quyền nếu phê duyệt.

## EPIC 5: Thông báo và Lịch sử Hoạt động
- **Task 5.1: Tích hợp Queue (BullMQ/Kafka)**
  - Thiết lập queue cho các tác vụ nền (gửi email, v.v.).
- **Task 5.2: Gửi email thông báo**
  - Gửi email khi có sự kiện quan trọng (tạo user, yêu cầu truy cập, phê duyệt, ...).
- **Task 5.3: Lịch sử chỉnh sửa tài liệu (Optional)**
  - API và giao diện xem lịch sử chỉnh sửa tài liệu.

---

Mỗi task trên có thể được chia nhỏ hơn khi thực hiện, tùy vào quy mô và tiến độ dự án.
