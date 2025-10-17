/**
 * Content Moderation Library
 * Handles profanity filtering and nickname validation for JellyBoard
 * COPPA compliant - validates student nicknames for safety
 */

import Filter from "bad-words";

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Minimum nickname length
 */
export const MIN_NICKNAME_LENGTH = 2;

/**
 * Maximum nickname length
 */
export const MAX_NICKNAME_LENGTH = 20;

/**
 * Initialize profanity filter
 * Using bad-words library with default English profanity list
 */
const profanityFilter = new Filter();

/**
 * Check if text contains profanity
 * 
 * @param text - Text to check
 * @returns True if text contains inappropriate words
 * 
 * @example
 * containsProfanity("hello world") // false
 * containsProfanity("bad word here") // true
 */
export function containsProfanity(text: string): boolean {
  if (!text || !text.trim()) {
    return false;
  }

  return profanityFilter.isProfane(text);
}

/**
 * Sanitize text by replacing profanity with asterisks
 * 
 * @param text - Text to sanitize
 * @returns Sanitized text with profanity replaced by ***
 * 
 * @example
 * sanitizeText("hello world") // "hello world"
 * sanitizeText("bad word here") // "*** word here"
 */
export function sanitizeText(text: string): string {
  if (!text || !text.trim()) {
    return text;
  }

  return profanityFilter.clean(text);
}

/**
 * Validate nickname for student join
 * Checks length, character restrictions, and profanity
 * 
 * @param nickname - Nickname to validate
 * @returns Validation result with error message if invalid
 * 
 * @example
 * validateNickname("Alex") // { valid: true }
 * validateNickname("A") // { valid: false, error: "..." }
 * validateNickname("BadWord123") // { valid: false, error: "..." }
 */
export function validateNickname(nickname: string): ValidationResult {
  // Check if empty
  if (!nickname || !nickname.trim()) {
    return { valid: false, error: "Nickname cannot be empty" };
  }

  const trimmedNickname = nickname.trim();

  // Check minimum length
  if (trimmedNickname.length < MIN_NICKNAME_LENGTH) {
    return {
      valid: false,
      error: `Nickname must be at least ${MIN_NICKNAME_LENGTH} characters long`,
    };
  }

  // Check maximum length
  if (trimmedNickname.length > MAX_NICKNAME_LENGTH) {
    return {
      valid: false,
      error: `Nickname must be ${MAX_NICKNAME_LENGTH} characters or less`,
    };
  }

  // Check for valid characters (alphanumeric, spaces, hyphens, underscores only)
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedNickname)) {
    return {
      valid: false,
      error: "Nickname can only contain letters, numbers, spaces, hyphens, and underscores",
    };
  }

  // Check for profanity
  if (containsProfanity(trimmedNickname)) {
    return {
      valid: false,
      error: "This nickname is not allowed. Please choose a different one.",
    };
  }

  return { valid: true };
}

/**
 * Add custom word to profanity filter
 * Allows teachers to add classroom-specific blocked words
 * 
 * @param word - Word to add to filter
 * 
 * @example
 * addCustomWord("playground");
 * containsProfanity("playground") // true
 */
export function addCustomWord(word: string): void {
  if (word && word.trim()) {
    profanityFilter.addWords(word.trim());
  }
}

/**
 * Remove word from profanity filter
 * Allows removing false positives
 * 
 * @param word - Word to remove from filter
 * 
 * @example
 * removeCustomWord("hello");
 */
export function removeCustomWord(word: string): void {
  if (word && word.trim()) {
    profanityFilter.removeWords(word.trim());
  }
}

/**
 * Get custom word list for a room
 * In Phase 1, this returns empty array (stored in memory only)
 * In future phases, this will load from Firestore room metadata
 * 
 * @param roomId - Room ID to get custom words for
 * @returns Promise resolving to array of custom words
 */
export async function getCustomWordList(roomId: string): Promise<string[]> {
  // Phase 1: No persistent custom word lists
  // Phase 2: Load from Firestore room metadata customWordList field
  console.log(`[ContentModeration] Getting custom word list for room ${roomId}`);
  return [];
}

/**
 * Add custom word for a room
 * In Phase 1, this is a no-op (stored in memory only)
 * In future phases, this will save to Firestore room metadata
 * 
 * @param roomId - Room ID to add word for
 * @param word - Word to add to custom filter
 * @returns Promise that resolves when word is added
 */
export async function addCustomWordForRoom(roomId: string, word: string): Promise<void> {
  // Phase 1: Add to in-memory filter only
  addCustomWord(word);
  console.log(`[ContentModeration] Added custom word for room ${roomId}: ${word}`);
  
  // Phase 2: Also save to Firestore room metadata
  // const roomRef = doc(db, "rooms", roomId, "metadata", "info");
  // await updateDoc(roomRef, {
  //   customWordList: arrayUnion(word)
  // });
}

