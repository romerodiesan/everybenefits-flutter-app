import { type Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import type { AppCheck } from "firebase-admin/app-check";
export type SsoAdminDeps = {
    adminAppCheck: () => AppCheck;
    adminAuth: () => Auth;
    adminDb: () => Firestore;
    usingEmulators: () => boolean;
};
export declare class SsoHttpError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(status: number, code: string, message: string);
    toResponse(): Response;
}
export declare function createSsoServer(deps: SsoAdminDeps): {
    createSsoHandoffCode: (request: Request, idToken: string) => Promise<{
        code: string;
        uid: string;
    }>;
    exchangeSsoHandoffCode: (request: Request, code: string) => Promise<{
        customToken: string;
        uid: string;
    }>;
    verifySsoAppCheck: (request: Request) => Promise<void>;
    createHandoffPostHandler: () => (request: Request) => Promise<Response>;
    createExchangePostHandler: () => (request: Request) => Promise<Response>;
};
