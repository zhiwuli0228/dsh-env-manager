# Storage Contract

Status: normative for V1.

Durable registry data is a directory of YAML files. Nothing else is authoritative.

Related: [data-model.md](./data-model.md), [design.md](./design.md) §5.

---

## 1. Location

```text
<dataDir>/
├── environments/{environmentId}.yaml
├── services/{serviceId}.yaml
├── deployments/{deploymentId}.yaml
├── rules/{ruleProfileId}.yaml
├── operations/{bindingId}.yaml
├── sessions/{sessionId}.json
└── .backups/
```

### 1.1 Resolving `dataDir`

Precedence:

1. Plugin config `dataDir`, when set (absolute path or path relative to the plugin workspace).
2. A DSH-provided profile data directory, when the plugin context exposes one.
3. `$DSH_PROFILE_DIR/data/dsh-env-manager`.
4. `<working directory>/data/dsh-env-manager` as a last resort for development only.

The chosen path is reported once at startup as an `info` diagnostic so a user can find the files. Items 2 and 3 are verified during implementation (design §16, open question 1).

### 1.2 Creation

- The directory tree is created on first use.
- A missing directory is not an error; an unwritable directory is an error with `STORAGE_UNWRITABLE`.

---

## 2. File rules

| Rule | Value |
|---|---|
| Encoding | UTF-8, no BOM |
| Line endings | LF on write; CRLF tolerated on read |
| Format | YAML 1.2 |
| Extension | `.yaml` for records, `.json` for session state |
| Name | `{id}.yaml`, where `id` matches `^[a-z0-9][a-z0-9-]{0,63}$` |
| Extra files | Ignored unless they match the extension; ignored files are not deleted |

A record file whose `id` differs from its filename is reported by `env_validate` and treated as invalid on load.

---

## 3. Record envelope

Every record carries:

```yaml
id: string
schemaVersion: 1
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

- `createdAt` is set by storage on create and preserved on update.
- `updatedAt` is set by storage on every successful write.
- Callers cannot supply these values through tools; they are ignored if present.

---

## 4. Atomic write protocol

```text
1. Serialize the record to YAML.
2. Validate the serialized document by parsing it back and running schema validation.
3. Write to `{target}.tmp-{random}` in the same directory.
4. Flush and close.
5. Rename over the target (atomic on the same volume).
6. On any failure, delete the temp file and return the original record unchanged.
7. Reload the affected registry entry.
```

Constraints:

- Never write directly to the target file.
- Never leave a temp file behind on success or on a caught failure.
- Never delete a record file that failed to parse; surface a diagnostic instead.

---

## 5. Read behavior

```text
1. Enumerate `*.yaml` in the directory.
2. Parse each file.
3. Schema-validate.
4. On parse error: record `RECORD_INVALID` diagnostic, skip the file.
5. On unknown schemaVersion: record `SCHEMA_UNSUPPORTED` warning, skip the file.
6. Build an in-memory map keyed by id.
```

Reads never modify files. A failed file stays on disk for the user to fix.

If a directory is unreadable, the loader returns an empty map plus an error diagnostic; tools still serve whatever other directories loaded.

---

## 6. Registry lifecycle

- `registry.load()` scans all five record directories.
- `registry.reload()` re-scans; used after every write and after `env_validate` if a change is detected.
- The registry is an in-memory cache; it is never persisted.
- V1 has no index files. A scan of a few hundred small YAML files is fast enough; this is revisited only with measured need.

Optional external edit detection uses `ctx.fs.watch` where available; otherwise a reload happens on the next tool call after a recorded mtime change (implementation detail, not a contract).

---

## 7. Session state

```text
sessions/{sessionId}.json
```

```json
{
  "schemaVersion": 1,
  "sessionId": "session-abc",
  "defaultEnvironmentId": "test-a",
  "updatedAt": "2026-11-01T03:00:00.000Z"
}
```

Rules:

- Written atomically with the same protocol as records.
- A missing file means "no default".
- A corrupt file is ignored with `SESSION_CONTEXT_UNPERSISTED` and the in-memory value is used for the current session.
- Session files are not registry records and are never scanned into the registry.
- If the DSH session API offers a durable store, it is preferred and this file becomes a fallback.

---

## 8. Referential integrity

Storage itself does not enforce cross-record references; the registry does, on load and on write:

- Broken references are reported by `env_validate`.
- On load, an invalid reference produces a warning; the record stays usable for name lookups.
- On write, an invalid reference is rejected (`RECORD_INVALID` with details).

This split keeps a single bad file from making the whole registry unusable.

---

## 9. Backups

V1 keeps one rolling backup per write:

```text
.backups/{type}/{id}.{timestamp}.yaml
```

- At most 5 backups per record; older ones are pruned.
- Backups are best-effort: a backup failure does not fail the write, but emits a warning.
- Backups are not a history feature. They exist to recover from an accidental overwrite.

---

## 10. Migration

- `schemaVersion` gates compatibility.
- V1 accepts only `1`.
- A future migration must:
  1. read old files,
  2. write new files atomically,
  3. keep a backup,
  4. report counts,
  5. never delete the old file until the new one is verified.

V1 implements no migration.

---

## 11. What must never be stored

- Passwords, tokens, private keys, kubeconfigs.
- Raw command output or logs.
- Copy of credential values.
- Session conversation content.

A violation found in validation is reported as `RECORD_INVALID` with the field path but without echoing the value.

---

## 12. Concurrency

- Writers are serialized in-process; the plugin is one Host process per profile.
- Multi-process writers are last-write-wins; no file locks in V1.
- Readers never block writers.
- A write that fails validation leaves the previous file untouched.

---

## 13. Repository hygiene

- `data/` is git-ignored.
- The repository ships no registry data, only schemas, examples in docs, and tests fixtures.
- Test fixtures live under `tests/fixtures/` and contain no real hostnames, IPs or URLs.
