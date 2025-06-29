// Các kiểu dữ liệu mapping với DTO/response backend

import type { User } from "./app.types";

export interface LoginResponseDto {
  access_token: string;
  refreshToken?: string;
  user: User;
}

export interface GrantPermissionDto {
  userId: string;
  nodeId: string;
  permission: PermissionLevel;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface CreateNodeDto {
  name: string;
  type: NodeType;
  parentId?: string | null;
  content?: string;
}

export interface UpdateNodeNameDto {
  name: string;
}

export interface UpdateNodeContentDto {
  content: string;
}

export interface CreateAccessRequestDto {
  nodeId: string;
  requestedPermission: PermissionLevel;
  isRecursive?: boolean;
  message?: string;
}


export type RequestStatus = 'PENDING' | 'APPROVED' | 'DENIED';
export type PermissionLevel = 'Owner' | 'Editor' | 'Viewer';
export type NodeType = 'FOLDER' | 'FILE';
