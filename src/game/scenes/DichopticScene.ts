import {
    type ContrastConfig,
    type ContrastState,
    createContrastConfig,
    createContrastState,
    getAccuracy,
    recordTrial,
} from '../../modules/contrastEngine';
import { type GlassesType, getEyeColors } from '../../modules/glassesColors';
import { CONTRAST_TWEEN_MS } from '../dichoptic/winChannels';

/** Minimal shape every scene's `settings` carries — see modules/gameState.ts GameSettings. */
export interface DichopticSettings {
    fellowEyeContrast?: number;
    eyeConfig?: string;
    glassesType?: string;
    [key: string]: unknown;
}

export interface DichopticStats {
    accuracy: number;
    totalTrials: number;
    fellowContrastStart: number;
    fellowContrastEnd: number;
}

export interface EyeChannelColors {
    fellowColor: number;
    amblyopicColor: number;
}

type FellowAlphaListener = (alpha: number) => void;

/** Subset of the Phaser display-object API DichopticScene relies on — avoids
 *  a hard dependency on a specific GameObject subclass so plain rectangles,
 *  circles, containers, sprites, and images are all accepted uniformly. */
interface AlphaTarget {
    active?: boolean;
    setAlpha?: (alpha: number) => unknown;
}

/**
 * Shared base class for every dichoptic (red/cyan anaglyph) Phaser mini-game
 * in Vision. Centralizes the four mechanisms every scene previously
 * duplicated by hand:
 *
 *   1. Eye→color assignment from calibration glasses_type (resolveEyeColors).
 *   2. Clinical contrast-state init (see src/modules/contrastEngine.ts).
 *   3. Fellow-eye alpha application — either applied directly to registered
 *      display objects (setFellowEyeTargets) or pushed to scenes that redraw
 *      via Graphics/grid rebuild (onFellowAlphaChange).
 *   4. The recordTrial → getDichopticStats bridge each scene maps onto its
 *      own (historically inconsistent) session-payload field names.
 *
 * Subclasses stay `@ts-nocheck` and keep their existing per-scene field names
 * (platformAlpha, crosshairAlpha, alphaA, knifeAlpha, ...) — this base class
 * owns the mechanism, not scene-specific naming or session-payload shape.
 */
export default abstract class DichopticScene extends Phaser.Scene {
    contrastConfig!: ContrastConfig;
    contrastState!: ContrastState;

    /** Fellow (strong) eye alpha, 0..1 — mirrors contrastState.fellowEyeContrast / 100. */
    fellowAlpha = 1;

    private fellowContrastStart = 30;
    private fellowEyeTargets: AlphaTarget[] = [];
    private amblyopicEyeTargets: AlphaTarget[] = [];
    private fellowAlphaListeners: FellowAlphaListener[] = [];

    /**
     * Initialize the clinical contrast engine for this session. Call once
     * from startGameplay(), before building any dichoptic visuals, so
     * `fellowAlpha` is correct at first render — several scenes previously
     * left the fellow-eye object at a stale/uninitialized alpha until the
     * first recorded trial (approved behavior delta, see bead Vision-so0).
     */
    initDichoptics(settings: DichopticSettings): void {
        this.contrastConfig = createContrastConfig();
        this.contrastState = createContrastState(
            settings.fellowEyeContrast ?? 30,
        );
        this.fellowContrastStart = settings.fellowEyeContrast ?? 30;
        this.fellowAlpha = this.contrastState.fellowEyeContrast / 100;
        this.fellowEyeTargets = [];
        this.amblyopicEyeTargets = [];
        this.fellowAlphaListeners = [];
    }

    /**
     * Register the strong-eye (fellow) display object(s) that must track the
     * adaptive clinical contrast. Applies the current fellowAlpha immediately
     * so newly-created objects start correct. REPLACES the current target
     * list on every call — safe to re-register when a scene recreates its
     * fellow-eye object mid-game (e.g. a respawned marker/target).
     */
    setFellowEyeTargets(...displayObjects: AlphaTarget[]): void {
        this.fellowEyeTargets = displayObjects.filter(
            (obj): obj is AlphaTarget => Boolean(obj),
        );
        for (const obj of this.fellowEyeTargets) {
            obj.setAlpha?.(this.fellowAlpha);
        }
    }

