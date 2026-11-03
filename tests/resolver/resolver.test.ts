import { describe, expect, it } from 'vitest'
import {
  binding,
  deployment,
  environment,
  ruleProfile,
  service,
} from '../helpers.js'
import { resolveContext } from '../../src/resolver/resolve.js'
import { resolveOperation } from '../../src/router/router.js'
import type { OperationBinding, ServiceContext } from '../../src/domain/types.js'

function baseInput() {
  return {
    environment: structuredClone(environment) as any,
    service: structuredClone(service) as any,
    deployment: structuredClone(deployment) as any,
    ruleProfiles: new Map([['java-common', structuredClone(ruleProfile) as any]]),
  }
}

function resolve(): ServiceContext {
  const result = resolveContext(baseInput())
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  return result.context
}

describe('resolver', () => {
  it('resolves variables, paths and runtime-specific structured fields', () => {
    const context = resolve()
    expect(context.paths.serviceHome?.value).toBe('/opt/company/services/aicoservice')
    expect(context.paths.jar?.value).toBe(
      '/opt/company/services/aicoservice/lib/aicoservice.jar',
    )
    expect(context.paths.applicationLog?.value).toBe(
      '/opt/company/services/aicoservice/logs/aicoservice.log',
    )
    expect(context.logSource?.value).toEqual({
      kind: 'pod-logs',
      namespace: 'dv-sop',
      workload: 'aicoservice',
    })
    expect(context.classLocation).toBeUndefined()
    expect(context.variables.replicaCount?.value).toBe(2)
    expect(context.status).toBe('configured-not-verified')
  })

  it('records provenance and shadowed layers', () => {
    const input = baseInput()
    input.environment.ruleOverrides = { variables: { installRoot: '/srv/apps' } }
    const result = resolveContext(input)
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    const home = result.context.paths.serviceHome!
    expect(home.value).toBe('/srv/apps/aicoservice')
    expect(home.provenance.definedBy.layer).toBe('service')
    expect(home.provenance.shadowed).toEqual([])
    expect(home.provenance.inputs).toContainEqual(
      expect.objectContaining({ name: 'installRoot', source: expect.objectContaining({ layer: 'environment' }) }),
    )
  })

  it('detects a cycle', () => {
    const input = baseInput()
    input.service.ruleProfileRefs = ['cycle']
    input.ruleProfiles.set('cycle', {
      id: 'cycle',
      schemaVersion: 1,
      variables: { a: '${b}', b: '${a}' },
      createdAt: '2026-11-01T03:00:00.000Z',
      updatedAt: '2026-11-01T03:00:00.000Z',
    } as any)
    const result = resolveContext(input)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.diagnostics.some((item) => item.code === 'RULE_CYCLE')).toBe(true)
    }
  })

  it('rejects undefined variables and path traversal', () => {
    const input = baseInput()
    input.environment.ruleOverrides = {
      variables: { bad: '${does.not.exist}' },
      paths: { escape: '${variables.installRoot}/../../etc' },
    }
    const result = resolveContext(input)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const codes = result.diagnostics.map((item) => item.code)
      expect(codes).toContain('RULE_UNDEFINED_VARIABLE')
    }
  })

  it('rejects path traversal in a resolved path', () => {
    const input = baseInput()
    input.environment.ruleOverrides = {
      variables: { installRoot: '../../etc' },
      paths: { escape: '${installRoot}/passwd' },
    }
    const result = resolveContext(input)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.diagnostics.some((item) => item.code === 'RULE_PATH_TRAVERSAL')).toBe(true)
    }
  })

  it('rejects a malformed template', () => {
    const input = baseInput()
    input.environment.ruleOverrides = { paths: { broken: '${unterminated' } }
    const result = resolveContext(input)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.diagnostics.some((item) => item.code === 'RULE_TEMPLATE_INVALID')).toBe(true)
    }
  })

  it('applies deployment variables after environment overrides', () => {
    const input = baseInput()
    input.environment.ruleOverrides = { variables: { installRoot: '/env' } }
    input.deployment.variables = { installRoot: '/deployment' }
    const result = resolveContext(input)
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    expect(result.context.paths.serviceHome!.value).toBe('/deployment/aicoservice')
  })

  it('resolves a service-level context without an environment or deployment', () => {
    const input = baseInput()
    delete input.environment
    delete input.deployment
    const result = resolveContext(input)
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    const context = result.context
    expect(context.environmentId).toBeUndefined()
    expect(context.environmentName).toBeUndefined()
    expect(context.deploymentId).toBeUndefined()
    expect(context.runtimeMode).toBeUndefined()
    expect(context.location).toBeUndefined()
    expect(context.logSource).toBeUndefined()
    expect(context.paths.serviceHome?.value).toBe('/opt/company/services/aicoservice')
    expect(context.paths.jar?.value).toBe(
      '/opt/company/services/aicoservice/lib/aicoservice.jar',
    )
  })

  it('applies the environment layer without a deployment', () => {
    const input = baseInput()
    delete input.deployment
    input.environment.ruleOverrides = { variables: { installRoot: '/srv/apps' } }
    const result = resolveContext(input)
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    const context = result.context
    expect(context.environmentId).toBe('test-a')
    expect(context.deploymentId).toBeUndefined()
    expect(context.runtimeMode).toBeUndefined()
    expect(context.paths.serviceHome!.value).toBe('/srv/apps/aicoservice')
    expect(context.paths.serviceHome!.provenance.inputs).toContainEqual(
      expect.objectContaining({
        name: 'installRoot',
        source: expect.objectContaining({ layer: 'environment' }),
      }),
    )
  })
})

