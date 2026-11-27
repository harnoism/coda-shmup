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
        PLAYER_TRAIL_EVENT: "playerTrail",
        // Emitted on the game events: a short message for the UI to show (debug cheats feedback)
        DEBUG_MESSAGE_EVENT: "debugMessage",
    } as const);

    public static readonly SceneKeys = Object.freeze({
        HOME: "HomeScene",
        MAIN_GAME: "MainGameScene",
        MAIN_UI: "MainUIScene",
        GAME_OVER: "GameOverScene",
    } as const);

    // Colors of everything that belongs to the player: the pink sprites of the ships are in assets-src/sprites.
    // The bullets are a lighter pastel pink than the pink enemies (#ff69b4) so the two stay easy to tell apart.
    public static readonly PlayerTheme = Object.freeze({
        BULLET_COLOR: 0xffb3e6,
        EFFECT_COLOR: 0xff5cc8,
        // Hit feedback: red, not pink, since the player is pink now
        DAMAGE_COLOR: 0xff3b3b,
    } as const);

    // Debug shortcuts (B: jump to the boss wave), only in `npm run dev`, not in the production build
    public static readonly DEBUG_CHEATS_ENABLED: boolean = import.meta.env.DEV;
    public static readonly DEBUG_MESSAGE_DURATION: number = 1500;

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