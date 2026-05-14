import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { assertRole, type Role } from "@/lib/rbac";

export type AppUser = {
  id: string;
  email: string;
  role: Role;
};

export async function currentUser(): Promise<AppUser | null> {
  if (!env.DEV_AUTH_EMAIL) {
    return null;
  }
  return {
    id: "dev-user",
    email: env.DEV_AUTH_EMAIL,
    role: env.DEV_AUTH_ROLE
  };
}

export async function requireUser(): Promise<AppUser> {
  const user = await currentUser();
  if (!user) {
    redirect("/");
  }
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  assertRole(user.role, "ADMIN");
  return user;
}
