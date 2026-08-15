"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapUserProfile = mapUserProfile;
const shared_1 = require("@pulse/shared");
const dates_1 = require("./dates");
function asString(value) {
    return typeof value === "string" ? value : null;
}
function mapUserProfile(id, data) {
    const accountStatus = data.accountStatus === "deactivated" ||
        data.accountStatus === "pendingDeletion"
        ? data.accountStatus
        : data.accountStatus === "active"
            ? "active"
            : undefined;
    const approvalStatus = data.approvalStatus === "pending" ||
        data.approvalStatus === "approved" ||
        data.approvalStatus === "rejected"
        ? data.approvalStatus
        : undefined;
    return {
        uid: id,
        email: asString(data.email),
        displayName: asString(data.displayName),
        username: asString(data.username),
        photoUrl: asString(data.photoUrl),
        role: (0, shared_1.parseRole)(data.role),
        isAnonymous: data.isAnonymous === true,
        profileCompleted: data.profileCompleted !== false,
        productTourVersion: typeof data.productTourVersion === "number"
            ? data.productTourVersion
            : undefined,
        phoneCountryCode: asString(data.phoneCountryCode),
        phoneCountryIso2: asString(data.phoneCountryIso2),
        phoneNumber: asString(data.phoneNumber),
        phoneVerified: typeof data.phoneVerified === "boolean" ? data.phoneVerified : undefined,
        npn: asString(data.npn),
        address: asString(data.address),
        addressStreet: asString(data.addressStreet),
        addressApt: asString(data.addressApt),
        addressCity: asString(data.addressCity),
        addressState: asString(data.addressState),
        addressZip: asString(data.addressZip),
        agency: asString(data.agency),
        bio: asString(data.bio),
        orgNodeId: asString(data.orgNodeId),
        createdAt: (0, dates_1.toDate)(data.createdAt),
        updatedAt: (0, dates_1.toDate)(data.updatedAt),
        accountStatus,
        approvalStatus,
        profileBadge: parsePublicBadge(data.profileBadge, data.appearance),
    };
}
function parsePublicBadge(raw, appearance) {
    if (!raw || typeof raw !== "object")
        return null;
    const data = raw;
    if (data.enabled === false)
        return null;
    const text = typeof data.text === "string" ? data.text.trim() : "";
    if (!text)
        return null;
    const accent = (0, shared_1.appearanceAccentFrom)(appearance);
    const backgroundColor = typeof data.backgroundColor === "string" && data.backgroundColor.startsWith("#")
        ? data.backgroundColor
        : (0, shared_1.resolveBadgeBackgroundColor)(typeof data.color === "string" ? data.color : "accent", accent);
    return {
        text: text.slice(0, 40),
        icon: typeof data.icon === "string" ? data.icon : "badge",
        backgroundColor,
    };
}
