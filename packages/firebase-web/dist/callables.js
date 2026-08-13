"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionsUnavailableError = void 0;
exports.callCloudFunction = callCloudFunction;
const functions_1 = require("firebase/functions");
class FunctionsUnavailableError extends Error {
    constructor(message = "Cloud Functions unavailable") {
        super(message);
        this.name = "FunctionsUnavailableError";
    }
}
exports.FunctionsUnavailableError = FunctionsUnavailableError;
function isUnavailableCode(code) {
    const normalized = code.replace(/^functions\//, "");
    return (normalized.includes("unavailable") ||
        normalized.includes("not-found") ||
        normalized.includes("failed-precondition") ||
        normalized.includes("unimplemented") ||
        normalized.includes("deadline-exceeded"));
}
/**
 * Shared callable invoker for Next clients (admin / payments / studio / web).
 */
async function callCloudFunction(functions, name, data, options) {
    try {
        const callable = (0, functions_1.httpsCallable)(functions, name, options?.timeoutMs != null ? { timeout: options.timeoutMs } : undefined);
        const result = await callable(data ?? {});
        return result.data;
    }
    catch (error) {
        const code = error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "";
        if (isUnavailableCode(code)) {
            throw new FunctionsUnavailableError(error instanceof Error ? error.message : String(error));
        }
        throw error;
    }
}
