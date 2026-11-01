export type Role = "client" | "employee" | "manager";

export type Profile = {
  /** Row id in the `client` or `employee` table (NOT the auth user id). */
  id: string;
  role: Role;
  fullName: string | null;
};

/** Which roles may open each protected section. */
export const ROUTE_ROLES: Record<string, Role[]> = {
  "/": ["client"],
  "/history": ["client"],
  "/checkout": ["client"],
  "/staff": ["employee", "manager"],
  "/admin": ["manager"],
};

export function homeForRole(role: Role) {
  if (role === "manager") return "/admin";
  if (role === "employee") return "/staff";
  return "/";
}

/** Only allow same-origin relative paths as post-login redirects. */
export function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
