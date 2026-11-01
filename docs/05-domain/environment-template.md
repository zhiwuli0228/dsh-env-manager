# Environment Template

```yaml
id: test-a
schemaVersion: 1
name: Test Environment A
aliases:
  - test-a
  - ta
category: test
description: Main test environment for aicoservice
hosts:
  - id: host-001
    name: test-a-node-01
    os: ubuntu-22.04
    ip: 10.0.1.10
    sshPort: 22
    roles:
      - management
      - business
clusters:
  - id: k8s-01
    name: test-a-k8s
    apiEndpoint: https://10.0.1.20:6443
    namespaces:
      - dv-sop
endpoints:
  - kind: ssh
    hostRef: host-001
    port: 22
  - kind: web
    url: https://test-a.example.internal
roles:
  - management
  - business
```
