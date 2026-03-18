// src/game/vfx/GameVisuals.ts
// Reusable visual components for polished game rendering

export const GameVisuals = {
    /**
     * Draw a circle with soft outer glow (same color, lower alpha)
     * Returns the container with all visual layers
     */
    glowCircle: (
        scene: Phaser.Scene,
        x: number,
        y: number,
        radius: number,
        color: number,
        alpha: number = 1,
    ): Phaser.GameObjects.Container => {
        const container = scene.add.container(x, y);
        // Outer glow (3 layers, decreasing alpha)
        container.add(
            scene.add.circle(0, 0, radius * 2.0, color, alpha * 0.04),
        );
        container.add(
            scene.add.circle(0, 0, radius * 1.5, color, alpha * 0.08),
        );
        container.add(
            scene.add.circle(0, 0, radius * 1.2, color, alpha * 0.12),
        );
        // Core body
        container.add(scene.add.circle(0, 0, radius, color, alpha));
        // Inner highlight (brighter center)
        container.add(
            scene.add.circle(
                0,
                0,
                radius * 0.4,
                color,
                Math.min(alpha * 1.3, 1),
            ),
        );
        return container;
    },

    /**
     * Draw a rectangle with glow effect and rounded corners
     */
    glowRect: (
        scene: Phaser.Scene,
        x: number,
        y: number,
        w: number,
        h: number,
        color: number,
        alpha: number = 1,
        radius: number = 4,
    ): Phaser.GameObjects.Container => {
        const container = scene.add.container(x, y);
        // Outer glow
        const glowG = scene.add.graphics();
        glowG.fillStyle(color, alpha * 0.06);
        glowG.fillRoundedRect(
            -w / 2 - 6,
            -h / 2 - 6,
            w + 12,
            h + 12,
            radius + 4,
        );
        container.add(glowG);
        // Body
        const bodyG = scene.add.graphics();
        bodyG.fillStyle(color, alpha);
        bodyG.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
        container.add(bodyG);
        // Top edge highlight
        const highlightG = scene.add.graphics();
        highlightG.fillStyle(color, Math.min(alpha * 1.2, 1));
        highlightG.fillRoundedRect(-w / 2 + 2, -h / 2, w - 4, 2, 1);
        container.add(highlightG);
        return container;
    },

    /**
     * Subtle background grid (GRAY, very low alpha — visible to both eyes)
     */
    drawBgGrid: (
        scene: Phaser.Scene,
        fx: number,
        fy: number,
        fw: number,
        fh: number,
        cellSize: number = 40,
    ) => {
        const g = scene.add.graphics();
        g.lineStyle(0.5, 0x808080, 0.05);
        for (let x = fx; x <= fx + fw; x += cellSize) {
            g.moveTo(x, fy);
            g.lineTo(x, fy + fh);
        }
        for (let y = fy; y <= fy + fh; y += cellSize) {
            g.moveTo(fx, y);
            g.lineTo(fx + fw, y);
        }
        g.strokePath();
        return g;
    },

    /**
     * Decorative border with glowing corners
     */
    styledBorder: (
        scene: Phaser.Scene,
        fx: number,
        fy: number,
        fw: number,
        fh: number,
    ) => {
        const g = scene.add.graphics();
        // Main border
        g.lineStyle(1.5, 0x808080, 0.15);
        g.strokeRect(fx, fy, fw, fh);
        // Corner accents (brighter)
        const cornerLen = 20;
        g.lineStyle(2, 0x808080, 0.3);
        // Top-left
        g.moveTo(fx, fy + cornerLen);
        g.lineTo(fx, fy);
        g.lineTo(fx + cornerLen, fy);
        // Top-right
        g.moveTo(fx + fw - cornerLen, fy);
        g.lineTo(fx + fw, fy);
        g.lineTo(fx + fw, fy + cornerLen);
        // Bottom-left
        g.moveTo(fx, fy + fh - cornerLen);
        g.lineTo(fx, fy + fh);
        g.lineTo(fx + cornerLen, fy + fh);
        // Bottom-right
        g.moveTo(fx + fw - cornerLen, fy + fh);
        g.lineTo(fx + fw, fy + fh);
        g.lineTo(fx + fw, fy + fh - cornerLen);
        g.strokePath();
        // Corner dots
        scene.add.circle(fx, fy, 2, 0x808080, 0.4);
        scene.add.circle(fx + fw, fy, 2, 0x808080, 0.4);
        scene.add.circle(fx, fy + fh, 2, 0x808080, 0.4);
        scene.add.circle(fx + fw, fy + fh, 2, 0x808080, 0.4);
        return g;
    },

    /**
     * Styled fixation cross with subtle glow
     */
    styledCross: (scene: Phaser.Scene, x: number, y: number, size: number) => {
        const container = scene.add.container(x, y);
        // Glow
        container.add(scene.add.circle(0, 0, size * 0.8, 0xffffff, 0.03));
        // Cross
        container.add(scene.add.rectangle(0, 0, size, 1.5, 0xffffff, 0.7));
        container.add(scene.add.rectangle(0, 0, 1.5, size, 0xffffff, 0.7));
        // Center dot
        container.add(scene.add.circle(0, 0, 1.5, 0xffffff, 0.9));
        return container;
    },

    /**
     * Pulse animation — attach to any game object
     */
    pulse: (
        scene: Phaser.Scene,
        target: Phaser.GameObjects.GameObject,
        min: number = 0.95,
        max: number = 1.05,
        duration: number = 800,
    ) => {
        return scene.tweens.add({
            targets: target,
            scaleX: { from: min, to: max },
            scaleY: { from: min, to: max },
            duration,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    },

    /**
     * Slow rotation animation
     */
    rotate: (
        scene: Phaser.Scene,
        target: Phaser.GameObjects.GameObject,
        speed: number = 0.5,
    ) => {
        return scene.tweens.add({
            targets: target,
            angle: 360,
            duration: (360 / speed) * (1000 / 60),
            repeat: -1,
        });
    },

    /**
     * Styled score display with monospace font
     */
    scoreText: (
        scene: Phaser.Scene,
        x: number,
        y: number,
        text: string,
        align: number = 0,
    ): Phaser.GameObjects.Text => {
        return scene.add
            .text(x, y, text, {
                fontSize: '15px',
                color: '#808080',
                fontFamily: '"JetBrains Mono", "Courier New", monospace',
            })
            .setOrigin(align, 0);
    },

    /**
     * Standard HUD: level (left), timer (center), score (right)
     * All games use the same layout — no overlapping, no custom positioning.
     */
    createHUD: (
        scene: Phaser.Scene,
        field: { x: number; y: number; w: number; h: number },
    ) => {
        const fontSize = `${Math.max(12, Math.round(field.w * 0.022))}px`;
        const font = {
            fontSize,
            color: '#808080',
            fontFamily: '"JetBrains Mono", "Courier New", monospace',
        };
        const y = field.y + 8;

        const levelText = scene.add
            .text(field.x + 8, y, 'Ур.1', font)
            .setOrigin(0, 0);
        const timerText = scene.add
            .text(field.x + field.w / 2, y, '00:00', font)
            .setOrigin(0.5, 0);
        const scoreText = scene.add
            .text(field.x + field.w - 8, y, '', font)
            .setOrigin(1, 0);

        return { levelText, timerText, scoreText };
    },

    /**
     * Update all three HUD elements in one call.
     */
    updateHUD: (
        hud: {
            levelText: Phaser.GameObjects.Text;
            timerText: Phaser.GameObjects.Text;
            scoreText: Phaser.GameObjects.Text;
        },
        level: number,
        elapsedMs: number,
        scoreStr: string,
    ) => {
        hud.levelText.setText(`Ур.${level}`);
        const mins = String(Math.floor(elapsedMs / 60000)).padStart(2, '0');
        const secs = String(Math.floor((elapsedMs % 60000) / 1000)).padStart(
            2,
            '0',
        );
        hud.timerText.setText(`${mins}:${secs}`);
        hud.scoreText.setText(scoreStr);
    },
};
