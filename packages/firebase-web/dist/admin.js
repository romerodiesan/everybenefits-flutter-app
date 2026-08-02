"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionsUnavailableError = void 0;
exports.callCloudFunction = callCloudFunction;
exports.mapAdminUserRow = mapAdminUserRow;
exports.mapOrgNode = mapOrgNode;
exports.createAdminRepository = createAdminRepository;
const functions_1 = require("firebase/functions");
const shared_1 = require("@pulse/shared");
class FunctionsUnavailableError extends Error {
    constructor(message = "Cloud Functions unavailable") {
        super(message);
        this.name = "FunctionsUnavailableError";
    }
}
exports.FunctionsUnavailableError = FunctionsUnavailableError;
async function callCloudFunction(functions, name, data) {
    try {
        const callable = (0, functions_1.httpsCallable)(functions, name);
        const result = await callable(data ?? {});
        return result.data;
    }
    catch (error) {
        const code = error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "";
        if (code.includes("unavailable") ||
            code.includes("not-found") ||
            code.includes("failed-precondition")) {
            throw new FunctionsUnavailableError(error instanceof Error ? error.message : String(error));
        }
        throw error;
    }
}
function mapAdminUserRow(entry) {
    return {
        uid: String(entry.uid ?? ""),
        email: entry.email ?? null,
        displayName: entry.displayName ?? null,
        photoUrl: entry.photoUrl ?? null,
        role: (0, shared_1.parseRole)(entry.role),
        isAnonymous: Boolean(entry.isAnonymous),
        profileCompleted: entry.profileCompleted ?? true,
        npn: entry.npn ?? null,
        agency: entry.agency ?? null,
        orgNodeId: entry.orgNodeId ?? null,
        accountStatus: entry.accountStatus === "deactivated" ||
            entry.accountStatus === "pendingDeletion"
            ? entry.accountStatus
            : "active",
        approvalStatus: entry.approvalStatus === "pending" ||
            entry.approvalStatus === "approved" ||
            entry.approvalStatus === "rejected"
            ? entry.approvalStatus
            : undefined,
    };
}
function mapOrgNode(entry) {
    const type = (0, shared_1.parseOrgNodeType)(entry.type) ?? "organization";
    const depth = Number(entry.depth);
    return {
        id: String(entry.id ?? ""),
        name: String(entry.name ?? ""),
        type,
        depth: (depth >= 1 && depth <= 7 ? depth : 1),
        parentId: entry.parentId ?? null,
        path: Array.isArray(entry.path) ? entry.path.map(String) : [],
        managerUids: Array.isArray(entry.managerUids)
            ? entry.managerUids.map(String)
            : [],
        active: entry.active !== false,
    };
}
function createAdminRepository(functions) {
    return {
        async listUsers(filters) {
            try {
                const data = await callCloudFunction(functions, "listUsersForAdmin", filters ?? {});
                return (data?.users ?? []).map(mapAdminUserRow).filter((p) => p.uid);
            }
            catch (error) {
                if (error instanceof FunctionsUnavailableError)
                    return [];
                throw error;
            }
        },
        async deactivateUser(uid) {
            await callCloudFunction(functions, "adminDeactivateUser", { uid });
        },
        async reactivateUser(uid) {
            await callCloudFunction(functions, "adminReactivateUser", { uid });
        },
        async getInsights() {
            try {
                return await callCloudFunction(functions, "getAdminInsights", {});
            }
            catch (error) {
                if (error instanceof FunctionsUnavailableError)
                    return null;
                throw error;
            }
        },
        async listOrgSubtree(parentId) {
            try {
                const data = await callCloudFunction(functions, "listOrgSubtree", { parentId: parentId ?? null });
                return (data?.nodes ?? []).map(mapOrgNode).filter((n) => n.id);
            }
            catch (error) {
                if (error instanceof FunctionsUnavailableError)
                    return [];
                throw error;
            }
        },
        async ensureOrgRoot() {
            try {
                const data = await callCloudFunction(functions, "ensureOrgRoot", {});
                return data?.node ? mapOrgNode(data.node) : null;
            }
            catch (error) {
                if (error instanceof FunctionsUnavailableError)
                    return null;
                throw error;
            }
        },
        async createOrgNode(input) {
            const data = await callCloudFunction(functions, "createOrgNode", input);
            return data?.node ? mapOrgNode(data.node) : null;
        },
        async updateOrgNode(input) {
            const data = await callCloudFunction(functions, "updateOrgNode", input);
            return data?.node ? mapOrgNode(data.node) : null;
        },
        async assignUserToOrgNode(uid, orgNodeId) {
            await callCloudFunction(functions, "assignUserToOrgNode", {
                uid,
                orgNodeId,
            });
        },
        async setUserRole(uid, role) {
            await callCloudFunction(functions, "setUserRole", { uid, role });
        },
    };
}
