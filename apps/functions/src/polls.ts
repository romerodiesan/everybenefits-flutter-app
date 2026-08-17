import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { randomUUID } from "node:crypto";
import {
  emptyPollCounts,
  isPollOpen,
  pollUpsertSchema,
  votePollSchema,
  withPollCompatDefaults,
  bannerAudienceMatches,
  type Poll,
  type PollAudience,
  type PollLocalizedString,
  type PollOption,
  type PollSurface,
} from "@pulse/shared";
import { isUserApprovedForJoin } from "./auth";
import { requireActor, requireCaller } from "./guards";
import { db, callableOpts } from "./init";

const COLLECTION = "polls";

function millisOrNull(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    const fn = (value as { toMillis?: () => number }).toMillis;
    if (typeof fn === "function") return fn.call(value);
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asLocalized(
  value: unknown,
  fallback: PollLocalizedString = { en: "", es: "" },
): PollLocalizedString {
  if (!value || typeof value !== "object") return fallback;
  const record = value as Record<string, unknown>;
  return {
    en: typeof record.en === "string" ? record.en : fallback.en,
    es: typeof record.es === "string" ? record.es : fallback.es,
  };
}

function asOptions(value: unknown): PollOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const id =
        typeof record.id === "string" && record.id.trim()
          ? record.id.trim()
          : `o${index + 1}`;
      return { id, label: asLocalized(record.label) };
    })
    .filter((option): option is PollOption => Boolean(option));
}

function asCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) out[key] = Math.floor(n);
  }
  return out;
}

export function mapPoll(id: string, data: DocumentData): Poll {
  return withPollCompatDefaults({
    id,
    version: typeof data.version === "number" ? data.version : 1,
    active: data.active === true,
    surface: (data.surface as PollSurface) ?? "home",
    audiences: Array.isArray(data.audiences)
      ? (data.audiences.map(String) as PollAudience[])
      : ["all"],
    question: asLocalized(data.question),
    options: asOptions(data.options),
    allowChange: data.allowChange === true,
    showResultsBeforeVote: data.showResultsBeforeVote === true,
    dismissible: data.dismissible !== false,
    counts: asCounts(data.counts),
    voteCount: typeof data.voteCount === "number" ? data.voteCount : 0,
    startsAt: millisOrNull(data.startsAt),
    endsAt: millisOrNull(data.endsAt),
    createdAt: millisOrNull(data.createdAt),
    updatedAt: millisOrNull(data.updatedAt),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  });
}

async function requirePollAdmin(
  request: { auth?: { uid: string } },
  operation: string,
): Promise<string> {
  const actor = await requireActor(request, operation, {
    permission: "platform.manage",
  });
  return actor.uid;
}

function slugId(input?: string): string {
  const raw = (input ?? "").trim().toLowerCase();
  if (raw) return raw;
  return `poll-${randomUUID().slice(0, 8)}`;
}

export const listPolls = onCall(callableOpts, async (request) => {
  await requirePollAdmin(request, "listPolls");
  const snap = await db
    .collection(COLLECTION)
    .orderBy("updatedAt", "desc")
    .limit(200)
    .get();
  return { polls: snap.docs.map((doc) => mapPoll(doc.id, doc.data())) };
});

