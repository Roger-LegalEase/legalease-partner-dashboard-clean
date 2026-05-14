import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminMonitoringPage() {
  await requireAdmin();
  const [enrollments, alerts] = await Promise.all([
    prisma.monitoringEnrollment.findMany({
      orderBy: { updatedAt: "desc" },
      take: 25,
      include: { user: true, candidate: true }
    }).catch(() => []),
    prisma.monitoringAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 25
    }).catch(() => [])
  ]);

  return (
    <div className="panel">
      <h1>Monitoring</h1>
      <h2>Enrollments</h2>
      <ul>
        {enrollments.map((enrollment) => (
          <li key={enrollment.id}>
            {enrollment.user.email}: {enrollment.status}{" "}
            <span className="muted">{enrollment.providerContinuousCheckId ?? "pending provider id"}</span>
          </li>
        ))}
      </ul>
      <h2>Recent alerts</h2>
      <ul>
        {alerts.map((alert) => (
          <li key={alert.id}>
            {alert.title}: {alert.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
