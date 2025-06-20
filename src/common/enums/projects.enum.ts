export enum UserRole {
  ROOT_ADMIN = 'RootAdmin',
  USER = 'User',
}

export enum NodeType {
  FOLDER = 'FOLDER',
  FILE = 'FILE',
}

export enum PermissionLevel {
  OWNER = 'Owner',
  EDITOR = 'Editor',
  VIEWER = 'Viewer',
}

export enum RequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  DENIED = 'Denied',
}