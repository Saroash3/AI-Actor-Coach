/**
 * Cleans machine-annotated screenplays before they go into the library.
 *
 * The annotated source data has systematic tagging errors:
 *  - the first line after a speaker cue is often tagged "text" instead of "dialog"
 *  - dialogue is split at the printed page's line wraps ("…eighteen meters." / "Thirteen…")
 *  - page furniture is tagged as speakers: (CONTINUED), CUT TO:, (MORE), (BEAT)
 *  - cue extensions split one character into several: BEN / BEN (CONT'D) / BEN (V.O.)
 *  - the title page is parsed as scenes ("Default Scene", "THIRD DRAFT … PARAMOUNT")
 *  - scene numbers are left in headings and narration ("… -- DAY 1", "6 The bow …")
 */

// ── Text normalisation ────────────────────────────────────────────────────────

function normalizeText(s) {
  return String(s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

const letterCount = (s) => (s.match(/[A-Za-z]/g) || []).length

// Page furniture that should never be read aloud or spoken
const PAGE_MARKER_RE =
  /^(\(?\s*(CONTINUED|CONT'D|MORE)\s*\)?:?(\s*\(\d+\))?|(SMASH |MATCH |JUMP |HARD )?CUT TO:?|DISSOLVE TO:?|FADE (IN|OUT|TO BLACK)( ON)?[:.]?|WIPE TO:?|BACK TO SCENE:?|INTERCUT( WITH)?:?|INSERT:?|OMITTED|THE END|END CREDITS\.?)$/i

function isNoise(s) {
  if (letterCount(s) < 2) return true // "!", "1", "—_7", page numbers
  return PAGE_MARKER_RE.test(s)
}

const isParenthetical = (s) => /^\(.*\)\.?$/.test(s)

// "6 The featureless gray clay…" → "The featureless gray clay…"
// Keeps "5 MINUTES LATER" (all caps) and "3 men…" (lowercase), which are real text.
function stripLeadingSceneNumber(s) {
  return s.replace(/^\d{1,3}[A-Z]?\s+(?=[A-Z][a-z])/, '')
}

function cleanHeading(s) {
  return normalizeText(s)
    .replace(/^\d+[A-Z]?\s+/, '')
    .replace(/\s+\d+[A-Z]?\s*\*?$/, '')
    .replace(/\s*\(CONTINUED\)\s*$/i, '')
    .trim()
}

// ── Speaker cues ──────────────────────────────────────────────────────────────

// All-caps camera/format words the tagger mistakes for character cues
const NOT_CHARACTERS = new Set([
  'BLACK', 'BLACKNESS', 'DARKNESS', 'SILENCE', 'LOGO', 'SUPER', 'TITLE', 'TITLES',
  'MAIN TITLES', 'CREDITS', 'MONTAGE', 'SERIES OF SHOTS', 'ANGLE', 'CLOSE ON', 'CLOSE UP',
  'POV', 'LATER', 'CONTINUOUS', 'MOMENTS LATER', 'FLASHBACK', 'END FLASHBACK', 'INTERCUT',
])
// Shot descriptions: "LOW ANGLE 2", "WIDE SHOT", "REVERSE POV"
const CAMERA_RE = /\b(ANGLE|SHOT|POV|CLOSE ON|CLOSE-UP|CLOSEUP)\b/

/**
 * Returns the canonical character name, or null when the cue is not a real
 * character (page marker, transition, parenthetical, camera word, OCR junk).
 * "LIONEL (cont'd) (CONT'D)" → "LIONEL",  "VOICE (0.S.)" → "VOICE"
 */
function normalizeSpeaker(raw, scriptTitle = '') {
  let s = normalizeText(raw)
  if (isParenthetical(s) || isNoise(s)) return null
  // Strip trailing cue extensions: (CONT'D), (V.O.), (O.S.), (0.S.), (8), …
  while (/\s*\([^)]*\)\s*$/.test(s)) s = s.replace(/\s*\([^)]*\)\s*$/, '')
  s = s.replace(/[:.]+$/, '').trim()
  if (!/^[A-Z][A-Z0-9 .'\-\/&#]*$/.test(s)) return null
  if (letterCount(s) < 2 || s.length > 35 || s.split(' ').length > 5) return null
  if (NOT_CHARACTERS.has(s) || CAMERA_RE.test(s)) return null
  if (scriptTitle && s === scriptTitle.toUpperCase()) return null // title card
  return s
}

// ── Dialogue reconstruction ───────────────────────────────────────────────────

const endsSentence    = (s) => /[.!?…"'\-—)]$/.test(s)
const startsLowercase = (s) => /^[a-z]/.test(s)

// A line continues the previous one when the previous line was cut mid-sentence
// or this one picks up in lowercase — regardless of how it was tagged.
const isContinuation = (prev, next) => !endsSentence(prev) || startsLowercase(next)

/**
 * Re-flows wrapped fragments into sentences, then groups very short sentences
 * so each spoken line carries enough words for emotion analysis.
 */
function toSpokenLines(fragments) {
  const joined = fragments.join(' ').replace(/(\w)- (\w)/g, '$1$2').replace(/\s+/g, ' ').trim()
  const sentences = joined.split(/(?<=[.!?…]["')]?)\s+(?=["'(]?[A-Z])/)
  const lines = []
  let buf = ''
  for (const sentence of sentences) {
    buf = buf ? `${buf} ${sentence}` : sentence
    if (buf.split(' ').length >= 6) {
      lines.push(buf)
      buf = ''
    }
  }
  if (buf) {
    if (lines.length > 0 && buf.split(' ').length < 3) lines[lines.length - 1] += ` ${buf}`
    else lines.push(buf)
  }
  return lines
}

function cleanElements(rawElements, scriptTitle = '') {
  // 1. Normalise, drop noise, classify
  const els = []
  for (const el of rawElements ?? []) {
    let content = normalizeText(el.content)
    if (!content) continue
    if (el.type === 'speaker') {
      const name = normalizeSpeaker(content, scriptTitle)
      if (name) els.push({ kind: 'speaker', content: name })
      else if (CAMERA_RE.test(content) && content.split(' ').length <= 4) continue // "LOW ANGLE 2"
      else if (!isNoise(content) && !isParenthetical(content) && letterCount(content) >= 3) {
        // mis-tagged narration ("1 BLACKNESS", title card, camera words)
        els.push({ kind: 'line', tag: 'text', content: content.replace(/^\d+[A-Z]?\s+/, '') })
      }
      continue
    }
    if (isNoise(content)) continue
    if (isParenthetical(content)) {
      els.push({ kind: 'paren', content })
      continue
    }
    if (el.type === 'text') content = stripLeadingSceneNumber(content)
    // "My name is Kathy. cuT To -" → "My name is Kathy."
    content = content.replace(/\s+(cut|dissolve|smash cut) to\s*[:.\-–—]*\s*$/i, '')
    els.push({ kind: 'line', tag: el.type === 'dialog' ? 'dialog' : 'text', content })
  }

  // 2. Rebuild speeches and narration
  const out = []
  let i = 0
  while (i < els.length) {
    const el = els[i]

    if (el.kind === 'speaker') {
      const fragments = []
      let j = i + 1
      while (j < els.length && els[j].kind === 'paren') j++
      // A cue is always followed by dialogue, whatever the tagger said
      if (j < els.length && els[j].kind === 'line') fragments.push(els[j++].content)
      while (j < els.length) {
        const next = els[j]
        if (next.kind === 'speaker') break
        if (next.kind === 'paren') { j++; continue }
        const prev = fragments[fragments.length - 1]
        if (next.tag === 'dialog' || isContinuation(prev, next.content)) {
          fragments.push(next.content)
          j++
        } else break
      }
      if (fragments.length > 0) {
        out.push({ type: 'speaker', content: el.content })
        for (const line of toSpokenLines(fragments)) out.push({ type: 'dialog', content: line })
      }
      i = j
      continue
    }

    // Narration: orphan "dialog" and parentheticals outside a speech are narration too
    out.push({ type: 'text', content: el.content })
    i++
  }
  return out
}

// ── Scenes ────────────────────────────────────────────────────────────────────

const SLUGLINE_RE = /\b(INT|EXT|I\/E)\b/i
const FADE_IN_RE  = /\b(FADE|FARCE) IN\b/i // "FARCE IN" is an OCR misread in the data

// Title-page lines: credits, drafts, dates, legal notices
const LEGAL_RE   = /copyright|©|rights reserved|property of|exclusive property|affiliates|reproduc|written consent|restrictions|for your consideration|by any means|any medium|unauthori[sz]ed|disclosure|pr[oa]hibited/i
const CREDITS_RE = /written|screenplay|\bby\b|based on|novel|story|created|draft|revis|amendment|shooting script|producer|president/i
const DATE_RE    = /\b(19|20)\d\d\b|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d/i
const ADDRESS_RE = /\b(street|avenue|boulevard|plaza|suite|floor|unit|centre|center)\b|\b\d{5}\b|\b[A-Z]{1,2}\d{1,2}[A-Z]? \d[A-Z]{2}\b/i
const AUTHOR_RE  = /written|screenplay|\bby\b/i

// Counts real words only: "- 211 East 43rd Street . ." → 3
const wordCount = (s) => s.split(/\s+/).filter((w) => /[A-Za-z]/.test(w)).length

function isTitlePageLine(s) {
  const n = wordCount(s)
  return LEGAL_RE.test(s) ||
    (n <= 8 && (CREDITS_RE.test(s) || ADDRESS_RE.test(s))) ||
    (n <= 5 && DATE_RE.test(s))
}

/**
 * Finds where the story starts inside the title-page scenes: after the last
 * credits/legal line (or the first FADE IN), past any author names that follow
 * a "by" line, at the first line of real content.
 * Scanning for title-page lines stops at the first line of real prose, so a
 * "by" or a date inside the story can't reset the start.
 * Returns an index into `flat`, or -1 when the title page holds no story.
 */
function findOpening(flat) {
  let start = 0
  for (let i = 0; i < flat.length; i++) {
    const { content, isHeading } = flat[i]
    if (FADE_IN_RE.test(content)) { start = i + 1; break }
    if (isTitlePageLine(content)) { start = i + 1; continue }
    if (!isHeading && wordCount(content) >= 8) break
  }
  // "Screenplay by" → "David Goyer" → "and" → "Jonathan Nolan"
  if (start > 0 && AUTHOR_RE.test(flat[start - 1].content) && !FADE_IN_RE.test(flat[start - 1].content)) {
    let skipped = 0
    while (start < flat.length && skipped < 3 && !flat[start].isHeading && wordCount(flat[start].content) <= 4) {
      start++
      skipped++
    }
  }
  for (let i = start; i < flat.length; i++) {
    const { content, isHeading, type } = flat[i]
    if (isHeading || isNoise(content) || isParenthetical(content)) continue
    if (type !== 'speaker' && wordCount(content) >= 4) return i
    if (type === 'speaker' && normalizeSpeaker(content)) {
      const next = flat.slice(i + 1).find((f) => !isParenthetical(f.content))
      if (next && !next.isHeading && wordCount(next.content) >= 3) return i
    }
  }
  return -1
}

/**
 * Title-page scenes (before the first slugline) are dropped, except for any
 * story content that starts there, which becomes an "Opening" scene.
 */
function extractOpening(frontScenes) {
  const flat = []
  frontScenes.forEach((s, sceneIdx) => {
    flat.push({ sceneIdx, isHeading: true, content: s.heading })
    for (const el of s.elements) {
      const content = normalizeText(el.content)
      if (content) flat.push({ sceneIdx, type: el.type, content, el })
    }
  })
  const start = findOpening(flat)
  if (start === -1) return []

  const kept = []
  for (const item of flat.slice(start)) {
    if (item.isHeading) {
      kept.push({ heading: isTitlePageLine(item.content) ? 'Opening' : item.content, elements: [] })
      continue
    }
    if (kept.length === 0) kept.push({ heading: 'Opening', elements: [] })
    kept[kept.length - 1].elements.push(item.el)
  }
  return kept
}

/**
 * Drops the title page (keeping any opening story content before the first
 * slugline), cleans each scene, drops empty scenes and renumbers from 1.
 */
function cleanScenes(rawScenes, scriptTitle = '') {
  const scenes = rawScenes.map((s) => ({
    heading:  cleanHeading(s.sceneHeading ?? s.scene_heading ?? ''),
    elements: s.elements ?? [],
  }))
  const firstSlug = scenes.findIndex((s) => SLUGLINE_RE.test(s.heading))
  const body = firstSlug > 0
    ? [...extractOpening(scenes.slice(0, firstSlug)), ...scenes.slice(firstSlug)]
    : scenes

  return body
    .map((s) => ({ heading: s.heading, elements: cleanElements(s.elements, scriptTitle) }))
    .filter((s) => s.elements.length > 0)
    .map((s, i) => ({
      sceneNumber:  i + 1,
      sceneHeading: s.heading || `Scene ${i + 1}`,
      elements:     s.elements,
    }))
}

// ── Difficulty ────────────────────────────────────────────────────────────────

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (w.length <= 3) return 1
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g)
  return Math.max(1, groups ? groups.length : 1)
}

/**
 * Difficulty from what the actor actually has to perform, not script length:
 *  - speech length:  average words per speech (sustaining longer speeches is harder)
 *  - monologues:     share of speeches of 60+ words
 *  - language:       share of words with 3+ syllables (heightened / technical language)
 * Each is scaled 0–1 against a typical ceiling, then weighted.
 */
function scoreDifficulty(scenes) {
  let speeches = 0
  let words = 0
  let longSpeeches = 0
  let complexWords = 0

  for (const scene of scenes) {
    let current = null
    const flush = () => {
      if (current === null) return
      speeches++
      words += current
      if (current >= 60) longSpeeches++
      current = null
    }
    for (const el of scene.elements) {
      if (el.type === 'speaker') { flush(); current = 0 }
      else if (el.type === 'dialog' && current !== null) {
        const ws = el.content.split(/\s+/).filter((w) => /[A-Za-z]/.test(w))
        current += ws.length
        complexWords += ws.filter((w) => syllables(w) >= 3).length
      } else flush()
    }
    flush()
  }

  if (speeches === 0) return { score: 0, avgWordsPerSpeech: 0, monologueShare: 0, complexWordShare: 0 }

  const avgWordsPerSpeech = words / speeches
  const monologueShare    = longSpeeches / speeches
  const complexWordShare  = complexWords / words
  const clamp = (x) => Math.max(0, Math.min(1, x))

  const score =
    0.45 * clamp((avgWordsPerSpeech - 6) / 14) +
    0.30 * clamp(monologueShare / 0.06) +
    0.25 * clamp((complexWordShare - 0.04) / 0.06)

  return { score, avgWordsPerSpeech, monologueShare, complexWordShare }
}

// Thresholds calibrated on the 30-film library (scores range ~0.1–0.7):
// sparse-dialogue films (Moonlight, Wonderstruck) land in Beginner,
// monologue-heavy ones (Motherless Brooklyn, The Godfather) in Advanced.
function getDifficulty(scenes) {
  const { score } = scoreDifficulty(scenes)
  if (score < 0.22) return 'Beginner'
  if (score < 0.35) return 'Intermediate'
  return 'Advanced'
}

module.exports = { cleanScenes, cleanElements, normalizeSpeaker, scoreDifficulty, getDifficulty }
