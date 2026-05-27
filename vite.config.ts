import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

import { cloudflare } from "@cloudflare/vite-plugin";

function git(cmd: string): string | null {
  try {
    return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return null
  }
}

// Resolve a version string at build time so every deployment shows a fresh,
// monotonically increasing value. The number is a UTC build timestamp
// (Cloudflare builds use a shallow clone, so a git commit count is unreliable),
// paired with the short commit SHA for traceability. The SHA comes from
// Cloudflare's build env vars, falling back to git, then a local placeholder.
function resolveVersion(now: Date): string {
  const envSha =
    process.env.WORKERS_CI_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    null
  const sha = (envSha || git('rev-parse --short HEAD') || 'local').slice(0, 7)
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp =
    `${String(now.getUTCFullYear()).slice(2)}.${p(now.getUTCMonth() + 1)}.` +
    `${p(now.getUTCDate())}.${p(now.getUTCHours())}${p(now.getUTCMinutes())}`
  return `v${stamp} (${sha})`
}

const BUILD_NOW = new Date()
const APP_VERSION = resolveVersion(BUILD_NOW)
const BUILD_TIME = `${BUILD_NOW.toISOString().slice(0, 16).replace('T', ' ')} UTC`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
})
