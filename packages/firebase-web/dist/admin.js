"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callCloudFunction = exports.FunctionsUnavailableError = void 0;
exports.mapAdminUserRow = mapAdminUserRow;
exports.mapOrgNode = mapOrgNode;
exports.createAdminRepository = createAdminRepository;
const shared_1 = require("@pulse/shared");
const callables_1 = require("./callables");
Object.defineProperty(exports, "FunctionsUnavailableError", { enumerable: true, get: function () { return callables_1.FunctionsUnavailableError; } });
Object.defineProperty(exports, "callCloudFunction", { enumerable: true, get: function () { return callables_1.callCloudFunction; } });
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
        badgeText: typeof entry.badgeText === "string" ? entry.badgeText : null,
        badgeIcon: typeof entry.badgeIcon === "string" ? entry.badgeIcon : null,
        badgeColor: typeof entry.badgeColor === "string" ? entry.badgeColor : null,
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
        profileBadge: entry.profileBadge && typeof entry.profileBadge === "object"
            ? {
                enabled: entry.profileBadge.enabled === true,
                text: String(entry.profileBadge.text ?? ""),
                icon: String(entry.profileBadge.icon ?? "badge"),
                color: String(entry.profileBadge.color ?? "accent"),
            }
            : null,
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
function stringOrNull(value) {
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim();
    return trimmed || null;
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
        ownerUids: Array.isArray(entry.ownerUids)
            ? entry.ownerUids.map(String).filter(Boolean)
            : [],
        logoUrl: stringOrNull(entry.logoUrl),
        email: stringOrNull(entry.email),
        paymentsEmail: stringOrNull(entry.paymentsEmail),
        npn: stringOrNull(entry.npn),
        agencyLicense: stringOrNull(entry.agencyLicense),
        ein: stringOrNull(entry.ein),
        active: entry.active !== false,
    };
}
function mapPromoBanner(entry) {
    const localized = (value) => {
        if (!value || typeof value !== "object")
            return { en: "", es: "" };
        const record = value;
        return {
            en: typeof record.en === "string" ? record.en : "",
            es: typeof record.es === "string" ? record.es : "",
        };
    };
    return (0, shared_1.withBannerCompatDefaults)({
        id: String(entry.id ?? ""),
        version: typeof entry.version === "number" ? entry.version : 1,
        active: entry.active === true,
        type: entry.type,
        format: entry.format,
        surface: entry.surface ?? "home",
        audiences: Array.isArray(entry.audiences)
            ? entry.audiences.map(String)
            : ["all"],
        dismissible: entry.dismissible !== false,
        showCta: entry.showCta !== false,
        showImage: typeof entry.showImage === "boolean" ? entry.showImage : undefined,
        eyebrow: localized(entry.eyebrow),
        title: localized(entry.title),
        body: localized(entry.body),
        ctaLabel: localized(entry.ctaLabel),
        href: typeof entry.href === "string" ? entry.href : "",
        imageUrl: typeof entry.imageUrl === "string" ? entry.imageUrl : null,
        imagePath: typeof entry.imagePath === "string" ? entry.imagePath : null,
        startsAt: typeof entry.startsAt === "number" ? entry.startsAt : null,
        endsAt: typeof entry.endsAt === "number" ? entry.endsAt : null,
        createdAt: typeof entry.createdAt === "number" ? entry.createdAt : null,
        updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : null,
        updatedBy: typeof entry.updatedBy === "string" ? entry.updatedBy : null,
    });
}
function mapPoll(entry) {
    const localized = (value) => {
        if (!value || typeof value !== "object")
            return { en: "", es: "" };
        const record = value;
        return {
            en: typeof record.en === "string" ? record.en : "",
            es: typeof record.es === "string" ? record.es : "",
        };
    };
    const options = Array.isArray(entry.options)
        ? entry.options
            .map((raw, index) => {
            if (!raw || typeof raw !== "object")
                return null;
            const record = raw;
            return {
                id: typeof record.id === "string" && record.id.trim()
                    ? record.id.trim()
                    : `o${index + 1}`,
                label: localized(record.label),
            };
        })
            .filter((option) => Boolean(option))
        : [];
    const counts = {};
    if (entry.counts && typeof entry.counts === "object") {
        for (const [key, value] of Object.entries(entry.counts)) {
            const n = Number(value);
            if (Number.isFinite(n))
                counts[key] = n;
        }
    }
    return (0, shared_1.withPollCompatDefaults)({
        id: String(entry.id ?? ""),
        version: typeof entry.version === "number" ? entry.version : 1,
        active: entry.active === true,
        surface: entry.surface ?? "home",
        audiences: Array.isArray(entry.audiences)
            ? entry.audiences.map(String)
            : ["all"],
        question: localized(entry.question),
        options,
        allowChange: entry.allowChange === true,
        showResultsBeforeVote: entry.showResultsBeforeVote === true,
        dismissible: entry.dismissible !== false,
        counts,
        voteCount: typeof entry.voteCount === "number" ? entry.voteCount : 0,
        startsAt: typeof entry.startsAt === "number" ? entry.startsAt : null,
        endsAt: typeof entry.endsAt === "number" ? entry.endsAt : null,
        createdAt: typeof entry.createdAt === "number" ? entry.createdAt : null,
        updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : null,
        updatedBy: typeof entry.updatedBy === "string" ? entry.updatedBy : null,
    });
}
function createAdminRepository(functions) {
    return {
        async listUsers(filters) {
            try {
                const data = await (0, callables_1.callCloudFunction)(functions, "listUsersForAdmin", {
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
                if (error instanceof callables_1.FunctionsUnavailableError) {
                    return { users: [], nextPageToken: null };
                }
                throw error;
            }
        },
        async createUser(input) {
            const data = await (0, callables_1.callCloudFunction)(functions, "adminCreateUser", input);
            return data?.user ? mapAdminUserRow(data.user) : null;
        },
        async updateUser(input) {
            const data = await (0, callables_1.callCloudFunction)(functions, "adminUpdateUser", input);
            return data?.user ? mapAdminUserRow(data.user) : null;
        },
        async deactivateUser(uid) {
            await (0, callables_1.callCloudFunction)(functions, "adminDeactivateUser", { uid });
        },
        async reactivateUser(uid) {
            await (0, callables_1.callCloudFunction)(functions, "adminReactivateUser", { uid });
        },
        async bulkSetUserApproval(uids, status) {
            return await (0, callables_1.callCloudFunction)(functions, "bulkSetUserApproval", { uids, status });
        },
        async bulkSetUserAccountStatus(uids, status) {
            return await (0, callables_1.callCloudFunction)(functions, "bulkSetUserAccountStatus", { uids, status });
        },
        async bulkSetUserRole(uids, role) {
            return await (0, callables_1.callCloudFunction)(functions, "bulkSetUserRole", { uids, role });
        },
        async bulkAssignUsersToOrgNode(uids, orgNodeId) {
            return await (0, callables_1.callCloudFunction)(functions, "bulkAssignUsersToOrgNode", { uids, orgNodeId });
        },
        async bulkSetOrgNodesActive(ids, active) {
            return await (0, callables_1.callCloudFunction)(functions, "bulkSetOrgNodesActive", { ids, active });
        },
        async getInsights() {
            try {
                return await (0, callables_1.callCloudFunction)(functions, "getAdminInsights", {});
            }
            catch (error) {
                if (error instanceof callables_1.FunctionsUnavailableError)
                    return null;
                throw error;
            }
        },
        async listOrgSubtree(parentId, opts) {
            try {
                const data = await (0, callables_1.callCloudFunction)(functions, "listOrgSubtree", {
                    parentId: parentId ?? null,
                    full: opts?.full === true,
                    includeInactive: opts?.includeInactive === true,
                });
                return (data?.nodes ?? []).map(mapOrgNode).filter((n) => n.id);
            }
            catch (error) {
                if (error instanceof callables_1.FunctionsUnavailableError)
                    return [];
                throw error;
            }
        },
        async listAgencies(opts) {
            const data = await (0, callables_1.callCloudFunction)(functions, "listAgenciesForAdmin", opts ?? {});
            return {
                agencies: (data?.agencies ?? []).map(mapOrgNode).filter((n) => n.id),
                nextPageToken: data?.nextPageToken ?? null,
            };
        },
        async listOrgNodesByType(type, pageSize = 100) {
            const data = await (0, callables_1.callCloudFunction)(functions, "listOrgNodesByType", { type, pageSize });
            return (data?.nodes ?? []).map(mapOrgNode).filter((n) => n.id);
        },
        async ensureOrgRoot() {
            try {
                const data = await (0, callables_1.callCloudFunction)(functions, "ensureOrgRoot", {});
                return data?.node ? mapOrgNode(data.node) : null;
            }
            catch (error) {
                if (error instanceof callables_1.FunctionsUnavailableError)
                    return null;
                throw error;
            }
        },
        async createOrgNode(input) {
            const data = await (0, callables_1.callCloudFunction)(functions, "createOrgNode", input);
            return data?.node ? mapOrgNode(data.node) : null;
        },
        async updateOrgNode(input) {
            const data = await (0, callables_1.callCloudFunction)(functions, "updateOrgNode", input);
            return data?.node ? mapOrgNode(data.node) : null;
        },
        async assignUserToOrgNode(uid, orgNodeId) {
            await (0, callables_1.callCloudFunction)(functions, "assignUserToOrgNode", {
                uid,
                orgNodeId,
            });
        },
        async migrateSubAgenciesToAgencies() {
            const data = await (0, callables_1.callCloudFunction)(functions, "migrateSubAgenciesToAgencies", {});
            return {
                scanned: Number(data?.scanned ?? 0),
                updated: Number(data?.updated ?? 0),
                done: data?.done !== false,
            };
        },
        async uploadOrgLogo(input) {
            const data = await (0, callables_1.callCloudFunction)(functions, "uploadOrgLogo", input);
            if (!data?.downloadUrl)
                return null;
            return {
                downloadUrl: String(data.downloadUrl),
                path: String(data.path ?? ""),
            };
        },
        async setUserRole(uid, role) {
            await (0, callables_1.callCloudFunction)(functions, "setUserRole", { uid, role });
        },
        async listRoles(filters) {
            try {
                const data = await (0, callables_1.callCloudFunction)(functions, "listRoles", filters ?? {});
                return {
                    roles: (data?.roles ?? [])
                        .map(mapRoleDoc)
                        .filter((r) => r.id),
                };
            }
            catch (error) {
                if (error instanceof callables_1.FunctionsUnavailableError) {
                    return { roles: [] };
                }
                throw error;
            }
        },
        async createRole(input) {
            const data = await (0, callables_1.callCloudFunction)(functions, "createRole", input);
            return data?.role ? mapRoleDoc(data.role) : null;
        },
        async updateRole(input) {
            const data = await (0, callables_1.callCloudFunction)(functions, "updateRole", input);
            return data?.role ? mapRoleDoc(data.role) : null;
        },
        async deleteRole(id, hard = false) {
            await (0, callables_1.callCloudFunction)(functions, "deleteRole", { id, hard });
        },
        async seedSystemRoles() {
            const data = await (0, callables_1.callCloudFunction)(functions, "seedSystemRoles", {});
            return {
                roles: (data?.roles ?? []).map(mapRoleDoc).filter((r) => r.id),
            };
        },
        async backfillUserSearchFields(input) {
            const data = await (0, callables_1.callCloudFunction)(functions, "backfillUserSearchFields", {
                pageSize: input?.pageSize,
                pageToken: input?.pageToken ?? undefined,
            });
            return {
                scanned: Number(data?.scanned ?? 0),
                updated: Number(data?.updated ?? 0),
                done: Boolean(data?.done),
                nextPageToken: data?.nextPageToken ?? null,
            };
        },
        async listPromoBanners() {
            try {
                const data = await (0, callables_1.callCloudFunction)(functions, "listPromoBanners", {});
                return {
                    banners: (data?.banners ?? [])
                        .map(mapPromoBanner)
                        .filter((b) => b.id),
                };
            }
            catch (error) {
                if (error instanceof callables_1.FunctionsUnavailableError) {
                    return { banners: [] };
                }
                throw error;
            }
        },
        async upsertPromoBanner(input) {
            const data = await (0, callables_1.callCloudFunction)(functions, "upsertPromoBanner", input);
            return data?.banner ? mapPromoBanner(data.banner) : null;
        },
        async deletePromoBanner(id, hard = false) {
            await (0, callables_1.callCloudFunction)(functions, "deletePromoBanner", { id, hard });
        },
        async uploadPromoBannerImage(input) {
            const data = await (0, callables_1.callCloudFunction)(functions, "uploadPromoBannerImage", input);
            if (!data?.downloadUrl)
                return null;
            return {
                downloadUrl: String(data.downloadUrl),
                path: String(data.path ?? ""),
            };
        },
        async listPolls() {
            try {
                const data = await (0, callables_1.callCloudFunction)(functions, "listPolls", {});
                return {
                    polls: (data?.polls ?? []).map(mapPoll).filter((poll) => poll.id),
                };
            }
            catch (error) {
                if (error instanceof callables_1.FunctionsUnavailableError) {
                    return { polls: [] };
                }
                throw error;
            }
        },
        async upsertPoll(input) {
            const data = await (0, callables_1.callCloudFunction)(functions, "upsertPoll", input);
            return data?.poll ? mapPoll(data.poll) : null;
        },
        async deletePoll(id, hard = false) {
            await (0, callables_1.callCloudFunction)(functions, "deletePoll", { id, hard });
        },
    };
}
