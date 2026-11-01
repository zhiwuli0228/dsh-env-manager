# Service Template

```yaml
id: aicoservice
schemaVersion: 1
name: Aico Service
aliases:
  - aicoservice
category: backend
description: Core AI coordination service
git:
  url: https://git.example.internal/team/aicoservice.git
  defaultBranch: main
  modulePath: /
artifact:
  name: aicoservice.jar
  buildTool: maven
  deployModes:
    - native
    - docker
    - kubernetes
ruleProfileRefs:
  - java-common
  - company-default
```
