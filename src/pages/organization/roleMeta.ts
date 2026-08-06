import { Crown, Users } from "lucide-react";

export type RoleId = "admin" | "builder" | "viewer";

export const ROLES: { id: RoleId; name: string; icon: any; color: string; bg: string }[] = [
  { id: "admin", name: "Admin", icon: Crown, color: "text-warning", bg: "bg-warning-soft" },
  { id: "builder", name: "Builder", icon: Users, color: "text-primary", bg: "bg-primary-soft" },
  { id: "viewer", name: "Viewer", icon: Users, color: "text-muted-foreground", bg: "bg-surface-muted" },
];
