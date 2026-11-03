import z from '@deepseek-ai/schemastery';
/**
 * Host plugin config (schemastery). See `docs/01-architecture/detailed-design.md` §3.
 */
export const Config = z.object({
    dataDir: z
        .string()
        .default('')
        .description('Registry directory; relative paths resolve against the profile directory.'),
    maxRecords: z.natural().default(2000),
    registerSkill: z
        .boolean()
        .default(true)
        .description('Register the profile-wide dsh-env-manager discovery Skill.'),
    writePolicy: z
        .object({
        allowUiProductionWrites: z.boolean().default(false),
        requireApprovalForDelete: z.boolean().default(true),
        requireApprovalForProductionSave: z.boolean().default(true),
    })
        .default({}),
    defaults: z
        .object({
        environmentId: z.string().default(''),
    })
        .default({}),
});
export function normalizeConfig(config) {
    const parsed = Config(config ?? {});
    return {
        dataDir: parsed.dataDir ?? '',
        maxRecords: parsed.maxRecords ?? 2000,
        registerSkill: parsed.registerSkill ?? true,
        writePolicy: {
            allowUiProductionWrites: parsed.writePolicy?.allowUiProductionWrites ?? false,
            requireApprovalForDelete: parsed.writePolicy?.requireApprovalForDelete ?? true,
            requireApprovalForProductionSave: parsed.writePolicy?.requireApprovalForProductionSave ?? true,
        },
        defaults: { environmentId: parsed.defaults?.environmentId ?? '' },
    };
}
//# sourceMappingURL=config.js.map