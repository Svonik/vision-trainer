import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from './main';
import { EventBus } from './EventBus';

export interface IRefPhaserGame
{
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

interface IProps
{
    currentActiveScene?: (scene_instance: Phaser.Scene) => void
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame({ currentActiveScene }, ref)
{
    const game = useRef<Phaser.Game | null>(null!);

    useLayoutEffect(() =>
    {
        if (game.current === null)
        {
            game.current = StartGame("game-container");

            if (typeof ref === 'function')
            {
                ref({ game: game.current, scene: null });
            } else if (ref)
            {
                ref.current = { game: game.current, scene: null };
            }

        }

        return () =>
        {
            // Clear ALL EventBus listeners before destroying — prevents stale
            // scene handlers from firing on next game instance (React StrictMode!)
            EventBus.removeAllListeners();
            if (game.current)
            {
                game.current.destroy(true);
                if (game.current !== null)
                {
                    game.current = null;
                }
            }
        }
    }, [ref]);

    useEffect(() =>
    {
        const handler = (scene_instance: Phaser.Scene) =>
        {
            if (currentActiveScene && typeof currentActiveScene === 'function')
            {
                currentActiveScene(scene_instance);
            }
            if (typeof ref === 'function')
            {
                ref({ game: game.current, scene: scene_instance });
            } else if (ref)
            {
                ref.current = { game: game.current, scene: scene_instance };
            }
        };
        EventBus.on('current-scene-ready', handler);
        return () =>
        {
            EventBus.removeListener('current-scene-ready', handler);
        }
    }, [currentActiveScene, ref]);

    return (
        <div id="game-container"></div>
    );

});
