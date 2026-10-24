import apiClient from './client';
import type { LoginRequest, LoginResponse, User, UpdateProfileRequest } from '../types';

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', data);
  return response.data;
};

export const logout = async (): Promise<{ message: string }> => {
  const response = await apiClient.post<{ message: string }>('/auth/logout');
  return response.data;
};

export const me = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
};

export const updateProfile = async (data: UpdateProfileRequest): Promise<User> => {
  const response = await apiClient.put<User>('/auth/profile', data);
  return response.data;
};

export const authApi = {
  login,
  logout,
  me,
  updateProfile,
};

export default authApi;
