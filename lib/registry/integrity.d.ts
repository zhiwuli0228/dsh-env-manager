import type { Diagnostic, RecordKind, RegistrySnapshot } from '../domain/types.js';
/** Referential checks over a loaded snapshot. Broken references are diagnostics. */
export declare function checkIntegrity(snapshot: RegistrySnapshot): Diagnostic[];
export interface Referrer {
    kind: RecordKind;
    id: string;
    field: string;
}
/** Records that point at `kind/id`, used to block a delete. */
export declare function findReferences(snapshot: RegistrySnapshot, kind: RecordKind, id: string): Referrer[];
