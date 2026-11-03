import type { RecordByKind, RecordKind, RegistrySnapshot } from '../domain/types.js';
export declare function loadSnapshot(dataDir: string): Promise<RegistrySnapshot>;
export declare function lookup<T extends RecordKind>(snapshot: RegistrySnapshot, kind: T, id: string): RecordByKind[T] | undefined;
/** Lookup an id that may be an id, a name, or an alias. */
export declare function lookupByRef<T extends RecordKind>(snapshot: RegistrySnapshot, kind: T, ref: string): RecordByKind[T] | undefined;
export declare class RegistryLoader {
    private readonly dataDir;
    private last;
    private inflight;
    constructor(dataDir: string);
    get lastSnapshot(): RegistrySnapshot | undefined;
    load(): Promise<RegistrySnapshot>;
}
export declare function requireKind(value: string): RecordKind;
