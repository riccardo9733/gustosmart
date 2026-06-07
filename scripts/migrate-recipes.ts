/**
 * Migration Script: Existing Recipes → Global Catalog + Personal Collection
 *
 * This one-shot script migrates recipes from the old schema (recipes/{id} with userId field)
 * to the new schema:
 *   - /recipes/{id} (global, immutable, no userId)
 *   - /users/{uid}/recipes/{id} (personal collection with reference)
 *
 * Run with:
 *   npx ts-node --project tsconfig.json scripts/migrate-recipes.ts
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON
 *   - Or run with firebase-admin initialized with default credentials
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin with application default credentials
if (!admin.apps.length) {
  admin.initializeApp({
    // If running locally, set GOOGLE_APPLICATION_CREDENTIALS env var
    // or initialize with a service account:
    // credential: admin.credential.cert(require("../path/to/serviceAccount.json")),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gustosmart",
  });
}

const db = admin.firestore();

async function migrateRecipes() {
  console.log("🚀 Avvio migrazione ricette...\n");

  // 1. Fetch all existing recipes with a userId field (old schema)
  const recipesSnap = await db.collection("recipes")
    .where("userId", "!=", "")
    .get();

  if (recipesSnap.empty) {
    console.log("✅ Nessuna ricetta da migrare (campo userId non trovato). Migrazione completata.");
    return;
  }

  console.log(`📦 Trovate ${recipesSnap.size} ricette da migrare.\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const recipeDoc of recipesSnap.docs) {
    const data = recipeDoc.data();
    const recipeId = recipeDoc.id;
    const userId = data.userId;

    if (!userId) {
      console.log(`⚠️  Ricetta ${recipeId}: userId mancante, skip.`);
      skipped++;
      continue;
    }

    try {
      const batch = db.batch();

      // 2. Update the global recipe: remove userId, add createdBy
      const globalRef = db.collection("recipes").doc(recipeId);
      batch.update(globalRef, {
        createdBy: userId,
        userId: admin.firestore.FieldValue.delete(), // Remove old field
      });

      // 3. Create personal reference in users/{uid}/recipes/{recipeId}
      const userRecipeRef = db
        .collection("users")
        .doc(userId)
        .collection("recipes")
        .doc(recipeId);

      // Check if personal doc already exists (idempotent migration)
      const existingSnap = await userRecipeRef.get();
      if (!existingSnap.exists) {
        batch.set(userRecipeRef, {
          recipeRef: globalRef,
          addedAt: data.createdAt || admin.firestore.Timestamp.now(),
          customTitle: null,
          customIngredients: null,
          customInstructions: null,
          personalNotes: null,
          rating: null,
          isCustomized: false,
        });
      }

      await batch.commit();
      console.log(`✅ Migrata ricetta ${recipeId} per utente ${userId}`);
      migrated++;
    } catch (err) {
      console.error(`❌ Errore nella migrazione di ${recipeId}:`, err);
      errors++;
    }
  }

  console.log("\n--- Risultati Migrazione ---");
  console.log(`✅ Migrate con successo: ${migrated}`);
  console.log(`⚠️  Saltate: ${skipped}`);
  console.log(`❌ Errori: ${errors}`);
  console.log("---------------------------\n");

  if (errors > 0) {
    console.log("⚠️  Alcuni errori si sono verificati. Riesegui lo script: è idempotente.");
  } else {
    console.log("🎉 Migrazione completata con successo!");
  }
}

migrateRecipes().catch((err) => {
  console.error("Errore fatale durante la migrazione:", err);
  process.exit(1);
});
