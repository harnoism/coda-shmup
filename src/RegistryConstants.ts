import {Data} from 'phaser';

export default class RegistryConstants {
    public static readonly Keys = Object.freeze({
        PLAYER_SCORE: 'playerScore',
        DIFFICULTY: 'difficulty'
    } as const);

    public static readonly Events = Object.freeze({
        PLAYER_SCORE_CHANGE: Data.Events.CHANGE_DATA_KEY + RegistryConstants.Keys.PLAYER_SCORE
    } as const);
}