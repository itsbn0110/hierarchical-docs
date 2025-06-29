export interface User {
  _id: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'RootAdmin' | 'User';

export interface Node {
  _id: string;
  name: string;
  type: NodeType;
  content?: string;
  parentId: string | null;
  ancestors: { _id: string; name: string }[];
  level: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type NodeType = 'FOLDER' | 'FILE';

export interface Permission {
  _id: string;
  userId: string;
  nodeId: string;
  permission: PermissionLevel;
  grantedBy: string;
  grantedAt: string;
}

export type PermissionLevel = 'Owner' | 'Editor' | 'Viewer';

export interface AccessRequest {
  _id: string;
  requesterId: string;
  nodeId: string;
  requestedPermission: PermissionLevel;
  isRecursive: boolean;
  message?: string;
  status: RequestStatus;
  reviewerId?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'DENIED';

export interface ActivityLog {
  _id: string;
  userId: string;
  action: ActivityAction;
  targetId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: Record<string, any>;
  createdAt: string;
}

export type ActivityAction =
  | 'NODE_CREATED'
  | 'NODE_RENAMED'
  | 'NODE_MOVED'
  | 'NODE_DELETED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED';