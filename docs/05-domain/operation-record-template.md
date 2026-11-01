# Operation Record Template

```ts
interface OperationRecord {
  id: string;
  sessionId: string;
  environmentId: string;
  serviceId?: string;
  deploymentId?: string;
  operation: string;
  skillRef?: string;
  startedAt: string;
  finishedAt?: string;
  outcome: "success" | "failure" | "unknown";
  evidenceRefs: string[];
  summary: string;
}
```

Stored through the memory bridge, not duplicated in this plugin.
