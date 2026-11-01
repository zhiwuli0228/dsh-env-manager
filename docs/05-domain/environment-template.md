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

hosts:
  - id: host-001
    name: test-a-node-01
    os: ubuntu-22.04
    platform: Linux / x86_64
    ip: 10.0.1.10
    sshPort: 22
    roles: [management, business]     # co-location: one host, two roles
    adminUser: root
    isActive: true
    credentialRef: cred-test-a-root
    accounts:
      - id: root
        username: root
        purpose: system administration
        protocol: ssh
        port: 22
        authType: private-key
        credentialRef: cred-test-a-root
        lastLoginAt: 2026-10-31T08:12:00.000Z
        lastLoginFrom: 10.0.8.21

clusters:
  - id: k8s-01
    name: test-a-k8s
    kind: kubernetes
    apiEndpoint: https://10.0.1.20:6443
    namespaces: [dv-sop]
    credentialRef: cred-test-a-kubeconfig

endpoints:
  - id: ep-ssh-01
    kind: ssh
    hostRef: host-001
    port: 22
    credentialRef: cred-test-a-root
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
- Every `hosts[].roles` value must reference a declared `roles[].id`.
- A host that serves two planes is one entry with two roles; do not duplicate it.
- `endpoints[].hostRef` / `clusterRef` must resolve within this environment.
- `credentialRef` is a reference only; never put a value here. The same rule applies to
  every `accounts[].credentialRef`.
- `category: production` triggers the approval gate on management writes.
- `accounts[]` is capped at 50 per host; `loginRecords[]` is capped at 200 per
  environment. Login records may reference a host and an account on that host.
- `loginRecords` are audit context, not a replacement for a PAM/SIEM system. Keep only
  the fields needed by DSH; do not copy session recordings or credentials into YAML.
