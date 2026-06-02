import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

async function main() {
  const db = getFirestore(app);
  const snapshot = await getDocs(collection(db, "vault_collections"));
  let count = 0;
  for (const d of snapshot.docs) {
    const tier = d.data().tier;
    if (tier !== "daily") {
      await updateDoc(doc(db, "vault_collections", d.id), { tier: "daily" });
      console.log("✓", d.id, "→ daily");
      count++;
    } else {
      console.log("  (skip)", d.id, "— already daily");
    }
  }
  console.log("\nDone:", count, "updated");
  process.exit(0);
}

main().catch(console.error);
