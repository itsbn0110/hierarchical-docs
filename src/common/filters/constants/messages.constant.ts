export const ErrorMessages = {
    // Auth related
    INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không đúng',
    USER_NOT_FOUND: 'Không tìm thấy người dùng hoặc người dùng đã bị vô hiệu hóa',
    UNAUTHORIZED: 'Không có quyền truy cập',
    TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn',
    
    // User related
    USERNAME_AREADY_EXISTS: 'Tên đăng nhập đã tồn tại',
    EMAIL_ALREADY_EXISTS: 'Email đã được sử dụng',
    INVALID_PASSWORD: 'Mật khẩu phải có ít nhất 8 ký tự',
    INVALID_EMAIL: 'Email không đúng định dạng',
    INVALID_USERNAME: 'Tên người dùng không hợp lệ',
    USERNAME_REQUIRED: 'Tên người dùng không được để trống',
    EMAIL_REQUIRED: 'Email không được để trống',
    PASSWORD_REQUIRED: 'Mật khẩu không được để trống',
    ROLE_REQUIRED: 'Vai trò không được để trống',
    INVALID_ROLE: 'Vai trò không hợp lệ',
    CANNOT_CREATE_USER: 'Tạo User mới thất bại!',
    
    // Permission related
    INSUFFICIENT_PERMISSIONS: 'Bạn không có đủ quyền để thực hiện hành động này',
    ACCESS_DENIED: 'Từ chối truy cập vào tài nguyên này',
    
    // Document related
    DOCUMENT_NOT_FOUND: 'Không tìm thấy tài liệu',
    FOLDER_NOT_FOUND: 'Không tìm thấy thư mục',
    INVALID_DOCUMENT_TYPE: 'Loại tài liệu không hợp lệ',
    
    // Request related
    REQUEST_LIMIT_EXCEEDED: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
    INVALID_REQUEST: 'Yêu cầu không hợp lệ',
    
    // General
    INTERNAL_SERVER_ERROR: 'Đã xảy ra lỗi hệ thống',
    BAD_REQUEST: 'Yêu cầu không hợp lệ',
    VALIDATION_ERROR: 'Lỗi xác thực dữ liệu'
} as const;

export const SuccessMessages = {
    // Auth related
    LOGIN_SUCCESS: 'Đăng nhập thành công',
    LOGOUT_SUCCESS: 'Đăng xuất thành công',
    PASSWORD_CHANGED: 'Đổi mật khẩu thành công',
    
    // User related
    USER_CREATED: 'Tạo người dùng thành công',
    USER_UPDATED: 'Cập nhật thông tin người dùng thành công',
    
    // Document related
    DOCUMENT_CREATED: 'Tạo tài liệu thành công',
    DOCUMENT_UPDATED: 'Cập nhật tài liệu thành công',
    DOCUMENT_DELETED: 'Xóa tài liệu thành công',
    
    // Permission related
    PERMISSION_GRANTED: 'Cấp quyền thành công',
    PERMISSION_REVOKED: 'Thu hồi quyền thành công'
} as const;
