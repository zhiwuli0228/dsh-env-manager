function layerFromOverride(override, source) {
    if (!override)
        return null;
    return {
        source,
        variables: override.variables,
        paths: override.paths,
        logSources: override.logSources,
        classLocations: override.classLocations,
    };
}
export function buildLayers(service, environment, deployment, ruleProfiles) {
    const layers = [];
    const missingProfiles = [];
    for (const ref of service.ruleProfileRefs) {
        const profile = ruleProfiles.get(ref);
        if (!profile) {
            missingProfiles.push(ref);
            continue;
        }
        layers.push({
            source: { layer: 'service', ruleProfileId: profile.id, recordId: service.id },
            variables: profile.variables,
            paths: profile.paths,
            logSources: profile.logSources,
            classLocations: profile.classLocations,
        });
    }
    const environmentLayer = layerFromOverride(environment.ruleOverrides, {
        layer: 'environment',
        recordId: environment.id,
    });
    if (environmentLayer)
        layers.push(environmentLayer);
    if (deployment.variables) {
        layers.push({
            source: { layer: 'deployment', recordId: deployment.id },
            variables: deployment.variables,
        });
    }
    const deploymentLayer = layerFromOverride(deployment.ruleOverrides, {
        layer: 'deployment',
        recordId: deployment.id,
    });
    if (deploymentLayer)
        layers.push(deploymentLayer);
    return { layers, missingProfiles };
}
function setField(fields, key, raw, source) {
    const previous = fields.get(key);
    if (!previous) {
        fields.set(key, { key, raw, definedBy: source, shadowed: [] });
        return;
    }
    fields.set(key, {
        key,
        raw,
        definedBy: source,
        shadowed: [...previous.shadowed, previous.definedBy],
    });
}
function flattenLayer(layer, fields) {
    for (const [name, value] of Object.entries(layer.variables ?? {})) {
        setField(fields, `variables.${name}`, value, layer.source);
    }
    for (const [name, value] of Object.entries(layer.paths ?? {})) {
        setField(fields, `paths.${name}`, value, layer.source);
    }
    for (const [runtime, value] of Object.entries(layer.logSources ?? {})) {
        if (!value)
            continue;
        for (const [property, propertyValue] of Object.entries(value)) {
            setField(fields, `logSources.${runtime}.${property}`, propertyValue, layer.source);
        }
    }
    for (const [runtime, value] of Object.entries(layer.classLocations ?? {})) {
        if (!value)
            continue;
        for (const [property, propertyValue] of Object.entries(value)) {
            setField(fields, `classLocations.${runtime}.${property}`, propertyValue, layer.source);
        }
    }
}
export function mergeLayers(layers) {
    const fields = new Map();
    for (const layer of layers)
        flattenLayer(layer, fields);
    return { fields, layers };
}
//# sourceMappingURL=merge.js.map