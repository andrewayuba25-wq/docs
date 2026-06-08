async function fetchMetrics() {
  const base = process.env.API_BASE_URL ?? 'http://localhost:4000';
  const token = process.env.ADMIN_API_TOKEN;
  try {
    const res = await fetch(`${base}/v1/admin/metrics`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('failed');
    return (await res.json()) as { users: number; artisans: number; bookings: number; completed: number };
  } catch {
    return { users: 0, artisans: 0, bookings: 0, completed: 0 };
  }
}

export default async function Page() {
  const m = await fetchMetrics();
  return (
    <>
      <h2>Dashboard</h2>
      <p style={{ color: 'var(--muted)' }}>Operational overview of the marketplace.</p>
      <div className="kpis">
        <Kpi label="Total users" value={m.users} />
        <Kpi label="Artisans" value={m.artisans} />
        <Kpi label="Bookings" value={m.bookings} />
        <Kpi label="Completed" value={m.completed} />
      </div>
      <p style={{ color: 'var(--muted)', maxWidth: 640 }}>
        This is the production-ready admin shell. Connect <code>ADMIN_API_TOKEN</code> to surface live
        data from the API. Navigate to <strong>Verifications</strong> to approve artisan documents,
        <strong> Reports</strong> to handle disputes, and <strong>Users</strong> to suspend or
        reinstate accounts.
      </p>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="value">{value.toLocaleString()}</div>
    </div>
  );
}
