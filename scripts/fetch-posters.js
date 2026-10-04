/**
 * Downloads a poster for every library film from Wikipedia into public/posters/
 * and writes lib/poster-manifest.ts (title → image path) for the app.
 *
 * Run once (or after adding films):  node scripts/fetch-posters.js
 *
 * Film posters are copyrighted; Wikipedia hosts them under fair use. They're used
 * here for an educational, non-commercial project and credited on the site.
 */

const fs = require('fs')
const path = require('path')

// Library title → exact Wikipedia article (explicit, so "Avatar" can't resolve to the cartoon)
const ARTICLES = {
  'Avatar':                              'Avatar (2009 film)',
  'Batman Begins':                       'Batman Begins',
  'Moonlight':                           'Moonlight (2016 film)',
  'Moonrise Kingdom':                    'Moonrise Kingdom',
  'Moonstruck':                          'Moonstruck',
  'Motherless Brooklyn':                 'Motherless Brooklyn (film)',
  'Moulin Rouge':                        'Moulin Rouge!',
  'Mr Blandings Builds His Dream House': 'Mr. Blandings Builds His Dream House',
  'Mr Brooks':                           'Mr. Brooks',
  'Mr Destiny':                          'Mr. Destiny',
  'Never Let Me Go':                     'Never Let Me Go (2010 film)',
  'Never Look Away':                     'Never Look Away (2018 film)', // plain title is a disambiguation page
  'New Jack City':                       'New Jack City',
  'New York Minute':                     'New York Minute (film)',
  'Newton':                              'Newton (film)',
  'Next Friday':                         'Next Friday',
  'Team America World Police':           'Team America: World Police',
  'Tender Mercies':                      'Tender Mercies',
  'Tenet':                               'Tenet (film)',
  'Terminator 2 Judgment Day':           'Terminator 2: Judgment Day',
  'Terminator 3 Rise of the Machines':   'Terminator 3: Rise of the Machines',
  'Terminator Salvation':                'Terminator Salvation',
  'The Godfather':                       'The Godfather',
  'The Sandlot':                         'The Sandlot',
  'Titanic':                             'Titanic (1997 film)',
  'Woman in Gold':                       'Woman in Gold (film)', // plain "Woman in Gold" is the Klimt painting
  'Wonder Boys':                         'Wonder Boys (film)',
  'Wonder Woman':                        'Wonder Woman (2017 film)',
  'Wonderstruck':                        'Wonderstruck (film)',
  'Wrongfully Accused':                  'Wrongfully Accused',
}

const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'posters')
const MANIFEST = path.join(ROOT, 'lib', 'poster-manifest.ts')
// Wikimedia asks API clients to identify themselves
const HEADERS = { 'User-Agent': 'ActorProAI-FYP/1.0 (educational project; poster fetch script)' }

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Wikimedia rate-limits image downloads (HTTP 429): back off and retry, honouring Retry-After
async function download(url, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, { headers: HEADERS })
    if (res.status !== 429) return res
    const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * 2 ** i
    await sleep(wait)
  }
  return fetch(url, { headers: HEADERS })
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // One API call for all films: lead image (the infobox poster) at 500px, plus a description to sanity-check
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', redirects: '1',
    // pilicense=any: posters are non-free images, which the API leaves out by default
    prop: 'pageimages|description', piprop: 'thumbnail', pithumbsize: '500', pilicense: 'any',
    titles: Object.values(ARTICLES).join('|'),
  })
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { headers: HEADERS })
  const data = await res.json()

  // Map redirected/normalised titles back to the ones we asked for
  const resolved = {}
  for (const n of data.query.normalized ?? []) resolved[n.to] = n.from
  for (const r of data.query.redirects ?? []) resolved[r.to] = resolved[r.from] ?? r.from
  const pages = new Map(data.query.pages.map((p) => [resolved[p.title] ?? p.title, p]))

  const manifest = {}
  for (const [film, article] of Object.entries(ARTICLES)) {
    const page = pages.get(article)
    const url = page?.thumbnail?.source
    if (page && !/film/i.test(page.description ?? '')) {
      console.log(`  SKIP   ${film}  (${article} is "${page.description}", not a film)`)
      continue
    }
    if (!url) {
      console.log(`  MISS   ${film}  (${article}: no lead image)`)
      continue
    }
    const ext = path.extname(new URL(url).pathname).toLowerCase() || '.jpg'
    const file = `${slug(film)}${ext}`
    if (fs.existsSync(path.join(OUT_DIR, file))) {
      manifest[film] = `/posters/${file}`
      console.log(`  HAVE   ${film}`)
      continue
    }
    const img = await download(url)
    if (!img.ok) {
      console.log(`  FAIL   ${film}  (HTTP ${img.status})`)
      continue
    }
    fs.writeFileSync(path.join(OUT_DIR, file), Buffer.from(await img.arrayBuffer()))
    manifest[film] = `/posters/${file}`
    console.log(`  OK     ${film.padEnd(36)} ${page.description ?? ''}`)
    await sleep(1200) // be gentle with Wikimedia
  }

  const body = Object.entries(manifest)
    .map(([title, src]) => `  ${JSON.stringify(title)}: ${JSON.stringify(src)},`)
    .join('\n')
  fs.writeFileSync(
    MANIFEST,
    `// Generated by scripts/fetch-posters.js — posters from Wikipedia (fair use, educational project)\n` +
    `export const POSTERS: Record<string, string> = {\n${body}\n}\n\n` +
    `export const posterFor = (title: string): string | undefined => POSTERS[title]\n`,
  )
  console.log(`\n${Object.keys(manifest).length}/${Object.keys(ARTICLES).length} posters saved to public/posters/`)
}

main().catch((err) => {
  console.error('Poster fetch failed:', err.message)
  process.exit(1)
})
