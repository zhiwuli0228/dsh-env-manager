import type { Deployment, Environment, LogSource, ClassLocation, RuleProfile, RuleSource, RuntimeMode, Service } from '../domain/types.js';
export interface Layer {
    source: RuleSource;
    variables?: Record<string, string | number | boolean>;
    paths?: Record<string, string>;
    logSources?: Partial<Record<RuntimeMode, LogSource>>;
    classLocations?: Partial<Record<RuntimeMode, ClassLocation>>;
}
export interface MergedField {
    key: string;
    raw: string | number | boolean;
    definedBy: RuleSource;
    shadowed: RuleSource[];
}
export interface MergeResult {
    fields: Map<string, MergedField>;
    layers: Layer[];
}
export declare function buildLayers(service: Service, environment: Environment | undefined, deployment: Deployment | undefined, ruleProfiles: Map<string, RuleProfile>): {
    layers: Layer[];
    missingProfiles: string[];
};
export declare function mergeLayers(layers: Layer[]): MergeResult;
