/**
 * Page Sync for tldraw
 * Handles persistence of multiple pages (tabs) in tldraw
 */

import type { TLPageId } from "@tldraw/tldraw";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Page data structure in Firestore
 */
export interface FirestorePage {
  id: string;
  name: string;
  index: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Simplified page structure from tldraw
 */
export interface TldrawPageData {
  id: TLPageId;
  name: string;
  index: string;
}

/**
 * Write page to Firestore
 */
export async function writePageToFirestore(
  roomId: string,
  page: TldrawPageData,
  userId: string
): Promise<void> {
  try {
    const pageRef = doc(db, `rooms/${roomId}/pages`, page.id);
    
    const firestorePage: Omit<FirestorePage, "createdAt" | "updatedAt"> = {
      id: page.id,
      name: page.name,
      index: page.index,
      createdBy: userId,
    };

    await setDoc(pageRef, {
      ...firestorePage,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log("[PageSync] Page written to Firestore:", page.id);
  } catch (error) {
    console.error("[PageSync] Error writing page:", error);
    throw error;
  }
}

/**
 * Delete page from Firestore
 */
export async function deletePageFromFirestore(
  roomId: string,
  pageId: string
): Promise<void> {
  try {
    const pageRef = doc(db, `rooms/${roomId}/pages`, pageId);
    await deleteDoc(pageRef);
    console.log("[PageSync] Page deleted from Firestore:", pageId);
  } catch (error) {
    console.error("[PageSync] Error deleting page:", error);
    throw error;
  }
}

/**
 * Get all pages from Firestore
 */
export async function getAllPages(roomId: string): Promise<FirestorePage[]> {
  try {
    const pagesRef = collection(db, `rooms/${roomId}/pages`);
    const pagesQuery = query(pagesRef);
    const snapshot = await getDocs(pagesQuery);

    return snapshot.docs.map((doc) => doc.data() as FirestorePage);
  } catch (error) {
    console.error("[PageSync] Error getting all pages:", error);
    return [];
  }
}

/**
 * Listen to page changes in Firestore
 */
export function listenToPages(
  roomId: string,
  onPagesChange: (pages: FirestorePage[]) => void
): () => void {
  const pagesRef = collection(db, `rooms/${roomId}/pages`);
  const pagesQuery = query(pagesRef);

  const unsubscribe = onSnapshot(
    pagesQuery,
    (snapshot) => {
      const pages = snapshot.docs.map((doc) => doc.data() as FirestorePage);
      onPagesChange(pages);
    },
    (error) => {
      console.error("[PageSync] Error in pages listener:", error);
    }
  );

  return unsubscribe;
}

