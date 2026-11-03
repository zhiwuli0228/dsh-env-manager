/**
 * Serialize writes to one absolute path within this process.
 * No cross-process lock exists in V1.
 */
export declare function serialize<T>(key: string, work: () => Promise<T>): Promise<T>;
export declare function writeTextAtomic(target: string, text: string): Promise<void>;
export declare function rotateBackup(source: string, backupDirectory: string, extension: string): Promise<void>;
/** Remove orphan `.tmp` files older than one hour. */
export declare function cleanupTempFiles(dataDir: string): Promise<number>;
export declare function ensureLayout(dataDir: string): Promise<void>;
