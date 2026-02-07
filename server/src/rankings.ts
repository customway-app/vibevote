import { prisma } from './db.js';

// Recompute ranks for APPROVED songs.
// - currentRank: 1..N based on votes desc then updatedAt asc
// - previousRank: last saved currentRank
export async function recomputeRanks() {
  const songs = await prisma.song.findMany({
    where: { status: 'APPROVED' },
    orderBy: [{ votes: 'desc' }, { updatedAt: 'asc' }, { id: 'asc' }],
    select: { id: true, currentRank: true },
  });

  if (songs.length === 0) {
    return;
  }

  // Update in a transaction; keep it deterministic.
  await prisma.$transaction(
    songs.map((s, idx) =>
      prisma.song.update({
        where: { id: s.id },
        data: {
          previousRank: s.currentRank,
          currentRank: idx + 1,
        },
      })
    )
  );
}
