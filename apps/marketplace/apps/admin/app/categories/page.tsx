async function fetchCategories() {
  const base = process.env.API_BASE_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${base}/v1/categories`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Array<{ id: string; slug: string; name: string; active: boolean }>;
  } catch {
    return [];
  }
}

export default async function Page() {
  const cats = await fetchCategories();
  return (
    <>
      <h2>Service categories</h2>
      <p style={{ color: 'var(--muted)' }}>Categories shown to customers when browsing.</p>
      <table>
        <thead>
          <tr><th>Name</th><th>Slug</th><th>Active</th></tr>
        </thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td><code>{c.slug}</code></td>
              <td>
                <span className={`badge ${c.active ? 'ok' : 'danger'}`}>{c.active ? 'Active' : 'Hidden'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
