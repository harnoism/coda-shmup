export default class GameConstants {
    public static readonly Events = Object.freeze({
        PLAYER_SPAWNED_EVENT: "playerSpawned",
        ENEMY_SPAWNED_EVENT: "enemySpawned",
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
}