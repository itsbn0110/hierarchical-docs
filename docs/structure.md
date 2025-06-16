
1. Cấu trúc thư mục chuẩn cho dự án NestJS lớn (Best Practice)
      src/
        ├── app.module.ts
        ├── main.ts
        ├── common/                # Các thành phần dùng chung (guards, interceptors, filters, decorators, utils, constants, interfaces)
        ├── config/                # Cấu hình (database, queue, mail, app, ...)
        ├── modules/               # Chứa các business modules chính
        │   ├── users/             # Quản lý người dùng
        │   ├── auth/              # Xác thực & phân quyền
        │   ├── folders/           # Quản lý thư mục
        │   ├── documents/         # Quản lý tài liệu
        │   ├── permissions/       # Quản lý phân quyền
        │   ├── access-requests/   # Yêu cầu truy cập
        │   ├── search/            # Tìm kiếm
        │   └── notifications/     # Thông báo (email, queue)
        ├── queue/                 # Tích hợp BullMQ/Redis (jobs, workers, types)
        │   ├── jobs/
        │   ├── workers/
        │   └── types/
        ├── entities/              # Định nghĩa các entity (nếu không chia nhỏ theo module)
        └── utils/                 # Các hàm tiện ích dùng chung
      test/                        # Test e2e
      docs/                        # Tài liệu dự án (markdown, swagger, ...)
      .env
      .eslintrc.js
      .prettierrc
      nest-cli.json
      package.json
      README.md
      tsconfig.json



2.Cấu trúc đề xuất cho dự án của bạn (theo đặc thù tài liệu yêu cầu)
      src/
        ├── app.module.ts
        ├── main.ts
        ├── common/
        │   ├── guards/
        │   ├── interceptors/
        │   ├── filters/
        │   ├── decorators/
        │   ├── constants/
        │   └── utils/
        ├── config/
        │   ├── database.config.ts
        │   ├── queue.config.ts
        │   └── mail.config.ts
        ├── modules/
        │   ├── users/
        │   ├── auth/
        │   ├── folders/
        │   ├── documents/
        │   ├── permissions/
        │   ├── access-requests/
        │   ├── search/
        │   └── notifications/
        ├── queue/
        │   ├── index.ts
        │   ├── jobs/
        │   │   └── email.job.ts
        │   ├── workers/
        │   │   └── email.worker.ts
        │   └── types/
        │       └── queue-job.type.ts
        ├── entities/
        │   ├── user.entity.ts
        │   ├── folder.entity.ts
        │   ├── document.entity.ts
        │   ├── permission.entity.ts
        │   ├── access-request.entity.ts
        │   └── activity-log.entity.ts
        └── utils/
      test/
      docs/
      .env
      .eslintrc.js
      .prettierrc
      nest-cli.json
      package.json
      README.md
      tsconfig.json