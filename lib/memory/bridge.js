export const nullMemoryBridge = {
    available: false,
    async emit() {
        return undefined;
    },
    async query() {
        return [];
    },
    async propose() {
        throw new Error('Memory bridge is not configured');
    },
};
//# sourceMappingURL=bridge.js.map