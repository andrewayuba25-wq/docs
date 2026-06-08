async function fetchUsers() {
  const base = process.env.API_BASE_URL ?? 'http://localhost:4000';
  const token = process.env.ADMIN_API_TOKEN;
  try {
    const res = await fetch(`${base}/v1/admin/users`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { users: Array<{ id: string; phone: string; fullName: string | null; role: string; status: string; createdAt: string }> };
    return data.users;
  } catch {
    return [];
  }
}

export default async function Page() {
  const users = await fetchUsers();
  return (
    <>
      <h2>Users</h2>
      <p style={{ color: 'var(--muted)' }}>Search, suspend, or reinstate accounts.</p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr><td colSpan={6} style={{ color: 'var(--muted)' }}>No users found.</td></tr>
          ) : users.map((u) => (
            <tr key={u.id}>
              <td>{u.fullName ?? '—'}</td>
              <td>{u.phone}</td>
              <td>{u.role}</td>
              <td><span className={`badge ${u.status === 'ACTIVE' ? 'ok' : u.status === 'SUSPENDED' ? 'warn' : 'danger'}`}>{u.status}</span></td>
              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              <td><button className="ghost">Manage</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
