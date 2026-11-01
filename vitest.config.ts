import { defineConfig } from 'vitest/config'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * TypeScript sources use NodeNext `.js` specifiers. Vite does not map `.js` to
 * `.ts` by itself, so resolve that case to the sibling TypeScript file.
 */
function tsExtensionPlugin() {
  return {
    name: 'dsh-env-manager-ts-extension',
    enforce: 'pre' as const,
    resolveId(source: string, importer: string | undefined) {
      if (!importer || !source.startsWith('.') || !source.endsWith('.js')) return null
      const importerPath = importer.startsWith('file:') ? fileURLToPath(importer) : importer
      const candidate = path.resolve(path.dirname(importerPath), source.replace(/\.js$/, '.ts'))
      return existsSync(candidate) ? candidate : null
    },
  }
}

export default defineConfig({
  plugins: [tsExtensionPlugin()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 10000,
  },
})
