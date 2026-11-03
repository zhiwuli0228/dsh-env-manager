import type { OperationResolution } from '../domain/types.js';
export interface OperationRecordDraft {
    operation: string;
    resolution: OperationResolution;
    outcome: 'planned' | 'succeeded' | 'failed' | 'rejected';
    evidence?: string[];
}
/**
 * Optional memory integration. V1 never requires the memory plugin: the null
 * bridge reports unavailability and never writes.
 */
export interface MemoryBridge {
    readonly available: boolean;
    emit(record: OperationRecordDraft): Promise<void>;
    query(): Promise<never[]>;
    propose(): Promise<never>;
}
export declare const nullMemoryBridge: MemoryBridge;
