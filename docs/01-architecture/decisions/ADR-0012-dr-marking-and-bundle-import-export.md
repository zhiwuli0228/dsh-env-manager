# ADR-0012: Disaster-recovery marking on the environment plus versioned bundle import/export

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

1. **No DR marking.** An environment record describes one network; it has no place to
   say "this is the standby of prod-a", who its peer is, or what RTO/RPO applies.
2. **No bulk surface.** Onboarding a new site or restoring a backup meant replaying many
   `env_save` calls with hand-managed ordering and references.

## Decision

1. **Embed DR marking in the environment record** — no new record kind. `Environment`
   gains an optional `dr` block, validated by a Zod shape
   (`o(drFields(mode), mode).optional()`):
   - `role` (`primary` 生产 | `standby` 容灾) — required inside the block;
   - `type` — a short token, ≤16 chars, `^[A-Za-z0-9][A-Za-z0-9_-]{0,15}$`; presets
     `AS` (主备 Active-Standby), `AA` (双活 Active-Active), `AP` (主从 Active-Passive);
     custom codes are allowed;
   - `peer` (optional environment id, ≤128) — the other half of the DR pair;
   - `scope` (optional, ≤40) — e.g. 同城 / 异地;
   - `rtoMinutes` / `rpoMinutes` (optional integers 0..10080 = 7 days) — descriptive
     objectives, never enforced;
   - `note` (optional, ≤2000).
   Cross-checks: `peer` cannot equal the environment's own id. Each half of a pair
   declares its own marking, so a pair is two `dr` blocks whose `peer` fields point at
   each other.
2. **DR marking is metadata only.** There is no failover/switch/promote operation, no
   witness/仲裁 role, and no scheduled-drill tracking in V1. RTO/RPO are declared
   objectives, never measured or enforced. The router never reads `dr`, so a marking can
   never authorize an execution.
3. **Integrity.** An environment whose `dr.peer` points at a missing environment is
   reported as a `DR_PEER_UNKNOWN` warning by `env_validate` (severity warning, file
   `environments/{id}.yaml`, path `dr.peer`). Deleting an environment that is the DR peer
   of another environment is blocked with `RECORD_IN_USE`; the blocker's
   `details.referrer` is `{ kind: 'environment', id, field: 'dr.peer' }`. A bundle import
   rejects a record with a missing peer using the same code `DR_PEER_UNKNOWN` (HTTP 400).
4. **Add a versioned bundle document** (`BundleDocument`, version 1): top-level `version`
   and `exportedAt` plus optional plural-kind arrays `environments`, `services`,
   `deployments`, `ruleProfiles`, `operationBindings`. There is no groups key: DR
   marking travels inside each environment record. Unknown keys, wrong versions, and
   non-array kind fields are rejected; a bundle is a transient in-memory document, never
   stored under `dataDir`.
5. **`env_import`** applies a bundle:
   - records parse with the same zod schemas as normal saves;
   - records apply in dependency order (environment → service → deployment → ruleProfile →
     operationBinding);
   - references resolve against the existing registry **plus** the ids written by the same
     bundle; reference problems use the same codes as single-record validation
     (`ENV_NOT_FOUND`, `SERVICE_NOT_FOUND`, `DEPLOYMENT_NOT_FOUND`,
     `RULE_PROFILE_NOT_FOUND`, `DR_PEER_UNKNOWN`);
   - conflict modes `skip` (default) / `overwrite` (keeps `createdAt`) / `error`
     (`RECORD_EXISTS`);
   - a production-touching bundle throws `APPROVAL_REQUIRED` unless `confirm: true`;
     actor `ui` needs `writePolicy.allowUiProductionWrites`;
   - per-record failures are reported (`{ imported, skipped, failed, warnings }`) and do
     not abort the rest;
   - strict schemas reject any `password`/`sshPassword` field.
6. **`env_export`** writes a bundle: omitted ids → the whole registry. Explicit ids →
   DR peers ride along **in both directions** (a selected env's peer is added; an env whose
   peer is selected is added too; fixpoint) so the bundle stays self-contained — but
   deployments, services, rule profiles and operation bindings are still derived only from
   the explicitly selected env ids, so a DR peer brings only its environment record, not
   its deployments/services/bindings. Lists are sorted by id; `exportedAt` is set. Records
   carry `credentialRef` names only.
