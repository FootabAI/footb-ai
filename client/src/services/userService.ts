import { API_URL } from '../api';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
}

const UserService = {
  getUsers: async (): Promise<User[]> => {
    const response = await fetch(`${API_URL}/users`);
    return response.json();
  },

  createUser: async (userData: CreateUserDto): Promise<User> => {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return response.json();
  },

  updateUser: async (id: string, userData: UpdateUserDto): Promise<User> => {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return response.json();
  },

  deleteUser: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
  },
};

export default UserService; 