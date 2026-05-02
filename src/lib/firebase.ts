import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AnalysisResult } from './analysis';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Caches an analysis result in Firestore
 */
export async function cacheAnalysis(result: AnalysisResult) {
  try {
    const docRef = doc(db, "analysis_cache", result.groupKey);
    await setDoc(docRef, {
      ...result,
      timestamp: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error("Firestore Cache Save Error:", error);
  }
}

/**
 * Retrieves a cached analysis result from Firestore
 */
export async function getCachedAnalysis(groupKey: string): Promise<AnalysisResult | null> {
  try {
    const docRef = doc(db, "analysis_cache", groupKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AnalysisResult;
    }
    return null;
  } catch (error) {
    console.error("Firestore Cache Load Error:", error);
    return null;
  }
}

/**
 * Caches an AI report in Firestore
 */
export async function cacheReport(groupKey: string, report: string) {
  try {
    const docRef = doc(db, "report_cache", groupKey);
    await setDoc(docRef, {
      report,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Firestore Report Cache Save Error:", error);
  }
}

/**
 * Retrieves a cached AI report from Firestore
 */
export async function getCachedReport(groupKey: string): Promise<string | null> {
  try {
    const docRef = doc(db, "report_cache", groupKey);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().report;
    }
    return null;
  } catch (error) {
    console.error("Firestore Report Cache Load Error:", error);
    return null;
  }
}
