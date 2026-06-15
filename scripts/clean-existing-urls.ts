import * as fs from "fs";
import * as path from "path";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { cleanUrl } from "../src/lib/scraping/urlCleaner";

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

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gustosmart";

if (!getApps().length) {
  initializeApp({
    projectId: projectId,
  });
}

const db = getFirestore();

async function cleanExistingUrls() {
  console.log("🚀 Starting cleaning and de-duplication of recipe URLs in Firestore...\n");
  console.log(`Using Firebase Project ID: ${projectId}\n`);

  // 1. Fetch all recipes from /recipes/
  const recipesSnap = await db.collection("recipes").get();
  if (recipesSnap.empty) {
    console.log("❌ No recipes found in the 'recipes' collection.");
    return;
  }

  console.log(`📦 Found ${recipesSnap.size} global recipes. Analyzing for duplicates...\n`);

  // Group recipes by cleaned URL
  const groups: Record<string, any[]> = {};
  
  for (const doc of recipesSnap.docs) {
    const data = doc.data();
    const recipeId = doc.id;
    const originalUrl = data.sourceUrl || "";
    
    if (!originalUrl) {
      console.log(`⚠️ Recipe ${recipeId} has no sourceUrl. Skipping.`);
      continue;
    }
    
    const cleaned = cleanUrl(originalUrl);
    
    if (!groups[cleaned]) {
      groups[cleaned] = [];
    }
    groups[cleaned].push({ id: recipeId, data, originalUrl });
  }

  // 2. Fetch all users for personal recipe override updates
  const usersSnap = await db.collection("users").get();
  const userDocs = usersSnap.docs;
  console.log(`👤 Found ${userDocs.length} users in the database.`);

  let totalUpdated = 0;
  let totalDuplicatesResolved = 0;
  let totalDeleted = 0;

  // 3. Process each group
  for (const [cleanedUrl, items] of Object.entries(groups)) {
    // Determine the canonical recipe (oldest or first one in list)
    items.sort((a, b) => {
      const aTime = a.data.createdAt?.toMillis?.() || 0;
      const bTime = b.data.createdAt?.toMillis?.() || 0;
      return aTime - bTime;
    });

    const canonical = items[0];
    const duplicates = items.slice(1);

    // Update canonical recipe sourceUrl if it's not already clean
    if (canonical.originalUrl !== cleanedUrl) {
      await db.collection("recipes").doc(canonical.id).update({
        sourceUrl: cleanedUrl
      });
      console.log(`\n🧹 Cleaned URL for canonical recipe '${canonical.data.title}' (${canonical.id}):`);
      console.log(`   Old: ${canonical.originalUrl}`);
      console.log(`   New: ${cleanedUrl}`);
      totalUpdated++;
    }

    if (duplicates.length > 0) {
      console.log(`\n⚠️ Found ${duplicates.length} duplicates for canonical recipe '${canonical.data.title}' (${canonical.id})`);
      console.log(`   Canonical URL: ${cleanedUrl}`);
      
      for (const dup of duplicates) {
        console.log(`   -> Duplicate: '${dup.data.title}' (${dup.id}) | Original URL: ${dup.originalUrl}`);
        
        // Scan each user to see if they reference the duplicate
        for (const userDoc of userDocs) {
          const userId = userDoc.id;
          const userRecipesRef = db.collection("users").doc(userId).collection("recipes");
          
          const dupUserRecipeDoc = await userRecipesRef.doc(dup.id).get();
          
          if (dupUserRecipeDoc.exists) {
            console.log(`      👤 User ${userId} has saved duplicate recipe ${dup.id}`);
            
            // Check if user already has canonical recipe
            const canonicalUserRecipeDoc = await userRecipesRef.doc(canonical.id).get();
            
            if (canonicalUserRecipeDoc.exists) {
              // User already has canonical. Just delete the duplicate reference.
              await userRecipesRef.doc(dup.id).delete();
              console.log(`      ✅ User already had canonical recipe ${canonical.id}. Deleted duplicate saved reference.`);
            } else {
              // Recreate user recipe under canonical ID, keeping custom fields, but updating recipeRef
              const dupData = dupUserRecipeDoc.data() || {};
              const canonicalRef = db.collection("recipes").doc(canonical.id);
              
              await userRecipesRef.doc(canonical.id).set({
                ...dupData,
                recipeRef: canonicalRef,
                // Make sure card display fields are denormalized from canonical if they weren't already
                title: dupData.title || canonical.data.title || "",
                category: dupData.category || canonical.data.category || "other",
                prepTimeMinutes: dupData.prepTimeMinutes !== undefined ? dupData.prepTimeMinutes : (canonical.data.prepTimeMinutes || null),
                servings: dupData.servings !== undefined ? dupData.servings : (canonical.data.servings || 2),
                sourcePlatform: dupData.sourcePlatform || canonical.data.sourcePlatform || "web",
                ingredients: dupData.ingredients || canonical.data.ingredients || [],
                isGlutenFree: dupData.isGlutenFree !== undefined ? dupData.isGlutenFree : (canonical.data.isGlutenFree || null),
                isVegan: dupData.isVegan !== undefined ? dupData.isVegan : (canonical.data.isVegan || null),
                isVegetarian: dupData.isVegetarian !== undefined ? dupData.isVegetarian : (canonical.data.isVegetarian || null),
                isLactoseFree: dupData.isLactoseFree !== undefined ? dupData.isLactoseFree : (canonical.data.isLactoseFree || null),
              });
              
              await userRecipesRef.doc(dup.id).delete();
              console.log(`      ✅ Re-pointed user saved recipe to canonical recipe ${canonical.id} and deleted duplicate reference.`);
            }
          }
        }
        
        // Delete duplicate global recipe
        await db.collection("recipes").doc(dup.id).delete();
        console.log(`   🗑️ Deleted global duplicate recipe document ${dup.id}`);
        totalDuplicatesResolved++;
        totalDeleted++;
      }
    }
  }

  console.log("\n--- URL Clean and De-duplication Results ---");
  console.log(`Cleaned Canonical URLs:   ${totalUpdated}`);
  console.log(`Duplicates Resolved:      ${totalDuplicatesResolved}`);
  console.log(`Global Documents Deleted: ${totalDeleted}`);
  console.log("--------------------------------------------\n");
  console.log("🎉 De-duplication migration successfully completed!");
}

cleanExistingUrls().catch(err => {
  console.error("Fatal error during URL cleaning migration:", err);
  process.exit(1);
});
