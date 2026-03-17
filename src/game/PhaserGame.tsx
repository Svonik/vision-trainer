import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { EventBus } from './EventBus';

export interface IRefPhaserGame {
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

interface IProps {
    currentActiveScene?: (scene_instance: Phaser.Scene) => void;
    ref?: React.Ref<IRefPhaserGame>;
}

export function PhaserGame({ currentActiveScene, ref }: IProps) {
    const game = useRef<Phaser.Game | null>(null);
    const [loading, setLoading] = useState(true);

    useLayoutEffect(() => {
        let cancelled = false;

        (async () => {
            const { default: StartGame } = await import('./main');
            if (cancelled) return;

            game.current = StartGame('game-container');
            setLoading(false);

            if (typeof ref === 'function') {
                ref({ game: game.current, scene: null });
            } else if (ref && typeof ref === 'object') {
                (ref as React.MutableRefObject<IRefPhaserGame>).current = { game: game.current, scene: null };
            }
        })();

        return () => {
            cancelled = true;
            EventBus.removeAllListeners();
            if (game.current) {
                game.current.destroy(true);
                game.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const handler = (scene_instance: Phaser.Scene) => {
            if (currentActiveScene && typeof currentActiveScene === 'function') {
                currentActiveScene(scene_instance);
            }
            if (typeof ref === 'function') {
                ref({ game: game.current, scene: scene_instance });
            } else if (ref && typeof ref === 'object') {
                (ref as React.MutableRefObject<IRefPhaserGame>).current = { game: game.current, scene: scene_instance };
            }
        };
        EventBus.on('current-scene-ready', handler);
        return () => {
            EventBus.removeListener('current-scene-ready', handler);
        };
    }, [currentActiveScene, ref]);

    return (
        <>
            {loading && (
                <div
                    style={{
                        width: 800,
                        height: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#000',
                        color: 'var(--text, #e8e0f0)',
                        fontFamily: 'var(--font-display, Fredoka, system-ui, sans-serif)',
                        fontSize: '18px',
                    }}
                >
                    Загрузка...
                </div>
            )}
            <div id="game-container" style={{ display: loading ? 'none' : 'block' }} />
        </>
    );
}
