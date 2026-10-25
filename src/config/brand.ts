/** Signature quote (auth pages and first entrance). */
export const SIGNATURE_QUOTE = {
  text: 'The sky is not the limit, you limit yourself to the sky.',
  attribution: 'Jaydin, Founder of Voxly',
} as const

/**
 * Optional looping instrumental for the entrance only. Owner adds the file under public/audio
 * (see ops/ENTRANCE-MUSIC.md). When null, speaker and Settings controls stay hidden.
 */
export const entranceMusic: { src: string; credit: string; licence: string } | null = null
