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

// Derive the version from the PR number at build time, so every merged PR
// deploys an incrementing version (e.g. PR #8 -> v0.008). The PR number is
// read from the head commit subject, which works on Cloudflare's shallow
// clone. Handles both merge commits ("Merge pull request #8 from ...") and
// squash merges ("Title (#8)"); non-PR builds fall back to v0.000.
function resolveVersion(): string {
  const subject = git('log -1 --pretty=%s') || ''
  const pr =
    subject.match(/Merge pull request #(\d+)/)?.[1] ??
    subject.match(/\(#(\d+)\)\s*$/)?.[1] ??
    null
  return pr ? `v0.${pr.padStart(3, '0')}` : 'v0.000'
}

const APP_VERSION = resolveVersion()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
})
