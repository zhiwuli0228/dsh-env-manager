import type { AnyRecord, RecordKind } from './types.js';
export interface RecordIssue {
    path: string;
    message: string;
}
export type ParseResult<T extends AnyRecord = AnyRecord> = {
    ok: true;
    record: T;
} | {
    ok: false;
    issues: RecordIssue[];
};
export declare function matchShape(match: Record<string, unknown>): string | null;
export declare function normalizeRecordInput(kind: RecordKind, raw: unknown): unknown;
export declare function parseRecordInput(kind: RecordKind, raw: unknown): ParseResult;
export declare function parseRecord(kind: RecordKind, raw: unknown): ParseResult;
export declare function parseRecordLoose(kind: RecordKind, raw: unknown): ParseResult;
export declare function withTimestamps<T extends {
    createdAt?: string;
    updatedAt?: string;
}>(record: T, previous?: {
    createdAt: string;
}, now?: string): T & {
    createdAt: string;
    updatedAt: string;
};
/** Top-level unknown keys, used for read-side `UNKNOWN_FIELD` warnings. */
export declare function unknownTopLevelKeys(kind: RecordKind, raw: unknown): string[];
