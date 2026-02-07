const WP_BASE_URL = (import.meta.env.VITE_WP_BASE_URL || '').replace(/\/$/, '');
const APP_API_KEY = import.meta.env.VITE_APP_API_KEY || '';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || '';

function voterKeyStorageKey() {
  return `top100.voterKey.${WP_BASE_URL || 'proxy'}`;
}

function getOrCreateVoterKey() {
  const existing = localStorage.getItem(voterKeyStorageKey()) || '';
  if (existing) return existing;

  // Prefer crypto randomness when available
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const key = `vk_${hex}`;

  localStorage.setItem(voterKeyStorageKey(), key);
  return key;
}

function wpUrl(path: string) {
  // If WP_BASE_URL is empty, we rely on Vite proxy (dev) and call relative /wp-json/*
  if (!WP_BASE_URL) return `/wp-json/top100-api/v1${path}`;
  return `${WP_BASE_URL}/wp-json/top100-api/v1${path}`;
}

function withCacheBust(url: string) {
  // Avoid CDN/host caching during live voting.
  // Works for both absolute and Vite-proxied relative URLs.
  const u = url.startsWith('http') ? new URL(url) : new URL(url, window.location.origin);
  u.searchParams.set('cb', String(Date.now()));
  return url.startsWith('http') ? u.toString() : u.pathname + '?' + u.searchParams.toString();
}

type ConnectorSettings = {
  chart_title?: string;
  gradient_start?: string;
  gradient_end?: string;
  auth_required?: number;
  // New (matches WP core plugin settings)
  max_votes_per_user?: number;
  vote_cooldown_hours?: number;
  // Back-compat
  max_votes_per_day?: number;

  // Vote modal strings (mirror WP settings)
  vote_success_message?: string;
  vote_limit_error_message?: string;

  // Request form field controls
  show_artist_field?: number;
  show_song_field?: number;
  show_genre_field?: number;
  show_first_name_field?: number;
  show_last_name_field?: number;
  show_youtube_url_field?: number;
  show_spotify_url_field?: number;
  show_album_art_url_field?: number;
  show_year_field?: number;
  require_email?: number;
};

type ConnectorTrack = {
  id: string;
  artist: string;
  title: string;
  year?: string | null;
  genre?: string | null;
  genre_slug?: string | null;
  genre_color?: string | null;
  votes: string;
  thumbnail?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  current_rank?: number;
  previous_rank?: number | null;
  position_change?: number;
  movement?: string | null;
};

export type Song = {
  id: number;
  artist: string;
  title: string;
  year: number | null;
  genre: string | null;
  youtubeUrl: string | null;
  spotifyUrl: string | null;
  albumArtUrl: string | null;
  votes: number;
  previousRank: number | null;
  currentRank: number | null;
  status: 'APPROVED';
  genreColor?: string | null;
};

export type AppData = {
  tracks: ConnectorTrack[];
  settings: ConnectorSettings;
  genres: { id: string; name: string; slug: string; color: string }[];
  generated_at: string;
};

export async function fetchAppData(): Promise<AppData> {
  const res = await fetch(withCacheBust(wpUrl('/app-data')));
  if (!res.ok) throw new Error('app_data_failed');
  const json = (await res.json()) as { success: boolean; data: AppData };
  if (!json?.success) throw new Error('app_data_failed');
  return json.data;
}

export function tracksToSongs(tracks: ConnectorTrack[]): Song[] {
  return tracks.map(mapTrackToSong);
}

function tokenStorageKey() {
  // separate tokens by base URL to avoid collisions between environments
  return `top100.wp.token.${WP_BASE_URL || 'proxy'}`;
}

function tokenExpStorageKey() {
  return `top100.wp.tokenExp.${WP_BASE_URL || 'proxy'}`;
}

