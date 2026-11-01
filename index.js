/**
 * DSH Environment Manager - Host entry point.
 *
 * The implementation lives in `lib/` (compiled from `src/`); this shim keeps the
 * bundle entry stable across builds.
 */

export { name, inject, Config, apply } from './lib/index.js'
