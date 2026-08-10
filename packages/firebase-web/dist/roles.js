"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchRolePermissions = watchRolePermissions;
exports.loadPermissionsForRoles = loadPermissionsForRoles;
const firestore_1 = require("firebase/firestore");
const shared_1 = require("@pulse/shared");
function normalizeRoleId(roleId) {
    return roleId === "teacher" ? "instructor" : roleId.trim() || "guest";
}
/** Live permissions for a role slug (defaults until / while Firestore loads). */
function watchRolePermissions(db, roleId, onChange, onError) {
    const normalized = normalizeRoleId(roleId);
    onChange([...(0, shared_1.getDefaultPermissionsForRole)(normalized)]);
    return (0, firestore_1.onSnapshot)((0, firestore_1.doc)(db, "roles", normalized), (snap) => {
        onChange((0, shared_1.resolvePermissionsFromRoleDoc)(normalized, snap.data()));
    }, (error) => {
        onChange([...(0, shared_1.getDefaultPermissionsForRole)(normalized)]);
        onError?.(error);
    });
}
/** One-shot permissions for role slugs (used by instructor pickers). */
async function loadPermissionsForRoles(db, roleIds) {
    const unique = [...new Set(roleIds.map(normalizeRoleId))];
    const entries = await Promise.all(unique.map(async (roleId) => {
        try {
            const snap = await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, "roles", roleId));
            return [
                roleId,
                (0, shared_1.resolvePermissionsFromRoleDoc)(roleId, snap.data()),
            ];
        }
        catch {
            return [roleId, [...(0, shared_1.getDefaultPermissionsForRole)(roleId)]];
        }
    }));
    return Object.fromEntries(entries.map(([roleId, perms]) => [roleId, [...perms]]));
}
