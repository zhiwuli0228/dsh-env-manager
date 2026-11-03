import { Config } from './config.js';
export declare const name = "dsh-env-manager";
export declare const inject: string[];
export { Config };
export interface ApplyConfig {
    dataDir?: string;
    maxRecords?: number;
    registerSkill?: boolean;
    writePolicy?: {
        allowUiProductionWrites?: boolean;
        requireApprovalForDelete?: boolean;
        requireApprovalForProductionSave?: boolean;
    };
    defaults?: {
        environmentId?: string;
    };
}
export declare function apply(ctx: any, config?: ApplyConfig): void;
