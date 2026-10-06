// Scores an actor's delivery of one dialogue, and summarises a whole scene.
//
//   line score = 50% emotion match   (voice emotion model vs the script's target emotion)
//              + 30% voice pattern   (pitch / loudness / pace / pauses vs the actor's own baseline)
//              + 20% line accuracy   (transcript vs script words)
//
// Components that couldn't be measured are left out and the weights re-balanced.

export const EMOTIONS = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"] as const
export type Emotion = (typeof EMOTIONS)[number]
export type EmotionMap = Record<string, number>

/** Measured by the voice service (Praat) for one recording */
export interface Prosody {
  durationSec:   number
  speechSec:     number
  pitchMedianHz: number | null
  pitchRangeSt:  number | null
  loudnessDb:    number
  loudnessVarDb: number
  pauseCount:    number
  pauseSec:      number
}

/** The actor's normal voice, from the calibration sentence */
export interface Baseline {
  prosody:     Prosody
  wordsPerSec: number
  /** true when estimated from the session's takes instead of a calibration recording */
  estimated?:  boolean
}

/**
 * Stand-in baseline when the actor skipped calibration: the average of their takes so far.
 * Less accurate (it drifts toward whatever emotions they've played), so results are flagged.
 */
export function estimateBaseline(takes: { prosody: Prosody; wordsPerSec: number }[]): Baseline | null {
  if (takes.length === 0) return null
  const avg = (f: (t: { prosody: Prosody; wordsPerSec: number }) => number | null) => {
    const vals = takes.map(f).filter((v): v is number => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  return {
    estimated: true,
    wordsPerSec: avg((t) => t.wordsPerSec) ?? 2.5,
    prosody: {
      durationSec:   avg((t) => t.prosody.durationSec) ?? 0,
      speechSec:     avg((t) => t.prosody.speechSec) ?? 0,
      pitchMedianHz: avg((t) => t.prosody.pitchMedianHz),
      pitchRangeSt:  avg((t) => t.prosody.pitchRangeSt),
      loudnessDb:    avg((t) => t.prosody.loudnessDb) ?? 0,
      loudnessVarDb: avg((t) => t.prosody.loudnessVarDb) ?? 0,
      pauseCount:    avg((t) => t.prosody.pauseCount) ?? 0,
      pauseSec:      avg((t) => t.prosody.pauseSec) ?? 0,
    },
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export function topEmotion(map: EmotionMap): string {
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral"
}

function normalize(map: EmotionMap): EmotionMap {
  const total = EMOTIONS.reduce((sum, e) => sum + (map[e] ?? 0), 0) || 1
  return Object.fromEntries(EMOTIONS.map((e) => [e, (map[e] ?? 0) / total]))
}

export const countWords = (text: string) => normalizeWords(text).length

// ── ① Emotion match ───────────────────────────────────────────────────────────

/**
 * overlap: how much the two emotion mixes have in common (sum of the smaller share of each emotion)
 * main:    how strongly the target's main emotion came through, relative to the strongest one heard
 */
export function scoreEmotionMatch(target: EmotionMap, achieved: EmotionMap) {
  const t = normalize(target)
  const a = normalize(achieved)
  const targetTop = topEmotion(t)
  const overlap = EMOTIONS.reduce((sum, e) => sum + Math.min(t[e], a[e]), 0)
  const main = a[targetTop] / (Math.max(...EMOTIONS.map((e) => a[e])) || 1)
  return {
    score:       Math.round(100 * (0.6 * overlap + 0.4 * main)),
    targetTop,
    achievedTop: topEmotion(a),
  }
}

// ── ② Voice pattern ───────────────────────────────────────────────────────────

export type FeatureKey = "pitch" | "pitchRange" | "loudness" | "pace" | "pauses"
type Direction = 1 | -1 | 0 // raise, lower, keep near normal

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  pitch:      "Pitch",
  pitchRange: "Pitch variety",
  loudness:   "Volume",
  pace:       "Pace",
  pauses:     "Pauses",
}

// How big a change from the actor's normal counts as "fully there"
const FULL_CHANGE: Record<FeatureKey, number> = {
  pitch:      2,   // semitones
  pitchRange: 2,   // semitones
  loudness:   4,   // dB
  pace:       12,  // % words per second
  pauses:     8,   // percentage points of time spent pausing
}

// How each emotion typically changes the voice (research-based tendencies, not rules)
const EMOTION_RECIPES: Record<string, Partial<Record<FeatureKey, Direction>>> = {
  anger:    { pitch: 1,  pitchRange: 1,  loudness: 1,  pace: 1,  pauses: -1 },
  joy:      { pitch: 1,  pitchRange: 1,  loudness: 1,  pace: 1 },
  surprise: { pitch: 1,  pitchRange: 1,  loudness: 1 },
  fear:     { pitch: 1,  pace: 1,        pauses: 1 },
  sadness:  { pitch: -1, pitchRange: -1, loudness: -1, pace: -1, pauses: 1 },
  disgust:  { pitch: -1, pace: -1 },
  neutral:  { pitch: 0,  pitchRange: 0,  loudness: 0,  pace: 0 },
}

export interface FeatureResult {
  key:      FeatureKey
  needed:   Direction
  change:   number   // actor's change from their normal, in the feature's unit
  unit:     string
  score:    number   // 0–1
}

const pauseShare = (p: Prosody) => (100 * p.pauseSec) / Math.max(0.1, p.speechSec + p.pauseSec)

function featureChanges(p: Prosody, wordsPerSec: number, base: Baseline): Partial<Record<FeatureKey, number>> {
  const b = base.prosody
  const changes: Partial<Record<FeatureKey, number>> = {
    loudness: p.loudnessDb - b.loudnessDb,
    pauses:   pauseShare(p) - pauseShare(b),
  }
  if (p.pitchMedianHz && b.pitchMedianHz) changes.pitch = 12 * Math.log2(p.pitchMedianHz / b.pitchMedianHz)
  if (p.pitchRangeSt != null && b.pitchRangeSt != null) changes.pitchRange = p.pitchRangeSt - b.pitchRangeSt
  if (wordsPerSec > 0 && base.wordsPerSec > 0) changes.pace = (100 * (wordsPerSec - base.wordsPerSec)) / base.wordsPerSec
  return changes
}

const UNITS: Record<FeatureKey, string> = { pitch: "st", pitchRange: "st", loudness: "dB", pace: "%", pauses: "pts" }

export function scoreVoicePattern(targetTop: string, p: Prosody, wordsPerSec: number, base: Baseline) {
  const recipe = EMOTION_RECIPES[targetTop] ?? EMOTION_RECIPES.neutral
  const changes = featureChanges(p, wordsPerSec, base)
  const features: FeatureResult[] = []

  for (const [key, needed] of Object.entries(recipe) as [FeatureKey, Direction][]) {
    const change = changes[key]
    if (change === undefined) continue
    const full = FULL_CHANGE[key]
    // Asked for fewer pauses but there were (almost) none: nothing left to cut
    const alreadyAtFloor = key === "pauses" && needed === -1 && pauseShare(p) <= 2
    const score = alreadyAtFloor
      ? 1
      : needed === 0
        ? clamp01(1 - Math.abs(change) / (2 * full)) // stay close to normal
        : clamp01((change * needed) / full)          // move the right way, far enough
    features.push({ key, needed, change: Math.round(change * 10) / 10, unit: UNITS[key], score })
  }

  return {
    score: features.length ? Math.round(100 * mean(features.map((f) => f.score))) : null,
    features,
  }
}

// ── ③ Line accuracy ───────────────────────────────────────────────────────────

// Small words count half: misreading "a" matters less than misreading "nerve"
const MINOR_WORDS = new Set([
  "a", "an", "the", "of", "to", "and", "in", "on", "at", "is", "it", "i", "you", "he", "she",
  "we", "they", "be", "was", "for", "that", "this", "with", "as", "but", "or", "so", "my", "your",
])
const SPOKEN_FORMS: Record<string, string> = { gonna: "going to", wanna: "want to", gotta: "got to", "'cause": "because", cause: "because", ok: "okay" }

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((w) => (SPOKEN_FORMS[w] ?? w).split(" "))
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter(Boolean)
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

// Speech recognition often mishears slightly ("realise"/"realize", "tonite"): allow near-misses
const sameWord = (a: string, b: string) =>
  a === b || a.replace(/'/g, "") === b.replace(/'/g, "") || (a.length >= 5 && editDistance(a, b) <= 1)

const wordWeight = (w: string) => (MINOR_WORDS.has(w) ? 0.5 : 1)

export function scoreLineAccuracy(scriptText: string, transcript: string) {
  const s = normalizeWords(scriptText)
  const t = normalizeWords(transcript)

  // Word-level alignment (like a spell-checker, but on whole words)
  const cost = Array.from({ length: s.length + 1 }, () => Array(t.length + 1).fill(0))
  for (let i = 1; i <= s.length; i++) cost[i][0] = i
  for (let j = 1; j <= t.length; j++) cost[0][j] = j
  for (let i = 1; i <= s.length; i++)
    for (let j = 1; j <= t.length; j++)
      cost[i][j] = Math.min(
        cost[i - 1][j] + 1,
        cost[i][j - 1] + 1,
        cost[i - 1][j - 1] + (sameWord(s[i - 1], t[j - 1]) ? 0 : 1),
      )

  const missing: string[] = []
  const wrong: { expected: string; said: string }[] = []
  const extra: string[] = []
  let matched = 0
  let i = s.length
  let j = t.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && cost[i][j] === cost[i - 1][j - 1] + (sameWord(s[i - 1], t[j - 1]) ? 0 : 1)) {
      if (sameWord(s[i - 1], t[j - 1])) matched += wordWeight(s[i - 1])
      else wrong.unshift({ expected: s[i - 1], said: t[j - 1] })
      i--; j--
    } else if (i > 0 && cost[i][j] === cost[i - 1][j] + 1) {
      missing.unshift(s[i - 1]); i--
    } else {
      extra.unshift(t[j - 1]); j--
    }
  }

  const total = s.reduce((sum, w) => sum + wordWeight(w), 0) || 1
  return { score: Math.round((100 * matched) / total), missing, wrong, extra }
}

// ── One line ──────────────────────────────────────────────────────────────────

export interface VoiceAnalysis {
  emotions: EmotionMap
  prosody:  Prosody
}

export interface FaceAnalysis {
  emotions:        EmotionMap
  dominantEmotion: string
  confidence:      number
  frameCount:      number
}

export interface Tip {
  kind: "emotion" | "voice" | "words" | "praise" | "face"
  text: string
}

export interface LineResult {
  speaker:     string
  scriptText:  string
  transcript:  string
  target:      EmotionMap
  targetTop:   string
  achieved:    EmotionMap | null
  achievedTop: string | null
  prosody:     Prosody | null
  wordsPerSec: number | null
  emotion:     number | null
  voice:       number | null
  voiceEstimated: boolean
  accuracy:    number
  total:       number
  features:    FeatureResult[]
  accuracyDetail: ReturnType<typeof scoreLineAccuracy>
  tips:        Tip[]
  faceEmotions:   EmotionMap | null
  faceTop:        string | null
  faceScore:      number | null
  faceConfidence: number | null
}

const weights = { emotion: 0.5, voice: 0.3, accuracy: 0.2 }
const weightsWithFace = { emotion: 0.4, voice: 0.24, accuracy: 0.16, face: 0.2 }

const FEATURE_ADVICE: Record<FeatureKey, Record<Direction, string>> = {
  pitch:      { 1: "Let your pitch rise higher", [-1]: "Bring your pitch down lower", 0: "Keep your pitch at your natural level" },
  pitchRange: { 1: "Vary your pitch more; it sounded flat", [-1]: "Keep your pitch steadier and heavier", 0: "Keep your pitch movement natural" },
  loudness:   { 1: "Push your volume up; give it more energy", [-1]: "Bring your volume down; let it be softer", 0: "Keep your volume at your natural level" },
  pace:       { 1: "Pick up the pace", [-1]: "Slow down and let the words land", 0: "Keep an even, natural pace" },
  pauses:     { 1: "Use more pauses; let silence do the work", [-1]: "Cut the pauses and keep it driving", 0: "Keep your pauses natural" },
}

export function scoreLine(input: {
  speaker:    string
  scriptText: string
  transcript: string
  target:     EmotionMap
  voice:      VoiceAnalysis | null
  baseline:   Baseline | null
  face?:      FaceAnalysis | null
}): LineResult {
  const targetTop = topEmotion(input.target)
  const accuracyDetail = scoreLineAccuracy(input.scriptText, input.transcript)
  const spokenWords = countWords(input.transcript) || countWords(input.scriptText)
  const wordsPerSec = input.voice ? spokenWords / Math.max(0.3, input.voice.prosody.speechSec) : null

  const emotionResult = input.voice ? scoreEmotionMatch(input.target, input.voice.emotions) : null
  const voiceResult = input.voice && input.baseline && wordsPerSec
    ? scoreVoicePattern(targetTop, input.voice.prosody, wordsPerSec, input.baseline)
    : null

  const faceResult = (input.face && input.face.frameCount > 0)
    ? scoreEmotionMatch(input.target, input.face.emotions)
    : null

  const w = faceResult ? weightsWithFace : weights
  const parts: [number, number][] = [[accuracyDetail.score, w.accuracy]]
  if (emotionResult) parts.push([emotionResult.score, w.emotion])
  if (voiceResult?.score != null) parts.push([voiceResult.score, w.voice])
  if (faceResult) parts.push([faceResult.score, (w as typeof weightsWithFace).face])
  const weightSum = parts.reduce((s, [, wt]) => s + wt, 0)
  const total = Math.round(parts.reduce((s, [v, wt]) => s + v * wt, 0) / weightSum)

  const tips: Tip[] = []
  if (emotionResult && emotionResult.achievedTop !== targetTop) {
    tips.push({ kind: "emotion", text: `Your voice came across as ${emotionResult.achievedTop}; the line calls for ${targetTop}.` })
  }
  if (faceResult && faceResult.achievedTop !== targetTop) {
    tips.push({ kind: "face", text: `Your face showed ${faceResult.achievedTop}; try to express ${targetTop} in your expression too.` })
  }
  for (const f of [...(voiceResult?.features ?? [])].sort((a, b) => a.score - b.score)) {
    if (f.score < 0.5) tips.push({ kind: "voice", text: `${FEATURE_ADVICE[f.key][f.needed]}.` })
  }
  const dropped = [...accuracyDetail.missing, ...accuracyDetail.wrong.map((w) => w.expected)].filter((w) => !MINOR_WORDS.has(w))
  if (accuracyDetail.score < 90 && dropped.length) {
    tips.push({ kind: "words", text: `Check your lines: you missed or changed "${dropped.slice(0, 3).join('", "')}".` })
  }
  if (tips.length === 0) tips.push({ kind: "praise", text: `Strong delivery: the ${targetTop} came through clearly${faceResult ? " in both voice and face" : ""}.` })

  return {
    speaker:        input.speaker,
    scriptText:     input.scriptText,
    transcript:     input.transcript,
    target:         normalize(input.target),
    targetTop,
    achieved:       input.voice ? normalize(input.voice.emotions) : null,
    achievedTop:    emotionResult?.achievedTop ?? null,
    prosody:        input.voice?.prosody ?? null,
    wordsPerSec,
    emotion:        emotionResult?.score ?? null,
    voice:          voiceResult?.score ?? null,
    voiceEstimated: Boolean(voiceResult && input.baseline?.estimated),
    accuracy:       accuracyDetail.score,
    total,
    features:       voiceResult?.features ?? [],
    accuracyDetail,
    tips:           tips.slice(0, 3),
    faceEmotions:   input.face ? normalize(input.face.emotions) : null,
    faceTop:        faceResult?.achievedTop ?? null,
    faceScore:      faceResult?.score ?? null,
    faceConfidence: input.face?.confidence ?? null,
  }
}

// ── Whole scene ───────────────────────────────────────────────────────────────

export interface Recommendation {
  title:    string
  detail:   string
  exercise: string
}

const EMOTION_EXERCISES: Record<string, string> = {
  anger:    "Say the line three times, raising the stakes each time: annoyed, furious, explosive. Keep the breath low and the consonants hard.",
  sadness:  "Before the line, recall something you've lost. Let your breath drop and speak on the out-breath, slower than feels natural.",
  fear:     "Take quick, shallow breaths before speaking and let them break the line. Keep your eyes moving as if checking for danger.",
  joy:      "Smile while speaking; it lifts the pitch. Let the voice bounce on the key words.",
  surprise: "Take a sharp in-breath before the line and let the first word jump up in pitch.",
  disgust:  "Pull back physically as you speak and let the words come out slower and lower, as if tasting something bad.",
  neutral:  "Read the line as plain information, as if telling a stranger the time. Resist adding colour.",
}

export interface SceneReport {
  overall:        number
  emotion:        number | null
  voice:          number | null
  accuracy:       number
  lineCount:      number
  strongest:      LineResult | null
  weakest:        LineResult | null
  paceWpm:        number | null
  pitchRangeSt:   number | null
  baselineRangeSt: number | null
  loudnessVarDb:  number | null
  pauseShare:     number | null
  recommendations: Recommendation[]
}

const avgOrNull = (xs: (number | null)[]) => {
  const vals = xs.filter((x): x is number => x != null)
  return vals.length ? Math.round(mean(vals)) : null
}

export function buildSceneReport(lines: LineResult[], baseline: Baseline | null): SceneReport {
  const prosodies = lines.map((l) => l.prosody).filter((p): p is Prosody => p != null)
  const paces = lines.map((l) => l.wordsPerSec).filter((x): x is number => x != null)
  const ranges = prosodies.map((p) => p.pitchRangeSt).filter((x): x is number => x != null)
  const sorted = [...lines].sort((a, b) => b.total - a.total)

  const report: SceneReport = {
    overall:        lines.length ? Math.round(mean(lines.map((l) => l.total))) : 0,
    emotion:        avgOrNull(lines.map((l) => l.emotion)),
    voice:          avgOrNull(lines.map((l) => l.voice)),
    accuracy:       Math.round(mean(lines.map((l) => l.accuracy))),
    lineCount:      lines.length,
    strongest:      sorted[0] ?? null,
    weakest:        sorted.length > 1 ? sorted[sorted.length - 1] : null,
    paceWpm:        paces.length ? Math.round(mean(paces) * 60) : null,
    pitchRangeSt:   ranges.length ? Math.round(mean(ranges) * 10) / 10 : null,
    baselineRangeSt: baseline?.prosody.pitchRangeSt ?? null,
    loudnessVarDb:  prosodies.length ? Math.round(mean(prosodies.map((p) => p.loudnessVarDb)) * 10) / 10 : null,
    pauseShare:     prosodies.length ? Math.round(mean(prosodies.map(pauseShare))) : null,
    recommendations: [],
  }
  report.recommendations = recommend(lines, report)
  return report
}

function recommend(lines: LineResult[], r: SceneReport): Recommendation[] {
  const recs: Recommendation[] = []

  // 1. The emotion that came through least
  const byEmotion = new Map<string, number[]>()
  for (const l of lines) if (l.emotion != null) byEmotion.set(l.targetTop, [...(byEmotion.get(l.targetTop) ?? []), l.emotion])
  const weakestEmotion = [...byEmotion.entries()].map(([e, s]) => [e, mean(s)] as const).sort((a, b) => a[1] - b[1])[0]
  if (weakestEmotion && weakestEmotion[1] < 60) {
    recs.push({
      title:    `Work on ${weakestEmotion[0]}`,
      detail:   `Your ${weakestEmotion[0]} lines scored ${Math.round(weakestEmotion[1])}/100 on emotion match: the feeling didn't fully reach your voice.`,
      exercise: EMOTION_EXERCISES[weakestEmotion[0]] ?? EMOTION_EXERCISES.neutral,
    })
  }

  // 2. Voice features that kept missing across the scene
  const misses = new Map<FeatureKey, { count: number; needed: Direction }>()
  for (const l of lines) for (const f of l.features) {
    if (f.needed !== 0 && f.score < 0.4) {
      const m = misses.get(f.key)
      misses.set(f.key, { count: (m?.count ?? 0) + 1, needed: f.needed })
    }
  }
  const voiced = lines.filter((l) => l.features.length).length
  const worstFeature = [...misses.entries()].sort((a, b) => b[1].count - a[1].count)[0]
  if (worstFeature && voiced && worstFeature[1].count / voiced >= 0.5) {
    const [key, { count, needed }] = worstFeature
    const exercises: Record<FeatureKey, string> = {
      pitch:      "Siren exercise: glide on 'ng' from your lowest to highest note and back, 5 times, then say the line starting higher.",
      pitchRange: "Read the line as if telling a story to a 5-year-old: exaggerate the ups and downs, then pull back to 70%.",
      loudness:   "Breath support: hand on your belly, breathe low, and speak the line to the back wall of a big room without straining your throat.",
      pace:       "Read the line against a clap: speed up or slow down the claps to feel the change, then drop the claps and keep the rhythm.",
      pauses:     "Mark the line with slashes where a thought changes, and give each slash a beat of silence.",
    }
    recs.push({
      title:    `${FEATURE_LABELS[key]}: ${FEATURE_ADVICE[key][needed].toLowerCase().split(";")[0]}`,
      detail:   `On ${count} of ${voiced} lines, your ${FEATURE_LABELS[key].toLowerCase()} didn't change the way the emotion needed.`,
      exercise: exercises[key],
    })
  }

  // 3. Pace across the whole scene, unless it would contradict the per-line pace feedback
  const paceMisses = (dir: Direction) =>
    lines.filter((l) => l.features.some((f) => f.key === "pace" && f.needed === dir && f.score < 0.5)).length
  if (r.paceWpm != null && r.paceWpm > 185 && paceMisses(1) === 0) {
    recs.push({
      title:    "Slow down",
      detail:   `You averaged ${r.paceWpm} words per minute; natural stage speech sits around 130–160.`,
      exercise: "Breathe out fully before each speech and give yourself one beat of silence before the first word.",
    })
  } else if (r.paceWpm != null && r.paceWpm < 100 && paceMisses(-1) === 0) {
    recs.push({
      title:    "Pick up the pace",
      detail:   `You averaged ${r.paceWpm} words per minute; natural stage speech sits around 130–160.`,
      exercise: "Run the scene once as fast as you can while staying clear, then once at normal speed; it usually settles at a livelier pace.",
    })
  }

  // 4. Knowing the lines
  if (r.accuracy < 85) {
    recs.push({
      title:    "Learn the lines more securely",
      detail:   `Your line accuracy was ${r.accuracy}%. Paraphrasing takes attention away from the performance.`,
      exercise: "Write the first letter of every word of your lines and practise speaking them from the letters alone.",
    })
  }

  if (recs.length === 0) {
    recs.push({
      title:    "Ready for more",
      detail:   `An overall score of ${r.overall} with no recurring weaknesses. This scene is in good shape.`,
      exercise: "Try a harder scene, or play this one with a different objective and see how the emotions shift.",
    })
  }
  return recs.slice(0, 3)
}
