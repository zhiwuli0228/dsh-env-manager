function diag(code, message, extra = {}) {
    return { code, severity: 'warning', message, ...extra };
}
/** Referential checks over a loaded snapshot. Broken references are diagnostics. */
export function checkIntegrity(snapshot) {
    const out = [];
    const environmentIds = new Set(snapshot.environments.keys());
    const serviceIds = new Set(snapshot.services.keys());
    const deploymentIds = new Set(snapshot.deployments.keys());
    for (const environment of snapshot.environments.values()) {
        const file = `environments/${environment.id}.yaml`;
        const hostIds = new Set();
        const hostIps = new Set();
        const roleIds = new Set(environment.roles.map((role) => role.id));
        for (const host of environment.hosts) {
            if (hostIds.has(host.id)) {
                out.push(diag('DUPLICATE_HOST_ID', `Host id ${host.id} is duplicated`, { file, path: 'hosts' }));
            }
            hostIds.add(host.id);
            if (host.ip) {
                if (hostIps.has(host.ip)) {
                    out.push(diag('DUPLICATE_HOST_IP', `Host IP ${host.ip} is duplicated`, { file, path: 'hosts' }));
                }
                hostIps.add(host.ip);
            }
            for (const role of host.roles) {
                if (!roleIds.has(role)) {
                    out.push(diag('ROLE_NOT_FOUND', `Host ${host.id} references missing role ${role}`, {
                        file,
                        path: 'hosts.roles',
                    }));
                }
            }
            const accountIds = new Set();
            for (const account of host.accounts ?? []) {
                if (accountIds.has(account.id)) {
                    out.push(diag('DUPLICATE_ACCOUNT_ID', `Account id ${account.id} is duplicated on host ${host.id}`, {
                        file,
                        path: 'hosts.accounts',
                    }));
                }
                accountIds.add(account.id);
            }
        }
        for (const endpoint of environment.endpoints) {
            if (endpoint.hostRef && !hostIds.has(endpoint.hostRef)) {
                out.push(diag('HOST_NOT_FOUND', `Endpoint ${endpoint.id} references missing host ${endpoint.hostRef}`, {
                    file,
                    path: 'endpoints.hostRef',
                }));
            }
            if (endpoint.clusterRef && !environment.clusters.some((cluster) => cluster.id === endpoint.clusterRef)) {
                out.push(diag('CLUSTER_NOT_FOUND', `Endpoint ${endpoint.id} references missing cluster ${endpoint.clusterRef}`, {
                    file,
                    path: 'endpoints.clusterRef',
                }));
            }
        }
        for (const login of environment.loginRecords ?? []) {
            const host = login.hostRef ? environment.hosts.find((item) => item.id === login.hostRef) : undefined;
            if (login.hostRef && !host) {
                out.push(diag('HOST_NOT_FOUND', `Login record ${login.id} references missing host ${login.hostRef}`, {
                    file,
                    path: 'loginRecords.hostRef',
                }));
            }
            if (login.accountId) {
                const account = host
                    ? host.accounts?.find((item) => item.id === login.accountId)
                    : environment.hosts
                        .flatMap((item) => item.accounts ?? [])
                        .find((item) => item.id === login.accountId);
                if (!account) {
                    out.push(diag('ACCOUNT_NOT_FOUND', `Login record ${login.id} references missing account ${login.accountId}`, {
                        file,
                        path: 'loginRecords.accountId',
                    }));
                }
            }
        }
    }
    for (const service of snapshot.services.values()) {
        for (const ref of service.ruleProfileRefs) {
            if (!snapshot.ruleProfiles.has(ref)) {
                out.push(diag('RULE_PROFILE_NOT_FOUND', `Service ${service.id} references missing rule profile ${ref}`, {
                    file: `services/${service.id}.yaml`,
                    path: 'ruleProfileRefs',
                }));
            }
        }
    }
    for (const deployment of snapshot.deployments.values()) {
        const file = `deployments/${deployment.id}.yaml`;
        if (!environmentIds.has(deployment.environmentId)) {
            out.push(diag('ENV_NOT_FOUND', `Deployment ${deployment.id} references missing environment ${deployment.environmentId}`, {
                file,
                path: 'environmentId',
            }));
            continue;
        }
        if (!serviceIds.has(deployment.serviceId)) {
            out.push(diag('SERVICE_NOT_FOUND', `Deployment ${deployment.id} references missing service ${deployment.serviceId}`, {
                file,
                path: 'serviceId',
            }));
        }
        else {
            const service = snapshot.services.get(deployment.serviceId);
            if (service && !service.deployModes.includes(deployment.runtimeMode)) {
                out.push(diag('RECORD_INVALID', `Service ${service.id} does not list deploy mode ${deployment.runtimeMode}`, { file, path: 'runtimeMode' }));
            }
        }
        const environment = snapshot.environments.get(deployment.environmentId);
        if (environment) {
            const location = deployment.location;
            if ('hostRef' in location) {
                const host = environment.hosts.find((item) => item.id === location.hostRef);
                if (!host) {
                    out.push(diag('HOST_NOT_FOUND', `Deployment ${deployment.id} references missing host ${location.hostRef}`, {
                        file,
                        path: 'location.hostRef',
                    }));
                }
            }
            if ('clusterRef' in location) {
                const cluster = environment.clusters.find((item) => item.id === location.clusterRef);
                if (!cluster) {
                    out.push(diag('CLUSTER_NOT_FOUND', `Deployment ${deployment.id} references missing cluster ${location.clusterRef}`, { file, path: 'location.clusterRef' }));
                }
            }
        }
    }
    for (const binding of snapshot.operationBindings.values()) {
        const file = `operations/${binding.id}.yaml`;
        const match = binding.match;
        if (match.environmentId && !environmentIds.has(match.environmentId)) {
            out.push(diag('ENV_NOT_FOUND', `Binding ${binding.id} references missing environment ${match.environmentId}`, {
                file,
                path: 'match.environmentId',
            }));
        }
        if (match.serviceId && !serviceIds.has(match.serviceId)) {
            out.push(diag('SERVICE_NOT_FOUND', `Binding ${binding.id} references missing service ${match.serviceId}`, {
                file,
                path: 'match.serviceId',
            }));
        }
        if (match.deploymentId && !deploymentIds.has(match.deploymentId)) {
            out.push(diag('DEPLOYMENT_NOT_FOUND', `Binding ${binding.id} references missing deployment ${match.deploymentId}`, {
                file,
                path: 'match.deploymentId',
            }));
        }
    }
    for (const group of snapshot.drGroups.values()) {
        const file = `drGroups/${group.id}.yaml`;
        for (const [index, member] of group.members.entries()) {
            if (!environmentIds.has(member.environmentId)) {
                out.push(diag('DR_GROUP_MEMBER_UNKNOWN', `DR group ${group.id} references missing environment ${member.environmentId}`, { file, path: `members[${index}].environmentId` }));
            }
        }
    }
    return out;
}
/** Records that point at `kind/id`, used to block a delete. */
export function findReferences(snapshot, kind, id) {
    const refs = [];
    switch (kind) {
        case 'environment':
            for (const deployment of snapshot.deployments.values()) {
                if (deployment.environmentId === id) {
                    refs.push({ kind: 'deployment', id: deployment.id, field: 'environmentId' });
                }
            }
            for (const binding of snapshot.operationBindings.values()) {
                if (binding.match.environmentId === id) {
                    refs.push({ kind: 'operationBinding', id: binding.id, field: 'match.environmentId' });
                }
            }
            for (const group of snapshot.drGroups.values()) {
                for (const member of group.members) {
                    if (member.environmentId === id) {
                        refs.push({ kind: 'drGroup', id: group.id, field: 'members.environmentId' });
                    }
                }
            }
            break;
        case 'service':
            for (const deployment of snapshot.deployments.values()) {
                if (deployment.serviceId === id) {
                    refs.push({ kind: 'deployment', id: deployment.id, field: 'serviceId' });
                }
            }
            for (const binding of snapshot.operationBindings.values()) {
                if (binding.match.serviceId === id) {
                    refs.push({ kind: 'operationBinding', id: binding.id, field: 'match.serviceId' });
                }
            }
            break;
        case 'deployment':
            for (const binding of snapshot.operationBindings.values()) {
                if (binding.match.deploymentId === id) {
                    refs.push({ kind: 'operationBinding', id: binding.id, field: 'match.deploymentId' });
                }
            }
            break;
        case 'ruleProfile':
            for (const service of snapshot.services.values()) {
                if (service.ruleProfileRefs.includes(id)) {
                    refs.push({ kind: 'service', id: service.id, field: 'ruleProfileRefs' });
                }
            }
            break;
        case 'operationBinding':
            break;
        case 'drGroup':
            break;
    }
    return refs;
}
//# sourceMappingURL=integrity.js.map