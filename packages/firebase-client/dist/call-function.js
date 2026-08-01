"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionsUnavailableError = void 0;
exports.callCloudFunction = callCloudFunction;
const functions_1 = require("firebase/functions");
const client_1 = require("./client");
class FunctionsUnavailableError extends Error {
    code = "functions-unavailable";
    constructor(name) {
        super(`Cloud Function "${name}" is unavailable. Start the Functions emulator or deploy functions.`);
        this.name = "FunctionsUnavailableError";
    }
}
exports.FunctionsUnavailableError = FunctionsUnavailableError;
function isUnavailable(error) {
    const code = typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
        ? error.code.replace(/^functions\//, "")
        : "";
    return (code === "unavailable" ||
        code === "not-found" ||
        code === "unimplemented" ||
        code === "internal" ||
        code === "deadline-exceeded");
}
/**
 * Invokes a Firebase callable via the JS SDK.
 * With `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` this hits `127.0.0.1:5001`.
 */
async function callCloudFunction(name, data = {}, options) {
    try {
        const callable = (0, functions_1.httpsCallable)((0, client_1.getFirebaseFunctions)(), name, options?.timeoutMs != null ? { timeout: options.timeoutMs } : undefined);
        const result = await callable(data);
        return result.data;
    }
    catch (error) {
        if (isUnavailable(error)) {
            throw new FunctionsUnavailableError(name);
        }
        throw error;
    }
}
