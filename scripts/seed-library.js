/**
 * Library seed script — run with: npm run seed
 * Reads all .txt files from the dataset folder, parses and cleans them,
 * and upserts them into the LibraryScript collection on MongoDB Atlas.
 * If the dataset folder is missing, copies the pre-parsed scripts from the
 * Ai_actor.scripts collection on the same cluster instead.
 *
 * Existing library scripts are skipped. Pass --force to re-import them
 * (npm run seed -- --force); documents are updated in place, so their ids
 * and any links to them stay valid.
 */

const fs       = require('fs')
const path     = require('path')
const mongoose = require('mongoose')
const { cleanScenes, getDifficulty } = require('./lib/clean-script')

const FORCE = process.argv.includes('--force')

// ── Load .env.local without dotenv ────────────────────────────────────────────
const envFile = path.join(__dirname, '..', '.env.local')
const env = {}
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=')
    if (eq > 0) {
      const k = line.slice(0, eq).trim()
      const v = line.slice(eq + 1).trim().replace(/^["'](.*)["']$/, '$1')
      env[k] = v
    }
  })
}

const MONGODB_URI = env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local')
  process.exit(1)
}

// ── Sources ───────────────────────────────────────────────────────────────────
const DATASET_FOLDER = path.join(
  __dirname, '..', 'Scene Selection', 'Scene Selection', 'Project_Dataset'
)

// Fallback: already-parsed scripts stored in another database on the same cluster
const ATLAS_SOURCE_DB         = 'Ai_actor'
const ATLAS_SOURCE_COLLECTION = 'scripts'

// ── Titles & genres ───────────────────────────────────────────────────────────
// Dataset files whose content is a different film than their filename says
// (checked against each script's title page)
const TITLE_FIXES = {
  '3 Godfathers':     'The Godfather',  // title page: "THE GODFATHER … MARIO PUZO"
  'Wives and Lovers': 'The Sandlot',    // title page: "THE SANDLOT KIDS … David Mickey Evans"
}

const GENRE_MAP = {
  'The Godfather':                    'Crime',
  'Avatar':                           'Sci-Fi',
  'Batman Begins':                    'Action',
  'Moonlight':                        'Drama',
  'Moonrise Kingdom':                 'Drama',
  'Moonstruck':                       'Romance',
  'Motherless Brooklyn':              'Mystery',
  'Moulin Rouge':                     'Romance',
  'Mr Blandings Builds His Dream House': 'Comedy',
  'Mr Brooks':                        'Thriller',
  'Mr Destiny':                       'Comedy',
  'Never Let Me Go':                  'Drama',
  'Never Look Away':                  'Drama',
  'New Jack City':                    'Crime',
  'New York Minute':                  'Comedy',
  'Newton':                           'Drama',
  'Next Friday':                      'Comedy',
  'Team America World Police':        'Comedy',
  'Tender Mercies':                   'Drama',
  'Tenet':                            'Sci-Fi',
  'Terminator 2 Judgment Day':        'Action',
  'Terminator 3 Rise of the Machines': 'Action',
  'Terminator Salvation':             'Action',
  'Titanic':                          'Drama',
  'The Sandlot':                      'Comedy',
  'Woman in Gold':                    'Drama',
  'Wonder Boys':                      'Drama',
  'Wonder Woman':                     'Action',
  'Wonderstruck':                     'Drama',
  'Wrongfully Accused':               'Comedy',
}

// ── Parse a single .txt script file into raw scenes ───────────────────────────
function parseTxtFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  const scenes = []
  let current = null
  let counter = 0

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (line.toLowerCase().startsWith('scene_heading:')) {
      if (current) scenes.push(current)
      counter++
      current = {
        sceneNumber:  counter,
        sceneHeading: line.slice('scene_heading:'.length).trim(),
        elements:     [],
      }
      continue
    }

    if (!current) {
      counter++
      current = { sceneNumber: counter, sceneHeading: 'Default Scene', elements: [] }
    }

    if (line.toLowerCase().startsWith('speaker_heading:')) {
      current.elements.push({ type: 'speaker', content: line.slice('speaker_heading:'.length).trim() })
    } else if (line.toLowerCase().startsWith('dialog:')) {
      current.elements.push({ type: 'dialog', content: line.slice('dialog:'.length).trim() })
    } else if (line.toLowerCase().startsWith('text:')) {
      current.elements.push({ type: 'text', content: line.slice('text:'.length).trim() })
    } else {
      current.elements.push({ type: 'text', content: line })
    }
  }

  if (current) scenes.push(current)
  return scenes
}

