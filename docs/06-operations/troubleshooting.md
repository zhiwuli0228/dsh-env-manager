# Troubleshooting

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

The bound Skill is not registered, or its source/digest does not match. Install or correct the Skill; do not add a fallback binding that changes the environment silently.

## `POLICY_DENIED`

Either the environment is production and the binding does not allow it, or an approval was denied. Fix the policy deliberately, not by flipping flags in a hurry.

## Session default is not remembered

If the tool reports `persisted: false`, the state file could not be written. Check `dataDir` permissions and the `sessions/` directory. The in-memory value still works for the current session.

## Storage errors

1. Verify write permission on `dataDir`.
2. Check that `dataDir` is not inside a read-only workspace.
3. Confirm the file name matches the record `id`.
4. Check `schemaVersion`; V1 only reads `1`.
