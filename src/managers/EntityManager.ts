import {GameObjects, Plugins, Physics, Scene} from "phaser";
import Health from "../components/Health.ts";
import Bullet from "../entities/Bullet.ts";
import Enemy from "../entities/Enemy.ts";
import Player from "../entities/Player.ts";
import type {EnemiesData, EnemyData} from "../gameData/EnemyData.ts";
import GroupUtils from "../utils/GroupUtils.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class EntityManager extends Plugins.ScenePlugin {
    public static readonly PLUGIN_KEY: string = 'EntityManager';
    public static readonly MAPPING_NAME: string = 'entityManager';

    // noinspection JSUnusedGlobalSymbols
    private readonly bulletGroupConfig = {
        classType: Bullet,
        maxSize: 256,
        runChildUpdate: true,
        createCallback: (bullet: GameObjects.GameObject) => {
            (bullet as Bullet).init();
        }
    }

    private _player: Player;
    private _playerBullets: Physics.Arcade.Group;
    // One pooled group per enemy type of enemies.json
    private _enemyGroups: Physics.Arcade.Group[] = [];
    private _enemyBullets: Physics.Arcade.Group;
    private readonly _spawnOffset: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

    constructor(scene: Scene, pluginManager: Plugins.PluginManager) {
        super(scene, pluginManager, EntityManager.PLUGIN_KEY);

        console.log("[EntityManager] Initialized");
    }

    destroy() {
        super.destroy();

        console.log("[EntityManager] Destroyed");
    }

    public initAndSpawnPlayer(): Player {
        this._playerBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(64, this._playerBullets);

        this._player = new Player(this.scene!, GameConstants.ARENA_WIDTH / 2, GameConstants.ARENA_HEIGHT / 2);
        this._player.init(this._playerBullets);

        console.log("[EntityManager] Player spawned");

        this.game!.events.emit(GameConstants.Events.PLAYER_SPAWNED_EVENT, this._player);

        return this._player;
    }

    public initEnemies() {
        this._enemyBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(256, this._enemyBullets);

        // The plugin outlives scene restarts: drop the groups of the previous run
        this._enemyGroups = [];
        const enemiesData = this.scene!.cache.json.get('enemies') as EnemiesData;
        for (const enemyData of Object.values(enemiesData)) {
            const enemies = this.scene!.physics.add.group({
                classType: Enemy,
                defaultKey: 'sprites',
                defaultFrame: enemyData.texture,
                createCallback: (enemy) => {
                    (enemy as Enemy).init(this._enemyBullets, this._player, enemyData);
                }
            });
            this._enemyGroups.push(enemies);

            // Spawn enemies of this type indefinitely
            this.scene!.time.addEvent({
                delay: enemyData.spawn.delay,
                callback: this.spawnEnemy,
                args: [enemies, enemyData],
                callbackScope: this,
                loop: true
            });
        }

        this._player.setTargets(this._enemyGroups);

        console.log("[EntityManager] Enemies initialized");
    }

    public initGroupCollisions() {
        for (let i = 0; i < this._enemyGroups.length; i++) {
            const enemies = this._enemyGroups[i];

            // Push enemies apart so they don't stack into a single blob, including enemies of other types
            for (let j = i; j < this._enemyGroups.length; j++) {
                this.scene!.physics.add.collider(enemies, this._enemyGroups[j]);
            }

            this.scene!.physics.add.overlap(this._playerBullets, enemies, (bullet, enemy) => {
                this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

                (bullet as Bullet).disable();
                (enemy as Enemy).getComponent(Health)?.damage((bullet as Bullet).damage);
            });

            this.scene!.physics.add.overlap(this._player, enemies, (player, enemy) => {
                this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

                const enemyHealth = (enemy as Enemy).getComponent(Health);
                enemyHealth?.damage(enemyHealth?.max);

                const playerHealth = (player as Player).getComponent(Health);
                playerHealth?.damage(1);

                this.scene?.cameras.main.shake(100, 0.03);
            });
        }

        this.scene!.physics.add.overlap(this._player, this._enemyBullets, (player, bullet) => {
            (bullet as Bullet).disable();
            (player as Player).getComponent(Health)?.damage((bullet as Bullet).damage);

            this.scene?.cameras.main.shake(100, 0.01);
        });

        console.log("[EntityManager] Group collisions initialized");
    }

    private spawnEnemy(enemies: Physics.Arcade.Group, enemyData: EnemyData) {
        if (enemies.countActive(true) >= enemyData.spawn.maxActive) {
            return;
        }

        const enemy = enemies.get() as Enemy;
        if (!enemy) {
            return;
        }

        // Spawn on a circle around the camera view, a bit further than its corners: always outside the screen.
        // Center on the view, not the player: at the arena edges the camera stops and the player is off-center
        const view = this.scene!.cameras.main.worldView;
        const spawnRadius = Phaser.Math.Distance.Between(view.centerX, view.centerY, view.right, view.top) + 128;
        Phaser.Math.RandomXY(this._spawnOffset, spawnRadius);
        enemy.enable(view.centerX + this._spawnOffset.x, view.centerY + this._spawnOffset.y);

        this.game!.events.emit(GameConstants.Events.ENEMY_SPAWNED_EVENT, enemy);

        console.log("[EntityManager] Enemy spawned");
    }
}