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
├── drGroups/{drGroupId}.yaml   # DR topology: members are environment references
├── scripts/                  # execution scripts referenced by bindings
├── experiences/{id}.yaml     # review-queue records (success summaries / failure lessons)
├── sessions/{sessionId}.json
└── .backups/
```

`scripts/` and `experiences/` are created with the layout. `experiences/` is **not** part
of the registry: records there are validated by the experience schema and never
participate in registry referential integrity. `scripts/` holds only files a binding
explicitly references; bindings and the executor reject absolute paths and `..`.
`drGroups/` holds DR group records; they are registry records and follow the same rules as
every other kind, with one extra referential rule (§8).

### 1.3 Bundle import / export files

Bundles (import/export documents) are **not stored**: an import document is parsed in
memory and applied record by record; an export document is serialized in memory and handed
to the caller (a JSON download in the panel). Nothing is written to `dataDir` beyond the
regular record writes the import performs through `storage`, so a bundle can never create
files outside `dataDir`.

### 1.1 Resolving `dataDir`

Precedence:

1. Plugin config `dataDir`, when set (absolute path or path relative to the profile directory).
2. `profileContext.dir` → `<dir>/data/dsh-env-manager`.
3. `$DSH_PROFILE_DIR/data/dsh-env-manager`.
4. `<working directory>/data/dsh-env-manager` as a last resort for development only.

The chosen path is memoized, reported once at startup, and shown in the UI overview. It
is never derived from model input. Resolution order and fallbacks are implemented in
`src/storage/paths.ts` (detailed-design §4.1).

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
| Name | `{id}.yaml`, where `id` matches `^[a-z0-9][a-z0-9-]{0,62}$` |
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

- `createdAt` is set by storage on create.
- `updatedAt` is set by storage on every successful write.
- A write input may include both fields; storage overrides them. `createdAt` is
  preserved from the existing file on update, so a caller cannot rewrite history.
- The stored record always contains both fields.

---

## 4. Atomic write protocol

```text
1. Serialize the record to YAML.
2. Validate the serialized document by parsing it back and running schema validation.
3. Open `.${id}.${pid}.${randomUUID()}.tmp` in the target directory.
4. Write UTF-8, fsync, close.
5. Copy the previous file into `.backups/<kind>/<id>/<timestamp>.yaml`, prune to 5.
6. Rename over the target (atomic on the same volume).
7. On a caught failure before rename, delete the temp file and leave the target intact.
```

Constraints:

- Never write directly to the target file.
- Never leave a temp file behind on success or on a caught failure. A crash can leave
  one; startup removes `*.tmp` older than one hour.
- A backup failure does not fail the write; it is reported as a warning.
- Never delete a record file that failed to parse; surface a diagnostic instead.
- Storage does not reload the registry; the application layer does after a successful
  write.

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

- V1 loads the registry at the start of every application request.
- Concurrent requests share one in-flight load.
- A successful write triggers a reload before the request returns.
- The registry is an in-memory snapshot; it is never persisted.
- V1 has no index files and no watcher. A scan of a few hundred small YAML files is
  fast enough; an mtime-keyed cache is added only with measured need.

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
- A corrupt file is treated as "no default" and reported as `persisted: false`; it is
  not deleted, so the user can inspect it.
- A process-local cache mirrors the last value so a failed write still works until
  restart (detailed-design §9).
- Session files are not registry records and are never scanned into the registry.
- V1 uses this file store; a projection over the durable session log is a later
  refinement (detailed-design §9).

---

## 8. Referential integrity

Storage itself does not enforce cross-record references; the registry does, on load and on write:

- Broken references are reported by `env_validate`.
- On load, an invalid reference produces a warning; the record stays usable for name lookups.
- On write, an invalid reference is rejected (`RECORD_INVALID` with details).
- A DR group whose `members[].environmentId` is missing is reported as a
  `DR_GROUP_MEMBER_UNKNOWN` warning on load/validate; deleting an environment that is a
  member of a group is blocked with `RECORD_IN_USE` until the group is edited or removed.

This split keeps a single bad file from making the whole registry unusable.

---

## 9. Backups

V1 keeps one rolling backup per write:

```text
.backups/{kind}/{id}/{timestamp}.yaml
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
