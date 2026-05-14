export const roles = ["CUSTOMER", "ADMIN"] as const;
export type Role = (typeof roles)[number];

const roleRank: Record<Role, number> = {
  CUSTOMER: 1,
  ADMIN: 2
};

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return roleRank[userRole] >= roleRank[requiredRole];
}

export function assertRole(userRole: Role, requiredRole: Role): void {
  if (!hasRole(userRole, requiredRole)) {
    throw new Error(`Access denied. Required role: ${requiredRole}.`);
  }
}
