#!/usr/bin/env node
/**
 * Generates supabase/seeds/daily_quotes_120.generated.sql (idempotent inserts).
 * Run: node scripts/generate-daily-quotes-seed.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

/** @type {{ text: string; author: string; source: string | null; kind: 'public_domain' | 'original' | 'owner' }[]} */
const QUOTES = [
  {
    text: 'The sky is not the limit, you limit yourself to the sky.',
    author: 'Jaydin, Founder of Voxly',
    source: null,
    kind: 'owner',
  },
  // Shakespeare & Elizabethan / Romantic (authors deceased 1928+ ago)
  { text: 'To be, or not to be, that is the question.', author: 'William Shakespeare', source: 'Hamlet', kind: 'public_domain' },
  { text: 'All the world’s a stage, and all the men and women merely players.', author: 'William Shakespeare', source: 'As You Like It', kind: 'public_domain' },
  { text: 'We are such stuff as dreams are made on, and our little life is rounded with a sleep.', author: 'William Shakespeare', source: 'The Tempest', kind: 'public_domain' },
  { text: 'The course of true love never did run smooth.', author: 'William Shakespeare', source: 'A Midsummer Night’s Dream', kind: 'public_domain' },
  { text: 'If music be the food of love, play on.', author: 'William Shakespeare', source: 'Twelfth Night', kind: 'public_domain' },
  { text: 'Brevity is the soul of wit.', author: 'William Shakespeare', source: 'Hamlet', kind: 'public_domain' },
  { text: 'This above all: to thine own self be true.', author: 'William Shakespeare', source: 'Hamlet', kind: 'public_domain' },
  { text: 'Cowards die many times before their deaths; the valiant never taste of death but once.', author: 'William Shakespeare', source: 'Julius Caesar', kind: 'public_domain' },
  { text: 'Love looks not with the eyes, but with the mind.', author: 'William Shakespeare', source: 'A Midsummer Night’s Dream', kind: 'public_domain' },
  { text: 'Fill your paper with the breathings of your heart.', author: 'William Wordsworth', source: null, kind: 'public_domain' },
  { text: 'I wandered lonely as a cloud that floats on high o’er vales and hills.', author: 'William Wordsworth', source: 'I Wandered Lonely as a Cloud', kind: 'public_domain' },
  { text: 'The child is father of the man.', author: 'William Wordsworth', source: 'My Heart Leaps Up', kind: 'public_domain' },
  { text: 'Come forth into the light of things, let nature be your teacher.', author: 'William Wordsworth', source: null, kind: 'public_domain' },
  { text: 'Poetry is the spontaneous overflow of powerful feelings.', author: 'William Wordsworth', source: null, kind: 'public_domain' },
  { text: 'A thing of beauty is a joy for ever.', author: 'John Keats', source: 'Endymion', kind: 'public_domain' },
  { text: 'Beauty is truth, truth beauty,—that is all ye know on earth, and all ye need to know.', author: 'John Keats', source: 'Ode on a Grecian Urn', kind: 'public_domain' },
  { text: 'Season of mists and mellow fruitfulness.', author: 'John Keats', source: 'To Autumn', kind: 'public_domain' },
  { text: 'My heart aches, and a drowsy numbness pains my sense.', author: 'John Keats', source: 'Ode to a Nightingale', kind: 'public_domain' },
  { text: 'If Winter comes, can Spring be far behind?', author: 'Percy Bysshe Shelley', source: 'Ode to the West Wind', kind: 'public_domain' },
  { text: 'Rise like Lions after slumber in unvanquishable number.', author: 'Percy Bysshe Shelley', source: 'The Mask of Anarchy', kind: 'public_domain' },
  { text: 'Fear not for the future, weep not for the past.', author: 'Percy Bysshe Shelley', source: null, kind: 'public_domain' },
  { text: 'She walks in beauty, like the night of cloudless climes and starry skies.', author: 'Lord Byron', source: null, kind: 'public_domain' },
  { text: 'There is pleasure in the pathless woods.', author: 'Lord Byron', source: null, kind: 'public_domain' },
  { text: 'Hope is the thing with feathers that perches in the soul.', author: 'Emily Dickinson', source: null, kind: 'public_domain' },
  { text: 'Because I could not stop for Death, he kindly stopped for me.', author: 'Emily Dickinson', source: null, kind: 'public_domain' },
  { text: 'Forever is composed of nows.', author: 'Emily Dickinson', source: null, kind: 'public_domain' },
  { text: 'Tell all the truth but tell it slant.', author: 'Emily Dickinson', source: null, kind: 'public_domain' },
  { text: 'I celebrate myself, and sing myself.', author: 'Walt Whitman', source: 'Song of Myself', kind: 'public_domain' },
  { text: 'Keep your face always toward the sunshine—and shadows will fall behind you.', author: 'Walt Whitman', source: null, kind: 'public_domain' },
  { text: 'Re-examine all you have been told; dismiss whatever insults your own soul.', author: 'Walt Whitman', source: null, kind: 'public_domain' },
  { text: 'Do I contradict myself? Very well then I contradict myself; I am large, I contain multitudes.', author: 'Walt Whitman', source: null, kind: 'public_domain' },
  { text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.', author: 'Jane Austen', source: 'Pride and Prejudice', kind: 'public_domain' },
  { text: 'There is no charm equal to tenderness of heart.', author: 'Jane Austen', source: null, kind: 'public_domain' },
  { text: 'It was the best of times, it was the worst of times.', author: 'Charles Dickens', source: 'A Tale of Two Cities', kind: 'public_domain' },
  { text: 'Reflect upon your present blessings.', author: 'Charles Dickens', source: null, kind: 'public_domain' },
  { text: 'It is a far, far better thing that I do, than I have ever done.', author: 'Charles Dickens', source: 'A Tale of Two Cities', kind: 'public_domain' },
  { text: 'It is never too late to be what you might have been.', author: 'George Eliot', source: null, kind: 'public_domain' },
  { text: 'What do we live for, if it is not to make life less difficult for each other?', author: 'George Eliot', source: null, kind: 'public_domain' },
  { text: 'The art of writing is the art of discovering what you believe.', author: 'Gustave Flaubert', source: null, kind: 'public_domain' },
  { text: 'Do not read, as children do, to amuse yourself, or like the ambitious, for the purpose of instruction. No, read in order to live.', author: 'Gustave Flaubert', source: null, kind: 'public_domain' },
  { text: 'Live in the sunshine, swim the sea, drink the wild air.', author: 'Ralph Waldo Emerson', source: null, kind: 'public_domain' },
  { text: 'Write it on your heart that every day is the best day in the year.', author: 'Ralph Waldo Emerson', source: null, kind: 'public_domain' },
  { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson', source: null, kind: 'public_domain' },
  { text: 'How vain it is to sit down to write when you have not stood up to live.', author: 'Henry David Thoreau', source: null, kind: 'public_domain' },
  { text: 'If you have built castles in the air, your work need not be lost.', author: 'Henry David Thoreau', source: 'Walden', kind: 'public_domain' },
  { text: 'We are all in the gutter, but some of us are looking at the stars.', author: 'Oscar Wilde', source: null, kind: 'public_domain' },
  { text: 'Beware; for I am fearless, and therefore powerful.', author: 'Mary Shelley', source: 'Frankenstein', kind: 'public_domain' },
  { text: 'Nothing is so painful to the human mind as a great and sudden change.', author: 'Mary Shelley', source: null, kind: 'public_domain' },
  { text: 'Once upon a midnight dreary, while I pondered, weak and weary.', author: 'Edgar Allan Poe', source: 'The Raven', kind: 'public_domain' },
  { text: 'All that we see or seem is but a dream within a dream.', author: 'Edgar Allan Poe', source: null, kind: 'public_domain' },
  { text: 'Ships that pass in the night, and speak each other in passing.', author: 'Henry Wadsworth Longfellow', source: 'Tales of a Wayside Inn', kind: 'public_domain' },
  { text: 'Lives of great men all remind us we can make our lives sublime.', author: 'Henry Wadsworth Longfellow', source: 'A Psalm of Life', kind: 'public_domain' },
  { text: 'Into each life some rain must fall.', author: 'Henry Wadsworth Longfellow', source: null, kind: 'public_domain' },
  { text: 'Knowledge comes, but wisdom lingers.', author: 'Alfred, Lord Tennyson', source: null, kind: 'public_domain' },
  { text: 'Tis better to have loved and lost than never to have loved at all.', author: 'Alfred, Lord Tennyson', source: 'In Memoriam', kind: 'public_domain' },
  { text: 'I am a part of all that I have met.', author: 'Alfred, Lord Tennyson', source: 'Ulysses', kind: 'public_domain' },
  { text: 'Either write something worth reading or do something worth writing.', author: 'Benjamin Franklin', source: null, kind: 'public_domain' },
  { text: 'The man who does not read has no advantage over the man who cannot read.', author: 'Mark Twain', source: null, kind: 'public_domain' },
  { text: 'Good friends, good books, and a sleepy conscience: this is the ideal life.', author: 'Mark Twain', source: null, kind: 'public_domain' },
  { text: 'The difference between the almost right word and the right word is really a large matter.', author: 'Mark Twain', source: null, kind: 'public_domain' },
  { text: 'Let us read, and let us dance; these two amusements will never do any harm to the world.', author: 'Voltaire', source: null, kind: 'public_domain' },
  { text: 'The pen is the tongue of the mind.', author: 'Miguel de Cervantes', source: null, kind: 'public_domain' },
  { text: 'Every man is the son of his own works.', author: 'Miguel de Cervantes', source: null, kind: 'public_domain' },
  { text: 'A room without books is like a body without a soul.', author: 'Marcus Tullius Cicero', source: null, kind: 'public_domain' },
  { text: 'If you have a garden and a library, you have everything you need.', author: 'Marcus Tullius Cicero', source: null, kind: 'public_domain' },
  { text: 'The only true wisdom is in knowing you know nothing.', author: 'Socrates', source: null, kind: 'public_domain' },
  { text: 'The unexamined life is not worth living.', author: 'Socrates', source: null, kind: 'public_domain' },
  { text: 'Knowing yourself is the beginning of all wisdom.', author: 'Aristotle', source: null, kind: 'public_domain' },
  { text: 'Educating the mind without educating the heart is no education at all.', author: 'Aristotle', source: null, kind: 'public_domain' },
  { text: 'Quality is not an act, it is a habit.', author: 'Aristotle', source: null, kind: 'public_domain' },
  { text: 'I think; therefore I am.', author: 'René Descartes', source: null, kind: 'public_domain' },
  { text: 'Man is born free, and everywhere he is in chains.', author: 'Jean-Jacques Rousseau', source: null, kind: 'public_domain' },
  { text: 'The world of reality has its limits; the world of imagination is boundless.', author: 'Jean-Jacques Rousseau', source: null, kind: 'public_domain' },
  { text: 'I am still learning.', author: 'Michelangelo', source: null, kind: 'public_domain' },
  { text: 'Learning never exhausts the mind.', author: 'Leonardo da Vinci', source: null, kind: 'public_domain' },
  { text: 'There is nothing either good or bad, but thinking makes it so.', author: 'William Shakespeare', source: 'Hamlet', kind: 'public_domain' },
  { text: 'Parting is such sweet sorrow.', author: 'William Shakespeare', source: 'Romeo and Juliet', kind: 'public_domain' },
  { text: 'We know what we are, but know not what we may be.', author: 'William Shakespeare', source: 'Hamlet', kind: 'public_domain' },
  { text: 'Words without thoughts never to heaven go.', author: 'William Shakespeare', source: 'Hamlet', kind: 'public_domain' },
  { text: 'The night is long that never finds the day.', author: 'William Shakespeare', source: 'Macbeth', kind: 'public_domain' },
  { text: 'Out, out, brief candle! Life’s but a walking shadow.', author: 'William Shakespeare', source: 'Macbeth', kind: 'public_domain' },
  { text: 'Shall I compare thee to a summer’s day?', author: 'William Shakespeare', source: 'Sonnet 18', kind: 'public_domain' },
  { text: 'Let me not to the marriage of true minds admit impediments.', author: 'William Shakespeare', source: 'Sonnet 116', kind: 'public_domain' },
  { text: 'The lunatic, the lover, and the poet are of imagination all compact.', author: 'William Shakespeare', source: 'A Midsummer Night’s Dream', kind: 'public_domain' },
  { text: 'Though she be but little, she is fierce.', author: 'William Shakespeare', source: 'A Midsummer Night’s Dream', kind: 'public_domain' },
  { text: 'Once more unto the breach, dear friends, once more.', author: 'William Shakespeare', source: 'Henry V', kind: 'public_domain' },
  { text: 'The better part of valor is discretion.', author: 'William Shakespeare', source: 'Henry IV', kind: 'public_domain' },
  { text: 'Sweet are the uses of adversity.', author: 'William Shakespeare', source: 'As You Like It', kind: 'public_domain' },
  { text: 'All that glisters is not gold.', author: 'William Shakespeare', source: 'The Merchant of Venice', kind: 'public_domain' },
  { text: 'The quality of mercy is not strained.', author: 'William Shakespeare', source: 'The Merchant of Venice', kind: 'public_domain' },
  { text: 'How far that little candle throws his beams! So shines a good deed in a naughty world.', author: 'William Shakespeare', source: 'The Merchant of Venice', kind: 'public_domain' },
  { text: 'Listen to many, speak to a few.', author: 'William Shakespeare', source: 'Hamlet', kind: 'public_domain' },
  // original Voxly
  { text: 'Every page holds a door if you are willing to knock.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Quiet ink can still change a room.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Read slowly; the world is in no hurry.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Leave a sentence softer than you found the page.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Your voice belongs in the chorus, not the echo.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Drafts are proof you showed up.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'A bookmark is a promise to return.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Stories travel farther when they travel honestly.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Write the line you needed yesterday.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Courage looks like sending the second draft.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Let your margins hold your breath.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Readers arrive as guests; welcome them in.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'One true detail can carry a whole scene.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'The feed fades; the page remains.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Share the work, not the performance of working.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Kindness in comments is also craft.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Your streak is a conversation with yourself.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Listen first; language follows.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Make room for silence between paragraphs.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Publish when the piece feels like a hand extended.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Notes in the margin are love letters to future you.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Global voices, one well-lit table.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Start small; revise with mercy.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'The best feedback asks a gentle question.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Protect the spark; edit the smoke.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'Write as if someone trusted you with their afternoon.', author: 'Voxly', source: null, kind: 'original' },
  { text: 'A poem can be a pocket-sized revolution.', author: 'Voxly', source: null, kind: 'original' },
]

// Remove duplicate Shakespeare line
const seen = new Set()
const deduped = QUOTES.filter((q) => {
  const key = `${q.author}\0${q.text}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

if (deduped.length !== 120) {
  console.error(`Expected 120 quotes after dedupe, got ${deduped.length}`)
  process.exit(1)
}

const esc = (s) => s.replace(/'/g, "''")

const lines = [
  '-- Generated by scripts/generate-daily-quotes-seed.mjs — do not edit by hand.',
  '-- Legacy non-PD rows from early seed (Atwood, Nin): deactivate; replacements are in this seed.',
  `update public.daily_quotes set active = false where author in ('Margaret Atwood', 'Anaïs Nin');`,
  '',
  'insert into public.daily_quotes (text, author, source, active, kind)',
  'select v.text, v.author, v.source, true, v.kind',
  'from (values',
]

deduped.forEach((q, i) => {
  const src = q.source === null ? 'null' : `'${esc(q.source)}'`
  const comma = i === deduped.length - 1 ? '' : ','
  lines.push(`  ('${esc(q.text)}', '${esc(q.author)}', ${src}, '${q.kind}')${comma}`)
})

lines.push(
  `) as v(text, author, source, kind)`,
  `where not exists (`,
  `  select 1 from public.daily_quotes dq where dq.text = v.text and dq.author = v.author`,
  `);`,
  '',
)

const outPath = path.join(process.cwd(), 'supabase/seeds/daily_quotes_120.generated.sql')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, lines.join('\n'))
console.log(`Wrote ${outPath} (${deduped.length} quotes)`)
