export type Role = "admin" | "editor" | "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Solo lectura",
};

export const ROLE_HELP: Record<Role, string> = {
  admin: "Gestiona el equipo, crea, edita y elimina workspaces.",
  editor: "Crea y edita workspaces y mapas.",
  viewer: "Ve workspaces y mapas sin cambiarlos.",
};

export const canEditWorkspaces = (role: Role) => role === "admin" || role === "editor";
export const canDeleteWorkspaces = (role: Role) => role === "admin";
export const canManageMembers = (role: Role) => role === "admin";

export function isRole(value: unknown): value is Role {
  return value === "admin" || value === "editor" || value === "viewer";
}
