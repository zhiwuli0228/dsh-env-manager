# DSH Environment Manager Design

## Overview

DSH Environment Manager is a DSH plugin that provides shared enterprise environment and service context to every session in a profile.

It supports:

- Environment, host, cluster and role registry
- Service catalog with Git/artifact metadata
- Deployment bindings across native, Docker and Kubernetes runtimes
- Layered, provenanced rule resolution
- Deterministic operation-to-skill routing
- Optional memory bridge integration

## Architecture Principles

```text
File-based registry is the source of truth.
Skill routing is explicit and conflict-aware.
Credentials are references; values live elsewhere.
Write operations and production access require approval.
Memory stores the lesson; this plugin stores the context.
```

## Overall Architecture

```plantuml
@startuml
title DSH Environment Manager Overall Architecture

actor User
actor "DSH Agent" as Agent

rectangle "DSH Web/Desktop" as UI {
  component "Environment Panel"
  component "Service Catalog Panel"
  component "Deployment Binding Panel"
  component "Rule Profile Editor"
  component "Operation Binding Editor"
  component "Context Preview"
}

rectangle "Host Plugin" as Host {
  component "Tools"
  component "Registry Service"
  component "Context Resolver"
  component "Rule Resolver"
  component "Skill Router"
}

rectangle "File Storage" as FS {
  folder "data/environments"
  folder "data/services"
  folder "data/deployments"
  folder "data/rules"
  folder "data/operations"
}

rectangle "Credential Vault" as Vault {
  component "External Secret Store"
}

rectangle "Memory Plugin" as Memory {
  component "Operation Records"
  component "Observations"
  component "Playbooks"
}

User --> UI
Agent --> Host : invoke tools
UI --> Host
Host --> FS
Host --> Vault : credentialRef only
Host --> Memory : emit / query via bridge

@enduml
```

## Main Flow

### Context Resolution Flow

```text
Agent request
→ Tool validation
→ Load registry files
→ Resolve environment, service, deployment
→ Apply rule layers
→ Build Service Context
→ Return with provenance
```

### Operation Routing Flow

```text
Agent request (environmentId, serviceId, operation)
→ Resolve service context
→ Match operation bindings by priority
→ Detect conflicts
→ Verify skill availability
→ Evaluate approval policy
→ Return skill reference + parameters
```

### Memory Bridge Flow

```text
Operation completes
→ Build Operation Record
→ Sanitize evidence
→ Emit to memory bridge
→ Optionally generate candidate proposal
→ Push proposal to review queue
```

## Key Data Files

Registry:

```text
data/
├── environments/
│   └── {environmentId}.yaml
├── services/
│   └── {serviceId}.yaml
├── deployments/
│   └── {deploymentId}.yaml
├── rules/
│   └── {ruleProfileId}.yaml
└── operations/
    └── {bindingId}.yaml
```

## Security Boundary

- The plugin may only read/write under its configured data directory.
- Credential values must never enter this plugin; only `credentialRef` references are stored.
- Production-flagged operations require explicit user approval before execution.
- Rule templates must not execute arbitrary JavaScript or shell code.
