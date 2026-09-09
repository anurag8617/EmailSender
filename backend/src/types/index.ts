export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export type SafeUser = Pick<User, "id" | "name" | "email">;

export interface AuthUser {
  userId: number;
  email: string;
}