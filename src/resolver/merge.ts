import type {
  Deployment,
  Environment,
  LogSource,
  ClassLocation,
  RuleOverride,
  RuleProfile,
  RuleSource,
  RuntimeMode,
  Service,
} from '../domain/types.js'

export interface Layer {
  source: RuleSource
  variables?: Record<string, string | number | boolean>
  paths?: Record<string, string>
  logSources?: Partial<Record<RuntimeMode, LogSource>>
  classLocations?: Partial<Record<RuntimeMode, ClassLocation>>
}

export interface MergedField {
  key: string
  raw: string | number | boolean
  definedBy: RuleSource
  shadowed: RuleSource[]
}

export interface MergeResult {
  fields: Map<string, MergedField>
  layers: Layer[]
}

function layerFromOverride(override: RuleOverride | undefined, source: RuleSource): Layer | null {
  if (!override) return null
  return {
    source,
    variables: override.variables,
    paths: override.paths,
    logSources: override.logSources,
    classLocations: override.classLocations,
  }
}

export function buildLayers(
  service: Service,
  environment: Environment | undefined,
  deployment: Deployment | undefined,
  ruleProfiles: Map<string, RuleProfile>,
): { layers: Layer[]; missingProfiles: string[] } {
  const layers: Layer[] = []
  const missingProfiles: string[] = []
  for (const ref of service.ruleProfileRefs) {
    const profile = ruleProfiles.get(ref)
    if (!profile) {
      missingProfiles.push(ref)
      continue
    }
    layers.push({
      source: { layer: 'service', ruleProfileId: profile.id, recordId: service.id },
      variables: profile.variables,
      paths: profile.paths,
      logSources: profile.logSources,
      classLocations: profile.classLocations,
    })
  }
  if (environment) {
    const environmentLayer = layerFromOverride(environment.ruleOverrides, {
      layer: 'environment',
      recordId: environment.id,
    })
    if (environmentLayer) layers.push(environmentLayer)
  }

  if (deployment) {
    if (deployment.variables) {
      layers.push({
        source: { layer: 'deployment', recordId: deployment.id },
        variables: deployment.variables,
      })
    }
    const deploymentLayer = layerFromOverride(deployment.ruleOverrides, {
      layer: 'deployment',
      recordId: deployment.id,
    })
    if (deploymentLayer) layers.push(deploymentLayer)
  }

  return { layers, missingProfiles }
}

function setField(
  fields: Map<string, MergedField>,
  key: string,
  raw: string | number | boolean,
  source: RuleSource,
) {
  const previous = fields.get(key)
  if (!previous) {
    fields.set(key, { key, raw, definedBy: source, shadowed: [] })
    return
  }
  fields.set(key, {
    key,
    raw,
    definedBy: source,
    shadowed: [...previous.shadowed, previous.definedBy],
  })
}

function flattenLayer(layer: Layer, fields: Map<string, MergedField>) {
  for (const [name, value] of Object.entries(layer.variables ?? {})) {
    setField(fields, `variables.${name}`, value, layer.source)
  }
  for (const [name, value] of Object.entries(layer.paths ?? {})) {
    setField(fields, `paths.${name}`, value, layer.source)
  }
  for (const [runtime, value] of Object.entries(layer.logSources ?? {})) {
    if (!value) continue
    for (const [property, propertyValue] of Object.entries(value)) {
      setField(fields, `logSources.${runtime}.${property}`, propertyValue, layer.source)
    }
  }
  for (const [runtime, value] of Object.entries(layer.classLocations ?? {})) {
    if (!value) continue
    for (const [property, propertyValue] of Object.entries(value)) {
      setField(fields, `classLocations.${runtime}.${property}`, propertyValue, layer.source)
    }
  }
}

export function mergeLayers(layers: Layer[]): MergeResult {
  const fields = new Map<string, MergedField>()
  for (const layer of layers) flattenLayer(layer, fields)
  return { fields, layers }
}
