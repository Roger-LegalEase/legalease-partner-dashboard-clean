import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdmin();
  return (
    <div className="layout-grid">
      <aside className="sidebar">
        <strong>Admin</strong>
        <p>{user.email}</p>
        <nav>
          <Link href="/admin">Overview</Link>
          <br />
          <Link href="/admin/cases">Cases</Link>
          <br />
          <Link href="/admin/monitoring">Monitoring</Link>
          <br />
          <Link href="/admin/wilma">Wilma QA</Link>
        </nav>
      </aside>
      <section>{children}</section>
    </div>
  );
}
