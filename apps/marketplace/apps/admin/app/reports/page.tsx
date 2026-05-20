async function fetchReports() {
  const base = process.env.API_BASE_URL ?? 'http://localhost:4000';
  const token = process.env.ADMIN_API_TOKEN;
  try {
    const res = await fetch(`${base}/v1/admin/reports`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { reports: Array<{ id: string; reason: string; status: string; createdAt: string; reporter: { fullName: string | null }; reported: { fullName: string | null } }> };
    return data.reports;
  } catch {
    return [];
  }
}

export default async function Page() {
  const reports = await fetchReports();
  return (
    <>
      <h2>Reports & disputes</h2>
      <p style={{ color: 'var(--muted)' }}>Open reports awaiting review.</p>
      <table>
        <thead>
          <tr>
            <th>Reporter</th>
            <th>Reported</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Opened</th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 ? (
            <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>No open reports.</td></tr>
          ) : reports.map((r) => (
            <tr key={r.id}>
              <td>{r.reporter.fullName ?? '—'}</td>
              <td>{r.reported.fullName ?? '—'}</td>
              <td>{r.reason}</td>
              <td><span className="badge warn">{r.status}</span></td>
              <td>{new Date(r.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
