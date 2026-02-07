import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';
import PDFDocument from 'pdfkit';
import { prisma } from './db.js';
import { env } from './env.js';
import { computeVoterHash, requireAdmin } from './security.js';
import { recomputeRanks } from './rankings.js';
import { verifyCaptcha } from './captcha.js';
import { listSongsQuerySchema, submissionBodySchema, voteBodySchema } from './validators.js';

const app = express();
app.disable('x-powered-by');

app.use(helmet());
app.use(morgan('combined'));
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: '256kb' }));

const voteLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const submissionLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: env.WEB_ORIGIN },
});

async function getApprovedSongsSnapshot() {
  const songs = await prisma.song.findMany({
    where: { status: 'APPROVED' },
    orderBy: [{ currentRank: 'asc' }, { votes: 'desc' }, { id: 'asc' }],
  });
  return songs;
}

async function broadcastSongs() {
  const songs = await getApprovedSongsSnapshot();
  io.emit('songs:update', songs);
}

io.on('connection', async (socket) => {
  socket.emit('songs:init', await getApprovedSongsSnapshot());
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// List songs (APPROVED)
app.get('/api/songs', async (req, res) => {
  const parsed = listSongsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_query' });
  }

  const { search, genre, decade, year, artist } = parsed.data;

  const where: any = { status: 'APPROVED' };
  if (genre) where.genre = genre;
  if (year) where.year = year;
  if (artist) where.artist = { contains: artist, mode: 'insensitive' };

  if (decade) {
    // e.g. "70s" => 1970..1979
    const match = decade.match(/^(\d{2})s$/);
    if (match) {
      const d = Number(match[1]);
      const from = 1900 + d * 10;
      where.year = { gte: from, lte: from + 9 };
    }
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { artist: { contains: search, mode: 'insensitive' } },
      { genre: { contains: search, mode: 'insensitive' } },
    ];
  }

  const songs = await prisma.song.findMany({
    where,
    orderBy: [{ currentRank: 'asc' }, { votes: 'desc' }, { id: 'asc' }],
  });

  res.json({ songs });
});

app.get('/api/filters', async (_req, res) => {
  const genres = await prisma.song.findMany({
    where: { status: 'APPROVED', genre: { not: null } },
    distinct: ['genre'],
    select: { genre: true },
    orderBy: { genre: 'asc' },
  });
  res.json({ genres: genres.map((g) => g.genre).filter(Boolean) });
});

// Vote (1 vote per song per IP/UA hash)
app.post('/api/votes', voteLimiter, async (req, res) => {
  const parsed = voteBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body' });
  }

  const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '').trim();
  const userAgent = req.headers['user-agent']?.toString() || '';
  const voterHash = computeVoterHash(ip, userAgent);

  const songId = parsed.data.songId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const song = await tx.song.findFirst({ where: { id: songId, status: 'APPROVED' } });
      if (!song) {
        return { kind: 'not_found' as const };
      }

      // Insert vote log (unique constraint enforces 1 vote per song per voterHash)
      await tx.vote.create({
        data: {
          songId,
          voterHash,
          ip: ip || null,
          userAgent: userAgent || null,
        },
      });

      const updated = await tx.song.update({
        where: { id: songId },
        data: { votes: { increment: 1 } },
      });

      return { kind: 'ok' as const, song: updated };
    });

    if (result.kind === 'not_found') {
      return res.status(404).json({ error: 'song_not_found' });
    }

    // Rankings depend on global ordering; recompute then broadcast.
    await recomputeRanks();
    await broadcastSongs();

    return res.json({ ok: true });
  } catch (err: any) {
    // Prisma unique constraint: duplicate vote
    const msg = typeof err?.message === 'string' ? err.message : '';
    if (msg.includes('Unique constraint failed')) {
      return res.status(409).json({ error: 'already_voted' });
    }
    return res.status(500).json({ error: 'vote_failed' });
  }
});

