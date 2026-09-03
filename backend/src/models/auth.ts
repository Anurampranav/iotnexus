/**
 * Auth, Home, and Room Models — Smart CodeFlurry
 */

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string; // ISO
}

export type HomeMemberRole = 'owner' | 'member' | 'guest';

export interface HomeMember {
  id: string;
  homeId: string;
  userId: string;
  user?: User;
  role: HomeMemberRole;
  createdAt: string; // ISO
}

export interface Room {
  id: string;
  name: string;
  homeId: string;
  icon?: string;
  deviceCount?: number;
}

export interface Home {
  id: string;
  name: string;
  ownerId: string;
  role?: HomeMemberRole;
  rooms?: Room[];
  members?: HomeMember[];
  createdAt: string; // ISO
}

export interface AuthResponse {
  token: string;
  user: User;
  defaultHomeId: string;
}
