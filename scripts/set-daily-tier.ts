#!/usr/bin/env npx tsx
/**
 * Set tier: "daily" on a vault_collection.
 * Uses Firebase client SDK (same as vault.vual.jp).
 *
 * Usage:
 *   npx tsx scripts/set-daily-tier.ts           # list all collections
 *   npx tsx scripts/set-daily-tier.ts <id>      # set tier: "daily" on that collection
 */
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

const db = getFirestore(app);

async function main() {
  const targetId = process.argv[2];

  const snapshot = await getDocs(collection(db, "vault_collections"));
  const docs = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      city: data.city || "",
      subtitle: data.subtitle || "",
      published: data.published ?? false,
      tier: data.tier || "(none)",
      hasRecipe: data.hasRecipe ?? false,
      mediaCount: (data.media || []).length,
    };
  });

  if (!targetId) {
    console.log("\nAll vault_collections:\n");
    for (const d of docs) {
      console.log(
        `  ${d.id.padEnd(40)} | ${d.city.padEnd(25)} | sub=${d.subtitle.padEnd(15)} | pub=${d.published} | tier=${d.tier.padEnd(6)} | recipe=${d.hasRecipe} | media=${d.mediaCount}`
      );
    }
    console.log(`\nTotal: ${docs.length}`);
    console.log("\nUsage: npx tsx scripts/set-daily-tier.ts <collectionId>");
    process.exit(0);
  }

  const found = docs.find((d) => d.id === targetId);
  if (!found) {
    console.error(`Collection "${targetId}" not found`);
    process.exit(1);
  }

  await updateDoc(doc(db, "vault_collections", targetId), { tier: "daily" });
  console.log(`✓ Set tier: "daily" on "${targetId}" (${found.city})`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
