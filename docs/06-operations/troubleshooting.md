# Troubleshooting

## Plugin not visible after install

1. Run `dsh plugin_manager list_bundles`.
2. Check for activation errors.
3. Restart DSH.

## Client icon not shown

1. Verify `client.js` is listed in `files`.
2. Check browser console for module loader errors.
3. Ensure slot id and name match a valid slot.

## Tools not registered

1. Check `index.js` for errors.
2. Verify the plugin is activated in the profile.
3. Review DSH host logs.

## Storage errors

1. Verify write permissions in plugin workspace.
2. Check YAML syntax of registry files.
3. Review schema version compatibility.
