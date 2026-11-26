export type DifficultiesData = {
    [key: string]: DifficultyData
}

export type DifficultyData = {
    // Shown in the home menu
    label: string;
    // Multiplies the delay between two enemy spawns: above 1 means fewer enemies
    spawnDelayMultiplier: number;
    // Multiplies the number of enemies of each type allowed alive at once
    maxActiveMultiplier: number;
    enemySpeedMultiplier: number;
    bulletSpeedMultiplier: number;
    playerHealth: number;
}
