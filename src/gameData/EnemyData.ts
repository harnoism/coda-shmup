import type {BulletData} from "./BulletData.ts";
import type {SpreadShotData} from "./SpreadShotData.ts";

export type EnemiesData = {
    [key: string]: EnemyData
}

export type EnemyData = {
    texture: string;
    // Hex color like "#ff69b4", tints the texture to tell enemies apart without a new sprite
    tint?: string;
    health: number;
    spawn: EnemySpawnData;
    movement: EnemyMovementData;
    // Optional: enemies without a weapon only chase the player
    weapon?: EnemyWeaponData;
}

export type EnemySpawnData = {
    // Milliseconds between two spawns
    delay: number;
    // No spawn while this many enemies of this type are alive
    maxActive: number;
}

export type EnemyMovementData = {
    // Pixels per millisecond, toward the player
    speed: number;
    // Optional: also weave from side to side of the path to the player
    sine?: SineMovementData;
}

export type SineMovementData = {
    // Pixels
    amplitude: number;
    // Cycles per second
    frequency: number;
}

export type EnemyWeaponData = {
    // Milliseconds, the delay between two shots is picked in this range
    shootDelayMin: number;
    shootDelayMax: number;
    bullet: EnemyBulletData;
    spread: SpreadShotData;
}

// Same as BulletData, with the color as a hex string like "#f25f5c" since JSON has no hex numbers
export type EnemyBulletData = Omit<BulletData, 'color'> & {
    color: string;
}
