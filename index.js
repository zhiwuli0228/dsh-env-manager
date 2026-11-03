/**
 * DSH Environment Manager - Host entry point.
 *
 * The implementation lives in `lib/` (compiled from `src/`); this shim keeps the
 * bundle entry stable across builds. `lib/` is committed so a checkout, git
 * install or npm tarball all have the same executable entry.
 */

let implementation

try {
  implementation = await import('./lib/index.js')
} catch (error) {
  const missingLib =
    error &&
    error.code === 'ERR_MODULE_NOT_FOUND' &&
    /lib[\\/]index\.js/.test(String(error.message))

  if (missingLib) {
    throw new Error(
      '[dsh-env-manager-plugin] Missing build output: lib/index.js. ' +
        'Install the published `dsh-env-manager-plugin` package, or run ' +
        '`npm install && npm run build` in the plugin checkout before installing it.',
      { cause: error },
    )
  }

  throw error
}

export const { name, inject, Config, apply } = implementation
