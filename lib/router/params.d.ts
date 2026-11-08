import type { ServiceContext } from '../domain/types.js';
export declare function buildParameterConstants(context: ServiceContext): Map<string, string>;
/**
 * Interpolate one `${ref}` template. `extra` adds already-resolved values
 * (operation parameters) so an execution target can reference them.
 */
export declare function interpolateText(raw: string, context: ServiceContext, label: string, extra?: Record<string, string>): string;
export declare function resolveArgv(argv: string[], context: ServiceContext, label: string, extra?: Record<string, string>): string[];
export declare function resolveParameters(parameters: Record<string, string | number | boolean> | undefined, context: ServiceContext): Record<string, string>;
