
import { PartPreset } from "./machine.model";

export type UserRole = 'admin' | 'moderator' | 'user';

export interface User {
  id: string;
  username: string;
  passwordHash: string; // In real app, never store plain text, here we simulate hash
  role: UserRole;
  createdAt: number;
  lastLoginAt?: number;
  lastLoginIp?: string;
  telegramChatId?: string;
}

export interface StoredFile {
  id: string;
  name: string;
  ownerId: string;
  data: PartPreset; // We store the JSON data required to generate the XLSX
  updatedAt: number;
}