async function getAuthToken(): Promise<string | null> {
  const appData = await fetchAppData();
  const authRequired = Number(appData.settings?.auth_required || 0);
  if (!authRequired) return null;

  if (!APP_API_KEY) throw new Error('missing_app_key');

  const existing = localStorage.getItem(tokenStorageKey()) || '';
  const exp = Number(localStorage.getItem(tokenExpStorageKey()) || '0');
  if (existing && exp > Date.now() + 30_000) {
    return existing;
  }

  const res = await fetch(wpUrl('/auth'), {
    headers: {
      'X-App-Key': APP_API_KEY,
    },
  });
  if (!res.ok) throw new Error('auth_failed');
  const json = (await res.json()) as { success: boolean; token: string; expires_in: number; auth_required: number };
  if (!json?.success || !json.token) throw new Error('auth_failed');

  localStorage.setItem(tokenStorageKey(), json.token);
  localStorage.setItem(tokenExpStorageKey(), String(Date.now() + Number(json.expires_in || 0) * 1000));
  return json.token;
}

export async function fetchSongs() {
  const data = await fetchAppData();
  return tracksToSongs(data.tracks);
}

export async function fetchFilters() {
  const data = await fetchAppData();
  // Keep original UI simple: just show the genre names
  return data.genres.map((g) => g.name);
}

function mapTrackToSong(t: ConnectorTrack): Song {
  return {
    id: Number(t.id),
    artist: t.artist,
    title: t.title,
    year: t.year ? Number(t.year) || null : null,
    genre: t.genre || null,
    youtubeUrl: t.youtube_url || null,
    spotifyUrl: t.spotify_url || null,
    albumArtUrl: t.thumbnail || null,
    votes: Number(t.votes) || 0,
    previousRank: t.previous_rank ?? null,
    currentRank: t.current_rank ?? null,
    status: 'APPROVED',
    genreColor: t.genre_color ?? null,
  };
}

export async function vote(songId: number) {
  const token = await getAuthToken();
  const res = await fetch(wpUrl('/vote'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-App-Token': token } : null),
    },
    body: JSON.stringify({ track_id: songId, voter_key: getOrCreateVoterKey() }),
  });

  const json = (await res.json()) as any;
  if (!res.ok || !json?.success) {
    const err = new Error(json?.error || 'vote_failed');
    (err as any).userMessage = json?.message;
    throw err;
  }

  return json as { success: true; vote_count?: number; message?: string };
}

export type SubmissionPayload = {
  artist: string;
  title: string;
  year?: number;
  genre: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  albumArtUrl?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  captchaToken?: string;
};

export async function submitSong(payload: SubmissionPayload) {
  const token = await getAuthToken();
  const res = await fetch(wpUrl('/submission'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-App-Token': token } : null),
    },
    body: JSON.stringify({
      artist: payload.artist,
      title: payload.title,
      year: payload.year,
      genre: payload.genre,
      youtube_url: payload.youtubeUrl,
      spotify_url: payload.spotifyUrl,
      album_art_url: payload.albumArtUrl,
      email: payload.email,
      first_name: payload.firstName,
      last_name: payload.lastName,
      captcha_token: payload.captchaToken,
    }),
  });
  let data: any = null;
  try {
    data = (await res.json()) as any;
  } catch {
    // Non-JSON response (e.g. WP fatal error HTML)
    throw new Error('submission_failed');
  }
  if (!res.ok || !data?.success) throw new Error(data?.message || data?.error || 'submission_failed');
  // Connector returns { success, track_id, is_pending }
  return data as { success: true; track_id: number; is_pending?: boolean };
}

export async function fetchPendingCount() {
  if (!ADMIN_KEY) {
    return null;
  }
  const res = await fetch(withCacheBust(wpUrl('/admin/pending-count')), {
    headers: { 'X-Admin-Key': ADMIN_KEY },
  });
  const data = (await res.json()) as any;
  if (!res.ok || !data?.success) {
    return null;
  }
  return Number(data.pending_count) || 0;
}