describe('router', () => {
  const skills = {
    async snapshot() {
      return {
        complete: true,
        skills: [{ name: 'redeploy-k8s-service', source: 'project-dsh', provider: 'bundled' }],
      }
    },
  }

  it('selects the environment-service binding and resolves parameters', async () => {
    const context = resolve()
    const resolution = await resolveOperation({
      operation: 'redeploy',
      context,
      bindings: [structuredClone(binding) as unknown as OperationBinding],
      skills,
    })
    expect(resolution.ok).toBe(true)
    expect(resolution.matchLevel).toBe('environment-service')
    expect(resolution.parameters).toMatchObject({
      namespace: 'dv-sop',
      workload: 'aicoservice',
      home: '/opt/company/services/aicoservice',
    })
    expect(resolution.policy?.requiresApproval).toBe(true)
  })

  it('prefers a deployment-level binding over environment-service', async () => {
    const context = resolve()
    const deploymentLevel = {
      ...structuredClone(binding),
      id: 'binding-002',
      match: { deploymentId: 'deploy-001' },
    } as unknown as OperationBinding
    const resolution = await resolveOperation({
      operation: 'redeploy',
      context,
      bindings: [structuredClone(binding) as unknown as OperationBinding, deploymentLevel],
      skills,
    })
    expect(resolution.matchedBindingId).toBe('binding-002')
    expect(resolution.matchLevel).toBe('deployment')
  })

  it('reports same-level conflicts', async () => {
    const context = resolve()
    const second = { ...structuredClone(binding), id: 'binding-002' } as unknown as OperationBinding
    const resolution = await resolveOperation({
      operation: 'redeploy',
      context,
      bindings: [structuredClone(binding) as unknown as OperationBinding, second],
      skills,
    })
    expect(resolution.ok).toBe(false)
    expect(resolution.diagnostics[0]?.code).toBe('BINDING_CONFLICT')
  })

  it('fails closed when the Skill is missing', async () => {
    const context = resolve()
    const resolution = await resolveOperation({
      operation: 'redeploy',
      context,
      bindings: [structuredClone(binding) as unknown as OperationBinding],
      skills: { async snapshot() { return { complete: true, skills: [] } } },
    })
    expect(resolution.ok).toBe(false)
    expect(resolution.diagnostics[0]?.code).toBe('SKILL_UNAVAILABLE')
  })

  it('denies production unless allowProduction is true', async () => {
    const context = { ...resolve(), environmentCategory: 'production' as const }
    const resolution = await resolveOperation({
      operation: 'redeploy',
      context,
      bindings: [structuredClone(binding) as unknown as OperationBinding],
      skills,
    })
    expect(resolution.ok).toBe(false)
    expect(resolution.diagnostics.some((item) => item.code === 'POLICY_DENIED')).toBe(true)
  })

  function serviceOnlyContext(): ServiceContext {
    const result = resolveContext({
      service: structuredClone(service) as any,
      ruleProfiles: new Map([['java-common', structuredClone(ruleProfile) as any]]),
    })
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    return result.context
  }

  it('routes a service-level binding from an environment-less context', async () => {
    const serviceLevel = {
      ...structuredClone(binding),
      id: 'binding-svc',
      operation: 'redeploy',
      match: { serviceId: 'aicoservice' },
      parameters: { home: '${paths.serviceHome}' },
    } as unknown as OperationBinding
    const resolution = await resolveOperation({
      operation: 'redeploy',
      context: serviceOnlyContext(),
      bindings: [serviceLevel],
      skills,
    })
    expect(resolution.ok).toBe(true)
    expect(resolution.matchLevel).toBe('service')
    expect(resolution.requested.environmentId).toBeUndefined()
    expect(resolution.parameters).toMatchObject({ home: '/opt/company/services/aicoservice' })
  })

  it('keeps environment-scoped bindings ineligible without an environment context', async () => {
    const resolution = await resolveOperation({
      operation: 'redeploy',
      context: serviceOnlyContext(),
      bindings: [structuredClone(binding) as unknown as OperationBinding],
      skills,
    })
    expect(resolution.ok).toBe(false)
    expect(resolution.diagnostics[0]?.code).toBe('BINDING_NOT_FOUND')
  })

  it('matches a global binding from an environment-less context', async () => {
    const globalBinding = {
      ...structuredClone(binding),
      id: 'binding-global',
      operation: 'restart',
      match: {},
      parameters: { home: '${paths.serviceHome}' },
    } as unknown as OperationBinding
    const resolution = await resolveOperation({
      operation: 'restart',
      context: serviceOnlyContext(),
      bindings: [globalBinding],
      skills,
    })
    expect(resolution.ok).toBe(true)
    expect(resolution.matchLevel).toBe('global')
  })

  it('skips and reports the production check without an environment context', async () => {
    const globalBinding = {
      ...structuredClone(binding),
      id: 'binding-global',
      operation: 'deploy',
      match: {},
      parameters: { home: '${paths.serviceHome}' },
      policy: { requiresApproval: true, allowProduction: false },
    } as unknown as OperationBinding
    const resolution = await resolveOperation({
      operation: 'deploy',
      context: serviceOnlyContext(),
      bindings: [globalBinding],
      skills,
    })
    expect(resolution.ok, JSON.stringify(resolution)).toBe(true)
    expect(
      resolution.diagnostics.some((item) => item.code === 'PRODUCTION_CHECK_SKIPPED'),
    ).toBe(true)
  })
})
