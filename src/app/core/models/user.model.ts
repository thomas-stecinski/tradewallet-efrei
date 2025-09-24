export interface User {
  id: number;
  name: string;
  firstName: string;
  email: string;
  phone: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  firstName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}
