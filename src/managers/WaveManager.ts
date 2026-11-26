import {Scene} from "phaser";
import GameConstants from "../GameConstants.ts";
import type {EnemySpawnData} from "../gameData/EnemyData.ts";
import type {WaveData, WavesData} from "../gameData/WaveData.ts";

// What the wave manager needs from the game to spawn enemies and know when a wave is cleared
export interface WaveSpawner {
    getSpawnData(enemyKey: string): EnemySpawnData;
    countActive(enemyKey: string): number;
    countAllActive(): number;
    // Returns false when no enemy could be spawned
    spawn(enemyKey: string): boolean;
}

// Plays the waves of waves.json one after the other, forever: once the last one is done, they start over with more enemies
export default class WaveManager {
    private readonly _scene: Scene;
    private readonly _waves: WavesData;
    private readonly _countMultiplier: number;
    private readonly _spawner: WaveSpawner;

    private _waveIndex: number = 0;
    private _state: 'announcing' | 'spawning' | 'boss' | 'intermission' = 'announcing';
    private readonly _remaining: Map<string, number> = new Map();
    private readonly _nextSpawnTime: Map<string, number> = new Map();
    private _bossKey: string | undefined;

    public constructor(scene: Scene, waves: WavesData, countMultiplier: number, spawner: WaveSpawner) {
        this._scene = scene;
        this._waves = waves;
        this._countMultiplier = countMultiplier;
        this._spawner = spawner;
    }

    public start() {
        this.startWave(0);

        this._scene.time.addEvent({delay: 100, callback: this.update, callbackScope: this, loop: true});
    }

    private startWave(waveIndex: number) {
        this._waveIndex = waveIndex;

        const wave: WaveData = this._waves[waveIndex % this._waves.length];
        const lap: number = Math.floor(waveIndex / this._waves.length);
        const lapMultiplier: number = 1 + lap * GameConstants.WAVE_LOOP_COUNT_SCALING;

        this._remaining.clear();
        this._nextSpawnTime.clear();
        for (const enemy of wave.enemies) {
            this._remaining.set(enemy.type, Math.max(1, Math.ceil(enemy.count * this._countMultiplier * lapMultiplier)));
            this._nextSpawnTime.set(enemy.type, 0);
        }
        this._bossKey = wave.boss;

        // Let the player read the announcement on an empty screen before the first enemy
        this._state = 'announcing';
        this._scene.game.events.emit(GameConstants.Events.WAVE_STARTED_EVENT, waveIndex + 1, wave.boss !== undefined);
        this._scene.time.delayedCall(GameConstants.WAVE_START_DELAY, () => this._state = 'spawning');
    }

    private update() {
        if (this._state === 'spawning') {
            this.updateSpawning();
        } else if (this._state === 'boss' && this._spawner.countActive(this._bossKey!) === 0) {
            this.endWave();
        }
    }

    private updateSpawning() {
        const now: number = this._scene.time.now;

        for (const [enemyKey, remaining] of this._remaining) {
            if (remaining <= 0)
                continue;

            const spawnData: EnemySpawnData = this._spawner.getSpawnData(enemyKey);
            const canSpawn: boolean = now >= this._nextSpawnTime.get(enemyKey)!
                && this._spawner.countActive(enemyKey) < spawnData.maxActive;
            if (canSpawn && this._spawner.spawn(enemyKey)) {
                this._remaining.set(enemyKey, remaining - 1);
                this._nextSpawnTime.set(enemyKey, now + spawnData.delay);
            }
        }

        const allSpawned: boolean = Array.from(this._remaining.values()).every(remaining => remaining <= 0);
        if (!allSpawned || this._spawner.countAllActive() > 0)
            return;

        // Everything is dead: the boss comes next, or the wave is over
        if (this._bossKey && this._spawner.spawn(this._bossKey)) {
            this._state = 'boss';
        } else {
            this.endWave();
        }
    }

    private endWave() {
        this._state = 'intermission';
        this._scene.time.delayedCall(GameConstants.WAVE_INTERMISSION_DELAY, () => this.startWave(this._waveIndex + 1));
    }
}
