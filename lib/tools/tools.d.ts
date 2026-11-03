import { type ToolDefinition } from '@deepseek-ai/dsh-tools';
import { App } from '../app/app.js';
export interface ToolRuntimeOptions {
    ctx: any;
    app: App;
    defaults: {
        environmentId?: string;
    };
    writePolicy: {
        requireApprovalForDelete: boolean;
        requireApprovalForProductionSave: boolean;
    };
}
export declare function createToolDefinitions(options: ToolRuntimeOptions): ToolDefinition[];
