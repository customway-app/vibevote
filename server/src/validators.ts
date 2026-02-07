import { z } from 'zod';

export const listSongsQuerySchema = z.object({
  search: z.string().optional(),
  genre: z.string().optional(),
  decade: z.string().optional(),
  year: z.coerce.number().int().optional(),
  artist: z.string().optional(),
});

export const voteBodySchema = z.object({
  songId: z.coerce.number().int().positive(),
});

export const submissionBodySchema = z.object({
  artist: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  genre: z.string().min(1).max(100),
  youtubeUrl: z.string().url().optional().or(z.literal('')),
  spotifyUrl: z.string().url().optional().or(z.literal('')),
  albumArtUrl: z.string().url().optional().or(z.literal('')),
  email: z.string().email(),
  firstName: z.string().max(100).optional().or(z.literal('')),
  lastName: z.string().max(100).optional().or(z.literal('')),
  captchaToken: z.string().optional(),
});
