import { Suspense } from "react";
import { getCurrentMember } from "@/lib/auth";
import { listWorkspaces } from "@/lib/workspaces";
import { Sidebar } from "./sidebar";

// Toda esta zona depende de la sesión: se renderiza por request detrás de un Suspense.
export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AuthedShell>{children}</AuthedShell>
    </Suspense>
  );
}

async function AuthedShell({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  const workspaces = await listWorkspaces();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        member={{ name: member.fullName ?? member.email, email: member.email, role: member.role }}
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, type: w.type }))}
      />
      <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-line bg-surface" />
      <main className="flex-1 px-10 py-8">
        <div className="h-7 w-48 animate-pulse rounded bg-line" />
      </main>
    </div>
  );
}
