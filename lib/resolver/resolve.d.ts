import type { Diagnostic, Deployment, Environment, RuleProfile, Service, ServiceContext } from '../domain/types.js';
import { refsOf } from './template.js';
export interface ResolveInput {
    environment?: Environment;
    service: Service;
    deployment?: Deployment;
    ruleProfiles: Map<string, RuleProfile>;
}
export type ResolveResult = {
    ok: true;
    context: ServiceContext;
} | {
    ok: false;
    diagnostics: Diagnostic[];
};
declare const ERROR_CODES: Set<string>;
export declare function resolveContext(input: ResolveInput): ResolveResult;
export { refsOf, ERROR_CODES };
