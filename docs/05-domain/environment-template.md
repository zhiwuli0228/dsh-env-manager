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
    ip: 10.0.1.10
    sshPort: 22
    roles: [management, business]     # co-location: one host, two roles
    credentialRef: cred-test-a-root

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

createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

## Notes

- `id` must match the file name.
- Every `hosts[].roles` value must reference a declared `roles[].id`.
- A host that serves two planes is one entry with two roles; do not duplicate it.
- `endpoints[].hostRef` / `clusterRef` must resolve within this environment.
- `credentialRef` is a reference only; never put a value here.
- `category: production` triggers the approval gate on management writes.
