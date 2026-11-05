# Environment Template

Copy into `<dataDir>/environments/<id>.yaml` and replace the example values.

```yaml
id: test-a
schemaVersion: 1
name: Test Environment A
aliases: [ta, test-a]
category: test          # dev | test | staging | production | custom
description: Main test environment for aicoservice

roles:
  - id: management
    name: Management Plane
    description: Admin plane and control entry points
  - id: business
    name: Business Plane
    description: Business traffic and workloads
  - id: database
    name: Database
    description: Database tier (primary/replica/sharding detail is Phase 2)
  - id: extension
    name: Expansion / other
    description: Expansion nodes and unclassified workloads

hosts:
  - id: host-001
    name: test-a-node-01
    kind: vm
    os: ubuntu-22.04
    platform: Linux / x86_64
    ip: 10.0.1.10
    sshPort: 22
    roles: [management, business]     # co-location: one host, two roles
    access: [ssh]
    adminUser: root
    isActive: true
    credentialRef: DSH_ENV_MANAGER_TEST_A_ROOT
    accounts:
      - id: root
        username: root
        purpose: system administration
        protocol: ssh
        port: 22
        authType: private-key
        credentialRef: DSH_ENV_MANAGER_TEST_A_ROOT
        lastLoginAt: 2026-10-31T08:12:00.000Z
        lastLoginFrom: 10.0.8.21
      - id: console
        username: ops
        purpose: business web console
        protocol: web
        loginUrl: https://test-a.example.internal/login
        authType: password
        credentialRef: DSH_ENV_MANAGER_TEST_A_CONSOLE
  - id: db-01
    name: test-a-db-01
    kind: physical
    platform: Linux / x86_64
    ip: 10.0.1.30
    sshPort: 22
    roles: [database]
    access: [ssh]
    adminUser: root
    isActive: true
    note: primary placeholder; topology is Phase 2
  - id: k8s-aio-01
    name: test-a-k8s-aio-01
    kind: k8s-all-in-one             # control plane + worker on one machine
    platform: Linux / x86_64
    ip: 10.0.1.20
    sshPort: 22
    roles: [management, business]
    access: [ssh, kubectl, docker]
    clusterRef: k8s-01
    adminUser: root
    isActive: true
    note: kubeconfig stays behind the cluster credentialRef
  - id: pod-host-01
    name: test-a-pod-host-01
    kind: pod-host                   # machine running Pods; operate with docker exec
    platform: Linux / x86_64
    ip: 10.0.1.21
    sshPort: 22
    roles: [business]
    access: [ssh, docker]
    clusterRef: k8s-01
    adminUser: root
    isActive: true
    note: Pods are workloads; this record is the host, not an individual Pod

clusters:
  - id: k8s-01
    name: test-a-k8s
    kind: kubernetes
    topology: all-in-one             # all-in-one | separate | external
    apiEndpoint: https://10.0.1.20:6443
    namespaces: [dv-sop]
    credentialRef: DSH_ENV_MANAGER_TEST_A_KUBECONFIG

endpoints:
  - id: ep-ssh-01
    kind: ssh
    hostRef: host-001
    port: 22
    credentialRef: DSH_ENV_MANAGER_TEST_A_ROOT
  - id: ep-web-01
    kind: web
    url: https://test-a.example.internal

loginRecords:
  - id: login-0001
    at: 2026-10-31T08:12:00.000Z
    username: root
    hostRef: host-001
    accountId: root
    protocol: ssh
    sourceIp: 10.0.8.21
    result: success             # success | failure
    note: jump-host session

createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

## Notes

- `id` must match the file name.
- One environment is one network and one configuration page. Its management, business,
  database and expansion planes are role views over the same `hosts[]`, not separate
  environments. The UI shows a node in every plane it serves.
- `roles` must contain at least one entry, and every `hosts[].roles` value must reference a
  declared `roles[].id`. A host must declare at least one role. The standard ids are
  `management`, `business`, `database` and `extension`; custom ids are allowed.
- A host that serves two planes is one entry with two roles; do not duplicate it.
- `hosts[].kind` is one of `vm`, `physical`, `k8s-all-in-one`, `k8s-worker` or `pod-host`;
  missing means `vm`. `k8s-all-in-one` means the control plane and worker share a machine.
  `pod-host` means the machine runs Pods and is operated with `docker exec`; it is still one
  host, not one entry per Pod.
- `hosts[].access` records the command surfaces present on the machine: `ssh`, `kubectl`,
  `docker`. It is metadata, not an authorization grant. The form pre-fills defaults; the
  values in YAML are authoritative.
- `k8s-all-in-one` and `k8s-worker` require `clusterRef` to an existing cluster.
  `pod-host` may omit it for a Docker-only machine outside the cluster. Any `clusterRef`
  must resolve within this environment.
- `clusters[].topology` is `all-in-one`, `separate` or `external`; it is descriptive and
  optional. Per-host `kind` is authoritative.
- `endpoints[].hostRef` / `clusterRef` must resolve within this environment.
- `credentialRef` is a reference only; never put a value here. The same rule applies to
  every `accounts[].credentialRef`. A ref must be a POSIX-style name
  (`^[A-Za-z_][A-Za-z0-9_]*$`); the UI generates `DSH_ENV_MANAGER_<ENVIRONMENT>_<ACCOUNT>`.
  The DSH credential store rejects any other key shape at boot, so an invalid ref breaks
  client startup.
- `category: production` triggers the approval gate on management writes.
- `accounts[]` is capped at 50 per host; `loginRecords[]` is capped at 200 per
  environment. Login records may reference a host and an account on that host.
- `accounts[].loginUrl` is the web console entry URL for a management or business login;
  `username` is the login name. It must be an absolute `http(s)` URL. The password is never
  stored here: the UI writes it to the DSH credential service and keeps only `credentialRef`.
- `loginRecords` are audit context, not a replacement for a PAM/SIEM system. Keep only
  the fields needed by DSH; do not copy session recordings or credentials into YAML.
- The panel's batch import writes one node per line as
  `IP,name,roles,port,user`; use `|` or `/` between roles. It creates generic `vm` nodes
  with `access: [ssh]`, never accepts passwords, and leaves Kubernetes/Pod-host
  classification to the node form or YAML.
- Database primary/replica/sharding topology is not modeled in Phase 1. Use the
  `database` role plus a node note; a later schema may add topology metadata.
