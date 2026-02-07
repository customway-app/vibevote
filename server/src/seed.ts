import { prisma } from './db.js';
import { recomputeRanks } from './rankings.js';

async function main() {
  const existing = await prisma.song.count();
  if (existing > 0) {
    // eslint-disable-next-line no-console
    console.log('seed skipped: songs already exist');
    return;
  }

  await prisma.song.createMany({
    data: [
      {
        artist: 'Bee Gees',
        title: 'Night Fever',
        year: 1977,
        genre: 'Disco',
        youtubeUrl: 'https://www.youtube.com/watch?v=SkypZuY6ZvA',
        spotifyUrl: 'https://open.spotify.com/track/1xznGGDReH1oQq0xzbwXa3',
        albumArtUrl: null,
        status: 'APPROVED',
        votes: 12,
      },
      {
        artist: 'Kool & The Gang',
        title: 'Celebration',
        year: 1980,
        genre: 'Disco',
        youtubeUrl: 'https://www.youtube.com/watch?v=3GwjfUFyY6M',
        spotifyUrl: null,
        albumArtUrl: null,
        status: 'APPROVED',
        votes: 9,
      },
      {
        artist: 'New Order',
        title: 'Blue Monday',
        year: 1983,
        genre: 'New wave',
        youtubeUrl: 'https://www.youtube.com/watch?v=c1GxjzHm5us',
        spotifyUrl: null,
        albumArtUrl: null,
        status: 'APPROVED',
        votes: 7,
      },
      {
        artist: 'Faithless',
        title: 'God Is a DJ',
        year: 1998,
        genre: 'Dance',
        youtubeUrl: 'https://www.youtube.com/watch?v=bhSB8EEnCAM',
        spotifyUrl: 'https://open.spotify.com/track/1pUFYb9peWkK8m1WCKNRjp',
        albumArtUrl: null,
        status: 'APPROVED',
        votes: 5,
      },
      {
        artist: 'Michael Jackson',
        title: 'Billie Jean',
        year: 1983,
        genre: 'Pop',
        youtubeUrl: 'https://youtu.be/Zi_XLOBDo_Y',
        spotifyUrl: null,
        albumArtUrl: null,
        status: 'APPROVED',
        votes: 11,
      },
    ],
  });

  await recomputeRanks();
  // eslint-disable-next-line no-console
  console.log('seeded');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
