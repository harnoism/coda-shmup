import type {DifficultyData} from "../gameData/DifficultyData.ts";
import type {EnemyData} from "../gameData/EnemyData.ts";

export default class DifficultyUtils {
    // Returns a scaled copy: the data loaded from the JSON cache must stay untouched
    static scaleEnemyData(data: EnemyData, difficulty: DifficultyData): EnemyData {
        return {
            ...data,
            spawn: {
                delay: data.spawn.delay * difficulty.spawnDelayMultiplier,
                maxActive: Math.max(1, Math.round(data.spawn.maxActive * difficulty.maxActiveMultiplier))
            },
            movement: {
                ...data.movement,
                speed: data.movement.speed * difficulty.enemySpeedMultiplier
            },
            weapon: data.weapon && {
                ...data.weapon,
                bullet: {
                    ...data.weapon.bullet,
                    speed: data.weapon.bullet.speed * difficulty.bulletSpeedMultiplier
                }
            }
        };
    }
}
