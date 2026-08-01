import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp({
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ||
    "https://every-benefits-us-default-rtdb.firebaseio.com",
});
setGlobalOptions({ region: "us-central1", maxInstances: 20 });
