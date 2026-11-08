import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import satisfies from 'semver/functions/satisfies.js'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const dshVersions = [
  // version            expected
  ['0.2.1-rc.5', true], // current desktop runtime
  ['0.2.1-rc.6', true],
  ['0.2.2-alpha.3', true], // 0.2.2 prerelease family
  ['0.2.2-rc.1', true],
  ['0.2.2-rc.7', true],
  ['0.2.2', true], // stable 0.2.2
  ['0.2.0', false],
  ['0.3.0-rc.0', false], // untested 0.3.0 must stay excluded
  ['0.3.0', false],
] as const

describe('DSH version compatibility', () => {
  it('engines.dsh accepts 0.2.1-rc.5 and every 0.2.2 prerelease, rejects 0.3.0', () => {
    const range = pkg.engines.dsh as string
    for (const [version, expected] of dshVersions) {
      expect(satisfies(version, range), `${version} vs engines.dsh ${range}`).toBe(expected)
    }
  })

  it('peer ranges for dsh-llm and dsh-tools mirror engines.dsh', () => {
    for (const name of ['@deepseek-ai/dsh-llm', '@deepseek-ai/dsh-tools']) {
      const range = pkg.peerDependencies[name] as string
      for (const [version, expected] of dshVersions) {
        expect(satisfies(version, range), `${version} vs peer ${name} ${range}`).toBe(expected)
      }
    }
  })

  it('cordis peer accepts 4.0.x and 4.1.x, rejects 3.x and 5.x', () => {
    const range = pkg.peerDependencies['@deepseek-ai/cordis'] as string
    expect(satisfies('4.0.5', range)).toBe(true)
    expect(satisfies('4.1.0', range)).toBe(true)
    expect(satisfies('3.9.0', range)).toBe(false)
    expect(satisfies('5.0.0', range)).toBe(false)
  })
})
