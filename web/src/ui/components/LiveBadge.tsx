export default function LiveBadge({ connected }: { connected: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-white/80 ring-1 ring-white/10">
      <span className={connected ? 'h-2 w-2 animate-pulseGlow rounded-full bg-emerald-400' : 'h-2 w-2 rounded-full bg-white/30'} />
      <span className="font-medium">Live</span>
      <span className="text-white/60">{connected ? 'connected' : 'offline'}</span>
    </div>
  );
}
