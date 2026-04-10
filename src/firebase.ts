import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Connection test
async function testConnection() {
  try {
    // Try to get a non-existent doc from server to test connection
    await getDocFromServer(doc(db, '_connection_test_', 'test'));
    console.log("Firestore connection successful.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("Firestore connection failed: The client is offline. This usually indicates an incorrect Firebase configuration.");
      } else if (error.message.includes('permission-denied') || error.message.includes('insufficient permissions')) {
        // Permission denied actually means we successfully reached the server!
        console.log("Firestore connection successful (verified via permission response).");
      }
      // Skip logging for other errors as per guidelines
    }
  }
}

testConnection();
