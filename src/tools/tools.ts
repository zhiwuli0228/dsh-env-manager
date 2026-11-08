import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { App } from '../app/app.js'
import { EnvManagerError, asEnvManagerError } from '../domain/errors.js'
import { ENVIRONMENT_SCOPED_OPERATIONS, RECORD_KINDS, isRecordKind } from '../domain/constants.js'
import type { Diagnostic, RecordKind, SessionContext } from '../domain/types.js'

const kindProperty = {
  type: 'string',
  enum: RECORD_KINDS,
  description: 'Record kind.',
} as const

function text(value: string): ContentBlock[] {
  return [{ type: 'text', text: value }]
}

function diagnosticsSchema() {
  return {
    type: 'array',
    items: { type: 'json', description: 'Diagnostic with code, severity and message.' },
  } as const
}

function sessionOutputSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      sessionId: { type: 'string', required: true, description: 'Calling session id.' },
      defaultEnvironmentId: {
        oneOf: [{ type: 'string' }, { type: 'null' }],
        required: true,
        description: 'Default environment, or null.',
      },
      persisted: { type: 'boolean', required: true, description: 'Whether the value is on disk.' },
    },
  } as const
}

function warningsSchema() {
  return diagnosticsSchema()
}

async function approval(
  ctx: any,
  exec: any,
  toolName: string,
  reason: string,
): Promise<void> {
  const agent = exec.agent
  if (!agent) {
    throw new EnvManagerError(
      'SESSION_CONTEXT_UNAVAILABLE',
      'This operation requires a session-scoped agent',
    )
  }
  const service = ctx.get('approval')
  if (!service) {
    throw new EnvManagerError('POLICY_DENIED', 'Approval service is unavailable; failing closed')
  }
  let outcome: string
  try {
    outcome = await service.request({
      agent,
      toolName,
      callId: exec.callId,
      reason,
      displayReason: { en: reason, zh: reason },
      signal: exec.signal,
    })
  } catch (error) {
    throw new EnvManagerError(
      'POLICY_DENIED',
      `Approval could not be requested: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (outcome !== 'allowed-once') {
    throw new EnvManagerError('POLICY_DENIED', `Approval ${outcome}`, { outcome })
  }
}

function sessionIdOf(exec: any): string {
  const agent = exec.agent
  if (!agent) {
    throw new EnvManagerError(
      'SESSION_CONTEXT_UNAVAILABLE',
      'This operation requires a session-scoped agent',
    )
  }
  const id = agent.session?.header?.id ?? agent.id
  if (!id) {
    throw new EnvManagerError('SESSION_CONTEXT_UNAVAILABLE', 'The calling agent has no session id')
  }
  return String(id)
}

function sessionValue(context: SessionContext) {
  return {
    sessionId: context.sessionId,
    defaultEnvironmentId: context.defaultEnvironmentId,
    persisted: context.persisted,
  }
}

export interface ToolRuntimeOptions {
  ctx: any
  app: App
  defaults: { environmentId?: string }
  writePolicy: {
    requireApprovalForDelete: boolean
    requireApprovalForProductionSave: boolean
  }
}

export function createToolDefinitions(options: ToolRuntimeOptions): ToolDefinition[] {
  const { ctx, app, defaults, writePolicy } = options

  async function environmentIdFor(
    exec: any,
    explicit?: string,
  ): Promise<string | undefined> {
    if (explicit) return explicit
    const context = await app.getContext(sessionIdOf(exec))
    if (context.defaultEnvironmentId) return context.defaultEnvironmentId
    if (defaults.environmentId) return defaults.environmentId
    return undefined
  }

  const envList = defineTool({
    name: 'env_list',
    description:
      'Use when the caller needs an inventory or wants to discover record ids before a specific call.',
    parameters: {
      kind: {
        type: 'string',
        enum: RECORD_KINDS,
        description: 'Limit the list to one record kind.',
      },
      query: {
        type: 'string',
        description: 'Case-insensitive filter over id and name.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          items: { type: 'array', items: { type: 'json' }, required: true },
          warnings: { ...diagnosticsSchema(), required: true },
        },
      },
      render: (_args, value) => {
        const items = (value as unknown as { items: Array<{ kind: string; id: string }> }).items
        return text(`${items.length} record(s): ${items.slice(0, 8).map((item) => `${item.kind}/${item.id}`).join(', ')}${items.length > 8 ? ', …' : ''}`)
      },
    },
    async execute(args: any): Promise<any> {
      try {
        const kinds: RecordKind[] = args.kind ? [args.kind as RecordKind] : [...RECORD_KINDS]
        const items = []
        const warnings: Diagnostic[] = []
        for (const kind of kinds) {
          const result = await app.list(kind)
          const needle = args.query ? String(args.query).toLowerCase() : ''
          items.push(
            ...result.items.filter(
              (item) => !needle || item.id.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle),
            ),
          )
          warnings.push(...result.warnings)
        }
        items.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id))
        return { items, warnings: warnings.slice(0, 20) }
      } catch (error) {
        throw asEnvManagerError(error)
      }
    },
  })

  const envGet = defineTool({
    name: 'env_get',
    description: 'Use when the caller already has an id and needs the full record and its YAML.',
    parameters: {
      kind: { ...kindProperty, required: true },
      id: { type: 'string', required: true, description: 'Record id, e.g. test-a.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          record: { type: 'json', required: true },
          yaml: { type: 'string', required: true },
        },
      },
      render: (_args, value) => {
        const result = value as { record: { id: string; kind?: string }; yaml: string }
        return text(`Record ${result.record.id}: ${result.yaml.length} bytes of YAML.`)
      },
    },
    async execute(args: any): Promise<any> {
      try {
        return await app.get(args.kind, args.id)
      } catch (error) {
        throw asEnvManagerError(error)
      }
    },
  })

  const envFind = defineTool({
    name: 'env_find',
    description: 'Use when the caller has a name or fragment and wants candidate ids; prefer this over guessing an id.',
    parameters: {
      query: { type: 'string', required: true, description: 'Name, id or fragment.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          hits: { type: 'array', items: { type: 'json' }, required: true },
        },
      },
      render: (_args, value) => {
        const hits = (value as { hits: Array<{ kind: string; id: string }> }).hits
        return text(hits.length ? `${hits.length} match(es): ${hits.map((hit) => `${hit.kind}/${hit.id}`).join(', ')}` : 'No matches.')
      },
    },
    async execute(args: any): Promise<any> {
      try {
        return await app.find(args.query)
      } catch (error) {
        throw asEnvManagerError(error)
      }
    },
  })

  const envResolve = defineTool({
    name: 'env_resolve',
    description:
      'Use when the caller needs concrete paths, log sources, class locations or variables for a service. This is the authoritative answer; never reconstruct paths from templates. An environment is optional: without one the result is the service-level context (service and global rule layers only).',
    parameters: {
      environmentId: {
        type: 'string',
        description: 'Optional; defaults to the session environment. Omit to resolve the service-level context.',
      },
      serviceId: { type: 'string', required: true, description: 'Service id or alias.' },
      deploymentId: { type: 'string', description: 'Optional; selects one deployment and its environment.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          context: { type: 'json', required: true },
          warnings: { ...warningsSchema(), required: true },
        },
      },
      render: (_args, value) => {
        const result = value as {
          context: { serviceId: string; environmentId?: string; runtimeMode?: string; paths: object; variables: object }
          warnings: unknown[]
        }
        const scope = result.context.environmentId ? ` in ${result.context.environmentId}` : ''
        const mode = result.context.runtimeMode ? ` (${result.context.runtimeMode})` : ''
        return text(
          `Resolved ${result.context.serviceId}${scope}${mode}: ${Object.keys(result.context.paths).length} paths, ${Object.keys(result.context.variables).length} variables, ${result.warnings.length} warning(s).`,
        )
      },
    },
    async execute(args: any, exec: any): Promise<any> {
      try {
        const environmentId = await environmentIdFor(exec, args.environmentId)
        const resolved = await app.resolve({
          environmentId,
          serviceId: args.serviceId,
          deploymentId: args.deploymentId,
        })
        return { context: resolved.context, warnings: resolved.warnings }
      } catch (error) {
        throw asEnvManagerError(error)
      }
    },
  })

  const envResolveOperation = defineTool({
    name: 'env_resolve_operation',
    description:
      'Use before acting: ask which Skill or execute target handles an operation for this context and what parameters it expects. This tool does not execute anything. Operations always run inside an environment: select one first (env_set_context or environmentId); without an environment routing fails instead of downgrading to a lower binding. Related experiences (lessons/summaries) come back so past successes and failures inform the run.',
    parameters: {
      operation: { type: 'string', required: true, description: 'Standard or custom operation id.' },
      environmentId: {
        type: 'string',
        description: 'Defaults to the session environment; required unless deploymentId supplies one.',
      },
      serviceId: { type: 'string', description: 'Service id; required unless the operation is environment-scoped (e.g. deploy-environment) or deploymentId supplies one.' },
      deploymentId: { type: 'string', description: 'Deployment id; supplies the service and environment when omitted.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          resolution: { type: 'json', required: true },
        },
      },
      render: (_args, value) => {
        const resolution = (value as {
          resolution: {
            operation: string
            matchedBindingId?: string
            target?: { mode: string }
            skill?: { name: string; available: boolean | string }
            experiences?: Array<{ kind: string; title: string }>
          }
        }).resolution
        const mode = resolution.target?.mode ?? 'skill'
        const skill = resolution.skill ? ` skill ${resolution.skill.name} (available: ${String(resolution.skill.available)})` : ''
        const lessons = (resolution.experiences ?? []).length
        return text(
          `${resolution.operation}: binding ${resolution.matchedBindingId ?? 'none'}, target ${mode}${skill}, ${lessons} related experience(s).`,
        )
      },
    },
    async execute(args: any, exec: any): Promise<any> {
      try {
        const environmentScoped = ENVIRONMENT_SCOPED_OPERATIONS.has(args.operation)
        if (!args.serviceId && !args.deploymentId && !environmentScoped) {
          throw new EnvManagerError(
            'INVALID_ARGUMENT',
            'Pass serviceId or deploymentId so the operation can be bound to a service',
          )
        }
        const environmentId = await environmentIdFor(exec, args.environmentId)
        const resolution = await app.route({
          operation: args.operation,
          environmentId,
          serviceId: args.serviceId,
          deploymentId: args.deploymentId,
        })
        return { resolution }
      } catch (error) {
        throw asEnvManagerError(error)
      }
    },
  })

  const envGetContext = defineTool({
    name: 'env_get_context',
    description: 'Use to check what environment the current session defaults to.',
    parameters: {},
    output: {
      schema: sessionOutputSchema(),
      render: (_args, value) => {
        const context = value as SessionContext
        return text(
          context.defaultEnvironmentId
            ? `Session default: ${context.defaultEnvironmentId}.`
            : 'Session default: none.',
        )
      },
    },
    async execute(_args: unknown, exec: any): Promise<any> {
      try {
        const context = await app.getContext(sessionIdOf(exec))
        return sessionValue(context)
      } catch (error) {
        throw asEnvManagerError(error)
      }
    },
  })

  const envSetContext = defineTool({
    name: 'env_set_context',
    description:
      'Use when the user says to work on an environment and later calls should omit environmentId. Passing null clears the default.',
    parameters: {
      environmentId: {
        oneOf: [{ type: 'string' }, { type: 'null' }],
        required: true,
        description: 'Environment id, or null to clear.',
      },
    },
    output: {
      schema: sessionOutputSchema(),
      render: (_args, value) => {
        const context = value as SessionContext
        return text(
          context.defaultEnvironmentId
            ? `Session default set to ${context.defaultEnvironmentId}.`
            : 'Session default cleared.',
        )
      },
    },
    async execute(args: any, exec: any): Promise<any> {
      try {
        const sessionId = sessionIdOf(exec)
        const context = await app.setContext(sessionId, args.environmentId)
        return sessionValue(context)
      } catch (error) {
        throw asEnvManagerError(error)
      }
    },
  })

  const envSave = defineTool({
    name: 'env_save',
    description:
      'Use to create or replace a record. Prefer env_get first, edit the YAML, then save the whole record; never send a partial patch.',
    parameters: {
      kind: { ...kindProperty, required: true },
      record: { type: 'json', required: true, description: 'Complete record object.' },
      dryRun: { type: 'boolean', description: 'Validate without writing.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', required: true },
          kind: { type: 'string', required: true },
          created: { type: 'boolean', required: true },
          dryRun: { type: 'boolean', required: true },
          warnings: { ...warningsSchema(), required: true },
        },
      },
      render: (_args, value) => {
        const result = value as { id: string; kind: string; created: boolean; dryRun: boolean }
        return text(
          `${result.dryRun ? 'Validated' : result.created ? 'Created' : 'Updated'} ${result.kind} ${result.id}.`,
        )
      },
    },
    async execute(args: any, exec: any): Promise<any> {
      try {
        if (!isRecordKind(args.kind)) {
          throw new EnvManagerError('INVALID_ARGUMENT', `Unknown record kind "${args.kind}"`)
        }
        if (
          writePolicy.requireApprovalForProductionSave &&
          (await app.needsProductionApproval(args.kind, args.record))
        ) {
          await approval(
            ctx,
            exec,
            'env_save',
            `Write production record ${args.record?.id ?? '(new)'}`,
          )
        }
        return await app.save(args.kind, args.record, {
          dryRun: Boolean(args.dryRun),
          actor: 'agent',
        })
      } catch (error) {
        throw asEnvManagerError(error)
      }
    },
  })

  const envDelete = defineTool({
    name: 'env_delete',
    description: 'Use only when the user explicitly asks to remove a record.',
    parameters: {
      kind: { ...kindProperty, required: true },
      id: { type: 'string', required: true, description: 'Record id.' },
      confirm: {
        type: 'boolean',
        required: true,
        description: 'true deletes after approval; false only reports blockers.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', required: true },
          kind: { type: 'string', required: true },
          deleted: { type: 'boolean', required: true },
          blockers: { ...diagnosticsSchema(), required: true },
        },
      },
      render: (_args, value) => {
        const result = value as { id: string; kind: string; deleted: boolean; blockers: unknown[] }
        return text(
          result.deleted
            ? `Deleted ${result.kind} ${result.id} (backup kept).`
            : `${result.kind} ${result.id} not deleted; ${result.blockers.length} blocker(s).`,
        )
      },
    },
    async execute(args: any, exec: any): Promise<any> {
      try {
        if (!args.confirm) {
          return await app.remove(args.kind, args.id, 'agent', { dryRun: true })
        }
        if (writePolicy.requireApprovalForDelete) {
          await approval(ctx, exec, 'env_delete', `Delete ${args.kind} ${args.id}`)
        }
        return await app.remove(args.kind, args.id, 'agent')
      } catch (error) {
        throw asEnvManagerError(error)
      }
    },
  })

  const envValidate = defineTool({
    name: 'env_validate',
    description: 'Use after hand-editing YAML or before trusting a resolve result.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          counts: { type: 'json', required: true },
          diagnostics: { ...diagnosticsSchema(), required: true },
        },
      },
      render: (_args, value) => {
        const report = value as { ok: boolean; diagnostics: unknown[] }
        return text(
          report.ok
            ? `Registry valid; ${report.diagnostics.length} diagnostic(s).`
            : `Registry invalid; ${report.diagnostics.length} diagnostic(s).`,
        )
      },
    },
    async execute(): Promise<any> {
      try {
        const report = await app.validate()
        return {
          ok: report.ok,
          counts: {
            environment: report.counts.environments ?? 0,
            service: report.counts.services ?? 0,
            deployment: report.counts.deployments ?? 0,
            ruleProfile: report.counts.ruleProfiles ?? 0,
            operationBinding: report.counts.operationBindings ?? 0,
            drGroup: report.counts.drGroups ?? 0,
          },
          diagnostics: report.diagnostics,
        }
      } catch (error) {
        throw asEnvManagerError(error)
      }
    },
  })

  const envOperate = defineTool({
    name: 'env_operate',
    description:
      'Execute the bound target for an operation inside the selected environment. Skill targets return prepared (invoke the Skill yourself); local commands and scripts run as a bounded process; remote targets return a prepared ssh command descriptor. Write operations require approval: pass confirm: true only after the user agrees. Every completed run writes an experience into the review queue (success → summary, failure → lesson), and later routes surface related experiences.',
    parameters: {
      operation: { type: 'string', required: true, description: 'Standard or custom operation id.' },
      environmentId: {
        type: 'string',
        description: 'Defaults to the session environment; required unless deploymentId supplies one.',
      },
      serviceId: { type: 'string', description: 'Service id; required unless the operation is environment-scoped or deploymentId supplies one.' },
      deploymentId: { type: 'string', description: 'Deployment id; supplies the service and environment when omitted.' },
      confirm: {
        type: 'boolean',
        description: 'true only after the user approved a gated (write) execution.',
      },
      dryRun: { type: 'boolean', description: 'Resolve and gate but run nothing.' },
      note: { type: 'string', description: 'Optional note stored with the experience record.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          resolution: { type: 'json', required: true },
          execution: { type: 'json', required: true },
          experience: { type: 'json', description: 'Written when the target completed or failed.' },
          warnings: { ...warningsSchema(), required: true },
        },
      },
      render: (_args, value) => {
        const result = value as unknown as {
          execution: { status: string; exitCode?: number; prepared?: { kind?: string } }
          experience?: { kind: string; id: string; status: string }
        }
        const prepared = result.execution.prepared?.kind
          ? ` (prepared ${result.execution.prepared.kind})`
          : ''
        const exit = result.execution.exitCode !== undefined ? ` exit=${result.execution.exitCode}` : ''
        return text(
          `Execution ${result.execution.status}${prepared}${exit}${result.experience ? `; experience ${result.experience.id} (${result.experience.kind}) queued` : ''}.`,
        )
      },
    },
    async execute(args: any, exec: any): Promise<any> {
      try {
        return await app.operate({
          operation: args.operation,
          environmentId: args.environmentId,
          serviceId: args.serviceId,
          deploymentId: args.deploymentId,
          confirm: Boolean(args.confirm),
          dryRun: Boolean(args.dryRun),
          note: args.note,
        })
      } catch (error) {
        const envError = asEnvManagerError(error)
        if (envError.code === 'APPROVAL_REQUIRED') {
          await approval(ctx, exec, 'env_operate', `Execute ${args.operation}`)
          return await app.operate({
            operation: args.operation,
            environmentId: args.environmentId,
            serviceId: args.serviceId,
            deploymentId: args.deploymentId,
            confirm: true,
            dryRun: Boolean(args.dryRun),
            note: args.note,
          })
        }
        throw error
      }
    },
  })

  const envExperience = defineTool({
    name: 'env_experience',
    description:
      'Manage the experience review queue: list experiences, add a hand-written lesson/summary (e.g. from a Skill run you observed), or approve/reject a proposed one. Nothing auto-applies: accepted experiences are surfaced on later routes so the tool gets smarter with use.',
    parameters: {
      action: {
        type: 'string',
        enum: ['list', 'add', 'approve', 'reject'],
        required: true,
        description: 'list returns matching records; add proposes a new one; approve/reject reviews a proposed one.',
      },
      operation: { type: 'string', description: 'Filter or set the operation id.' },
      environmentId: { type: 'string', description: 'Filter or set the environment scope.' },
      serviceId: { type: 'string', description: 'Filter or set the service scope.' },
      deploymentId: { type: 'string', description: 'Set the deployment scope (add only).' },
      bindingId: { type: 'string', description: 'Optional binding id (add only).' },
      kind: { type: 'string', enum: ['success-summary', 'failure-lesson'], description: 'Experience kind; filter for list, required for add.' },
      status: { type: 'string', enum: ['proposed', 'accepted', 'rejected'], description: 'Filter by review status (list only).' },
      outcome: { type: 'string', enum: ['success', 'failure', 'skipped'], description: 'Result that produced the experience (add only).' },
      mode: { type: 'string', enum: ['skill', 'script', 'command', 'remote'], description: 'Target mode (add only).' },
      title: { type: 'string', description: 'Short title (add only).' },
      content: { type: 'string', description: 'Narrative: what happened, why it worked or failed, what to do next time (add only).' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags (add only).' },
      id: { type: 'string', description: 'Experience id (approve/reject only).' },
      note: { type: 'string', description: 'Review note (approve/reject only).' },
      limit: { type: 'number', description: 'Max list items, default 25, at most 100.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          items: { type: 'array', items: { type: 'json' }, description: 'For action=list.' },
          record: { type: 'json', description: 'For action=add/approve/reject.' },
          warnings: { ...warningsSchema(), required: true },
        },
      },
      render: (_args, value) => {
        const result = value as {
          items?: Array<{ id: string; kind: string; status: string }>
          record?: { id: string; status: string; kind: string }
        }
        if (result.record) {
          return text(`Experience ${result.record.id} ${result.record.status} (${result.record.kind}).`)
        }
        return text(`${result.items?.length ?? 0} experience(s).`)
      },
    },
    async execute(args: any, exec: any): Promise<any> {
      try {
        switch (args.action) {
          case 'list':
            return {
              items: (await app.listExperiences({
                operation: args.operation,
                environmentId: args.environmentId,
                serviceId: args.serviceId,
                kind: args.kind,
                status: args.status,
                limit: args.limit,
              })).items,
              warnings: [],
            }
          case 'add': {
            if (!args.operation || !args.kind || !args.title || !args.content) {
              throw new EnvManagerError(
                'INVALID_ARGUMENT',
                'add requires operation, kind, title and content',
              )
            }
            const record = await app.addExperience({
              operation: args.operation,
              environmentId: args.environmentId,
              serviceId: args.serviceId,
              deploymentId: args.deploymentId,
              bindingId: args.bindingId,
              mode: args.mode ?? 'skill',
              outcome: args.outcome ?? 'failure',
              kind: args.kind,
              title: args.title,
              content: args.content,
              tags: args.tags,
            })
            return { record, warnings: [] }
          }
          case 'approve':
          case 'reject': {
            if (!args.id) {
              throw new EnvManagerError('INVALID_ARGUMENT', `${args.action} requires id`)
            }
            const record = await app.reviewExperience(args.id, args.action, 'agent', args.note)
            return { record, warnings: [] }
          }
          default:
            throw new EnvManagerError('INVALID_ARGUMENT', `Unknown action "${args.action}"`)
        }
      } catch (error) {
        throw asEnvManagerError(error)
      }
    },
  })

  const envImport = defineTool({
    name: 'env_import',
    description:
      'Import a self-contained environment bundle (several environments plus their services, deployments, rule profiles, operation bindings and DR groups) in one call. Conflict mode: skip keeps existing records, overwrite replaces them, error fails the conflicting ones. Records carry credentialRef names only — passwords are never accepted. Bundles touching production records require approval: pass confirm: true only after the user agrees.',
    parameters: {
      document: {
        type: 'json',
        required: true,
        description:
          'Bundle document: { version: 1, environments: [...], services: [...], deployments: [...], ruleProfiles: [...], operationBindings: [...], drGroups: [...] }.',
      },
      mode: {
        type: 'string',
        enum: ['skip', 'overwrite', 'error'],
        description: 'Conflict mode for ids that already exist; defaults to skip.',
      },
      confirm: {
        type: 'boolean',
        description: 'true only after the user approved importing production records.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          imported: { type: 'array', items: { type: 'json' }, required: true },
          skipped: { type: 'array', items: { type: 'json' }, required: true },
          failed: { type: 'array', items: { type: 'json' }, required: true },
          warnings: { ...warningsSchema(), required: true },
        },
      },
      render: (_args, value) => {
        const result = value as { imported: unknown[]; skipped: unknown[]; failed: unknown[] }
        return text(
          `Imported ${result.imported.length}, skipped ${result.skipped.length}, failed ${result.failed.length}.`,
        )
      },
    },
    async execute(args: any, exec: any): Promise<any> {
      const run = (confirm: boolean) =>
        app.importBundle(
          {
            document: args.document,
            mode: args.mode,
            confirm,
          },
          'agent',
        )
      try {
        return await run(Boolean(args.confirm))
      } catch (error) {
        const envError = asEnvManagerError(error)
        if (envError.code === 'APPROVAL_REQUIRED') {
          await approval(ctx, exec, 'env_import', 'Import an environment bundle')
          return await run(true)
        }
        throw error
      }
    },
  })

  const envExport = defineTool({
    name: 'env_export',
    description:
      'Export a self-contained environment bundle for backup or migration: environments, deployments, referenced services, related operation bindings, rule profiles and DR groups. Omit environmentIds to export the whole registry; pass ids/names to export one or several environments plus what references them. Records carry credentialRef names only — never a credential value.',
    parameters: {
      environmentIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional environment ids or names to include; omit for a full export.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          document: { type: 'json', required: true },
          counts: { type: 'json', required: true },
        },
      },
      render: (_args, value) => {
        const result = value as { counts: Record<string, number> }
        const total = Object.values(result.counts).reduce((sum, n) => sum + n, 0)
        return text(`Exported ${total} record(s).`)
      },
    },
    async execute(args: any): Promise<any> {
      try {
        const document = await app.exportBundle(args.environmentIds)
        return {
          document,
          counts: {
            environments: document.environments?.length ?? 0,
            services: document.services?.length ?? 0,
            deployments: document.deployments?.length ?? 0,
            ruleProfiles: document.ruleProfiles?.length ?? 0,
            operationBindings: document.operationBindings?.length ?? 0,
            drGroups: document.drGroups?.length ?? 0,
          },
        }
      } catch (error) {
        throw asEnvManagerError(error)
      }
    },
  })

  return [
    envList,
    envGet,
    envFind,
    envResolve,
    envResolveOperation,
    envGetContext,
    envSetContext,
    envSave,
    envDelete,
    envValidate,
    envOperate,
    envExperience,
    envImport,
    envExport,
  ]
}
