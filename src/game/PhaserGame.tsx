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

    console.log('[PhaserGame] RENDER, game.current=', game.current ? 'EXISTS' : 'NULL');

    useLayoutEffect(() =>
    {
        if (game.current === null)
        {
            console.log('[PhaserGame] useLayoutEffect: Creating new Phaser game');
            game.current = StartGame("game-container");
            console.log('[PhaserGame] useLayoutEffect: Game created', game.current);

            if (typeof ref === 'function')
            {
                ref({ game: game.current, scene: null });
            } else if (ref)
            {
                ref.current = { game: game.current, scene: null };
            }

        } else {
            console.log('[PhaserGame] useLayoutEffect: Game already exists, SKIPPING creation');
        }

        return () =>
        {
            console.log('[PhaserGame] useLayoutEffect CLEANUP: destroying game');
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
            console.log(`[PhaserGame] current-scene-ready handler: scene=${scene_instance.scene.key}`);
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
        console.log(`[PhaserGame] useEffect: registered current-scene-ready handler, total listeners=${EventBus.listenerCount('current-scene-ready')}`);
        return () =>
        {
            console.log('[PhaserGame] useEffect CLEANUP: removing current-scene-ready handler');
            EventBus.removeListener('current-scene-ready', handler);
        }
    }, [currentActiveScene, ref]);

    return (
        <div id="game-container"></div>
    );

});
