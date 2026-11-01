# ADR-0010: Environment as one network, planes as role views

- **Status:** Accepted
- **Date:** 2026-11-01
- **Supersedes:** the one-step "environment + first host + password" creation flow
  described in earlier V1 UI notes

## Context

Operators describe an environment as a complete network set: management nodes, business
nodes, database nodes (sometimes many), expansion nodes, and 1–100 IPs. They need to work
one network at a time and switch between planes inside it.

The original V1 panel treated the environment as a flat list of hosts plus accounts, and
its **New environment** form created the environment, first host, account and SSH endpoint
in one save. That mixed three concerns (network identity, node topology, credentials),
made every new environment inherit a node it might not need, and hid the plane structure
inside a generic host table.

Two alternatives were considered:

1. **A separate environment per plane.** Easy filtering, but duplicates the network,
   breaks shared nodes and forces the operator to maintain several YAML documents for one
   network.
2. **One environment with a flat host list.** Already supported by the schema, but the UI
   had no way to work plane-by-plane, so it did not match the operator's mental model.

## Decision

1. **One environment = one complete network = one YAML document = one configuration
   page.** Management, business, database and expansion are **logical roles**, not
   separate environments.
2. **Planes are views over the same `Environment.hosts[]`.** The detail page renders one
   tab per declared role by filtering `hosts[]`. A node serving two planes is one `Host`
   with two role ids and appears in both tabs; it is never copied per plane.
3. **`New environment` creates only the shell.** The form collects name, optional id,
   category and description, seeds the four standard roles (`management`, `business`,
   `database`, `extension`) and creates empty `hosts`, `clusters`, `endpoints` and
   `loginRecords`. Nodes are added inside the environment.
4. **Roles are mandatory where they carry meaning.**
   - `Environment.roles` must contain at least one entry.
   - Every `Host.roles` must contain at least one entry.
   - Every host role must reference a declared logical role.
   - A plane with zero nodes is valid; a node with zero roles is not.
5. **A node supports multiple roles.** Add/edit node uses role checkboxes; opening the form
   from a plane preselects that role. Co-location is represented once.
6. **Nodes are first-class in the panel.** Add/edit node, optional account creation,
   expandable account tables, a shared search across id/name/IP/platform/admin/role, and
   batch import in the form `IP,name,roles,port,user` (multiple roles separated by `|` or
   `/`). Batch import never accepts passwords.
7. **Credentials remain transient and namespaced.** The add/edit node form may collect a
   login username and password; the password is sent once to `ctx.credentials.set`, the
   record keeps `credentialRef` only. Shell creation and batch import collect no secrets.
8. **Database topology is deferred.** Phase 1 treats `database` as a role and keeps
   primary/replica/sharding detail in node notes. Modeling it now would add a schema the
   rest of the UI does not consume.

## Consequences

Positive:

- One network has one YAML document, one backup unit and one atomic write.
- A shared management/business/database host is represented once, avoiding duplicate-IP
  errors and split audit context.
- The UI matches the operator's vocabulary: open the network, switch planes, add nodes.
- New environments are cheap: four empty plane tabs are immediately usable.
- Schema validation prevents a node from disappearing from every plane because it has no
  role.

Costs / limits:

- Every plane view is a filter, so large environments need search and a future
  virtualization strategy; V1 assumes up to a few hundred nodes.
- Deleting a plane role would affect every node that references it; the panel currently
  edits the role catalog through YAML, not a dedicated role editor.
- Phase 1 cannot express primary/replica/sharding relationships, read/write split or
  shard ranges; those remain Phase 2.
- A node with no accounts is valid, but the panel shows `0 accounts` and no credential
  reference until one is added.

## Follow-up

- Phase 2: database topology metadata and plane-aware expansion modeling.
- Add row-level delete for nodes/accounts/login records and credential rotation.
- Consider an optional JumpServer/PAM import adapter for accounts and login observations.
- Keep `docs/01-architecture/data-model.md` §3 and `ui-design.md` §6.3 as the normative
  references for this decision.
