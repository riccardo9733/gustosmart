import * as fs from "fs";
import * as path from "path";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Parse .env.local manually if it exists to get PROJECT_ID
const envLocalPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "social-recipes-scraper";

if (!getApps().length) {
  initializeApp({
    projectId: projectId,
  });
}

const db = getFirestore();

async function runDenormalization() {
  console.log("🚀 Starting denormalization of recipe card info on Firestore...\n");
  console.log(`Using Firebase Project ID: ${projectId}\n`);

  // 1. Fetch all users
  const usersSnap = await db.collection("users").get();
  if (usersSnap.empty) {
    console.log("❌ No users found in the 'users' collection.");
    return;
  }

  console.log(`👤 Found ${usersSnap.size} users. Scanning their personal recipe collections...\n`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const userRecipesRef = db.collection("users").doc(userId).collection("recipes");
    const userRecipesSnap = await userRecipesRef.get();

    if (userRecipesSnap.empty) {
      continue;
    }

    console.log(`  👉 User ${userId}: scanning ${userRecipesSnap.size} saved recipes...`);

    for (const userRecipeDoc of userRecipesSnap.docs) {
      const recipeId = userRecipeDoc.id;
      const data = userRecipeDoc.data();
      totalProcessed++;

      // Check if denormalized fields already exist
      // We check for "title" and "category" as key indicators of denormalization
      if (data.title && data.category) {
        // Already denormalized, skip to save reads/writes
        continue;
      }

      try {
        // Fetch the global recipe
        const globalRecipeDoc = await db.collection("recipes").doc(recipeId).get();
        if (!globalRecipeDoc.exists) {
          console.log(`    ⚠️ Global recipe ${recipeId} not found for user ${userId}. Skipping.`);
          continue;
        }

        const globalData = globalRecipeDoc.data() || {};

        // Update the user's recipe override doc with denormalized fields
        await userRecipesRef.doc(recipeId).update({
          title: globalData.title || "",
          category: globalData.category || "other",
          prepTimeMinutes: globalData.prepTimeMinutes !== undefined ? globalData.prepTimeMinutes : null,
          servings: globalData.servings !== undefined ? globalData.servings : 2,
          sourcePlatform: globalData.sourcePlatform || "web",
          ingredients: globalData.ingredients || [],
          isGlutenFree: globalData.isGlutenFree !== undefined ? globalData.isGlutenFree : null,
          isVegan: globalData.isVegan !== undefined ? globalData.isVegan : null,
          isVegetarian: globalData.isVegetarian !== undefined ? globalData.isVegetarian : null,
          isLactoseFree: globalData.isLactoseFree !== undefined ? globalData.isLactoseFree : null,
        });

        console.log(`    ✅ Denormalized recipe '${globalData.title || recipeId}' for user ${userId}`);
        totalUpdated++;
      } catch (err) {
        console.error(`    ❌ Error denormalizing recipe ${recipeId} for user ${userId}:`, err);
        totalErrors++;
      }
    }
  }

  console.log("\n--- Migration Results ---");
  console.log("Total Saved Recipes Processed: " + totalProcessed);
  console.log("Successfully Denormalized:     " + totalUpdated);
  console.log("Errors:                        " + totalErrors);
  console.log("-------------------------\n");
}

runDenormalization().catch((err) => {
  console.error("Fatal error during denormalization script:", err);
  process.exit(1);
});
