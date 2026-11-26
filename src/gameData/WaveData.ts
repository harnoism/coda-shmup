export type WavesData = WaveData[];

export type WaveData = {
    enemies: WaveEnemyData[];
    // Optional: key of an enemy of enemies.json, spawned once the other enemies are dead
    boss?: string;
}

export type WaveEnemyData = {
    // Key of an enemy of enemies.json
    type: string;
    count: number;
}
