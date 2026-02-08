import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Song } from '../../lib/api';
import RankMove from './RankMove';

export default function SongCard(props: {
  song: Song;
  onVote: (id: number) => Promise<void>;
  isVoted: boolean;
  onOpenMedia: (kind: 'youtube' | 'spotify', url: string, title: string) => void;
  onShare: (song: Song) => void;
}) {
  const { song, onVote, isVoted, onOpenMedia, onShare } = props;
  const [busy, setBusy] = useState(false);
  const [popped, setPopped] = useState(false);

  const move = useMemo(() => {
    if (!song.previousRank || !song.currentRank) return 0;
    return song.previousRank - song.currentRank;
  }, [song.previousRank, song.currentRank]);

  const trending = move >= 5;

  const genreColor = song.genreColor && song.genreColor.trim() ? song.genreColor : null;

  async function handleVote() {
    if (isVoted) return;
    setBusy(true);
    try {
      await onVote(song.id);
      setPopped(true);
      window.setTimeout(() => setPopped(false), 300);
    } catch {
      // Parent handles user-facing toast.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass group flex gap-3 rounded-2xl p-4 shadow-glow transition hover:bg-white/10 sm:gap-4">
      <div className="flex w-10 flex-col items-center justify-center sm:w-14">
        <div className="font-display text-lg tabular-nums sm:text-xl">{song.currentRank ?? '—'}</div>
        <RankMove prev={song.previousRank} curr={song.currentRank} />
        {trending ? (
          <div className="mt-2 hidden rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-400/25 sm:block">
            Trending
          </div>
        ) : null}
      </div>

      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 sm:h-16 sm:w-16">
        {song.albumArtUrl ? (
          <img src={song.albumArtUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-pink-500/30 to-violet-500/30" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate font-display text-base leading-tight">{song.title}</div>
            <div className="truncate text-sm text-white/70">{song.artist}</div>

            <div className="mt-2 flex items-center gap-2 sm:hidden">
              {song.year ? (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/70 ring-1 ring-white/10">{song.year}</span>
              ) : null}
              {song.genre ? (
                <span
                  className="rounded-full bg-white/5 px-2 py-0.5 text-xs ring-1 ring-white/10"
                  style={genreColor ? { color: genreColor } : { color: 'rgba(255,255,255,0.7)' }}
                >
                  {song.genre}
                </span>
              ) : null}
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            {song.year ? (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/70 ring-1 ring-white/10">{song.year}</span>
            ) : null}
            {song.genre ? (
              <span
                className="rounded-full bg-white/5 px-2 py-0.5 text-xs ring-1 ring-white/10"
                style={genreColor ? { color: genreColor } : { color: 'rgba(255,255,255,0.7)' }}
              >
                {song.genre}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <button
            className={clsx(
              'btn h-10 w-full justify-between sm:w-auto sm:justify-center',
              isVoted ? 'btn-voted' : 'btn-primary',
              popped && 'animate-pop'
            )}
            onClick={handleVote}
            disabled={busy || isVoted}
          >
            <span>{busy ? 'Voting…' : isVoted ? 'Voted' : 'Vote'}</span>
            <span className="rounded-lg bg-black/25 px-2 py-0.5 text-xs tabular-nums">{song.votes}</span>
          </button>

          <div className="flex flex-wrap items-center gap-2 sm:contents">
            {song.youtubeUrl ? (
              <button
                type="button"
                className="btn btn-ghost h-10 px-3 text-xs"
                onClick={() => onOpenMedia('youtube', song.youtubeUrl || '', `${song.title} - ${song.artist}`)}
                aria-label="YouTube"
                title="YouTube"
              >
                <span className="hidden sm:inline">YouTube</span>
                <svg className="sm:hidden" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </button>
            ) : null}
            {song.spotifyUrl ? (
              <button
                type="button"
                className="btn btn-ghost h-10 px-3 text-xs"
                onClick={() => onOpenMedia('spotify', song.spotifyUrl || '', `${song.title} - ${song.artist}`)}
                aria-label="Spotify"
                title="Spotify"
              >
                <span className="hidden sm:inline">Spotify</span>
                <svg className="sm:hidden" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </button>
            ) : null}

            <button className="btn btn-ghost h-10 px-3 text-xs" onClick={() => onShare(song)}>
              <span className="hidden sm:inline">Share</span>
              <svg className="sm:hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 8a3 3 0 1 0-2.83-4H12a3 3 0 0 0 0 6c.74 0 1.41-.27 1.92-.72l4.02 2.01a3 3 0 0 0 0 1.42l-4.02 2.01A3 3 0 1 0 15 20a3 3 0 0 0-2.83-4H12a3 3 0 0 0 1.92.72l4.02-2.01A3 3 0 1 0 18 10c-.74 0-1.41.27-1.92.72l-4.02-2.01A2.99 2.99 0 0 0 15 8Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
