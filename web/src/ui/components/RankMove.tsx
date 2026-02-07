import clsx from 'clsx';

export default function RankMove({ prev, curr }: { prev: number | null; curr: number | null }) {
  if (!prev || !curr) return <span className="text-white/40">—</span>;
  const diff = prev - curr;
  if (diff === 0) return <span className="text-white/40">—</span>;
  const up = diff > 0;
  const label = `${up ? '▲' : '▼'}${Math.abs(diff)}`;
  return <span className={clsx('text-xs font-semibold', up ? 'text-emerald-300' : 'text-rose-300')}>{label}</span>;
}
