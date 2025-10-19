/**
 * Remote Drag Smoothing
 * Client-side interpolation for smooth remote cursor/shape drag rendering
 * Uses requestAnimationFrame for smooth 60fps interpolation without mutating server state
 */

import { lerp } from "./utils";

/**
 * Position with x, y coordinates
 */
interface Position {
  x: number;
  y: number;
}

/**
 * Tracked drag state for a remote shape
 */
interface DragState {
  currentPos: Position;   // Current visual position (interpolated)
  targetPos: Position;    // Target position from network
  lastApplied: number;    // Timestamp of last position apply
}

/**
 * Function to apply position update to tldraw editor
 */
type ApplyPositionFn = (shapeId: string, x: number, y: number) => void;

/**
 * RemoteDragSmoother - Smooth remote drag positions with client-side interpolation
 * 
 * Features:
 * - rAF-based interpolation (60fps smooth movement)
 * - Pixel distance guard (skip updates < 2px)
 * - Time guard (skip updates < 16ms apart)
 * - Only runs when there are active remote drags
 * - Client-side only (never mutates server state)
 * 
 * Usage:
 * const smoother = new RemoteDragSmoother(applyPositionFn);
 * smoother.applyUpdate('shape123', { x: 100, y: 200 });
 * // Later: smoother.stop();
 */
export class RemoteDragSmoother {
  private dragStates: Map<string, DragState> = new Map();
  private rafId: number | null = null;
  private applyPosition: ApplyPositionFn;
  private isRunning = false;
  
  // Guards
  private static readonly MIN_DISTANCE_PX = 2;
  private static readonly MIN_TIME_MS = 16; // ~60fps
  private static readonly LERP_FACTOR = 0.3; // Smoothing factor (0=no movement, 1=instant)

  constructor(applyPosition: ApplyPositionFn) {
    this.applyPosition = applyPosition;
  }

  /**
   * Applies a new target position for a shape
   * Starts the interpolation loop if not already running
   * 
   * @param shapeId - Shape ID to update
   * @param targetPos - Target position from network
   */
  public applyUpdate(shapeId: string, targetPos: Position): void {
    const existing = this.dragStates.get(shapeId);
    const now = performance.now();

    if (existing) {
      // Check time guard - skip if update too soon
      if (now - existing.lastApplied < RemoteDragSmoother.MIN_TIME_MS) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DragSmooth] ⏱️ Skipped (time guard): too soon since last apply');
        }
        return;
      }

      // Check distance guard - skip if movement too small
      const dist = Math.sqrt(
        (targetPos.x - existing.currentPos.x) ** 2 +
        (targetPos.y - existing.currentPos.y) ** 2
      );
      
      if (dist < RemoteDragSmoother.MIN_DISTANCE_PX) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DragSmooth] 📏 Skipped (distance guard): movement <2px');
        }
        return;
      }

      // Update target position
      existing.targetPos = targetPos;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[DragSmooth] 🎯 Updated target:', {
          shapeId,
          distance: dist.toFixed(1) + 'px',
          target: targetPos,
        });
      }
    } else {
      // First update for this shape - set immediately
      this.dragStates.set(shapeId, {
        currentPos: targetPos,
        targetPos,
        lastApplied: now,
      });
      
      // Apply immediately (no interpolation for first position)
      this.applyPosition(shapeId, targetPos.x, targetPos.y);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[DragSmooth] 🆕 New drag track:', { shapeId, pos: targetPos });
      }
    }

    // Start interpolation loop if not running
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Removes a shape from tracking (drag ended)
   * 
   * @param shapeId - Shape ID to stop tracking
   */
  public removeShape(shapeId: string): void {
    this.dragStates.delete(shapeId);
    
    // Stop loop if no more active drags
    if (this.dragStates.size === 0 && this.isRunning) {
      this.stop();
    }
  }

  /**
   * Starts the interpolation loop (rAF)
   */
  private start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.tick();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[DragSmooth] ▶️ Started interpolation loop');
    }
  }

  /**
   * Stops the interpolation loop
   */
  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isRunning = false;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[DragSmooth] ⏸️ Stopped interpolation loop');
    }
  }

  /**
   * Interpolation tick - runs at ~60fps via rAF
   */
  private tick = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    let hasActiveInterpolations = false;

    this.dragStates.forEach((state, shapeId) => {
      const { currentPos, targetPos } = state;

      // Check if we've reached the target
      const distToTarget = Math.sqrt(
        (targetPos.x - currentPos.x) ** 2 +
        (targetPos.y - currentPos.y) ** 2
      );

      if (distToTarget < 0.5) {
        // Close enough - snap to target
        state.currentPos = { ...targetPos };
        this.applyPosition(shapeId, targetPos.x, targetPos.y);
        state.lastApplied = now;
      } else {
        // Interpolate towards target
        const newX = lerp(currentPos.x, targetPos.x, RemoteDragSmoother.LERP_FACTOR);
        const newY = lerp(currentPos.y, targetPos.y, RemoteDragSmoother.LERP_FACTOR);
        
        state.currentPos = { x: newX, y: newY };
        this.applyPosition(shapeId, newX, newY);
        state.lastApplied = now;
        
        hasActiveInterpolations = true;

        if (process.env.NODE_ENV === 'development') {
          console.log('[DragSmooth] 🎬 Interpolating:', {
            shapeId,
            progress: (100 - (distToTarget / 10) * 100).toFixed(0) + '%',
            current: { x: newX.toFixed(1), y: newY.toFixed(1) },
            target: { x: targetPos.x.toFixed(1), y: targetPos.y.toFixed(1) },
          });
        }
      }
    });

    // Continue loop if there are active interpolations
    if (hasActiveInterpolations) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      // No active drags - stop the loop
      this.stop();
    }
  };

  /**
   * Clears all tracked drags
   */
  public clear(): void {
    this.dragStates.clear();
    this.stop();
  }

  /**
   * Returns number of actively tracked drags
   */
  public get activeCount(): number {
    return this.dragStates.size;
  }
}

