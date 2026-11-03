import type { ServiceContext } from '../domain/types.js';
export declare function buildParameterConstants(context: ServiceContext): Map<string, string>;
export declare function resolveParameters(parameters: Record<string, string | number | boolean> | undefined, context: ServiceContext): Record<string, string>;
