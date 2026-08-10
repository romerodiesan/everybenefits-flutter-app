"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SsoConsumePage = SsoConsumePage;
exports.SsoBridgePage = SsoBridgePage;
exports.LogoutCascadePage = LogoutCascadePage;
exports.__resetSsoUiForTests = __resetSsoUiForTests;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const next_intl_1 = require("next-intl");
const navigation_1 = require("next/navigation");
const auth_1 = require("firebase/auth");
const client_1 = require("../client");
const errors_1 = require("../errors");
const paths_1 = require("../paths");
const urls_1 = require("../urls");
function waitForSignedIn(auth, timeoutMs = 8000) {
    return new Promise((resolve) => {
        if (auth.currentUser) {
            resolve(true);
            return;
        }
        const timer = window.setTimeout(() => {
            unsub();
            resolve(Boolean(auth.currentUser));
        }, timeoutMs);
        const unsub = (0, auth_1.onAuthStateChanged)(auth, (user) => {
            if (!user)
                return;
            window.clearTimeout(timer);
            unsub();
            resolve(true);
        });
    });
}
let ssoConsumePromise = null;
let ssoConsumeDone = false;
function consumeSsoOnce(opts) {
    if (ssoConsumeDone)
        return Promise.resolve();
    if (ssoConsumePromise)
        return ssoConsumePromise;
    ssoConsumePromise = (async () => {
        opts.initFirebase?.();
        const stashedToken = (0, client_1.readStashedCustomToken)();
        if (stashedToken) {
            opts.onStep?.("signin");
            await opts.signInWithCustomToken(stashedToken);
            (0, client_1.clearStashedCustomToken)();
            (0, client_1.clearSsoAttempt)();
            ssoConsumeDone = true;
            return;
        }
        if (opts.getAuth().currentUser) {
            (0, client_1.clearSsoAttempt)();
            ssoConsumeDone = true;
            return;
        }
        const code = (0, client_1.takeHandoffCode)();
        if (!code)
            throw new Error("missing-token");
        opts.onStep?.("exchange");
        let customToken;
        try {
            customToken = await (0, client_1.exchangeHandoffCode)(code, opts.getAppCheckToken);
            (0, client_1.clearHandoffCodeStash)();
        }
        catch (error) {
            const clientErr = (0, client_1.asSsoClientError)(error);
            if (clientErr.status === 401 &&
                (await waitForSignedIn(opts.getAuth(), 2500))) {
                (0, client_1.clearHandoffCodeStash)();
                (0, client_1.clearSsoAttempt)();
                ssoConsumeDone = true;
                return;
            }
            throw clientErr;
        }
        opts.onStep?.("signin");
        (0, client_1.stashCustomToken)(customToken);
        await opts.signInWithCustomToken(customToken);
        (0, client_1.clearStashedCustomToken)();
        (0, client_1.clearSsoAttempt)();
        ssoConsumeDone = true;
    })().catch((error) => {
        ssoConsumePromise = null;
        throw error;
    });
    return ssoConsumePromise;
}
function SsoConsumePage({ homePath = "/", rootRedirectPath, LoadingUI, signInWithCustomToken, getAuth, initFirebase, getAppCheckToken, }) {
    const t = (0, next_intl_1.useTranslations)();
    const locale = (0, next_intl_1.useLocale)();
    const params = (0, navigation_1.useSearchParams)();
    const [error, setError] = (0, react_1.useState)(null);
    const [step, setStep] = (0, react_1.useState)("token");
    (0, react_1.useEffect)(() => {
        let alive = true;
        const run = async () => {
            try {
                if (!ssoConsumeDone) {
                    await consumeSsoOnce({
                        signInWithCustomToken,
                        getAuth,
                        initFirebase,
                        getAppCheckToken,
                        onStep: (s) => {
                            if (alive)
                                setStep(s);
                        },
                    });
                }
                if (!alive)
                    return;
                setStep("open");
                const next = (0, paths_1.safeInternalPath)(params.get("next") || homePath, homePath);
                const root = rootRedirectPath ?? homePath;
                const destPath = next === "/" ? root : next;
                const suffix = destPath === "/" ? "" : destPath;
                window.location.replace(`/${locale}${suffix}`);
            }
            catch (err) {
                if (!alive)
                    return;
                const clientErr = (0, client_1.asSsoClientError)(err);
                setError(t((0, errors_1.ssoMessageKeyForCode)(clientErr.code)));
            }
        };
        void run();
        return () => {
            alive = false;
        };
    }, [
        getAppCheckToken,
        getAuth,
        homePath,
        initFirebase,
        locale,
        params,
        rootRedirectPath,
        signInWithCustomToken,
        t,
    ]);
    if (error) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "mesh-bg flex min-h-[100svh] items-center justify-center p-6 text-sm text-red-400", children: error }));
    }
    const hint = step === "exchange"
        ? t("ssoStepExchange")
        : step === "signin"
            ? t("ssoStepSignIn")
            : step === "open"
                ? t("ssoStepOpen")
                : t("ssoSigningIn");
    return (0, jsx_runtime_1.jsx)(LoadingUI, { hint: hint });
}
function SsoBridgePage({ loginPath = "/login", loadingMessageKey = "ssoBridging", buildHandoffUrl, useAuthState, }) {
    const t = (0, next_intl_1.useTranslations)();
    const locale = (0, next_intl_1.useLocale)();
    const params = (0, navigation_1.useSearchParams)();
    const { user, loading } = useAuthState();
    const [error, setError] = (0, react_1.useState)(null);
    const returnUrl = params.get("return");
    const invalidReturn = !returnUrl || !(0, urls_1.isAllowedSsoReturnUrl)(returnUrl);
    (0, react_1.useEffect)(() => {
        if (loading || invalidReturn || !returnUrl)
            return;
        const go = async () => {
            if (!user) {
                const resume = `/${locale}/auth/bridge?return=${encodeURIComponent(returnUrl)}`;
                const next = encodeURIComponent(resume);
                window.location.replace(`/${locale}${loginPath}?next=${next}`);
                return;
            }
            try {
                const idToken = await user.getIdToken();
                window.location.replace(await buildHandoffUrl(returnUrl, idToken));
            }
            catch (err) {
                const clientErr = (0, client_1.asSsoClientError)(err);
                setError(t((0, errors_1.ssoMessageKeyForCode)(clientErr.code)));
            }
        };
        void go();
    }, [
        buildHandoffUrl,
        invalidReturn,
        loading,
        locale,
        loginPath,
        returnUrl,
        t,
        user,
    ]);
    const message = invalidReturn
        ? t("ssoInvalidReturn")
        : (error ?? t(loadingMessageKey));
    return ((0, jsx_runtime_1.jsx)("div", { className: "mesh-bg flex min-h-[100svh] items-center justify-center px-4 text-sm text-muted", children: message }));
}
function LogoutCascadePage({ LoadingUI, signOutLocal, clearProfileCache, }) {
    const t = (0, next_intl_1.useTranslations)();
    const locale = (0, next_intl_1.useLocale)();
    const params = (0, navigation_1.useSearchParams)();
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        let alive = true;
        const run = async () => {
            try {
                // Always clear this origin once per page load (no module singleton —
                // Next soft-nav / Strict Mode must not skip sign-out).
                await signOutLocal();
                clearProfileCache?.();
                (0, client_1.clearSsoAttempt)();
                (0, client_1.markSsoAttempted)();
                const next = params.get("next");
                if (next && (0, urls_1.isAllowedLogoutNext)(next)) {
                    // Absolute cross-origin cascade URLs must not get a locale prefix.
                    if ((0, paths_1.isSafeInternalPath)(next)) {
                        window.location.replace(`/${locale}${next}`);
                    }
                    else {
                        window.location.replace(next);
                    }
                    return;
                }
                window.location.replace(`/${locale}/login`);
            }
            catch {
                if (alive)
                    setError(t("ssoFailed"));
            }
        };
        void run();
        return () => {
            alive = false;
        };
    }, [clearProfileCache, locale, params, signOutLocal, t]);
    if (error) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "mesh-bg flex min-h-[100svh] items-center justify-center p-6 text-sm text-red-400", children: error }));
    }
    return (0, jsx_runtime_1.jsx)(LoadingUI, { hint: t("logoutEverywhere") });
}
/** Reset module singletons (tests only). */
function __resetSsoUiForTests() {
    ssoConsumePromise = null;
    ssoConsumeDone = false;
}
