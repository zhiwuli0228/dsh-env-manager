# ADR-0012: DR groups as a separate record plus versioned bundle import/export

- **Status:** Accepted
- **Date:** 2026-11-08
- **Related:** ADR-0002 (file-based storage), ADR-0006 (credentials as references), ADR-0009 (client–host HTTP transport), ADR-0010 (environment plane model)

## Context

The registry tracks environments, but several of them belong together: a production
site and its DR site are the same business service in two places. Operators want to see
that topology (Active-Standby 主备, Active-Active 双活, Active-Passive 主从 — or a custom
pattern) next to the environments themselves, and they onboard whole sets of environments
with their deployments, services, bindings and rule profiles at once — creating them
record by record is error-prone.

Two related gaps existed:

1. **No cross-environment topology.** An environment record describes one network; it has
   no place to say "this is the standby of prod-a". Putting DR fields on the environment
   would duplicate the same fact into every member and make edits race.
2. **No bulk surface.** Onboarding a new site or restoring a backup meant replaying many
   `env_save` calls with hand-managed ordering and references.

## Decision

1. **Add a `drGroup` record kind** (`<dataDir>/drGroups/{id}.yaml`), a top-level registry
   record like the other five kinds:
   - `name` (required, not unique), `type` (`AS` / `AA` / `AP` or a custom short token,
     required), optional `scope`, `rtoMinutes`/`rpoMinutes` (minutes, 0..10080) and
     `note`.
   - `members[]` (1..8) of `{ environmentId, role: primary | standby, weight?, note? }`.
   - Membership lives **in the group**; environments do not point back. Cross-checks: no
     duplicate member environment, at least one `primary`, exactly one `primary` for
     `AS`/`AP` (several allowed for `AA`).
   - Integrity: member environments must exist (`DR_GROUP_MEMBER_UNKNOWN` warning from
     `env_validate`); deleting a member environment is blocked with `RECORD_IN_USE`
     while a group references it.
2. **A DR group is topology metadata only.** There is no failover/switch/promote
   operation, no witness/仲裁 member role, and no scheduled-drill tracking in V1. RTO/RPO
   are descriptive objectives, never enforced. The router does not read groups, so a group
   can never authorize an execution.
3. **Add a versioned bundle document** (`BundleDocument`, version 1): top-level `version`
   plus optional plural-kind arrays `environments`, `services`, `deployments`,
   `ruleProfiles`, `operationBindings`, `drGroups`. Unknown keys, wrong versions, and
   non-array kind fields are rejected; a bundle is a transient in-memory document, never
   stored under `dataDir`.
4. **`env_import`** applies a bundle:
   - records parse with the same zod schemas as normal saves;
   - records apply in dependency order (environment → service → deployment → ruleProfile →
     operationBinding → drGroup);
   - references resolve against the existing registry **plus** the ids written by the same
     bundle;
   - conflict modes `skip` (default) / `overwrite` (keeps `createdAt`) / `error`
     (`RECORD_EXISTS`);
   - a production-touching bundle throws `APPROVAL_REQUIRED` unless `confirm: true`;
     actor `ui` needs `writePolicy.allowUiProductionWrites`;
   - per-record failures are reported (`{ imported, skipped, failed, warnings }`) and do
     not abort the rest;
   - strict schemas reject any `password`/`sshPassword` field.
5. **`env_export`** writes a bundle: omitted ids → the whole registry; explicit ids →
     the selected environments plus their deployments, referenced services, matching
     operation bindings, referenced rule profiles, and DR groups containing a selected
     environment; lists sorted by id, `exportedAt` set. Records carry `credentialRef`
     names only.
6. **Expose both on the tool and HTTP surfaces**: tools `env_import` / `env_export`
   (approval retry for import) and HTTP ops `import` / `export` (actor `ui`; `yaml`
   accepts YAML/JSON text). Panel: a DR Groups tab and import/export modals.

## Consequences

Positive:

- The production↔DR relationship is visible as a first-class record, and the DR tab shows
  both sides of the topology with their role, weight and objectives.
- Batch onboarding and backup/migration are one call, with ordering and reference
  resolution handled by the Host instead of by hand.
- The strict bundle shape and the existing approval/policy gates keep the bulk path as
  safe as single-record writes; a bad bundle cannot smuggle a secret or escape
  `dataDir`.
- DR membership has a single owner (the group), so no environment edit races with a DR
  declaration.

Costs / limits:

- No failover semantics: the group says *what the topology is*, not *what to do* when a
  site fails. Operators must still act manually until a future execution path exists.
- `AS`/`AP` role checks are schema-level; nothing verifies that the standby really
  receives replication.
- RPO/RTO are unverified numbers; they are a declaration, not a measurement.
- A bundle carries whatever the exporter selected; it is a snapshot, not an ongoing sync.

## Alternatives considered

- **Per-environment DR fields** (e.g. `drRole`, `drPeerRef` on Environment): rejected —
  duplicates the fact per member, invites conflicting edits, and makes validation span
  files. Membership belongs in one record that both sides reference.
- **A dedicated database or blob store for DR topology**: rejected — file-based YAML is
  the registry's only storage (ADR-0002), and groups add no query pattern that files
  cannot serve.
- **Full DR runbook automation now** (failover commands, drills, promotion): rejected —
  execution must stay approval-gated and binding-driven; the group is deliberately
  read-only metadata in V1.
- **Failover/switch/promote operations now**: rejected — would imply group-driven
  execution semantics, an approval model for state-changing DR actions, and credential
  resolution the plugin deliberately avoids. Deferred to a follow-up ADR.
- **Importing only selected kinds**: rejected — the bundle keeps one stable shape for all
  six kinds; importing a subset simply omits the others.

## Follow-up

- Add a witness/仲裁 member role and scheduled drill tracking if operations request them.
- Consider failover/switch/promote operations behind the existing approval and production
  gates (separate ADR); the group model itself stays metadata.
- Keep `docs/01-architecture/data-model.md` §8/§9, `docs/01-architecture/ui-design.md`
  §6.2b and `docs/05-domain/dr-group-template.md` synchronized with this decision.
