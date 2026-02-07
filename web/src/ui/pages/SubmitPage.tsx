import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { fetchAppData, submitSong } from '../../lib/api';
import VoteSuccessModal from '../components/VoteSuccessModal';
import GenrePickerModal from '../components/GenrePickerModal';

type FormValues = {
  artist?: string;
  title?: string;
  year?: string;
  genre?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  albumArtUrl?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

export default function SubmitPage() {
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err'; msg?: string }>({ kind: 'idle' });
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const [settings, setSettings] = useState<any>(null);
  const [genres, setGenres] = useState<string[]>(['Other']);
  const [genreModalOpen, setGenreModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      genre: 'Other',
    },
  });

  useEffect(() => {
    let cancelled = false;
    fetchAppData()
      .then((d) => {
        if (cancelled) return;
        setSettings(d.settings || null);
        const list = (d.genres || []).map((g) => g.name).filter(Boolean);
        setGenres(list.length ? list : ['Other']);
        setValue('genre', (list[0] || 'Other') as any);
      })
      .catch(() => {
        if (cancelled) return;
        setSettings(null);
        setGenres(['Other']);
        setValue('genre', 'Other' as any);
      });

    return () => {
      cancelled = true;
    };
  }, [setValue]);

  const showArtist = settings ? Number(settings.show_artist_field ?? 1) === 1 : true;
  const showSong = settings ? Number(settings.show_song_field ?? 1) === 1 : true;
  const showGenre = settings ? Number(settings.show_genre_field ?? 1) === 1 : true;
  const showYear = settings ? Number(settings.show_year_field ?? 1) === 1 : true;
  const showYoutube = settings ? Number(settings.show_youtube_url_field ?? 1) === 1 : true;
  const showSpotify = settings ? Number(settings.show_spotify_url_field ?? 1) === 1 : true;
  const showAlbumArt = settings ? Number(settings.show_album_art_url_field ?? 1) === 1 : true;
  const showFirst = settings ? Number(settings.show_first_name_field ?? 1) === 1 : true;
  const showLast = settings ? Number(settings.show_last_name_field ?? 1) === 1 : true;
  const requireEmail = settings ? Number(settings.require_email ?? 1) === 1 : true;

  const selectedGenre = String(watch('genre') || '');
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    // Safari < 14 uses addListener
    if ('addEventListener' in mq) {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    // eslint-disable-next-line deprecation/deprecation
    mq.addListener(apply);
    // eslint-disable-next-line deprecation/deprecation
    return () => mq.removeListener(apply);
  }, []);

  const groupedGenres = useMemo(() => {
    const list = genres.filter(Boolean);
    const decades: string[] = [];
    const rest: string[] = [];

    for (const g of list) {
      if (/^\d{2}s$/i.test(g.trim())) decades.push(g);
      else rest.push(g);
    }

    const groups: Record<string, string[]> = {
      'Decades': decades,
      '0-9': [],
      'A-F': [],
      'G-L': [],
      'M-R': [],
      'S-Z': [],
      'Other': [],
    };

    for (const g of rest.sort((a, b) => a.localeCompare(b))) {
      const c = (g.trim()[0] || '').toLowerCase();
      if (c >= '0' && c <= '9') groups['0-9'].push(g);
      else if (c >= 'a' && c <= 'f') groups['A-F'].push(g);
      else if (c >= 'g' && c <= 'l') groups['G-L'].push(g);
      else if (c >= 'm' && c <= 'r') groups['M-R'].push(g);
      else if (c >= 's' && c <= 'z') groups['S-Z'].push(g);
      else groups['Other'].push(g);
    }

    return groups;
  }, [genres]);

  function buildSchema() {
    return z.object({
      artist: showArtist ? z.string().min(1, 'Artist is required') : z.string().optional(),
      title: showSong ? z.string().min(1, 'Song title is required') : z.string().optional(),
      year: z.string().optional(),
      genre: showGenre ? z.string().min(1, 'Genre is required') : z.string().optional(),
      youtubeUrl: z.string().optional(),
      spotifyUrl: z.string().optional(),
      albumArtUrl: z.string().optional(),
      email: requireEmail ? z.string().email('Valid email required') : z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    });
  }

  async function onSubmit(values: FormValues) {
    const parsed = buildSchema().safeParse(values);
    if (!parsed.success) {
      setStatus({ kind: 'err', msg: 'Please fix the highlighted fields.' });
      return;
    }
    const year = parsed.data.year?.trim() ? Number(parsed.data.year) : undefined;
    if (year && (!Number.isFinite(year) || year < 1900 || year > 2100)) {
      setStatus({ kind: 'err', msg: 'Year must be between 1900 and 2100.' });
      return;
    }

    setStatus({ kind: 'idle' });
    try {
      const defaultGenre = genres[0] || 'Other';
      const res = await submitSong({
        artist: String(parsed.data.artist || '').trim(),
        title: String(parsed.data.title || '').trim(),
        year,
        genre: String((showGenre ? parsed.data.genre : defaultGenre) || defaultGenre),
        youtubeUrl: showYoutube ? parsed.data.youtubeUrl || undefined : undefined,
        spotifyUrl: showSpotify ? parsed.data.spotifyUrl || undefined : undefined,
        albumArtUrl: showAlbumArt ? parsed.data.albumArtUrl || undefined : undefined,
        email: requireEmail ? String(parsed.data.email || '').trim() : String(parsed.data.email || '').trim() || undefined,
        firstName: showFirst ? parsed.data.firstName || undefined : undefined,
        lastName: showLast ? parsed.data.lastName || undefined : undefined,
      });

      const pending = Boolean((res as any).is_pending);
      const msg = pending
        ? `Thank you! "${String(parsed.data.title || '').trim()}" by ${String(parsed.data.artist || '').trim()} has been submitted and is awaiting approval. You'll be notified when it's added to the chart!`
        : `Thank you! "${String(parsed.data.title || '').trim()}" by ${String(parsed.data.artist || '').trim()} has been submitted and was added to the chart.`;

      setSuccessModal({ open: true, message: msg });
      reset();
    } catch (e: any) {
      const msg = String(e?.message || 'Submission failed');
      if (msg === 'missing_app_key') {
        setStatus({ kind: 'err', msg: 'Missing VITE_APP_API_KEY (required for auth).' });
      } else if (msg === 'unauthorized') {
        setStatus({ kind: 'err', msg: 'Unauthorized. Check VITE_APP_API_KEY or token.' });
      } else {
        setStatus({ kind: 'err', msg });
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl tracking-tight">Submit a Song</h1>
      <p className="mt-1 text-sm text-white/70">
        Submissions go to <span className="font-semibold text-white">pending review</span>.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4">
        <section className="glass rounded-2xl p-5 shadow-glow">
          <h2 className="font-display text-lg">Music Information</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {showArtist ? (
              <Field label="Artist*" error={(errors as any).artist?.message}>
                <input {...register('artist', { required: true })} className="input" placeholder="e.g. Bee Gees" />
              </Field>
            ) : null}

            {showSong ? (
              <Field label="Song Title*" error={(errors as any).title?.message}>
                <input {...register('title', { required: true })} className="input" placeholder="e.g. Night Fever" />
              </Field>
            ) : null}

            {showYear ? (
              <Field label="Year" error={(errors as any).year?.message}>
                <input {...register('year')} className="input" placeholder="1979" />
              </Field>
            ) : null}

            {showGenre ? (
              <Field label="Genre*" error={(errors as any).genre?.message}>
                {isMobile ? (
                  <button
                    type="button"
                    className="input text-left"
                    onClick={() => setGenreModalOpen(true)}
                    aria-label="Choose genre"
                  >
                    {selectedGenre || 'Choose genre'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <select {...register('genre', { required: true })} className="input">
                      {Object.entries(groupedGenres)
                        .filter(([, items]) => items.length > 0)
                        .map(([label, items]) => (
                          <optgroup key={label} label={label}>
                            {items.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost h-11 shrink-0 px-3 text-xs"
                      onClick={() => setGenreModalOpen(true)}
                      aria-label="Search genres"
                      title="Search genres"
                    >
                      Search
                    </button>
                  </div>
                )}
              </Field>
            ) : null}

            {showYoutube ? (
              <Field label="YouTube URL" error={(errors as any).youtubeUrl?.message}>
                <input {...register('youtubeUrl')} className="input" placeholder="https://youtube.com/..." />
              </Field>
            ) : null}
            {showSpotify ? (
              <Field label="Spotify URL" error={(errors as any).spotifyUrl?.message}>
                <input {...register('spotifyUrl')} className="input" placeholder="https://open.spotify.com/..." />
              </Field>
            ) : null}
            {showAlbumArt ? (
              <Field label="Album Art URL" error={(errors as any).albumArtUrl?.message}>
                <input {...register('albumArtUrl')} className="input" placeholder="https://...jpg" />
              </Field>
            ) : null}
          </div>
        </section>

        <section className="glass rounded-2xl p-5 shadow-glow">
          <h2 className="font-display text-lg">Contact Information</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label={requireEmail ? 'Email*' : 'Email'} error={(errors as any).email?.message}>
              <input {...register('email', { required: requireEmail })} className="input" placeholder="name@example.com" />
            </Field>
            {showFirst ? (
              <Field label="First Name" error={(errors as any).firstName?.message}>
                <input {...register('firstName')} className="input" />
              </Field>
            ) : null}
            {showLast ? (
              <Field label="Last Name" error={(errors as any).lastName?.message}>
                <input {...register('lastName')} className="input" />
              </Field>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-white/55">
            Tip: add CAPTCHA in production by configuring `CAPTCHA_PROVIDER` and `CAPTCHA_SECRET` on the server.
          </p>
        </section>

        <div className="flex items-center gap-3">
          <button className="btn btn-primary h-11" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit Song'}
          </button>
          {status.kind === 'err' ? <span className="text-rose-200">{status.msg}</span> : null}
        </div>
      </form>

      <VoteSuccessModal
        open={successModal.open}
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, message: '' })}
      />

      <GenrePickerModal
        open={genreModalOpen}
        genres={genres}
        selected={selectedGenre}
        onSelect={(g) => {
          setValue('genre', g as any);
          setGenreModalOpen(false);
        }}
        onClose={() => setGenreModalOpen(false)}
      />
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-white/75">{label}</div>
      {children}
      {error ? <div className="mt-1 text-xs text-rose-200">{error}</div> : null}
    </label>
  );
}
