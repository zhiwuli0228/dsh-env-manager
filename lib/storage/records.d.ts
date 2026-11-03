import type { AnyRecord, RecordKind } from '../domain/types.js';
export interface RawRecord {
    found: boolean;
    text?: string;
    raw?: unknown;
    bytes?: number;
}
export declare function parseYamlText(text: string, file?: string): unknown;
export declare function stringifyRecord(record: AnyRecord): string;
export declare function readRecordRaw(dataDir: string, kind: RecordKind, id: string): Promise<RawRecord>;
export declare function writeRecordFile(dataDir: string, kind: RecordKind, record: AnyRecord): Promise<void>;
export declare function deleteRecordFile(dataDir: string, kind: RecordKind, id: string): Promise<void>;
export declare function listRecordIds(dataDir: string, kind: RecordKind): Promise<string[]>;
export declare function fileForRecord(dataDir: string, kind: RecordKind, id: string): string;
export declare function recordExists(dataDir: string, kind: RecordKind, id: string): Promise<boolean>;
export declare function relativeFile(dataDir: string, target: string): string;
