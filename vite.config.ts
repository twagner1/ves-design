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

// Resolve a version string at build time so every deployment reflects the
// exact commit it was built from. Cloudflare's build env exposes the commit
// SHA via env vars; fall back to git, then to a local placeholder.
function resolveVersion(): string {
  const envSha =
    process.env.WORKERS_CI_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    null
  const sha = (envSha || git('rev-parse --short HEAD') || 'local').slice(0, 7)
  const count = git('rev-list --count HEAD')
  const label = count ? `v0.${count.padStart(3, '0')}` : 'build'
  return `${label} (${sha})`
}

const APP_VERSION = resolveVersion()
const BUILD_TIME = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
})
