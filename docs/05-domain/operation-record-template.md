# Operation Record Template

P1 artifact. V1 defines the type and a null bridge; it does not persist records.

```ts
interface OperationRecord {
  id: string;
  sessionId: string;
  environmentId?: string;   // absent when the operation was routed at service level
  serviceId?: string;
  deploymentId?: string;
  operation: string;
  skillRef?: string;
  startedAt: string;
  finishedAt?: string;
  outcome: 'success' | 'failure' | 'unknown';
  evidenceRefs: string[];
  summary: string;
}
```

## JSON example

```json
{
  "id": "op-20261101-0001",
  "sessionId": "session-abc",
  "environmentId": "test-a",
  "serviceId": "aicoservice",
  "deploymentId": "deploy-001",
  "operation": "redeploy",
  "skillRef": "redeploy-k8s-service",
  "startedAt": "2026-11-01T03:00:00.000Z",
  "finishedAt": "2026-11-01T03:04:12.000Z",
  "outcome": "success",
  "evidenceRefs": ["evidence:test-a/deploy-001/log-20261101"],
  "summary": "Redeploy completed; pod rollout finished with 2/2 ready"
}
```

## Rules

- `evidenceRefs` are opaque and sanitized; never embed raw logs or secrets.
- `summary` is redacted and bounded (default 500 characters).
- The record carries scope ids so memory queries stay scoped.
- Records are append-only from the plugin's perspective.
- A record is not an audit replacement for the executing tool's own logging.

## Evidence reference format

```text
evidence:{environmentId}/{deploymentId}/{kind}-{timestamp}
```

`kind` is a short token such as `log`, `config` or `check`. The content lives outside the record.