// Submit new song (PENDING)
app.post('/api/submissions', submissionLimiter, async (req, res) => {
  const parsed = submissionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
  }

  const okCaptcha = await verifyCaptcha(parsed.data.captchaToken);
  if (!okCaptcha) {
    return res.status(400).json({ error: 'captcha_failed' });
  }

  const song = await prisma.song.create({
    data: {
      artist: parsed.data.artist,
      title: parsed.data.title,
      year: parsed.data.year,
      genre: parsed.data.genre,
      youtubeUrl: parsed.data.youtubeUrl || null,
      spotifyUrl: parsed.data.spotifyUrl || null,
      albumArtUrl: parsed.data.albumArtUrl || null,
      status: 'PENDING',
      submitterEmail: parsed.data.email,
      submitterFirstName: parsed.data.firstName || null,
      submitterLastName: parsed.data.lastName || null,
    },
  });

  res.json({ ok: true, songId: song.id });
});

// Admin: list pending
app.get('/api/admin/songs', async (req, res) => {
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const status = (req.query.status?.toString().toUpperCase() || 'PENDING') as any;
  const songs = await prisma.song.findMany({
    where: { status },
    orderBy: [{ createdAt: 'desc' }],
  });
  res.json({ songs });
});

app.post('/api/admin/songs/:id/approve', async (req, res) => {
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const id = Number(req.params.id);
  const song = await prisma.song.update({ where: { id }, data: { status: 'APPROVED' } });
  await recomputeRanks();
  await broadcastSongs();
  res.json({ ok: true, song });
});

app.post('/api/admin/songs/:id/reject', async (req, res) => {
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const id = Number(req.params.id);
  const song = await prisma.song.update({ where: { id }, data: { status: 'REJECTED' } });
  res.json({ ok: true, song });
});

app.get('/api/admin/export.csv', async (req, res) => {
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const songs = await prisma.song.findMany({
    where: { status: 'APPROVED' },
    orderBy: [{ currentRank: 'asc' }, { votes: 'desc' }],
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="top100-rankings.csv"');

  const header = [
    'rank',
    'previous_rank',
    'artist',
    'title',
    'year',
    'genre',
    'votes',
    'youtube_url',
    'spotify_url',
    'album_art_url',
  ].join(',');
  res.write(header + '\n');

  for (const s of songs) {
    const row = [
      s.currentRank ?? '',
      s.previousRank ?? '',
      csvSafe(s.artist),
      csvSafe(s.title),
      s.year ?? '',
      csvSafe(s.genre || ''),
      s.votes,
      csvSafe(s.youtubeUrl || ''),
      csvSafe(s.spotifyUrl || ''),
      csvSafe(s.albumArtUrl || ''),
    ].join(',');
    res.write(row + '\n');
  }

  res.end();
});

app.get('/api/admin/export.pdf', async (req, res) => {
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const songs = await prisma.song.findMany({
    where: { status: 'APPROVED' },
    orderBy: [{ currentRank: 'asc' }, { votes: 'desc' }],
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="top100-rankings.pdf"');

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(20).text('Top 100 Rankings', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10);

  for (const s of songs) {
    const move = rankMove(s.previousRank, s.currentRank);
    doc
      .text(
        `${String(s.currentRank ?? '').padStart(3, ' ')} ${move.padEnd(6, ' ')}  ${s.artist} - ${s.title}  (${s.year ?? ''})  [${s.genre ?? ''}]  votes=${s.votes}`
      )
      .moveDown(0.2);
  }

  doc.end();
});

function csvSafe(value: string) {
  const v = value.replaceAll('"', '""');
  return `"${v}"`;
}

function rankMove(prev?: number | null, curr?: number | null) {
  if (!prev || !curr) return '';
  const diff = prev - curr;
  if (diff === 0) return '—';
  if (diff > 0) return `↑${diff}`;
  return `↓${Math.abs(diff)}`;
}

server.listen(env.PORT, async () => {
  // Ensure ranks are populated on boot.
  await recomputeRanks();
  // eslint-disable-next-line no-console
  console.log(`server listening on http://localhost:${env.PORT}`);
});
