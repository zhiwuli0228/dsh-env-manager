# Deployment Guide

## Install as a Local Bundle

In a DSH session, call the `plugin_manager` tool:

```text
action: install_bundle
target: <absolute path to this repository>
```

Restart DSH if needed.

## Verify

1. Ask `plugin_manager` for `action: list_bundles` and confirm the bundle appears.
2. Confirm it is active, not `overridden` or `restart-required`.
3. Call `env_list` from the Agent; a fresh install returns an empty list.
4. Open the **Environment Manager** entry in the sidebar and confirm the Overview
   counts render.
5. Optional transport check:

   ```bash
   curl -s -X POST http://127.0.0.1:<port>/env-manager/api \
     -H 'content-type: application/json' \
     -H 'x-env-manager-request: 1' \
     -d '{"op":"meta"}'
   ```

   Without the header the route returns 403; that is the expected control.

## Upgrade

1. Pull the latest changes.
2. `npm install && npm run build`.
3. Reinstall the bundle with `plugin_manager`.
4. Restart DSH so the Host module generation is fresh.
5. Run `env_validate` and review diagnostics.

Registry data is untouched by an upgrade. A `schemaVersion` change requires a migration; V1 has none.

## Remove

Call `plugin_manager` with `action: remove_bundle` and `target: dsh-env-manager`.

Registry data under `dataDir` is not deleted. Back it up if you may reinstall later.

## Rollback

1. Reinstall the previous checkout.
2. Restart DSH.
3. Restore `dataDir` from the backup if the previous version wrote incompatible records.

V1 accepts only `schemaVersion: 1`; records written by an unknown version are skipped with a warning rather than corrupted.
