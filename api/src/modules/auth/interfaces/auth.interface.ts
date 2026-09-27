import { AuthRole } from 'generated/prisma';

export const AuthRoles = AuthRole;

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AuthRole;
}

export interface AuthResponse {
  access_token: string;
  expires_in: number;
  user: AuthUser;
}
