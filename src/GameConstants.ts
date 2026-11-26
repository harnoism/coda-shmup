export default class GameConstants {
    public static readonly Events = Object.freeze({
        PLAYER_SPAWNED_EVENT: "playerSpawned",
        ENEMY_SPAWNED_EVENT: "enemySpawned",
        WAVE_STARTED_EVENT: "waveStarted",
        // Emitted on the scene events, for the visual effects
        ENTITY_DAMAGED_EVENT: "entityDamaged",
        ENTITY_DIED_EVENT: "entityDied",
        BULLET_FIRED_EVENT: "bulletFired",
        BULLET_HIT_EVENT: "bulletHit",
        BULLET_TRAIL_EVENT: "bulletTrail",
    } as const);

    public static readonly SceneKeys = Object.freeze({
        HOME: "HomeScene",
        MAIN_GAME: "MainGameScene",
        MAIN_UI: "MainUIScene",
        GAME_OVER: "GameOverScene",
    } as const);

    // Key of the difficulty in difficulties.json used until the player picks one
    public static readonly DEFAULT_DIFFICULTY: string = "normal";

    public static readonly MAX_SCORE_DIGITS: number = 6;

    // Small enough for the planet, at the center, to stay visible from the arena corners
    public static readonly ARENA_WIDTH: number = 4700;
    public static readonly ARENA_HEIGHT: number = 3400;

    // Time to show the wave announcement before the first enemy spawns
    public static readonly WAVE_START_DELAY: number = 2500;
    // Time between the last enemy of a wave and the announcement of the next one
    public static readonly WAVE_INTERMISSION_DELAY: number = 3000;
    // Once all the waves are played, they start again with this much more enemies each lap
    public static readonly WAVE_LOOP_COUNT_SCALING: number = 0.5;
}