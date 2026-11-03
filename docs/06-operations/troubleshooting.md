# Troubleshooting

## Install fails with "Cannot find module .../lib/index.js"

This means DSH found the bundle but the Host build output was absent or incomplete.

1. Prefer the published package: `plugin_manager` → `install_bundle` with
   `dsh-env-manager-plugin@0.1.0`. The npm tarball includes `lib/`.
2. If installing a local checkout, use the current `main`; `lib/` is committed there on
   purpose. Older clones did not include it.
3. If the checkout is older or `lib/` was deleted, run `npm install && npm run build`
   in the repository, then reinstall the bundle.
4. Do not copy only `index.js` into a profile; the bundle needs `lib/`, `client.js`,
   `cordis.patch.yml` and the locale files together.

`index.js` now reports this condition with a dedicated message instead of a bare
`ERR_MODULE_NOT_FOUND`.

## DSH does not start: duplicate bundle registration

The plugin must appear **once** in the profile. A failed manual install often leaves both
an old `dsh-env-manager` entry and a new `dsh-env-manager-plugin` entry, which inserts the
same loader row twice.

For the affected profile, stop DSH, back up both files, and inspect:

```powershell
$p = Join-Path $HOME '.dsh\profiles\<profile>'
Get-Content -Raw (Join-Path $p 'package.json')
Get-ChildItem (Join-Path $p 'node_modules') | Where-Object Name -match 'env-manager'
```

In `package.json`:

- keep `dsh-env-manager-plugin` exactly once in `dependencies`;
- keep `dsh-env-manager-plugin` exactly once in `dsh.profile.bundles`;
- remove the legacy `dsh-env-manager` dependency and bundle entry;
- do not add a second bundle entry by hand.

Then remove any stale `node_modules/dsh-env-manager` link and reinstall through
`plugin_manager`. Do not copy files into the profile as a workaround.

From a checkout you can run the repair helper before restarting:

```powershell
node scripts/repair-profile.mjs --profile <profile>
node scripts/repair-profile.mjs --profile <profile> --fix
```

The helper edits only `package.json` (with a timestamped backup); it never deletes
registry data. The same file ships in the npm package as
`node_modules/dsh-env-manager-plugin/scripts/repair-profile.mjs`.

## Plugin is not visible after install

1. Ask `plugin_manager` for `action: list_bundles` — confirm the bundle is listed.
2. Check the activation result for `failed` / `overridden` / `restart-required`.
3. Restart DSH.

## Host build fails

1. Run `npm run build` and read the first error, not the count.
2. Confirm `tsconfig.json` exists and `outDir` is `lib`.
3. Check that `index.js` re-exports `./lib/index.js` and the file exists.

## Tools are not registered

1. Confirm the bundle is active.
2. Check Host logs for an exception in `apply`.
3. Call `env_list`: an empty list is correct on a fresh install; an unknown tool means registration failed.
4. Reinstall after every Host rebuild; Host code changes need a fresh module generation.

## Client panel does not appear

1. Verify `client.js` is listed in `files` and exported as `./client`.
2. Check the browser console for module-loader errors.
3. Verify the slot id and name match a live slot.
4. Reinstall the bundle after editing `client.js`.

## Registry loads with warnings

Warnings are expected when a file is invalid. They name the file and the field.

1. Fix the YAML or the field.
2. Run `env_validate` again.
3. Invalid files are never deleted automatically, so the data is still on disk.

## `env_resolve` returns `RULE_UNDEFINED_VARIABLE`

1. The message names the field and the missing variable.
2. Check that the variable exists in a referenced rule profile or in an environment/deployment override.
3. Remember that only the deployment's runtime fields are in scope.

## `RULE_CYCLE`

Two or more fields reference each other. Break the cycle in the rule profile; the message contains the cycle path.

## `RULE_PATH_TRAVERSAL`

A resolved path contains a `..` segment. Fix the template; traversal is rejected by design.

## `DEPLOYMENT_AMBIGUOUS`

The service has several bindings in the environment. Pass `deploymentId` explicitly.

## `BINDING_CONFLICT`

Two enabled bindings match at the same level. Disable one, narrow one, or merge them. The plugin will not choose for you.

## `SKILL_UNAVAILABLE`

The bound Skill is not registered, or its source/provider does not match. Install or correct the Skill; do not add a fallback binding that changes the environment silently.

## `POLICY_DENIED`

Either the environment is production and the binding does not allow it, or an approval was denied. Fix the policy deliberately, not by flipping flags in a hurry.

## Session default is not remembered

If the tool reports `persisted: false`, the state file could not be written. Check `dataDir` permissions and the `sessions/` directory. The value is kept in a process-local cache, so it still works for this process but is lost on restart.

## Panel says "Cannot reach the Host"

1. Confirm the bundle is active and the Host is running.
2. Reload the page; the panel uses a same-origin `POST /env-manager/api`.
3. In the browser console, a 403 means the request header or origin check failed — this is the transport control, not a bug.
4. A 404 means the route was not registered; reinstall the bundle after a Host rebuild.

## Panel write is denied for a production record

`writePolicy.allowUiProductionWrites` defaults to `false`. Edit the YAML through the Agent (`env_save`, with approval) or change the policy deliberately.

## Panel shows "Unknown" skill availability

The Skill catalog was absent or incomplete when the operation was resolved. Check that the Skill registry is available; the router never assumes a missing catalog means "available".

## Storage errors

1. Verify write permission on `dataDir`.
2. Check that `dataDir` is not inside a read-only workspace.
3. Confirm the file name matches the record `id`.
4. Check `schemaVersion`; V1 only reads `1`.
