/**
 * Types d'authentification et de gestion des accès
 * Architecture : Administrateur principal + Collaborateurs autorisés (Max 6)
 * Application : GESTION BOISSONS
 */

export type UserRole = 'admin' | 'collaborator';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  phone?: string;
}

export interface RoleDefinition {
  id: UserRole;
  label: string;
  shortLabel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    id: 'admin',
    label: 'Administrateur Principal',
    shortLabel: 'Admin',
    description: 'Accès intégral : opérations boutique, gestion des comptes de l’équipe et accès exclusif aux finances.',
    badgeBg: 'bg-[#294637]/10',
    badgeText: 'text-[#294637]',
    badgeBorder: 'border-[#294637]/25',
  },
  collaborator: {
    id: 'collaborator',
    label: 'Collaborateur',
    shortLabel: 'Équipe',
    description: 'Capacités opérationnelles complètes : gestion des produits, ventes, achats, stocks et inventaires.',
    badgeBg: 'bg-[#B87555]/10',
    badgeText: 'text-[#B87555]',
    badgeBorder: 'border-[#B87555]/25',
  },
};

export const MAX_ACTIVE_ACCOUNTS = 6;

export interface PermissionMatrix {
  canManageUsers: boolean;
  canViewFinances: boolean;
  canManageProducts: boolean;
  canMakeSales: boolean;
  canManageStock: boolean;
  canManagePurchases: boolean;
  canManageExpenses: boolean;
  canViewAuditLogs: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, PermissionMatrix> = {
  admin: {
    canManageUsers: true,
    canViewFinances: true,
    canManageProducts: true,
    canMakeSales: true,
    canManageStock: true,
    canManagePurchases: true,
    canManageExpenses: true,
    canViewAuditLogs: true,
  },
  collaborator: {
    canManageUsers: false,
    canViewFinances: false, // Strictement interdit aux collaborateurs
    canManageProducts: true,
    canMakeSales: true,
    canManageStock: true,
    canManagePurchases: true,
    canManageExpenses: true,
    canViewAuditLogs: false,
  },
};

export interface UserPresence {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isOnline: boolean;
  lastSeen: number;
}