7. **Expose both on the tool and HTTP surfaces**: tools `env_import` / `env_export`
   (approval retry for import) and HTTP ops `import` / `export` (actor `ui`; `yaml`
   accepts YAML/JSON text). Panel: Import/Export live in the panel header (modal hints say
   DR marking travels inside each environment / a DR peer environment is included
   automatically), and the environment detail has a 容灾 (DR) card in the right rail.

## Consequences

Positive:

- The production↔DR relationship is visible on the environment itself: the detail's DR
  card shows role, type, peer, scope and RTO/RPO, and the list summary appends
  `DR <role> <type> → <peer>`.
- Batch onboarding and backup/migration are one call, with ordering and reference
  resolution handled by the Host instead of by hand; a selected-environment export stays
  self-contained because DR peers ride along in both directions.
- The strict bundle shape and the existing approval/policy gates keep the bulk path as
  safe as single-record writes; a bad bundle cannot smuggle a secret or escape `dataDir`.
- No second record kind: the record kinds stay exactly five, and DR marking survives
  bundle round-trips because it lives inside the environment document.

Costs / limits:

- No failover semantics: the marking says *what the topology is*, not *what to do* when a
  site fails. Operators must still act manually until a future execution path exists.
- Peer links are per-environment declarations; nothing verifies that the standby really
  receives replication, or that both halves agree.
- RPO/RTO are unverified numbers; they are a declaration, not a measurement.
- A bundle carries whatever the exporter selected; it is a snapshot, not an ongoing sync.

## Alternatives considered

- **A separate `drGroup` record kind (built, then removed as out of scope)**: first
  implemented as its own record kind with a dedicated directory, a panel tab and a bundle
  key — then removed because it exceeded the request. A pair is two facts that the two
  environment records already own; a group record adds a sixth kind, a second UI surface
  and an extra bundle key the request never asked for.
- **Per-environment plain fields without a `peer` cross-check** (e.g. `drRole`,
  `drPeerRef` on Environment): rejected in favour of a validated `dr` block that also
  carries type, scope and RTO/RPO and cross-checks `peer ≠ id`.
- **A dedicated database or blob store for DR topology**: rejected — file-based YAML is
  the registry's only storage (ADR-0002), and DR marking adds no query pattern that files
  cannot serve.
- **Full DR runbook automation now** (failover commands, drills, promotion): rejected —
  execution must stay approval-gated and binding-driven; the marking is deliberately
  read-only metadata in V1.
- **Failover/switch/promote operations now**: rejected — would imply state-changing DR
  actions, an approval model, and credential resolution the plugin deliberately avoids.
  Deferred to a follow-up ADR.
- **Importing only selected kinds**: rejected — the bundle keeps one stable shape for all
  five kinds; importing a subset simply omits the others.

## Follow-up

- Consider failover/switch/promote operations behind the existing approval and production
  gates (separate ADR); the `dr` marking itself stays metadata.
- A witness/仲裁 role and scheduled drill tracking if operations request them.
- Keep `docs/01-architecture/data-model.md` §8/§9, `docs/01-architecture/ui-design.md`
  §6.3 and `docs/05-domain/environment-template.md` synchronized with this decision.

## Update 2026-11-09 — the panel can link the peer

The 容灾 card was display-only, which made the peer relationship impractical: an operator
saw the empty state but had to hand-edit YAML to say which environment the pair partner
is. The card now edits the marking in place: role, type (`AS`/`AA`/`AP`/custom), a peer
**picker limited to the other registered environments**, scope, RTO, RPO and note. The
peer is still linked by id inside this environment's own `dr` block, so decision 1 and the
"no new record kind" rule are unchanged; with the 同时更新对端环境 option the panel also
writes the mirror `dr` block on the peer (opposite role, `peer` = this environment) via a
second `save`, and confirms before relinking a peer that is already paired. 解除容灾
deletes this `dr` block and drops the peer's back-reference. Everything still runs through
the existing `save` op, its schema validation and its production policy gate — no new Host
op, no auto-apply, and no DR action. "Read-only" in the alternatives above meant "never
authorizes execution", not "not editable"; the marking is operator-authored metadata.

