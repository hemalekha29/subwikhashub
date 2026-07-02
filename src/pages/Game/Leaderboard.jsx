import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'leaderboard'))
      .then(snap => {
        const thisWeek = isoWeekKey(new Date());
        const best = {};
        snap.docs.forEach(d => {
          const e = d.data();
          const created = e.createdAt?.toDate ? e.createdAt.toDate() : null;
          if (!created || isoWeekKey(created) !== thisWeek) return;
          if (!best[e.playerId] || e.percent > best[e.playerId].percent) best[e.playerId] = e;
        });
        setRows(Object.values(best).sort((a, b) => b.percent - a.percent).slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || rows.length === 0) return null;

  return (
    <div style={{ maxWidth: 420, margin: '48px auto 0', background: 'var(--black-card)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '20px 24px' }}>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', marginBottom: 12, textAlign: 'center', color: 'var(--white)' }}>
        🏆 This Week's Leaderboard
      </h3>
      {rows.map((r, i) => (
        <div
          key={r.playerId}
          style={{
            display: 'flex', justifyContent: 'space-between', padding: '8px 0',
            borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            fontSize: '0.85rem', color: 'var(--white)',
          }}
        >
          <span>{i + 1}. {r.name || 'Anonymous'}</span>
          <span style={{ color: 'var(--gold)' }}>{r.percent}%</span>
        </div>
      ))}
    </div>
  );
}
