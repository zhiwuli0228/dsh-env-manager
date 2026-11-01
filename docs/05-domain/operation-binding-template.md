# Operation Binding Template

```yaml
id: binding-001
schemaVersion: 1
operation: redeploy
match:
  serviceId: aicoservice
  deploymentMode: kubernetes
  environmentId: test-a
skill:
  name: redeploy-k8s-service
  expectedSource: null
  expectedDigest: null
parameters:
  namespace: "${deployment.location.namespace}"
  workload: "${deployment.location.workload.name}"
  cluster: "${deployment.location.clusterId}"
policy:
  requiresApproval: true
  allowProduction: false
enabled: true
```
