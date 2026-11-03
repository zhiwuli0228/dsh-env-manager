import { afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const roots: string[] = []
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../scripts/repair-profile.mjs',
)

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('repair-profile helper', () => {
  it('reports duplicate and legacy bundle entries, then repairs package.json', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'dsh-repair-profile-'))
    roots.push(root)
    const profileDir = path.join(root, 'profiles', 'test')
    mkdirSync(path.join(profileDir, 'node_modules', 'dsh-env-manager-plugin', 'lib'), {
      recursive: true,
    })
    writeFileSync(
      path.join(profileDir, 'node_modules', 'dsh-env-manager-plugin', 'lib', 'index.js'),
      'export {}\n',
    )
    writeFileSync(
      path.join(profileDir, 'package.json'),
      JSON.stringify(
        {
          name: 'repair-test',
          dependencies: {
            'dsh-env-manager-plugin': '0.1.0',
            'dsh-env-manager': 'link:E:/old',
          },
          dsh: {
            profile: {
              bundles: [
                '@deepseek-ai/dsh-base',
                'dsh-env-manager-plugin',
                'dsh-env-manager',
                'dsh-env-manager-plugin',
              ],
            },
          },
        },
        null,
        2,
      ),
    )

    const env = { ...process.env, DSH_HOME: root, DSH_PROFILE: 'test' }
    const report = spawnSync(process.execPath, [script], { env, encoding: 'utf8' })
    expect(report.status).toBe(1)
    expect(report.stdout).toContain('appears 2 times')
    expect(report.stdout).toContain('legacy dsh-env-manager')

    const fixed = spawnSync(process.execPath, [script, '--fix'], { env, encoding: 'utf8' })
    expect(fixed.status).toBe(0)
    expect(fixed.stdout).toContain('Repaired package.json')

    const pkg = JSON.parse(readFileSync(path.join(profileDir, 'package.json'), 'utf8'))
    expect(pkg.dependencies).toEqual({ 'dsh-env-manager-plugin': '0.1.0' })
    expect(pkg.dsh.profile.bundles).toEqual([
      '@deepseek-ai/dsh-base',
      'dsh-env-manager-plugin',
    ])
  })
})
