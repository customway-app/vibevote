import { useEffect, useMemo, useState } from 'react';
import LiveBadge from '../components/LiveBadge';
import SongCard from '../components/SongCard';
import { fetchAppData, fetchPendingCount, tracksToSongs, type AppData, type Song, vote } from '../../lib/api';
import VoteSuccessModal from '../components/VoteSuccessModal';
import MediaEmbedModal from '../components/MediaEmbedModal';
import GenrePickerModal from '../components/GenrePickerModal';
import ShareModal from '../components/ShareModal';

const decades = ['70s', '80s', '90s', '00s'] as const;

export default function ChartPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppData['settings'] | null>(null);
  const [connected, setConnected] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [activeDecade, setActiveDecade] = useState<(typeof decades)[number] | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const [voteModal, setVoteModal] = useState<{ open: boolean; variant: 'success' | 'notice'; message: string }>({
    open: false,
    variant: 'success',
    message: '',
  });

  const [isMobile, setIsMobile] = useState(false);
  const [genreModalOpen, setGenreModalOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    if ('addEventListener' in mq) {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    // eslint-disable-next-line deprecation/deprecation
    mq.addListener(apply);
    // eslint-disable-next-line deprecation/deprecation
    return () => mq.removeListener(apply);
  }, []);

  const votedKey = useMemo(() => `top100.votedTracks.${window.location.origin}`, []);
  const [voted, setVoted] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(votedKey) || '[]';
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map((x) => Number(x)).filter((n) => Number.isFinite(n)));
      return new Set();
    } catch {
      return new Set();
    }
  });

  const [mediaModal, setMediaModal] = useState<{ open: boolean; kind: 'youtube' | 'spotify'; url: string; title: string; votes?: number }>({
    open: false,
    kind: 'youtube',
    url: '',
    title: '',
  });

  const [shareModal, setShareModal] = useState<{ open: boolean; target: { title: string; text: string; url: string } | null }>({
    open: false,
    target: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchAppData();
        const s = tracksToSongs(data.tracks);
        const g = data.genres.map((x) => x.name);
        if (!cancelled) {
          setSongs(s);
          setGenres(g);
          setSettings(data.settings);
          setConnected(true);

          // Apply theme from WordPress settings
          if (data.settings?.gradient_start) {
            document.documentElement.style.setProperty('--accent0', data.settings.gradient_start);
          }
          if (data.settings?.gradient_end) {
            document.documentElement.style.setProperty('--accent1', data.settings.gradient_end);
          }
        }
      } catch {
        if (!cancelled) setConnected(false);
        setToast('Failed to load songs');
      }

      try {
        const pc = await fetchPendingCount();
        if (!cancelled) setPendingCount(pc);
      } catch {
        if (!cancelled) setPendingCount(null);
      }
    }

    load();
    const t = window.setInterval(load, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return songs.filter((s) => {
      if (activeGenre && (s.genre || '') !== activeGenre) return false;
      if (activeDecade && s.year) {
        const d = Math.floor(s.year / 10) * 10;
        const label = `${String(d).slice(2)}s`;
        if (label !== activeDecade) return false;
      }
      if (!q) return true;
      const hay = `${s.artist} ${s.title} ${s.genre || ''} ${s.year || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [songs, search, activeGenre, activeDecade]);

  async function handleVote(id: number) {
    const songBefore = songs.find((s) => s.id === id);
    try {
      const res = await vote(id);

      setVoted((prev) => {
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem(votedKey, JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });

      // Optimistic UI: update local vote count immediately
      if (typeof res?.vote_count === 'number') {
        setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, votes: res.vote_count } : s)));
      } else {
        setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, votes: s.votes + 1 } : s)));
      }

      // Then refetch the authoritative ordering + ranks
      const data = await fetchAppData();
      setSongs(tracksToSongs(data.tracks));

      // The connector mirrors the main plugin and returns the final message.
      // (Settings are already applied server-side via top100_indicator_text.)
      const msg = String(res?.message || 'Vote cast successfully!');

      setVoteModal({ open: true, variant: 'success', message: msg });
    } catch (e: any) {
      const msg = String(e?.message || 'Vote failed');
      const userMessage = String((e as any)?.userMessage || '');

      if (msg === 'already_voted') {
        setVoteModal({ open: true, variant: 'notice', message: userMessage || settings?.vote_limit_error_message || 'You have already voted for this track.' });
      } else if (msg === 'vote_limit_exceeded') {
        setVoteModal({ open: true, variant: 'notice', message: userMessage || settings?.vote_limit_error_message || 'Rate limit exceeded. Please try again later.' });
      } else if (msg === 'db_error') {
        setVoteModal({ open: true, variant: 'notice', message: 'Voting temporarily unavailable. Please try again later.' });
      } else if (msg === 'missing_app_key') {
        setVoteModal({ open: true, variant: 'notice', message: 'App API key missing (VITE_APP_API_KEY).' });
      } else {
        setVoteModal({ open: true, variant: 'notice', message: userMessage || 'Vote failed. Try again.' });
      }
      throw e;
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight">{settings?.chart_title || 'Top 100 Chart'}</h1>
          <p className="mt-1 max-w-xl text-sm text-white/70">
            Vote in real time. Rankings shift instantly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {typeof pendingCount === 'number' ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-300/10 px-3 py-1 text-xs text-amber-100 ring-1 ring-amber-200/20">
              <span className="font-semibold">Pending</span>
              <span className="tabular-nums">{pendingCount}</span>
            </div>
          ) : null}
          <LiveBadge connected={connected} />
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="glass flex flex-col gap-3 rounded-2xl p-4 shadow-glow md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by artist, title, genre, year…"
              className="min-w-0 w-full rounded-xl bg-black/30 px-4 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/40 focus:ring-white/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-ghost h-10 px-3 text-xs"
              onClick={() => {
                setActiveGenre(null);
                setActiveDecade(null);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {decades.map((d) => (
            <button
              key={d}
              onClick={() => setActiveDecade(activeDecade === d ? null : d)}
              className={
                activeDecade === d
                  ? 'btn btn-primary h-9 px-3 text-xs'
                  : 'btn btn-ghost h-9 px-3 text-xs'
              }
            >
              {d}
            </button>
          ))}

          {isMobile ? (
            <button
              type="button"
              className="btn btn-ghost h-9 px-3 text-xs"
              onClick={() => setGenreModalOpen(true)}
              title="Choose genre"
            >
              {activeGenre ? `Genre: ${activeGenre}` : 'All genres'}
            </button>
          ) : (
            genres.slice(0, 16).map((g) => (
              <button
                key={g}
                onClick={() => setActiveGenre(activeGenre === g ? null : g)}
                className={
                  activeGenre === g
                    ? 'btn btn-primary h-9 px-3 text-xs'
                    : 'btn btn-ghost h-9 px-3 text-xs'
                }
              >
                {g}
              </button>
            ))
          )}
        </div>

        <div className="mt-2 grid gap-3">
          {filtered.map((s) => (
            <SongCard
              key={s.id}
              song={s}
              onVote={handleVote}
              isVoted={voted.has(s.id)}
              onOpenMedia={(kind, url, title) => setMediaModal({ open: true, kind, url, title, votes: s.votes })}
              onShare={(song) => {
                const base = `${window.location.origin}${window.location.pathname}`;
                const u = new URL(base);
                u.searchParams.set('track', String(song.id));
                setShareModal({
                  open: true,
                  target: {
                    title: `${song.title} - ${song.artist}`,
                    text: `Vote for ${song.artist} - ${song.title}`,
                    url: u.toString(),
                  },
                });
              }}
            />
          ))}
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="glass rounded-2xl px-4 py-3 text-sm shadow-glow">{toast}</div>
        </div>
      ) : null}

      <VoteSuccessModal
        open={voteModal.open}
        variant={voteModal.variant}
        message={voteModal.message}
        onClose={() => setVoteModal({ open: false, variant: 'success', message: '' })}
      />

      <MediaEmbedModal
        open={mediaModal.open}
        kind={mediaModal.kind}
        url={mediaModal.url}
        title={mediaModal.title}
        votes={mediaModal.votes}
        onClose={() => setMediaModal({ open: false, kind: 'youtube', url: '', title: '' })}
      />

      <GenrePickerModal
        open={genreModalOpen}
        genres={['__ALL__', ...genres]}
        selected={activeGenre || '__ALL__'}
        clearOptionValue="__ALL__"
        clearOptionLabel="All genres"
        onSelect={(g) => {
          setActiveGenre(g === '__ALL__' ? null : g);
          setGenreModalOpen(false);
        }}
        onClose={() => setGenreModalOpen(false)}
      />

      <ShareModal
        open={shareModal.open}
        target={shareModal.target}
        onCopied={() => setToast('Link copied')}
        onClose={() => setShareModal({ open: false, target: null })}
      />
    </div>
  );
}
