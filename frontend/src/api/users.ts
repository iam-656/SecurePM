import apiClient from './client';
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UsernameAvailabilityResponse,
} from '../types';

export const listUsers = async (): Promise<User[]> => {
  const response = await apiClient.get<User[]>('/users');
  return response.data;
};

export const getUser = async (id: number): Promise<User> => {
  const response = await apiClient.get<User>(`/users/${id}`);
  return response.data;
};

export const createUser = async (data: CreateUserRequest): Promise<User> => {
  const response = await apiClient.post<User>('/users', data);
  return response.data;
};

export const updateUser = async (
  id: number,
  data: UpdateUserRequest
): Promise<User> => {
  const response = await apiClient.put<User>(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: number): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/users/${id}`);
  return response.data;
};

export const checkUsername = async (
  username: string
): Promise<UsernameAvailabilityResponse> => {
  const response = await apiClient.get<UsernameAvailabilityResponse>(
    '/users/check-username',
    { params: { username } }
  );
  return response.data;
};

export const fetchUsers = listUsers;

export const usersApi = {
  listUsers,
  fetchUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  checkUsername,
};

export default usersApi;
