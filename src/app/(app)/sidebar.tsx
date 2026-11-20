"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "./actions";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

type Props = {
  member: { name: string; email: string; role: Role };
  workspaces: { id: string; name: string; type: "internal" | "client" }[];
};

export function Sidebar({ member, workspaces }: Props) {
  const pathname = usePathname();
  const activeId = pathname.match(/^\/workspaces\/([^/]+)/)?.[1];
  const active = workspaces.find((w) => w.id === activeId);

  const navItem = (href: string, label: string, exact = false) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`block rounded-md px-3 py-2 text-sm ${isActive ? "bg-accent/10 font-medium text-accent" : "text-ink hover:bg-canvas"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <p className="text-[11px] font-semibold tracking-widest text-muted">DOUX.WORK</p>
        <p className="text-lg font-semibold">DXW Funnel</p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div className="space-y-1">{navItem("/workspaces", "Todos los workspaces", true)}</div>

        {active && (
          <div>
            <p className="px-3 pb-1 text-xs font-medium text-muted">{active.name}</p>
            <div className="space-y-1">
              {navItem(`/workspaces/${active.id}`, "Mapas", true)}
              {navItem(`/workspaces/${active.id}/crm`, "CRM")}
              {navItem(`/workspaces/${active.id}/settings`, "Configuración")}
            </div>
          </div>
        )}

        <div>
          <p className="px-3 pb-1 text-xs font-medium text-muted">Workspaces</p>
          {workspaces.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted">Todavía no hay workspaces.</p>
          ) : (
            <ul className="space-y-0.5">
              {workspaces.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/workspaces/${w.id}`}
                    className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm ${w.id === activeId ? "font-medium text-accent" : "text-ink hover:bg-canvas"}`}
                  >
                    <span className="truncate">{w.name}</span>
                    {w.type === "internal" && <span className="ml-2 text-[10px] uppercase text-muted">Interno</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1">{navItem("/equipo", "Equipo")}</div>
      </nav>

      <div className="border-t border-line px-5 py-4">
        <p className="truncate text-sm font-medium">{member.name}</p>
        <p className="truncate text-xs text-muted">
          {member.email} · {ROLE_LABELS[member.role]}
        </p>
        <form action={signOut} className="mt-3">
          <button type="submit" className="text-xs text-muted underline-offset-2 hover:underline">
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
