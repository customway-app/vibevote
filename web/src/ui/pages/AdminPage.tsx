import { useEffect, useState } from 'react';
import { fetchPendingCount } from '../../lib/api';

export default function AdminPage() {
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const pc = await fetchPendingCount();
      if (!cancelled) setPending(pc);
    }
    load();
    const t = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-white/70">
        Approvals are handled in WordPress. This page only shows the pending count (if `VITE_ADMIN_KEY` is set).
      </p>

      <div className="mt-6 glass rounded-2xl p-5 shadow-glow">
        <div className="text-sm text-white/80">Pending requests</div>
        <div className="mt-2 font-display text-4xl tabular-nums">{typeof pending === 'number' ? pending : '—'}</div>
        <div className="mt-3 text-sm text-white/60">
          Open WP Admin to approve: <a className="underline" href="https://multimindmedia.nl/wp-admin/admin.php?page=top100-dashboard" target="_blank" rel="noreferrer">Top 100 Dashboard</a>
        </div>
      </div>
    </div>
  );
}
