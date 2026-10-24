export type Role = 'ADMIN' | 'MEMBER' | 'USER';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  active: boolean;
  createdBy?: number | null;
  isSuperAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  id?: number;
  username: string;
  email?: string;
  fullName: string;
  role: Role;
  active: boolean;
  createdBy?: number | null;
  isSuperAdmin?: boolean;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  password?: string;
  role?: Role;
  active?: boolean;
}

export interface UpdateProfileRequest {
  fullName?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UsernameAvailabilityResponse {
  username: string;
  available: boolean;
  message: string;
}
