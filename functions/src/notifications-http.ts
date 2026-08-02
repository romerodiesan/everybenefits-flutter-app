import { HttpsError, onCall } from "firebase-functions/v2/https";
import { callableOpts } from "./init";
import { requireCaller } from "./auth";
import { markNotificationsRead } from "./notifications";

export const markNotificationRead = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "markNotificationRead");
  const ids = Array.isArray(request.data?.notificationIds)
    ? request.data.notificationIds.map(String).filter(Boolean)
    : [];
  const notificationId = String(request.data?.notificationId ?? "");
  const all = ids.length
    ? ids
    : notificationId
      ? [notificationId]
      : [];
  if (!all.length) {
    throw new HttpsError("invalid-argument", "notificationId required");
  }
  return markNotificationsRead(uid, all);
});

export const markAllNotificationsRead = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "markAllNotificationsRead");
  return markNotificationsRead(uid, "all");
});
