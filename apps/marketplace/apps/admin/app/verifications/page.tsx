async function fetchPending() {
  const base = process.env.API_BASE_URL ?? 'http://localhost:4000';
  const token = process.env.ADMIN_API_TOKEN;
  try {
    const res = await fetch(`${base}/v1/admin/verifications`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { docs: Array<{ id: string; kind: string; status: string; artisan: { user: { fullName: string | null; phone: string } } }> };
    return data.docs;
  } catch {
    return [];
  }
}

export default async function Page() {
  const docs = await fetchPending();
  return (
    <>
      <h2>Verifications</h2>
      <p style={{ color: 'var(--muted)' }}>Review and approve artisan ID + license uploads.</p>
      <table>
        <thead>
          <tr>
            <th>Artisan</th>
            <th>Phone</th>
            <th>Document</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {docs.length === 0 ? (
            <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>No pending verifications.</td></tr>
          ) : docs.map((d) => (
            <tr key={d.id}>
              <td>{d.artisan.user.fullName ?? '—'}</td>
              <td>{d.artisan.user.phone}</td>
              <td>{d.kind}</td>
              <td><span className="badge warn">{d.status}</span></td>
              <td style={{ display: 'flex', gap: 8 }}>
                <button>Approve</button>
                <button className="danger">Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
