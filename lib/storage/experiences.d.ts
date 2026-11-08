import type { ExperienceFilter, ExperienceRecord } from '../domain/types.js';
import type { Logger } from '../logger.js';
export interface ExperienceStoreOptions {
    dataDir: string;
    logger: Logger;
}
/**
 * File-system store for operation experiences. Each record is one YAML file under
 * `<dataDir>/experiences/`; invalid files are skipped with a warning (never fatal).
 * Experiences are plugin-owned records, separate from the registry: they do not
 * participate in registry validation or referential integrity.
 */
export declare class ExperienceStore {
    private readonly options;
    constructor(options: ExperienceStoreOptions);
    get directory(): string;
    private ensureDir;
    /** Newest first, filtered by scope/kind/status. */
    list(filter?: ExperienceFilter): Promise<ExperienceRecord[]>;
    read(id: string): Promise<ExperienceRecord | null>;
    write(record: ExperienceRecord): Promise<void>;
    /** Deterministic id: exp-YYYYMMDD-HHMMSS with a numeric suffix on collision. */
    nextId(now?: Date): Promise<string>;
    private readAll;
}
