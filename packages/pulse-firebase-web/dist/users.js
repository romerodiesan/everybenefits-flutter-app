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
        photoUrl: asString(data.photoUrl),
        role: (0, shared_1.parseRole)(data.role),
        isAnonymous: data.isAnonymous === true,
        profileCompleted: data.profileCompleted !== false,
        productTourVersion: typeof data.productTourVersion === "number"
            ? data.productTourVersion
            : undefined,
        phoneCountryCode: asString(data.phoneCountryCode),
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
        orgNodeId: asString(data.orgNodeId),
        createdAt: (0, dates_1.toDate)(data.createdAt),
        updatedAt: (0, dates_1.toDate)(data.updatedAt),
        accountStatus,
        approvalStatus,
    };
}
