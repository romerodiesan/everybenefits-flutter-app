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
function mapRoleDoc(entry) {
    const category = String(entry.category ?? "custom");
    return {
        id: String(entry.id ?? ""),
        name: String(entry.name ?? ""),
        description: typeof entry.description === "string" ? entry.description : undefined,
        category: category || "custom",
        permissions: Array.isArray(entry.permissions)
            ? entry.permissions.map(String)
            : [],
        builtIn: entry.builtIn === true,
        editableBySystemOnly: entry.editableBySystemOnly === true,
        locked: entry.locked === true,
        active: entry.active !== false,
        sortOrder: typeof entry.sortOrder === "number" ? entry.sortOrder : 100,
        createdAt: typeof entry.createdAt === "number" ? entry.createdAt : null,
        updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : null,
        updatedBy: typeof entry.updatedBy === "string" ? entry.updatedBy : null,
    };
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
        createdAt: typeof entry.createdAt === "number" ? entry.createdAt : null,
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
                const data = await callCloudFunction(functions, "listUsersForAdmin", {
                    ...filters,
                    pageSize: filters?.pageSize ?? filters?.limit ?? 25,
                    pageToken: filters?.pageToken ?? undefined,
                });
                return {
                    users: (data?.users ?? [])
                        .map(mapAdminUserRow)
                        .filter((p) => p.uid),
                    nextPageToken: data?.nextPageToken ?? null,
                };
            }
            catch (error) {
                if (error instanceof FunctionsUnavailableError) {
                    return { users: [], nextPageToken: null };
                }
                throw error;
            }
        },
        async createUser(input) {
            const data = await callCloudFunction(functions, "adminCreateUser", input);
            return data?.user ? mapAdminUserRow(data.user) : null;
        },
        async updateUser(input) {
            const data = await callCloudFunction(functions, "adminUpdateUser", input);
            return data?.user ? mapAdminUserRow(data.user) : null;
        },
        async deactivateUser(uid) {
            await callCloudFunction(functions, "adminDeactivateUser", { uid });
        },
        async reactivateUser(uid) {
            await callCloudFunction(functions, "adminReactivateUser", { uid });
        },
        async bulkSetUserApproval(uids, status) {
            return await callCloudFunction(functions, "bulkSetUserApproval", { uids, status });
        },
        async bulkSetUserAccountStatus(uids, status) {
            return await callCloudFunction(functions, "bulkSetUserAccountStatus", { uids, status });
        },
        async bulkSetUserRole(uids, role) {
            return await callCloudFunction(functions, "bulkSetUserRole", { uids, role });
        },
        async bulkAssignUsersToOrgNode(uids, orgNodeId) {
            return await callCloudFunction(functions, "bulkAssignUsersToOrgNode", { uids, orgNodeId });
        },
        async bulkSetOrgNodesActive(ids, active) {
            return await callCloudFunction(functions, "bulkSetOrgNodesActive", { ids, active });
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
        async listOrgSubtree(parentId, opts) {
            try {
                const data = await callCloudFunction(functions, "listOrgSubtree", {
                    parentId: parentId ?? null,
                    full: opts?.full === true,
                    includeInactive: opts?.includeInactive === true,
                });
                return (data?.nodes ?? []).map(mapOrgNode).filter((n) => n.id);
            }
            catch (error) {
                if (error instanceof FunctionsUnavailableError)
                    return [];
                throw error;
            }
        },
        async listAgencies(opts) {
            try {
                const data = await callCloudFunction(functions, "listAgenciesForAdmin", opts ?? {});
                return {
                    agencies: (data?.agencies ?? []).map(mapOrgNode).filter((n) => n.id),
                    nextPageToken: data?.nextPageToken ?? null,
                };
            }
            catch (error) {
                if (error instanceof FunctionsUnavailableError) {
                    return { agencies: [], nextPageToken: null };
                }
                throw error;
            }
        },
        async listOrgNodesByType(type, pageSize = 100) {
            try {
                const data = await callCloudFunction(functions, "listOrgNodesByType", { type, pageSize });
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
        async listRoles(filters) {
            try {
                const data = await callCloudFunction(functions, "listRoles", filters ?? {});
                return {
                    roles: (data?.roles ?? [])
                        .map(mapRoleDoc)
                        .filter((r) => r.id),
                };
            }
            catch (error) {
                if (error instanceof FunctionsUnavailableError) {
                    return { roles: [] };
                }
                throw error;
            }
        },
        async createRole(input) {
            const data = await callCloudFunction(functions, "createRole", input);
            return data?.role ? mapRoleDoc(data.role) : null;
        },
        async updateRole(input) {
            const data = await callCloudFunction(functions, "updateRole", input);
            return data?.role ? mapRoleDoc(data.role) : null;
        },
        async deleteRole(id, hard = false) {
            await callCloudFunction(functions, "deleteRole", { id, hard });
        },
        async seedSystemRoles() {
            const data = await callCloudFunction(functions, "seedSystemRoles", {});
            return {
                roles: (data?.roles ?? []).map(mapRoleDoc).filter((r) => r.id),
            };
        },
    };
}
