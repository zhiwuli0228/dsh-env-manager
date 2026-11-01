import type { Diagnostic, RecordKind, RegistrySnapshot } from '../domain/types.js'

function diag(
  code: string,
  message: string,
  extra: { file?: string; path?: string; details?: Record<string, unknown> } = {},
): Diagnostic {
  return { code, severity: 'warning', message, ...extra }
}

/** Referential checks over a loaded snapshot. Broken references are diagnostics. */
export function checkIntegrity(snapshot: RegistrySnapshot): Diagnostic[] {
  const out: Diagnostic[] = []
  const environmentIds = new Set(snapshot.environments.keys())
  const serviceIds = new Set(snapshot.services.keys())
  const deploymentIds = new Set(snapshot.deployments.keys())

  for (const service of snapshot.services.values()) {
    for (const ref of service.ruleProfileRefs) {
      if (!snapshot.ruleProfiles.has(ref)) {
        out.push(
          diag('RULE_PROFILE_NOT_FOUND', `Service ${service.id} references missing rule profile ${ref}`, {
            file: `services/${service.id}.yaml`,
            path: 'ruleProfileRefs',
          }),
        )
      }
    }
  }

  for (const deployment of snapshot.deployments.values()) {
    const file = `deployments/${deployment.id}.yaml`
    if (!environmentIds.has(deployment.environmentId)) {
      out.push(
        diag('ENV_NOT_FOUND', `Deployment ${deployment.id} references missing environment ${deployment.environmentId}`, {
          file,
          path: 'environmentId',
        }),
      )
      continue
    }
    if (!serviceIds.has(deployment.serviceId)) {
      out.push(
        diag('SERVICE_NOT_FOUND', `Deployment ${deployment.id} references missing service ${deployment.serviceId}`, {
          file,
          path: 'serviceId',
        }),
      )
    } else {
      const service = snapshot.services.get(deployment.serviceId)
      if (service && !service.deployModes.includes(deployment.runtimeMode)) {
        out.push(
          diag(
            'RECORD_INVALID',
            `Service ${service.id} does not list deploy mode ${deployment.runtimeMode}`,
            { file, path: 'runtimeMode' },
          ),
        )
      }
    }
    const environment = snapshot.environments.get(deployment.environmentId)
    if (environment) {
      const location = deployment.location
      if ('hostRef' in location) {
        const host = environment.hosts.find((item) => item.id === location.hostRef)
        if (!host) {
          out.push(
            diag('HOST_NOT_FOUND', `Deployment ${deployment.id} references missing host ${location.hostRef}`, {
              file,
              path: 'location.hostRef',
            }),
          )
        }
      }
      if ('clusterRef' in location) {
        const cluster = environment.clusters.find((item) => item.id === location.clusterRef)
        if (!cluster) {
          out.push(
            diag(
              'CLUSTER_NOT_FOUND',
              `Deployment ${deployment.id} references missing cluster ${location.clusterRef}`,
              { file, path: 'location.clusterRef' },
            ),
          )
        }
      }
    }
  }

  for (const binding of snapshot.operationBindings.values()) {
    const file = `operations/${binding.id}.yaml`
    const match = binding.match
    if (match.environmentId && !environmentIds.has(match.environmentId)) {
      out.push(
        diag('ENV_NOT_FOUND', `Binding ${binding.id} references missing environment ${match.environmentId}`, {
          file,
          path: 'match.environmentId',
        }),
      )
    }
    if (match.serviceId && !serviceIds.has(match.serviceId)) {
      out.push(
        diag('SERVICE_NOT_FOUND', `Binding ${binding.id} references missing service ${match.serviceId}`, {
          file,
          path: 'match.serviceId',
        }),
      )
    }
    if (match.deploymentId && !deploymentIds.has(match.deploymentId)) {
      out.push(
        diag('DEPLOYMENT_NOT_FOUND', `Binding ${binding.id} references missing deployment ${match.deploymentId}`, {
          file,
          path: 'match.deploymentId',
        }),
      )
    }
  }

  return out
}

export interface Referrer {
  kind: RecordKind
  id: string
  field: string
}

/** Records that point at `kind/id`, used to block a delete. */
export function findReferences(
  snapshot: RegistrySnapshot,
  kind: RecordKind,
  id: string,
): Referrer[] {
  const refs: Referrer[] = []
  switch (kind) {
    case 'environment':
      for (const deployment of snapshot.deployments.values()) {
        if (deployment.environmentId === id) {
          refs.push({ kind: 'deployment', id: deployment.id, field: 'environmentId' })
        }
      }
      for (const binding of snapshot.operationBindings.values()) {
        if (binding.match.environmentId === id) {
          refs.push({ kind: 'operationBinding', id: binding.id, field: 'match.environmentId' })
        }
      }
      break
    case 'service':
      for (const deployment of snapshot.deployments.values()) {
        if (deployment.serviceId === id) {
          refs.push({ kind: 'deployment', id: deployment.id, field: 'serviceId' })
        }
      }
      for (const binding of snapshot.operationBindings.values()) {
        if (binding.match.serviceId === id) {
          refs.push({ kind: 'operationBinding', id: binding.id, field: 'match.serviceId' })
        }
      }
      break
    case 'deployment':
      for (const binding of snapshot.operationBindings.values()) {
        if (binding.match.deploymentId === id) {
          refs.push({ kind: 'operationBinding', id: binding.id, field: 'match.deploymentId' })
        }
      }
      break
    case 'ruleProfile':
      for (const service of snapshot.services.values()) {
        if (service.ruleProfileRefs.includes(id)) {
          refs.push({ kind: 'service', id: service.id, field: 'ruleProfileRefs' })
        }
      }
      break
    case 'operationBinding':
      break
  }
  return refs
}
