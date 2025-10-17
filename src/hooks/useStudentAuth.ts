/**
 * useStudentAuth Hook
 * Manages anonymous student sessions without Firebase Authentication
 * COPPA/FERPA compliant - no persistent identifiers or PII
 */

import { useEffect, useState, useCallback } from "react";
import { nanoid } from "nanoid";
import type { StudentSession } from "../types";
import { generateColorFromString } from "../lib/utils";
import { 
  updateStudentPresence, 
  markStudentOffline, 
  setupStudentPresenceHeartbeat 
} from "../lib/realtimeSync";
import { validateNickname } from "../lib/contentModeration";

/**
 * Return type for useStudentAuth hook
 */
interface UseStudentAuthReturn {
  session: StudentSession | null;
  joinAsStudent: (roomCode: string, nickname: string) => Promise<string>;
  leaveRoom: () => Promise<void>;
  isExpired: boolean;
  error: string | null;
}

/**
 * LocalStorage key for student session
 */
const STUDENT_SESSION_KEY = "jellyboard_student_session";

/**
 * Session duration: 24 hours in milliseconds
 */
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Custom hook for student anonymous authentication
 * Creates temporary sessions without Firebase Auth UIDs
 * 
 * @returns Object containing session state and auth functions
 * 
 * @example
 * const { session, joinAsStudent, leaveRoom } = useStudentAuth();
 * await joinAsStudent("482931", "Alex");
 */
export function useStudentAuth(): UseStudentAuthReturn {
  const [session, setSession] = useState<StudentSession | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load existing session from localStorage on mount
   */
  useEffect(() => {
    const loadSession = () => {
      try {
        const storedSession = localStorage.getItem(STUDENT_SESSION_KEY);
        if (!storedSession) {
          return;
        }

        const parsedSession = JSON.parse(storedSession) as StudentSession;

        // Check if session is expired
        if (parsedSession.expiresAt < Date.now()) {
          console.log("[useStudentAuth] Session expired, clearing localStorage");
          localStorage.removeItem(STUDENT_SESSION_KEY);
          setIsExpired(true);
          return;
        }

        setSession(parsedSession);
        console.log("[useStudentAuth] Loaded existing session:", parsedSession.sessionId);
      } catch (err) {
        console.error("[useStudentAuth] Error loading session:", err);
        localStorage.removeItem(STUDENT_SESSION_KEY);
      }
    };

    loadSession();
  }, []);

  /**
   * Check session expiry periodically (every 5 minutes)
   */
  useEffect(() => {
    if (!session) {
      return;
    }

    const checkExpiry = () => {
      if (session.expiresAt < Date.now()) {
        console.log("[useStudentAuth] Session expired");
        setIsExpired(true);
        void leaveRoom();
      }
    };

    // Check immediately and then every 5 minutes
    checkExpiry();
    const interval = setInterval(checkExpiry, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [session]);

  /**
   * Set up presence heartbeat for active session
   */
  useEffect(() => {
    if (!session || isExpired) {
      return;
    }

    // Set up heartbeat to keep student presence active
    const stopHeartbeat = setupStudentPresenceHeartbeat(
      session.roomId,
      session.sessionId,
      session.nickname,
      session.color
    );

    return () => {
      stopHeartbeat();
    };
  }, [session, isExpired]);

  /**
   * Join a room as a student with nickname
   * Creates temporary session without Firebase Auth
   * 
   * @param roomCode - 6-digit room code
   * @param nickname - Student's chosen nickname (validated)
   * @param roomId - Actual room ID (resolved from code)
   * @returns Promise resolving to session ID
   */
  const joinAsStudent = useCallback(
    async (roomCode: string, nickname: string, roomId: string): Promise<string> => {
      try {
        setError(null);

        // Validate nickname first
        const validation = validateNickname(nickname);
        if (!validation.valid) {
          const errorMessage = validation.error || "Invalid nickname";
          setError(errorMessage);
          throw new Error(errorMessage);
        }

        // Generate temporary session ID (no Firebase Auth UID)
        const sessionId = nanoid();
        const now = Date.now();

        // Create student session
        const newSession: StudentSession = {
          sessionId,
          nickname: nickname.trim(),
          roomCode,
          roomId,
          color: generateColorFromString(sessionId),
          joinedAt: now,
          expiresAt: now + SESSION_DURATION_MS, // 24 hours from now
          lastActivity: now,
        };

        // Save to localStorage
        localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(newSession));

        // Write presence to Realtime DB
        await updateStudentPresence(
          roomId,
          sessionId,
          nickname.trim(),
          newSession.color
        );

        setSession(newSession);
        setIsExpired(false);

        console.log("[useStudentAuth] Student joined:", {
          sessionId,
          nickname: nickname.trim(),
          roomCode,
          roomId,
        });

        return sessionId;
      } catch (err) {
        console.error("[useStudentAuth] Error joining as student:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to join room";
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  /**
   * Leave the current room and cleanup session
   * Removes presence from Realtime DB and clears localStorage
   */
  const leaveRoom = useCallback(async (): Promise<void> => {
    if (!session) {
      return;
    }

    try {
      // Mark student as offline in Realtime DB
      await markStudentOffline(session.roomId, session.sessionId);

      // Clear localStorage
      localStorage.removeItem(STUDENT_SESSION_KEY);

      // Clear state
      setSession(null);
      setIsExpired(false);

      console.log("[useStudentAuth] Student left room:", session.sessionId);
    } catch (err) {
      console.error("[useStudentAuth] Error leaving room:", err);
    }
  }, [session]);

  return {
    session,
    joinAsStudent,
    leaveRoom,
    isExpired,
    error,
  };
}

