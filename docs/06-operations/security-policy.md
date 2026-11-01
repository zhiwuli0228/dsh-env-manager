# Security Policy (Operations)

Operational rules for users and agents. Design rationale is in
[security-model.md](../01-architecture/security-model.md).

---

## 1. Credentials

1. Every host, cluster, endpoint and future adapter uses a `credentialRef`.
2. Never write a password, token, private key or kubeconfig into a registry file, a test fixture or a Git commit.
3. The plugin reports only `configured`, `missing` or `unavailable`.
4. If a credential is missing, fix the reference; do not paste the value into the registry.

## 2. Production changes

1. `category: production` environments are gated.
2. Operation bindings that target production must set `allowProduction: true` explicitly; otherwise routing fails.
3. Management writes that affect production records require approval when performed by
   the Agent.
4. The UI writes as actor `'ui'` and is denied for production records unless
   `writePolicy.allowUiProductionWrites` is enabled.
5. A denied approval is final for that attempt; nothing is written.

## 3. Rule templates

1. Only `${...}` interpolation is allowed.
2. Do not attempt to inject JavaScript, shell or environment lookups. They are rejected.
3. If a path must differ per environment, use an override, not a new template language feature.
4. Review rule profiles that resolve to sensitive directories. V1 does not read them, but future adapters will.

## 4. Data handling

1. `data/` is git-ignored. Do not commit registry data.
2. Do not place real internal hostnames, IPs or URLs in `tests/fixtures/`.
3. Redact command output and evidence before recording it.
4. Keep summaries short; evidence lives behind opaque references.

## 5. Sharing and scope

1. Registry data is profile-global. Treat it as internal documentation.
2. Session defaults are per session. Do not design flows that rely on a global default.
3. Memory entries must carry environment/service/deployment scope.
4. A conclusion from one environment is not a global rule.

## 6. Incident handling

If a secret is committed by mistake:

1. Rotate the secret immediately.
2. Remove it from Git history, not only from the working tree.
3. Record the incident outside this repository.
4. Add a check or test that would have caught it.
