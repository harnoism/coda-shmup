import {GameObjects, Scenes, Scene} from "phaser";
import Health from "../components/Health.ts";
import Enemy from "../entities/Enemy.ts";
import Player from "../entities/Player.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class MainUIScene extends Scene {
    private static readonly MARGIN: number = 64;
    private static readonly HEART_SPACING: number = 72;
    private static readonly BOSS_BAR_WIDTH: number = 800;
    private static readonly BOSS_BAR_HEIGHT: number = 28;
    private static readonly BOSS_BAR_COLOR: number = 0xff4d8d;
    private static readonly BOSS_BAR_CSS_COLOR: string = "#ff4d8d";

    private _hearts: GameObjects.Image[] = [];
    private _scoreText: GameObjects.BitmapText;
    private _waveText: GameObjects.Text;
    private _waveBanner: GameObjects.Text;
    private _bossBanner: GameObjects.Text;
    private _bossLabel: GameObjects.Text;
    private _bossBar: GameObjects.Graphics;

    constructor() {
        super(GameConstants.SceneKeys.MAIN_UI);
    }

    // noinspection JSUnusedGlobalSymbols
    init() {
        this.game.events.on(GameConstants.Events.PLAYER_SPAWNED_EVENT, this.onPlayerSpawned, this);
        this.game.events.on(GameConstants.Events.ENEMY_SPAWNED_EVENT, this.onEnemySpawned, this);
        this.game.events.on(GameConstants.Events.WAVE_STARTED_EVENT, this.onWaveStarted, this);
        this.registry.events.on(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onPlayerScoreChanged, this);

        this.events.once(Scenes.Events.SHUTDOWN, () => {
            this.game.events.off(GameConstants.Events.PLAYER_SPAWNED_EVENT, this.onPlayerSpawned, this);
            this.game.events.off(GameConstants.Events.ENEMY_SPAWNED_EVENT, this.onEnemySpawned, this);
            this.game.events.off(GameConstants.Events.WAVE_STARTED_EVENT, this.onWaveStarted, this);
            this.registry.events.off(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onPlayerScoreChanged, this);
        }, this);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        this._hearts = [];

        let scoreStr: string = "".padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        if (this.registry.has(RegistryConstants.Keys.PLAYER_SCORE))
            scoreStr = this.registry.get(RegistryConstants.Keys.PLAYER_SCORE).toString()
                .padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        this._scoreText = this.add.bitmapText(this.scale.width - MainUIScene.MARGIN, MainUIScene.MARGIN, "future-bmp", scoreStr, 128)
            .setOrigin(1, 0);

        // The bitmap font only has digits: letters use the TTF font
        this._waveText = this.add.text(MainUIScene.MARGIN, MainUIScene.MARGIN + 96, "", this.textStyle(40, "#ffffff"));

        const centerX: number = this.scale.width / 2;
        this._waveBanner = this.add.text(centerX, this.scale.height * 0.35, "", this.textStyle(128, "#ffffff"))
            .setOrigin(0.5).setAlpha(0);
        this._bossBanner = this.add.text(centerX, this.scale.height * 0.35 + 120, "BOSS", this.textStyle(80, MainUIScene.BOSS_BAR_CSS_COLOR))
            .setOrigin(0.5).setAlpha(0);

        this._bossLabel = this.add.text(centerX, MainUIScene.MARGIN - 24, "BOSS", this.textStyle(40, MainUIScene.BOSS_BAR_CSS_COLOR))
            .setOrigin(0.5, 0).setVisible(false);
        this._bossBar = this.add.graphics().setVisible(false);

        this.scene.bringToTop();

        console.log("MainUIScene created");
    }

    private textStyle(fontSize: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
        return {fontSize: fontSize + "px", color, fontFamily: "future", stroke: "#000000", strokeThickness: fontSize / 10};
    }

    private onPlayerScoreChanged(_: any, value: number) {
        const scoreStr: string = value.toString().padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        this._scoreText.setText(scoreStr);
    }

    private onPlayerSpawned(player: Player) {
        const health = player.getComponent(Health)!;

        // The player can respawn without this scene restarting (R key): start from a fresh row of hearts
        this._hearts.forEach(heart => heart.destroy());
        this._hearts = [];
        for (let i = 0; i < health.max; i++) {
            this._hearts.push(this.add.image(MainUIScene.MARGIN + i * MainUIScene.HEART_SPACING, MainUIScene.MARGIN, "sprites", "heartFull")
                .setOrigin(0));
        }

        health.on(Health.CHANGE_EVENT, (current: number) => {
            this._hearts.forEach((heart, i) => heart.setTexture("sprites", i < current ? "heartFull" : "heartEmpty"));

            // Make the heart that was just lost pop
            const lostHeart = this._hearts[current];
            if (lostHeart) {
                this.tweens.add({targets: lostHeart, scale: {from: 1.5, to: 1}, duration: 250, ease: 'Back.easeOut'});
            }
        }, this);
    }

    private onWaveStarted(waveNumber: number, hasBoss: boolean) {
        this._waveText.setText("WAVE " + waveNumber);
        this._waveBanner.setText("WAVE " + waveNumber);

        // Pop in, stay readable, then fade out
        const targets: GameObjects.Text[] = hasBoss ? [this._waveBanner, this._bossBanner] : [this._waveBanner];
        this.tweens.add({
            targets,
            alpha: {from: 0, to: 1},
            scale: {from: 0.6, to: 1},
            duration: 400,
            ease: 'Back.easeOut',
            hold: GameConstants.WAVE_START_DELAY - 1200,
            yoyo: true
        });
    }

    private onEnemySpawned(enemy: Enemy) {
        if (!enemy.isBoss)
            return;

        const health = enemy.getComponent(Health)!;
        this._bossLabel.setVisible(true);
        this._bossBar.setVisible(true);
        this.drawBossBar(health.current / health.max);

        const onBossHealthChanged = (current: number) => {
            this.drawBossBar(current / health.max);

            // Bosses are pooled like any enemy: stop listening once this one is dead
            if (current <= 0) {
                health.off(Health.CHANGE_EVENT, onBossHealthChanged, this);
                this._bossLabel.setVisible(false);
                this._bossBar.setVisible(false);
            }
        };
        health.on(Health.CHANGE_EVENT, onBossHealthChanged, this);
    }

    private drawBossBar(ratio: number) {
        const width: number = MainUIScene.BOSS_BAR_WIDTH;
        const height: number = MainUIScene.BOSS_BAR_HEIGHT;
        const x: number = (this.scale.width - width) / 2;
        const y: number = MainUIScene.MARGIN + 32;

        this._bossBar.clear();
        this._bossBar.fillStyle(0x000000, 0.6).fillRect(x, y, width, height);
        this._bossBar.fillStyle(MainUIScene.BOSS_BAR_COLOR, 1).fillRect(x, y, width * ratio, height);
        this._bossBar.lineStyle(4, 0xffffff, 1).strokeRect(x, y, width, height);
    }
}