export const upsertPoll = onCall(callableOpts, async (request) => {
  const uid = await requirePollAdmin(request, "upsertPoll");
  const parsed = pollUpsertSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) =>
        issue.path.length
          ? `${issue.path.join(".")}: ${issue.message}`
          : issue.message,
      )
      .join("; ");
    throw new HttpsError("invalid-argument", detail || "Invalid poll payload.");
  }
  const input = parsed.data;
  const id = slugId(input.id);
  const ref = db.doc(`${COLLECTION}/${id}`);
  const existing = await ref.get();
  const prev = existing.data() ?? {};
  const prevVersion =
    typeof prev.version === "number" ? Number(prev.version) : 1;
  const nextVersion = input.bumpVersion
    ? prevVersion + 1
    : typeof input.version === "number"
      ? input.version
      : prevVersion;

  const prevCounts = asCounts(prev.counts);
  const counts = emptyPollCounts(input.options);
  let voteCount = 0;
  for (const option of input.options) {
    const n = Math.max(0, Number(prevCounts[option.id] ?? 0));
    counts[option.id] = n;
    voteCount += n;
  }

  const payload: Record<string, unknown> = {
    version: nextVersion,
    active: input.active ?? (existing.exists ? prev.active === true : true),
    surface: input.surface,
    audiences: input.audiences,
    question: input.question,
    options: input.options,
    allowChange: input.allowChange === true,
    showResultsBeforeVote: input.showResultsBeforeVote === true,
    dismissible: input.dismissible !== false,
    counts,
    voteCount,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  };

  if (!existing.exists) {
    payload.createdAt = FieldValue.serverTimestamp();
    await ref.set(payload);
  } else {
    await ref.set(payload, { merge: true });
  }

  const fresh = await ref.get();
  return { poll: mapPoll(id, fresh.data() ?? {}) };
});

export const deletePoll = onCall(callableOpts, async (request) => {
  await requirePollAdmin(request, "deletePoll");
  const id = String(request.data?.id ?? "").trim();
  if (!id) throw new HttpsError("invalid-argument", "id required.");
  const hard = request.data?.hard === true;
  const ref = db.doc(`${COLLECTION}/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Poll not found.");
  if (hard) {
    await ref.delete();
    return { ok: true, deleted: true };
  }
  await ref.set(
    {
      active: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { ok: true, deleted: false };
});

export const votePoll = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "votePoll");
  const parsed = votePollSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "pollId and optionId required.");
  }
  const { pollId, optionId } = parsed.data;
  const userSnap = await db.doc(`users/${uid}`).get();
  const user = userSnap.data() ?? {};
  if (user.isAnonymous === true || !isUserApprovedForJoin(user)) {
    throw new HttpsError("permission-denied", "Approved members only.");
  }

  const pollRef = db.doc(`${COLLECTION}/${pollId}`);
  const voteRef = pollRef.collection("votes").doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const pollSnap = await tx.get(pollRef);
    if (!pollSnap.exists) throw new HttpsError("not-found", "Poll not found.");
    const poll = mapPoll(pollId, pollSnap.data() ?? {});
    if (!isPollOpen(poll)) {
      throw new HttpsError("failed-precondition", "This poll is closed.");
    }
    if (
      !bannerAudienceMatches(
        poll.audiences,
        String(user.role ?? ""),
        user.isAnonymous === true,
      )
    ) {
      throw new HttpsError("permission-denied", "Not in poll audience.");
    }
    if (!poll.options.some((option) => option.id === optionId)) {
      throw new HttpsError("invalid-argument", "Unknown option.");
    }

    const voteSnap = await tx.get(voteRef);
    const previous = String(voteSnap.data()?.optionId ?? "");
    if (voteSnap.exists && previous === optionId) {
      return poll;
    }
    if (voteSnap.exists && !poll.allowChange) {
      throw new HttpsError("already-exists", "Already voted.");
    }

    const counts = { ...poll.counts };
    if (previous && counts[previous] != null) {
      counts[previous] = Math.max(0, Number(counts[previous] ?? 0) - 1);
    }
    counts[optionId] = Math.max(0, Number(counts[optionId] ?? 0) + 1);
    const voteCount = voteSnap.exists
      ? poll.voteCount
      : poll.voteCount + 1;

    tx.set(
      pollRef,
      {
        counts,
        voteCount,
      },
      { merge: true },
    );
    tx.set(voteRef, {
      optionId,
      createdAt: voteSnap.exists
        ? (voteSnap.data()?.createdAt ?? FieldValue.serverTimestamp())
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return withPollCompatDefaults({
      ...poll,
      counts,
      voteCount,
    });
  });

  return { poll: result, optionId };
});
