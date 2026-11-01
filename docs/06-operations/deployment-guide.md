# Deployment Guide

## Install as Local Bundle

From the project root:

```bash
dsh plugin_manager install_bundle --target .
```

Restart DSH if needed.

## Verify

Check the bundle is listed:

```bash
dsh plugin_manager list_bundles
```

## Upgrade

1. Pull the latest changes.
2. Reinstall the bundle.
3. Restart DSH.

## Remove

```bash
dsh plugin_manager remove_bundle --target dsh-env-manager
```
