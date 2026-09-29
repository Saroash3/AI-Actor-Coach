/**
 * Puts the laptop's voice analysis service online for the Vercel-hosted website:
 *   1. starts the voice service (voice_service/, port 8001)
 *   2. waits until the model is loaded
 *   3. opens an ngrok tunnel on your fixed ngrok domain
 * Ctrl+C stops both.
 *
 * Needs in .env.local:  NGROK_DOMAIN=your-name.ngrok-free.app
 *                       VOICE_SERVICE_KEY=...   (same value as in Vercel)
 * Run with:  npm run voice:online
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn, execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const PORT = 8001

function readEnvLocal() {
  const file = path.join(ROOT, '.env.local')
  const env = {}
  if (!fs.existsSync(file)) return env
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const eq = line.indexOf('=')
    if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["'](.*)["']$/, '$1')
  }
  return env
}

const env = readEnvLocal()
const domain = (env.NGROK_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
if (!domain) {
  console.error('NGROK_DOMAIN is missing from .env.local (e.g. NGROK_DOMAIN=your-name.ngrok-free.app).')
  process.exit(1)
}
if (!env.VOICE_SERVICE_KEY) {
  console.error('VOICE_SERVICE_KEY is missing from .env.local; without it anyone could use your voice service.')
  process.exit(1)
}

// ngrok may not be on PATH yet in terminals opened before it was installed
function findNgrok() {
  if (env.NGROK_PATH && fs.existsSync(env.NGROK_PATH)) return env.NGROK_PATH
  try {
    const found = execFileSync(process.platform === 'win32' ? 'where' : 'which', ['ngrok'], { encoding: 'utf8' })
      .split(/\r?\n/).map((l) => l.trim()).find((l) => l && fs.existsSync(l))
    if (found) return found
  } catch {}
  if (process.platform === 'win32') {
    const packages = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages')
    const dir = fs.existsSync(packages) && fs.readdirSync(packages).find((d) => d.toLowerCase().startsWith('ngrok.ngrok'))
    if (dir && fs.existsSync(path.join(packages, dir, 'ngrok.exe'))) return path.join(packages, dir, 'ngrok.exe')
  }
  return null
}

const ngrok = findNgrok()
if (!ngrok) {
  console.error('ngrok not found. Install it (winget install Ngrok.Ngrok), run: ngrok config add-authtoken <token>')
  console.error('or set NGROK_PATH in .env.local to the full path of ngrok.exe.')
  process.exit(1)
}

const python = process.platform === 'win32'
  ? path.join(ROOT, 'voice_service', '.venv', 'Scripts', 'python.exe')
  : path.join(ROOT, 'voice_service', '.venv', 'bin', 'python')

const children = []
function stopAll(code = 0) {
  for (const child of children) if (!child.killed) child.kill()
  process.exit(code)
}
process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))

function run(name, command, args) {
  const child = spawn(command, args, { cwd: ROOT, env: { ...process.env, HF_HUB_DISABLE_SYMLINKS_WARNING: '1' } })
  const prefix = (chunk) => chunk.toString().split(/\r?\n/).filter(Boolean).forEach((l) => console.log(`[${name}] ${l}`))
  child.stdout.on('data', prefix)
  child.stderr.on('data', prefix)
  child.on('exit', (code) => {
    console.log(`[${name}] stopped (exit ${code})`)
    stopAll(code ?? 1)
  })
  child.on('error', (err) => {
    console.error(`[${name}] could not start: ${err.message}`)
    if (name === 'ngrok') console.error('Install ngrok (winget install ngrok.ngrok) and run: ngrok config add-authtoken <your token>')
    stopAll(1)
  })
  children.push(child)
  return child
}

async function waitForHealth(url, what, seconds) {
  for (let i = 0; i < seconds; i++) {
    try {
      const res = await fetch(`${url}/health`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      if (res.ok && (await res.json()).ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`${what} did not become ready within ${seconds} seconds`)
}

;(async () => {
  console.log('Starting voice service…')
  run('voice', python, ['-m', 'uvicorn', 'app:app', '--app-dir', 'voice_service', '--host', '127.0.0.1', '--port', String(PORT)])
  await waitForHealth(`http://127.0.0.1:${PORT}`, 'voice service', 120)

  console.log(`Opening tunnel https://${domain} → localhost:${PORT}…`)
  run('ngrok', ngrok, ['http', String(PORT), `--url=https://${domain}`, '--log=stdout', '--log-level=warn'])
  await waitForHealth(`https://${domain}`, 'ngrok tunnel', 30) // confirm it's reachable from the internet

  console.log('')
  console.log('Voice analysis is online.')
  console.log(`  Vercel env: VOICE_SERVICE_URL=https://${domain}`)
  console.log('  Keep this window open while people practise. Ctrl+C to stop.')
})().catch((err) => {
  console.error(err.message)
  stopAll(1)
})
