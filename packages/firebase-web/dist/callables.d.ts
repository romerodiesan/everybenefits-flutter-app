import { type Functions } from "firebase/functions";
export declare class FunctionsUnavailableError extends Error {
    constructor(message?: string);
}
/**
 * Shared callable invoker for Next clients (admin / payments / studio / web).
 */
export declare function callCloudFunction<T>(functions: Functions, name: string, data?: unknown, options?: {
    timeoutMs?: number;
}): Promise<T>;
//# sourceMappingURL=callables.d.ts.map