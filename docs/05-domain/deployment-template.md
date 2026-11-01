# Deployment Binding Template

```yaml
id: deploy-001
schemaVersion: 1
environmentId: test-a
serviceId: aicoservice
name: aicoservice-test-a
runtimeMode: kubernetes
location:
  clusterId: k8s-01
  namespace: dv-sop
  workload:
    kind: Deployment
    name: aicoservice
  container: aicoservice
variables:
  replicaCount: 2
ruleProfileRefs:
  - java-common
```
