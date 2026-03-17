import { Events } from 'phaser';

export type GameSettings = {
  contrastLeft: number;
  contrastRight: number;
  speed: string;
  eyeConfig: string;
  glassesType: string;
};

export type GameResult = {
  game: string;
  timestamp: string;
  duration_s: number;
  caught: number;
  total_spawned: number;
  hit_rate: number;
  contrast_left: number;
  contrast_right: number;
  speed: string;
  eye_config: string;
  level?: number;
};

type GameEvents = {
  'start-game': GameSettings;
  'game-complete': { result: GameResult; settings: GameSettings };
  'game-exit': void;
  'safety-timer-warning': { type: string };
  'safety-timer-force-stop': void;
  'safety-extend': void;
  'safety-finish': void;
  'timer-tick': number;
  'current-scene-ready': Phaser.Scene;
};

class TypedEventBus {
  private bus = new Events.EventEmitter();

  emit<K extends keyof GameEvents>(
    event: K,
    ...[data]: GameEvents[K] extends void ? [] : [GameEvents[K]]
  ): void {
    this.bus.emit(event, data);
  }

  on<K extends keyof GameEvents>(
    event: K,
    fn: GameEvents[K] extends void ? () => void : (data: GameEvents[K]) => void,
  ): void {
    this.bus.on(event, fn);
  }

  off<K extends keyof GameEvents>(
    event: K,
    fn: GameEvents[K] extends void ? () => void : (data: GameEvents[K]) => void,
  ): void {
    this.bus.off(event, fn);
  }

  removeListener<K extends keyof GameEvents>(
    event: K,
    fn: GameEvents[K] extends void ? () => void : (data: GameEvents[K]) => void,
  ): void {
    this.bus.off(event, fn);
  }

  removeAllListeners(): void {
    this.bus.removeAllListeners();
  }
}

export const typedEventBus = new TypedEventBus();
