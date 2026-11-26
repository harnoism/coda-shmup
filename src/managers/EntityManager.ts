import {GameObjects, Plugins, Physics, Scene} from "phaser";
import Health from "../components/Health.ts";
import Bullet from "../entities/Bullet.ts";
import Enemy from "../entities/Enemy.ts";
import Player from "../entities/Player.ts";
import type {DifficultiesData, DifficultyData} from "../gameData/DifficultyData.ts";
import type {EnemiesData, EnemyData, EnemySpawnData} from "../gameData/EnemyData.ts";
import type {WavesData} from "../gameData/WaveData.ts";
import WaveManager, {WaveSpawner} from "./WaveManager.ts";
import DifficultyUtils from "../utils/DifficultyUtils.ts";
import GroupUtils from "../utils/GroupUtils.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

// An enemy type of enemies.json: its pooled enemies and its data scaled by the difficulty
type EnemyType = {
    group: Physics.Arcade.Group;
    data: EnemyData;
}

export default class EntityManager extends Plugins.ScenePlugin implements WaveSpawner {
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
    private readonly _enemyTypes: Map<string, EnemyType> = new Map();
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
        this._player.init(this._playerBullets, this.getDifficulty().playerHealth);

        console.log("[EntityManager] Player spawned");

        this.game!.events.emit(GameConstants.Events.PLAYER_SPAWNED_EVENT, this._player);

        return this._player;
    }

    public initEnemies() {
        this._enemyBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(256, this._enemyBullets);

        // The plugin outlives scene restarts: drop the types of the previous run
        this._enemyTypes.clear();
        const enemiesData = this.scene!.cache.json.get('enemies') as EnemiesData;
        const difficulty = this.getDifficulty();
        for (const [enemyKey, baseEnemyData] of Object.entries(enemiesData)) {
            const enemyData = DifficultyUtils.scaleEnemyData(baseEnemyData, difficulty);
            const group = this.scene!.physics.add.group({
                classType: Enemy,
                defaultKey: 'sprites',
                defaultFrame: enemyData.texture,
                createCallback: (enemy) => {
                    (enemy as Enemy).init(this._enemyBullets, this._player, enemyData);
                }
            });
            this._enemyTypes.set(enemyKey, {group, data: enemyData});
        }

        this._player.setTargets(Array.from(this._enemyTypes.values(), enemyType => enemyType.group));

        const wavesData = this.scene!.cache.json.get('waves') as WavesData;
        new WaveManager(this.scene!, wavesData, difficulty.waveCountMultiplier, this).start();

        console.log("[EntityManager] Enemies initialized");
    }

    public initGroupCollisions() {
        const enemyGroups: Physics.Arcade.Group[] = Array.from(this._enemyTypes.values(), enemyType => enemyType.group);
        for (let i = 0; i < enemyGroups.length; i++) {
            const enemies = enemyGroups[i];

            // Push enemies apart so they don't stack into a single blob, including enemies of other types
            for (let j = i; j < enemyGroups.length; j++) {
                this.scene!.physics.add.collider(enemies, enemyGroups[j]);
            }

            this.scene!.physics.add.overlap(this._playerBullets, enemies, (bullet, enemy) => {
                this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

                (bullet as Bullet).disable();
                (enemy as Enemy).getComponent(Health)?.damage((bullet as Bullet).damage);
            });

            this.scene!.physics.add.overlap(this._player, enemies, (player, enemy) => {
                this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

                (enemy as Enemy).onPlayerContact();

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

    // The difficulty picked in the home menu, or the default one
    private getDifficulty(): DifficultyData {
        const difficulties = this.scene!.cache.json.get('difficulties') as DifficultiesData;
        const difficultyKey: string = this.scene!.registry.get(RegistryConstants.Keys.DIFFICULTY) ?? GameConstants.DEFAULT_DIFFICULTY;

        return difficulties[difficultyKey] ?? difficulties[GameConstants.DEFAULT_DIFFICULTY];
    }

    public getSpawnData(enemyKey: string): EnemySpawnData {
        return this._enemyTypes.get(enemyKey)!.data.spawn;
    }

    public countActive(enemyKey: string): number {
        return this._enemyTypes.get(enemyKey)!.group.countActive(true);
    }

    public countAllActive(): number {
        let total: number = 0;
        for (const enemyType of this._enemyTypes.values()) {
            total += enemyType.group.countActive(true);
        }

        return total;
    }

    public spawn(enemyKey: string): boolean {
        const enemy = this._enemyTypes.get(enemyKey)!.group.get() as Enemy | null;
        if (!enemy) {
            return false;
        }

        // Spawn on a circle around the camera view, a bit further than its corners: always outside the screen.
        // Center on the view, not the player: at the arena edges the camera stops and the player is off-center
        const view = this.scene!.cameras.main.worldView;
        const spawnRadius = Phaser.Math.Distance.Between(view.centerX, view.centerY, view.right, view.top) + 128;
        Phaser.Math.RandomXY(this._spawnOffset, spawnRadius);
        enemy.enable(view.centerX + this._spawnOffset.x, view.centerY + this._spawnOffset.y);

        this.game!.events.emit(GameConstants.Events.ENEMY_SPAWNED_EVENT, enemy);

        console.log("[EntityManager] Enemy spawned");

        return true;
    }
}