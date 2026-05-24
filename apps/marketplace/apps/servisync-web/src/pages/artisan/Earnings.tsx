import { useSession, useDbVersion } from '../../lib/store';
import { queries } from '../../lib/db';
import { Card, TopBar } from '../../components/UI';

export function Earnings() {
  useDbVersion();
  const { user } = useSession();
  if (!user) return null;

  const completed = queries.bookingsForArtisan(user.id).filter((b) => b.status === 'completed');
  const total = completed.reduce((s, b) => s + b.price, 0);
  const commission = Math.round(total * 0.12);

  return (
    <>
      <TopBar title="Earnings" />
      <div className="screen" style={{ paddingTop: 0 }}>
        <Card className="col center">
          <div className="muted tiny">Lifetime gross</div>
          <div className="title">₦{total.toLocaleString()}</div>
          <div className="muted small mt-sm">{completed.length} completed job{completed.length === 1 ? '' : 's'}</div>
        </Card>

        <div className="row gap mt">
          <Card className="grow col center">
            <div className="muted tiny">Platform fee (12%)</div>
            <div className="bold" style={{ fontSize: 18 }}>₦{commission.toLocaleString()}</div>
          </Card>
          <Card className="grow col center">
            <div className="muted tiny">Net payout</div>
            <div className="bold" style={{ fontSize: 18, color: 'var(--success)' }}>₦{(total - commission).toLocaleString()}</div>
          </Card>
        </div>

        <h2 className="h2 mt">Completed jobs</h2>
        <div className="stack mt-sm">
          {completed.length === 0 && <div className="muted small">No completed jobs yet.</div>}
          {completed.map((b) => (
            <Card key={b.id} className="row between">
              <div>
                <div className="semibold small">{queries.categoryBySlug(b.categorySlug)?.name}</div>
                <div className="muted tiny">{new Date(b.updatedAt).toLocaleDateString()}</div>
              </div>
              <span className="bold">₦{b.price.toLocaleString()}</span>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
