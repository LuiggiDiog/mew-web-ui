export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export type { SessionData } from "@/modules/auth/lib/session";
