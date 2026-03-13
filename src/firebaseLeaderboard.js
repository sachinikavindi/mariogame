import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let db = null;

function getDb() {
  if (db) return db;

  if (!firebaseConfig.projectId) {
    console.warn("Firebase not configured: missing VITE_FIREBASE_PROJECT_ID.");
    return null;
  }

  const app =
    getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  db = getFirestore(app);
  return db;
}

const LEADERBOARD_COLLECTION = "marioLeaderboard";

export async function saveLeaderboardEntry(entry) {
  const database = getDb();
  if (!database) return;

  const safeEntry = {
    name: String(entry.name || "Player").slice(0, 40),
    durationMs: Number(entry.durationMs || 0),
    endedAtMs: Number(entry.endedAtMs || Date.now()),
    reason: entry.reason || "finish",
    lives: Number(entry.lives ?? 0),
  };

  try {
    await addDoc(collection(database, LEADERBOARD_COLLECTION), safeEntry);
  } catch (err) {
    console.error("Failed to save leaderboard entry:", err);
  }
}

export async function loadTopLeaderboardEntries(limitCount = 10) {
  const database = getDb();
  if (!database) return null;

  try {
    const q = query(
      collection(database, LEADERBOARD_COLLECTION),
      orderBy("durationMs", "asc"),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    const rows = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      rows.push({
        id: doc.id,
        name: data.name || "Player",
        durationMs: data.durationMs ?? 0,
        endedAtMs: data.endedAtMs ?? null,
        reason: data.reason || "finish",
        lives: data.lives ?? 0,
      });
    });
    return rows;
  } catch (err) {
    console.error("Failed to load leaderboard:", err);
    return null;
  }
}