// ── Inline Mongoose schema (avoids TypeScript compilation) ────────────────────
const SceneElementSchema = new mongoose.Schema(
  { type: String, content: String },
  { _id: false }
)
const SceneSchema = new mongoose.Schema(
  { sceneNumber: Number, sceneHeading: String, elements: [SceneElementSchema] },
  { _id: false }
)
const LibraryScriptSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, unique: true },
    genre:       { type: String, default: 'Film' },
    difficulty:  { type: String, default: 'Intermediate' },
    totalScenes: { type: Number, default: 0 },
    scenes:      [SceneSchema],
    sourceFile:  String,
  },
  { timestamps: true }
)
const LibraryScript =
  mongoose.models.LibraryScript ||
  mongoose.model('LibraryScript', LibraryScriptSchema)

// ── Import one script ─────────────────────────────────────────────────────────
const stats = { inserted: 0, updated: 0, skipped: 0 }

// Matches by source file first so renamed titles (TITLE_FIXES) update in place
async function importScript(rawTitle, rawScenes, sourceFile) {
  const title = TITLE_FIXES[rawTitle] || rawTitle
  const genre = GENRE_MAP[title] || 'Film'

  const existing = await LibraryScript.findOne({ $or: [{ sourceFile }, { title }] }, { _id: 1 })
  if (existing && !FORCE) {
    console.log(`  SKIP   ${title}`)
    stats.skipped++
    return
  }

  const scenes     = cleanScenes(rawScenes, title)
  const difficulty = getDifficulty(scenes)
  const doc = { title, genre, difficulty, totalScenes: scenes.length, scenes, sourceFile }

  if (existing) {
    await LibraryScript.updateOne({ _id: existing._id }, { $set: doc })
    stats.updated++
  } else {
    await LibraryScript.create(doc)
    stats.inserted++
  }
  console.log(`  ${existing ? 'UPDATE' : 'INSERT'} ${title}  (${scenes.length} scenes · ${genre} · ${difficulty})`)
}

async function seedFromFolder() {
  const files = fs.readdirSync(DATASET_FOLDER).filter(f => f.endsWith('.txt'))
  console.log(`Found ${files.length} script files in dataset\n`)

  for (const filename of files) {
    // "Batman Begins_0372784_anno.txt" → "Batman Begins"
    const title = filename.replace(/_\d+_anno\.txt$/, '').replace(/_/g, ' ')
    await importScript(title, parseTxtFile(path.join(DATASET_FOLDER, filename)), filename)
  }
}

// Source docs use snake_case scene fields and titles like "Avatar 0499549 anno"
async function seedFromAtlas() {
  const source = mongoose.connection.client.db(ATLAS_SOURCE_DB).collection(ATLAS_SOURCE_COLLECTION)
  const docs   = await source.find({}).toArray()
  console.log(`Found ${docs.length} scripts in ${ATLAS_SOURCE_DB}.${ATLAS_SOURCE_COLLECTION}\n`)

  for (const doc of docs) {
    const title = doc.title.replace(/\s+\d+\s+anno$/i, '').trim()
    await importScript(title, doc.scenes ?? [], doc.filename || `${title}.json`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGODB_URI)
  console.log(`Connected to MongoDB Atlas${FORCE ? ' (--force: re-importing existing scripts)' : ''}\n`)

  if (fs.existsSync(DATASET_FOLDER)) {
    await seedFromFolder()
  } else {
    console.log(`Dataset folder not found, importing from ${ATLAS_SOURCE_DB}.${ATLAS_SOURCE_COLLECTION} instead\n`)
    await seedFromAtlas()
  }

  console.log(`\nDone. Inserted: ${stats.inserted}  Updated: ${stats.updated}  Skipped: ${stats.skipped}`)
  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('\nSeed failed:', err.message)
  process.exit(1)
})
