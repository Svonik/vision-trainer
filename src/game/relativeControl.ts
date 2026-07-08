/**
 * Relative (velocity-integrated) control for the fellow-eye object.
 *
 * MEDICAL RATIONALE
 * The controlled object (Breakout platform / Invaders ship) belongs to the
 * strong "fellow" eye and is shown at reduced contrast. If its position were
 * assigned straight from the pointer (`object.x = pointer.x`) the child could
 * steer it purely by proprioception — tracking their own hand — and play with
 * a single eye, defeating the binocular therapy. Here the position is INTEGRATED
 * from a relative velocity command derived from input DELTA (pointer drag /
 * keyboard hold), never from an absolute pointer coordinate. The object's
 * position is therefore not recoverable from input alone, so the child must
 * VISUALLY perceive the low-contrast object to bring it onto the target/ball
 * (amblyopic eye). Mirrors the Snake / Asteroid control model already in use.
 *
 * The module is pure (no Phaser dependency) so the invariant can be unit-tested.
 */

export interface ControlState {
    /** Current object position along the movement axis (px). */
    x: number;
    /** Current velocity (px/s). */
    vx: number;
}

export interface ControlConfig {
    /** Lower position bound (inclusive), e.g. left wall. */
    minX: number;
    /** Upper position bound (inclusive), e.g. right wall. */
    maxX: number;
    /** Velocity low-pass factor per 60fps frame, 0..1. Higher = snappier. */
    smoothing: number;
    /** Maximum speed magnitude (px/s) — also the anti-teleport clamp. */
    maxSpeed: number;
}

const REFERENCE_FRAME_MS = 1000 / 60; // ≈16.667ms

export const clampNumber = (value: number, min: number, max: number): number =>
    value < min ? min : value > max ? max : value;

const safeDt = (deltaMs: number): number =>
    deltaMs > 0 ? deltaMs / 1000 : 1 / 60;

/**
 * Convert a pointer drag delta (px moved since the previous frame) into a
 * velocity command (px/s). Relative by construction: it depends only on the
 * MOTION of the pointer, not its absolute position. `sensitivity` (0..1) makes
 * the object trail the hand so absolute pointer position never maps 1:1 to the
 * object.
 */
export const pointerDragToVelocity = (
    dragDeltaPx: number,
    deltaMs: number,
    sensitivity: number,
): number => (dragDeltaPx / safeDt(deltaMs)) * sensitivity;

/**
 * Integrate one frame toward a commanded velocity.
 *
 * `commandVx` is a RELATIVE velocity intent (from keyboard hold or
 * `pointerDragToVelocity`), never an absolute pointer coordinate. The command
 * is clamped to `maxSpeed` (so a large pointer jump cannot teleport the object),
 * low-passed for a soft, child-friendly response, then integrated onto the
 * PRIOR position. Hitting a wall clamps position and kills velocity.
 *
 * Pure: returns a new {@link ControlState}; the input state is not mutated.
 */
export const stepControl = (
    state: ControlState,
    commandVx: number,
    config: ControlConfig,
    deltaMs: number,
): ControlState => {
    const dt = safeDt(deltaMs);
    const clampedCmd = clampNumber(commandVx, -config.maxSpeed, config.maxSpeed);

    // Frame-rate-independent low-pass toward the command → no slippery overshoot.
    const alpha =
        1 - Math.pow(1 - config.smoothing, deltaMs / REFERENCE_FRAME_MS);
    let vx = state.vx + (clampedCmd - state.vx) * alpha;

    let x = state.x + vx * dt;

    if (x <= config.minX) {
        return { x: config.minX, vx: 0 };
    }
    if (x >= config.maxX) {
        return { x: config.maxX, vx: 0 };
    }
    return { x, vx };
};
