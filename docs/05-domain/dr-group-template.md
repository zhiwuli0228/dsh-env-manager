# DR Group Template

Copy into `<dataDir>/drGroups/<id>.yaml` and replace the example values.

A DR group is topology metadata: it joins two or more environments (typically a
production site and its standby) so the panel can present the DR topology together.
Membership lives **in this record**; environments carry nothing about the group. A group
never executes anything — there is no failover / switch / promote operation, and RTO/RPO
values are descriptive objectives, not enforced limits.

## Active-Standby (AS 主备)

```yaml
id: dr-prod-as
schemaVersion: 1
name: 生产主备
type: AS                     # AS 主备 | AA 双活 | AP 主从 | custom token
scope: 同城                   # optional, ≤40 chars
rtoMinutes: 30               # optional, 0..10080 (7 days), minute granularity
rpoMinutes: 10               # optional, 0..10080
note: 生产主备，同城灾备；备用环境平时不承载业务流量。
members:
  - environmentId: prod-env
    role: primary            # primary = 生产/主用
    weight: 100              # optional, 0..1000; primary usually 100
    note: 生产
  - environmentId: dr-env
    role: standby            # standby = 容灾/备用
    weight: 0
    note: 容灾
createdAt: 2026-11-08T00:00:00.000Z
updatedAt: 2026-11-08T00:00:00.000Z
```

## Active-Active (AA 双活)

```yaml
id: dr-fin-aa
schemaVersion: 1
name: 两地双活
type: AA
scope: 两地三中心
rtoMinutes: 5
rpoMinutes: 0
members:
  - environmentId: fin-site-a
    role: primary
    weight: 50
    note: 站点 A
  - environmentId: fin-site-b
    role: primary
    weight: 50
    note: 站点 B
createdAt: 2026-11-08T00:00:00.000Z
updatedAt: 2026-11-08T00:00:00.000Z
```

## Fields

| Field | Required | Type / limit | Notes |
|---|---|---|---|
| `id` | yes | `^[a-z0-9][a-z0-9-]{0,62}$` | Must match the file name. |
| `schemaVersion` | yes | `1` | |
| `name` | yes | string, 1..120 | Display name; **not** enforced unique (ids are). |
| `type` | yes | `^[A-Za-z0-9][A-Za-z0-9_-]{0,15}$` | `AS` / `AA` / `AP` or a custom token; the UI labels the three standard codes and shows a custom code as-is. |
| `scope` | no | string, 1..40 | e.g. `同城`, `异地`, `两地三中心`. |
| `rtoMinutes` | no | integer 0..10080 | Recovery time objective, minutes. |
| `rpoMinutes` | no | integer 0..10080 | Recovery point objective, minutes. |
| `note` | no | string, ≤2000 | Free text. |
| `members` | yes | array, 1..8 | At least one environment. |
| `members[].environmentId` | yes | existing environment id | A missing environment is flagged `DR_GROUP_MEMBER_UNKNOWN` by `env_validate`. |
| `members[].role` | yes | `primary` \| `standby` | `primary` = 生产/主用, `standby` = 容灾/备用. |
| `members[].weight` | no | integer 0..1000 | Traffic/priority hint; primary usually 100, standby 0. |
| `members[].note` | no | string, ≤500 | Free text. |
| `createdAt` / `updatedAt` | — | ISO 8601 | Set by storage. |

## Invariants

- Member `environmentId`s are unique within the group.
- At least one member is `primary`.
- `AS` and `AP` require **exactly one** `primary`; `AA` allows several.
- A group references existing environments only; deleting an environment that is a member
  is blocked with `RECORD_IN_USE` until the group is edited or removed.
- A witness/仲裁 member role is deliberately not modelled; roles are `primary` and
  `standby` only.
- RPO/RTO are objectives. Nothing measures or enforces them.

## How to attach environments

1. Create the environments first (both sides exist as independent environment records).
2. Create the group with one `members[]` entry per environment, choosing
   `role: primary` for the live site and `role: standby` for the DR site (or two
   `primary` members for `AA`).
3. Verify with `env_validate` (or the Overview → Validate button); a member pointing at a
   missing environment shows `DR_GROUP_MEMBER_UNKNOWN`.

Remove a member by deleting its entry, then re-validate. Deleting the group itself only
removes the topology record; it never touches the member environments.

## RTO / RPO guidance

- Use minute values with realistic targets, e.g. `rtoMinutes: 30` / `rpoMinutes: 10` for a
  warm standby, `rtoMinutes: 5` / `rpoMinutes: 0` for an active-active pair.
- `0` is allowed and means "no data loss" / "immediate" as a declared objective; it is
  not a measurement.
- Both fields are optional: omit them when there is no agreed objective rather than
  inventing one.

## Do / Don't

Do:

- Keep one group per topology; use the `note` for operator context.
- Use the standard `AS` / `AA` / `AP` codes so the panel labels them consistently.
- Re-run `env_validate` after editing membership.

Don't:

- Don't put credentials, passwords or secrets in a group — there is no credential field,
  and record schemas are strict.
- Don't model a witness/仲裁 node as a member; the role enum has no such value yet.
- Don't treat a group as an execution authorization: it cannot trigger failover or any
  operation, and the operation router does not read groups.
- Don't duplicate production facts here; the environments already own them.

## How to verify

```text
env_validate                          # registry-wide: DR_GROUP_MEMBER_UNKNOWN warnings
env_get  kind=drGroup id=dr-prod-as   # read the stored record
env_save kind=drGroup record=…        # schema + cross-checks run before write
```

`env_save` rejects a group with duplicate environments, no `primary`, or more than one
`primary` for `AS`/`AP`. `env_import` applies a `drGroups` array with the same schema and
fails a record whose member environment does not exist (registry ∪ same bundle).
