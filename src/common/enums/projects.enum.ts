/* eslint-disable no-unused-vars */
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
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
}

export enum ActivityAction {
  NODE_CREATED = 'NODE_CREATED',
  NODE_RENAMED = 'NODE_RENAMED',
  NODE_MOVED = 'NODE_MOVED',
  NODE_DELETED = 'NODE_DELETED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
}