    /**
     * Register a callback for scenes that redraw via Graphics/grid rebuild
     * rather than mutating a display object's alpha directly (e.g. Tetris
     * piece render, Match3 gem redraw, ColorFlood type-color table). Invoked
     * immediately with the current fellowAlpha, and again after every
     * contrast-driven alpha change.
     */
    onFellowAlphaChange(cb: FellowAlphaListener): void {
        this.fellowAlphaListeners.push(cb);
        cb(this.fellowAlpha);
    }

    /**
     * Register the amblyopic (weak) eye display object(s) — forced to alpha
     * 1.0 always, per clinical protocol. Opt-in: scenes with an intentional
     * static non-1.0 amblyopic alpha (e.g. KnifeHit's stuckAlpha) simply
     * don't register here.
     */
    setAmblyopicEyeTargets(...displayObjects: AlphaTarget[]): void {
        this.amblyopicEyeTargets = displayObjects.filter(
            (obj): obj is AlphaTarget => Boolean(obj),
        );
        for (const obj of this.amblyopicEyeTargets) {
            obj.setAlpha?.(1.0);
        }
    }

    /**
     * Record one dichoptic trial (hit/miss) against the clinical contrast
     * engine. When the fellow-eye contrast steps, propagate the new alpha to
     * every registered fellow-eye target (250ms tween, CONTRAST_TWEEN_MS —
     * the same duration scenes already tweened with) and to every redraw
     * listener.
     */
    recordDichopticTrial(hit: boolean): void {
        const previousContrast = this.contrastState.fellowEyeContrast;
        this.contrastState = recordTrial(
            this.contrastState,
            this.contrastConfig,
            hit,
        );
        if (this.contrastState.fellowEyeContrast === previousContrast) return;

        this.fellowAlpha = this.contrastState.fellowEyeContrast / 100;

        for (const obj of this.fellowEyeTargets) {
            if (!obj || obj.active === false) continue;
            if (this.tweens) {
                this.tweens.killTweensOf(obj);
                this.tweens.add({
                    targets: obj,
                    alpha: this.fellowAlpha,
                    duration: CONTRAST_TWEEN_MS,
                    ease: 'Sine.easeInOut',
                });
            } else {
                obj.setAlpha?.(this.fellowAlpha);
            }
        }

        for (const cb of this.fellowAlphaListeners) cb(this.fellowAlpha);
    }

    /** Maps onto each scene's existing (inconsistent) session-payload field names. */
    getDichopticStats(): DichopticStats {
        return {
            accuracy: getAccuracy(this.contrastState),
            totalTrials: this.contrastState.totalTrials,
            fellowContrastStart: this.fellowContrastStart,
            fellowContrastEnd: this.contrastState.fellowEyeContrast,
        };
    }
}

/**
 * Pure, framework-free anaglyph channel assignment — the fellow (strong) eye
 * is visible through `eyeConfig === 'platform_left'` iff the object is on the
 * left lens. Exported standalone (not just as a DichopticScene method) so
 * scenes that must keep a module-level `resolveChannelColors` export for
 * their existing unit tests (BalloonPop/WhackMole/ShootingGallery) can
 * delegate to this single implementation instead of duplicating it.
 */
export function resolveEyeChannelColors(
    eyeConfig: string | undefined,
    glassesType: GlassesType | string | undefined,
): EyeChannelColors {
    const eyeColors = getEyeColors((glassesType as GlassesType) || 'red-cyan');
    const isFellowLeft = eyeConfig === 'platform_left';
    return {
        fellowColor: isFellowLeft ? eyeColors.leftColor : eyeColors.rightColor,
        amblyopicColor: isFellowLeft
            ? eyeColors.rightColor
            : eyeColors.leftColor,
    };
}
