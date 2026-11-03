#!/usr/bin/env node
/**
 * Repair a DSH profile that has a duplicated or half-removed environment-manager
 * bundle. This script only edits the profile's package.json; it never installs
 * packages and never touches registry data under `data/`.
 *
 * Usage:
 *   node scripts/repair-profile.mjs [--profile <name>] [--fix]
 *
 * Without --fix it reports problems and exits nonzero. With --fix it rewrites the
 * package.json atomically after creating a timestamped backup.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PLUGIN = 'dsh-env-manager-plugin'
const LEGACY = 'dsh-env-manager'

function pathEntryExists(candidate) {
  try {
    fs.lstatSync(candidate)
    return true
  } catch {
    return false
  }
}

const argv = process.argv.slice(2)
const fix = argv.includes('--fix')
const profileIndex = argv.indexOf('--profile')
const profile =
  profileIndex >= 0 && argv[profileIndex + 1]
    ? argv[profileIndex + 1]
    : process.env.DSH_PROFILE

if (!profile) {
  console.error('Missing profile. Pass --profile <name> or set DSH_PROFILE.')
  process.exit(2)
}

const dshHome = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const profileDir = path.join(dshHome, 'profiles', profile)
const packagePath = path.join(profileDir, 'package.json')

if (!fs.existsSync(packagePath)) {
  console.error(`Profile package.json not found: ${packagePath}`)
  process.exit(2)
}

let pkg
try {
  pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
} catch (error) {
  console.error(`Cannot parse ${packagePath}: ${error.message}`)
  process.exit(2)
}

const dependencies = pkg.dependencies && typeof pkg.dependencies === 'object' ? pkg.dependencies : {}
const profileConfig = pkg.dsh?.profile
const bundles = Array.isArray(profileConfig?.bundles) ? profileConfig.bundles : []
const pluginEntries = bundles.filter((entry) => entry === PLUGIN).length
const legacyEntries = bundles.filter((entry) => entry === LEGACY).length
const dependencyEntries = Object.prototype.hasOwnProperty.call(dependencies, PLUGIN)
const legacyDependency = Object.prototype.hasOwnProperty.call(dependencies, LEGACY)
const pluginLib = path.join(profileDir, 'node_modules', PLUGIN, 'lib', 'index.js')
const legacyLink = path.join(profileDir, 'node_modules', LEGACY)

const problems = []
if (pluginEntries > 1) {
  problems.push(`${PLUGIN} appears ${pluginEntries} times in dsh.profile.bundles`)
}
if (legacyEntries > 0) {
  problems.push(`legacy ${LEGACY} still appears in dsh.profile.bundles`)
}
if (legacyDependency) {
  problems.push(`legacy ${LEGACY} is still a dependency`)
}
if (dependencyEntries && pluginEntries === 0) {
  problems.push(`${PLUGIN} is a dependency but missing from dsh.profile.bundles`)
}
if (dependencyEntries && !fs.existsSync(pluginLib)) {
  problems.push(`installed package is missing ${pluginLib}`)
}
if (legacyLink && pathEntryExists(legacyLink)) {
  problems.push(`stale legacy node_modules entry exists: ${legacyLink}`)
}

console.log(`profile: ${profileDir}`)
console.log(`package: ${packagePath}`)
if (problems.length === 0) {
  console.log('OK: one plugin dependency and one bundle entry; build output present.')
  process.exit(0)
}

console.log('Problems:')
for (const problem of problems) console.log(`- ${problem}`)

if (!fix) {
  console.log('Run again with --fix to repair package.json (registry data is untouched).')
  process.exit(1)
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupPath = `${packagePath}.bak-repair-${timestamp}`
fs.copyFileSync(packagePath, backupPath)

const nextBundles = []
let seenPlugin = false
for (const entry of bundles) {
  if (entry === LEGACY) continue
  if (entry === PLUGIN) {
    if (seenPlugin) continue
    seenPlugin = true
  }
  nextBundles.push(entry)
}
if (dependencyEntries && !seenPlugin) nextBundles.push(PLUGIN)

const nextDependencies = { ...dependencies }
delete nextDependencies[LEGACY]
pkg.dependencies = nextDependencies
pkg.dsh = pkg.dsh || {}
pkg.dsh.profile = pkg.dsh.profile || {}
pkg.dsh.profile.bundles = nextBundles

const temporary = `${packagePath}.tmp-repair-${process.pid}`
fs.writeFileSync(temporary, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
fs.renameSync(temporary, packagePath)

console.log(`Backup: ${backupPath}`)
console.log('Repaired package.json. Restart DSH, then reinstall with plugin_manager if needed.')
if (legacyLink && pathEntryExists(legacyLink)) {
  console.log(`Warning: remove the stale link manually after verifying it: ${legacyLink}`)
}
if (dependencyEntries && !fs.existsSync(pluginLib)) {
  console.error(`Still missing after repair: ${pluginLib}`)
  console.error('Reinstall the bundle with plugin_manager; do not copy files by hand.')
  process.exit(1)
}
