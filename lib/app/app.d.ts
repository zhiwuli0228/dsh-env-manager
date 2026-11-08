import { type ProcessRunner } from '../executor/runner.js';
import type { Actor, BundleDocument, CredentialDirectory, Diagnostic, ExperienceFilter, ExperienceRecord, ExperienceSummary, FindResult, GetResult, ImportRequest, ImportResult, ListResult, MetaResult, OperateRequest, OperateResult, OperationResolution, RecordKind, RemoveOptions, RemoveResult, ResolveRequest, RouteRequest, SaveOptions, SaveResult, ServiceContext, SessionContext, SkillDirectory, ValidationReport } from '../domain/types.js';
import type { Logger } from '../logger.js';
export declare const VERSION: string;
export interface AppOptions {
    dataDir: string;
    maxRecords: number;
    writePolicy: {
        allowUiProductionWrites: boolean;
    };
    skills: SkillDirectory | null;
    credentials: CredentialDirectory | null;
    logger: Logger;
    defaults?: {
        environmentId?: string;
    };
    /** Injectable process runner; defaults to the node child-process runner. */
    runner?: ProcessRunner;
}
export interface SaveContext {
    actor?: Actor;
}
export interface GetContextOptions {
    actor?: Actor;
}
export interface ResolveOutcome {
    context: ServiceContext;
    warnings: Diagnostic[];
}
export declare class App {
    private readonly options;
    private readonly loader;
    private readonly sessions;
    private readonly experiences;
    constructor(options: AppOptions);
    get dataDir(): string;
    init(): Promise<void>;
    private snapshot;
    private counts;
    private warnings;
    meta(): Promise<MetaResult>;
    list(kind: RecordKind): Promise<ListResult>;
    get(kind: RecordKind, id: string): Promise<GetResult>;
    find(query: string): Promise<FindResult>;
    saveYaml(kind: RecordKind, yaml: string, options?: SaveOptions & SaveContext): Promise<SaveResult>;
    save(kind: RecordKind, raw: unknown, options?: SaveOptions & SaveContext): Promise<SaveResult>;
    remove(kind: RecordKind, id: string, actor: Actor, options?: RemoveOptions): Promise<RemoveResult>;
    validate(): Promise<ValidationReport>;
    /**
     * Import a self-contained environment bundle: several environments plus the
     * services, deployments, rule profiles and operation bindings that reference
     * them, in one call. Records are schema-validated first; references are checked
     * against the registry plus the ids arriving in the same bundle. DR marking
     * travels inside each environment (`dr`). Bundle records carry `credentialRef`
     * names only — never a password or key.
     */
    importBundle(request: ImportRequest, actor?: Actor): Promise<ImportResult>;
    /**
     * Export a self-contained environment bundle. Without ids the whole registry is
     * exported; with ids, each named environment plus its deployments, referenced
     * services and related bindings is exported. DR marking travels inside each
     * environment (`dr`). Records contain only `credentialRef` names — never a
     * credential value.
     */
    exportBundle(environmentIds?: string[]): Promise<BundleDocument>;
    /**
     * Store one SSH/web credential in the DSH credential service and return only
     * its reference. Registry YAML must never contain the value itself. Refs are
     * restricted to the plugin's POSIX-style `DSH_ENV_MANAGER_*` namespace: the
     * DSH store rejects any other key shape at boot, so a bad ref here would
     * break the whole credentials document, not just this entry.
     */
    setCredential(ref: string, value: string): Promise<{
        ref: string;
        configured: boolean;
    }>;
    /** Remove a credential owned by this plugin; other namespaces are rejected. */
    unsetCredential(ref: string): Promise<{
        ref: string;
        removed: true;
    }>;
    resolve(request: ResolveRequest): Promise<ResolveOutcome>;
    route(request: RouteRequest): Promise<OperationResolution>;
    /**
     * Execute a routed operation. Skill targets are prepared (the agent invokes the
     * Skill); script/command targets run a bounded local process; remote targets are
     * prepared as an ssh descriptor. Every completed execution writes an experience
     * into the review queue (success → summary, failure → lesson).
     */
    operate(request: OperateRequest): Promise<OperateResult>;
    listExperiences(filter?: ExperienceFilter): Promise<{
        items: ExperienceSummary[];
        warnings: Diagnostic[];
    }>;
    reviewExperience(id: string, action: 'approve' | 'reject', actor: Actor, note?: string): Promise<ExperienceRecord>;
    /**
     * Add a hand-written experience (e.g. a lesson from a Skill run the agent
     * observed, or an out-of-band deployment note). Always enters the review queue
     * as `proposed`; nothing auto-applies.
     */
    addExperience(input: {
        operation: string;
        environmentId?: string;
        serviceId?: string;
        deploymentId?: string;
        bindingId?: string;
        mode: import('../domain/types.js').ExecutionMode;
        outcome: import('../domain/types.js').ExperienceOutcome;
        kind: import('../domain/types.js').ExperienceKind;
        title: string;
        content: string;
        tags?: string[];
        evidenceRefs?: string[];
    }): Promise<ExperienceRecord>;
    /** Experiences matching an operation+scope, newest first, failures ranked first. */
    private relevantExperiences;
    private buildExperience;
    private experienceSummaryOf;
    getContext(sessionId: string): Promise<SessionContext>;
    setContext(sessionId: string, environmentId: string | null): Promise<SessionContext>;
    needsProductionApproval(kind: RecordKind, raw: unknown): Promise<boolean>;
    private mapFor;
    private selectDeployment;
    private isProductionRecord;
    private describeCredentials;
}
