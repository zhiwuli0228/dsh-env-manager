import z from '@deepseek-ai/schemastery';
/**
 * Host plugin config (schemastery). See `docs/01-architecture/detailed-design.md` §3.
 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    dataDir: z<string, string, "defined">;
    maxRecords: z<number, number, "defined">;
    registerSkill: z<boolean, boolean, "defined">;
    writePolicy: z<Schemastery.ObjectS<NoInfer<{
        allowUiProductionWrites: z<boolean, boolean, "defined">;
        requireApprovalForDelete: z<boolean, boolean, "defined">;
        requireApprovalForProductionSave: z<boolean, boolean, "defined">;
    }>>, Schemastery.ObjectT<NoInfer<{
        allowUiProductionWrites: z<boolean, boolean, "defined">;
        requireApprovalForDelete: z<boolean, boolean, "defined">;
        requireApprovalForProductionSave: z<boolean, boolean, "defined">;
    }>>, "defined">;
    defaults: z<Schemastery.ObjectS<NoInfer<{
        environmentId: z<string, string, "defined">;
    }>>, Schemastery.ObjectT<NoInfer<{
        environmentId: z<string, string, "defined">;
    }>>, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    dataDir: z<string, string, "defined">;
    maxRecords: z<number, number, "defined">;
    registerSkill: z<boolean, boolean, "defined">;
    writePolicy: z<Schemastery.ObjectS<NoInfer<{
        allowUiProductionWrites: z<boolean, boolean, "defined">;
        requireApprovalForDelete: z<boolean, boolean, "defined">;
        requireApprovalForProductionSave: z<boolean, boolean, "defined">;
    }>>, Schemastery.ObjectT<NoInfer<{
        allowUiProductionWrites: z<boolean, boolean, "defined">;
        requireApprovalForDelete: z<boolean, boolean, "defined">;
        requireApprovalForProductionSave: z<boolean, boolean, "defined">;
    }>>, "defined">;
    defaults: z<Schemastery.ObjectS<NoInfer<{
        environmentId: z<string, string, "defined">;
    }>>, Schemastery.ObjectT<NoInfer<{
        environmentId: z<string, string, "defined">;
    }>>, "defined">;
}>>, "plain">;
export type HostConfig = {
    dataDir: string;
    maxRecords: number;
    registerSkill: boolean;
    writePolicy: {
        allowUiProductionWrites: boolean;
        requireApprovalForDelete: boolean;
        requireApprovalForProductionSave: boolean;
    };
    defaults: {
        environmentId: string;
    };
};
export declare function normalizeConfig(config: unknown): HostConfig;
