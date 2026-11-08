import type { Host, MatchLevel, OperationBinding, OperationResolution, ServiceContext, SkillDirectory } from '../domain/types.js';
declare const RANK: Record<MatchLevel, number>;
export interface RouterInput {
    operation: string;
    context: ServiceContext;
    bindings: OperationBinding[];
    skills: SkillDirectory | null;
    /** Environment hosts, used to prepare remote targets. Never includes credential values. */
    hosts?: Host[];
    signal?: AbortSignal;
}
export declare function resolveOperation(input: RouterInput): Promise<OperationResolution>;
export { RANK };
