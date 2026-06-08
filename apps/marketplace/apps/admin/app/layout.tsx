import './globals.css';

export const metadata = {
  title: 'Artisan Admin',
  description: 'Operations dashboard for the Artisan marketplace.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <aside className="sidebar">
            <h1>Artisan Admin</h1>
            <nav>
              <a href="/">Dashboard</a>
              <a href="/users">Users</a>
              <a href="/verifications">Verifications</a>
              <a href="/reports">Reports</a>
              <a href="/categories">Categories</a>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
