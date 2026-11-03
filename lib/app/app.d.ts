import type { Actor, CredentialDirectory, Diagnostic, FindResult, GetResult, ListResult, MetaResult, OperationResolution, RecordKind, RemoveOptions, RemoveResult, ResolveRequest, RouteRequest, SaveOptions, SaveResult, ServiceContext, SessionContext, SkillDirectory, ValidationReport } from '../domain/types.js';
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
     * Store one SSH/web credential in the DSH credential service and return only
     * its reference. Registry YAML must never contain the value itself.
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
    getContext(sessionId: string): Promise<SessionContext>;
    setContext(sessionId: string, environmentId: string | null): Promise<SessionContext>;
    needsProductionApproval(kind: RecordKind, raw: unknown): Promise<boolean>;
    private mapFor;
    private selectDeployment;
    private isProductionRecord;
    private describeCredentials;
}
