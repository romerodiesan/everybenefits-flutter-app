export declare class FunctionsUnavailableError extends Error {
    code: string;
    constructor(name: string);
}
export type CallCloudFunctionOptions = {
    /** Passed through to `httpsCallable` as `timeout` (ms). */
    timeoutMs?: number;
};
/**
 * Invokes a Firebase callable via the JS SDK.
 * With `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` this hits `127.0.0.1:5001`.
 */
export declare function callCloudFunction<TResult = unknown>(name: string, data?: unknown, options?: CallCloudFunctionOptions): Promise<TResult>;
