import os from 'node:os';
import { App } from './app/app.js';
import { Config, normalizeConfig } from './config.js';
import { consoleLogger } from './logger.js';
import { resolveDataDir } from './storage/paths.js';
import { cleanupTempFiles } from './storage/atomic.js';
import { createEnvironmentManagerSkill } from './skill.js';
import { createToolDefinitions } from './tools/tools.js';
import { registerHttpTransport } from './transport/http.js';
/**
 * Adapt the DSH `ctx.credentials` service to the narrow directory the App uses.
 *
 * Accepts `undefined` while the provider is still initializing, so callers can
 * use the same function for the eager attempt and the late `ctx.inject` bind.
 */
function credentialDirectory(service) {
    if (!service || typeof service.describe !== 'function')
        return null;
    return {
        async describe(ref) {
            const info = await service.describe(ref);
            return { configured: info.configured, source: info.source };
        },
        async set(ref, value) {
            if (typeof service.set !== 'function') {
                throw new Error('the credential service is not writable');
            }
            await service.set(ref, value);
        },
        async unset(ref) {
            if (typeof service.unset !== 'function') {
                throw new Error('the credential service is not writable');
            }
            await service.unset(ref);
        },
    };
}
export const name = 'dsh-env-manager';
export const inject = ['tools'];
export { Config };
export function apply(ctx, config = {}) {
    const normalized = normalizeConfig(config);
    const profileContext = ctx.get('profileContext');
    const profileDir = profileContext?.dir ?? process.env.DSH_PROFILE_DIR ?? process.cwd();
    const dataDir = resolveDataDir(normalized.dataDir, profileDir, process.cwd(), os.homedir());
    const skills = ctx.get('skills');
    const app = new App({
        dataDir,
        maxRecords: normalized.maxRecords,
        writePolicy: {
            allowUiProductionWrites: normalized.writePolicy.allowUiProductionWrites,
        },
        skills: skills
            ? {
                snapshot: (options) => skills.snapshot(options),
            }
            : null,
        credentials: credentialDirectory(ctx.get('credentials')),
        logger: consoleLogger,
        defaults: normalized.defaults,
    });
    void app.init().catch((error) => {
        consoleLogger.error(`Could not initialize ${dataDir}: ${error instanceof Error ? error.message : String(error)}`);
    });
    void cleanupTempFiles(dataDir).catch(() => undefined);
    const disposeTools = [];
    ctx.effect(() => {
        const definitions = createToolDefinitions({
            ctx,
            app,
            defaults: normalized.defaults,
            writePolicy: normalized.writePolicy,
        });
        for (const definition of definitions) {
            disposeTools.push(ctx.tools.register(definition));
        }
        // The HTTP panel transport is registered through `ctx.inject`, so the
        // route is mounted once the `webServer` service is actually provided.
        // A synchronous `ctx.get('webServer')` in `apply` loses the race when the
        // web runtime starts after this bundle (observed on DSH 0.2.2-rc.x), which
        // silently disabled the panel. `inject` also keeps the transport optional
        // on headless profiles.
        ctx.inject(['webServer'], (webCtx) => {
            webCtx.effect(() => registerHttpTransport(webCtx, app, consoleLogger));
        });
        // The credential provider registers `credentials` from an async
        // `Service.init` (read `$DSH_HOME/.credentials.yaml`, verify its owner-only
        // mode), and cordis only exposes a service whose providing fiber is ACTIVE.
        // On a cold start this bundle applies inside that window, so a synchronous
        // `ctx.get('credentials')` was undefined and the session behaved as if no
        // credential store existed: every password save failed with
        // `CREDENTIAL_UNAVAILABLE`. Bind it when it becomes available instead.
        ctx.inject(['credentials'], (credentialCtx) => {
            credentialCtx.effect(() => {
                app.setCredentials(credentialDirectory(credentialCtx.get('credentials')));
                return () => app.setCredentials(null);
            });
        });
        let disposeSkill;
        if (normalized.registerSkill && skills && typeof skills.register === 'function') {
            try {
                disposeSkill = skills.register(createEnvironmentManagerSkill());
                consoleLogger.debug('Registered discovery skill dsh-env-manager');
            }
            catch (error) {
                consoleLogger.warn(`Could not register discovery skill: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return () => {
            disposeSkill?.();
            for (const dispose of disposeTools.splice(0))
                dispose();
        };
    });
    consoleLogger.info(`Environment registry ready at ${dataDir}`);
}
//# sourceMappingURL=index.js.map