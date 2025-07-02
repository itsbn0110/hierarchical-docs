export const ErrorMessages = {
  // Auth related
  INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không đúng',
  USER_NOT_FOUND: 'Không tìm thấy người dùng hoặc người dùng đã bị vô hiệu hóa',
  UNAUTHORIZED: 'Không có quyền truy cập',
  TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn',
  MUST_CHANGE_PASSWORD: 'Bạn phải đổi mật khẩu trước khi có thể thực hiện các hành động khác.',
  INVALID_OLD_PASSWORD: 'Mật khẩu cũ không chính xác.',

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
  ACCOUNT_DISABLED: 'Tài khoản của bạn đã bị vô hiệu hóa.',
  CANNOT_DELETE_SELF: 'Bạn không thể tự xóa tài khoản của chính mình.',

  // Permission related
  INSUFFICIENT_PERMISSIONS: 'Bạn không có đủ quyền để thực hiện hành động này',
  ACCESS_DENIED: 'Từ chối truy cập vào tài nguyên này',
  ALREADY_HAS_PERMISSION: 'Bạn đã có quyền truy cập vào mục này rồi.',
  CANNOT_CHANGE_OWN_PERMISSION: 'Bạn không thể tự thay đổi quyền của chính mình.',
  ONLY_OWNER_CAN_GRANT: 'Chỉ chủ sở hữu mới có quyền cấp quyền cho mục này.',
  CANNOT_CHANGE_OTHER_OWNER: 'Bạn không có quyền thay đổi quyền của một Owner khác.',
  PERMISSION_NOT_FOUND: 'Quyền này không tồn tại.',
  ONLY_OWNER_CAN_REVOKE: 'Chỉ chủ sở hữu mới có quyền thu hồi quyền trên mục này.',
  CANNOT_REVOKE_OTHER_OWNER: 'Bạn không có quyền thu hồi quyền của một Owner khác.',
  // eslint-disable-next-line max-len
  CANNOT_DELETE_LAST_OWNER:
    'Không thể xóa chủ sở hữu cuối cùng của mục này. Hãy chuyển quyền sở hữu cho người khác trước.',

  // Document related
  DOCUMENT_NOT_FOUND: 'Không tìm thấy tài liệu',
  FOLDER_NOT_FOUND: 'Không tìm thấy thư mục',
  INVALID_DOCUMENT_TYPE: 'Loại tài liệu không hợp lệ',

  // Request related
  REQUEST_LIMIT_EXCEEDED: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
  INVALID_REQUEST: 'Yêu cầu không hợp lệ',
  PENDING_REQUEST_EXISTS: 'Bạn đã gửi một yêu cầu cho mục này và đang chờ xử lý.',
  REQUEST_NOT_FOUND: 'Yêu cầu không tồn tại.',
  REQUEST_ALREADY_PROCESSED: 'Yêu cầu này đã được xử lý.',

  // General
  INTERNAL_SERVER_ERROR: 'Đã xảy ra lỗi hệ thống',
  BAD_REQUEST: 'Yêu cầu không hợp lệ',
  VALIDATION_ERROR: 'Lỗi xác thực dữ liệu',
  ROOTADMIN_ISNOT_DEFINED:
    'ROOT_ADMIN_EMAIL, ROOT_ADMIN_USERNAME, hoặc ROOT_ADMIN_PASSWORD không được định nghĩa trong biến môi trường',
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
  PERMISSION_REVOKED: 'Thu hồi quyền thành công',
} as const;
