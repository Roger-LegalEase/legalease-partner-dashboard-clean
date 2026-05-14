import { requireUser } from "@/lib/auth";

export default async function CustomerDashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <div className="layout-grid">
      <aside className="sidebar">
        <strong>Customer</strong>
        <p>{user.email}</p>
      </aside>
      <section>{children}</section>
    </div>
  );
}
