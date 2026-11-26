import {Loader} from "phaser";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";
import SaveConstants from "../SaveConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import type {DifficultiesData} from "../gameData/DifficultyData.ts";

export default class HomeScene extends Phaser.Scene {
    private saveManager: SaveManager;

    constructor() {
        super(GameConstants.SceneKeys.HOME);
    }

    preload() {
        const width: number = this.scale.width;
        const y: number = this.scale.height / 2;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(0, y, width, 64);
        this.load.on(Loader.Events.PROGRESS, function (value: number) { // 0-1
            console.log("Loading : " + value);

            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(0, y, width * value, 64);
        });
        this.load.on(Loader.Events.COMPLETE, function () {
            console.log("Loading complete");

            progressBar.destroy();
            progressBox.destroy();
        });

        this.load.setPath('assets');

        this.load.image('bg', 'Backgrounds/darkPurple.png');
        this.load.image('planet', 'Planets/planet00.png');
        this.load.atlas('sprites', 'Spritesheet/gameSprites.png', 'Spritesheet/gameSprites.json');
        this.load.bitmapFont('future-bmp', 'Fonts/kenvector_future.png', 'Fonts/kenvector_future.xml');
        this.load.font('future', 'Fonts/kenvector_future.ttf');
        this.load.json('playerShips', 'Data/playerShips.json');
        this.load.json('enemies', 'Data/enemies.json');
        this.load.json('waves', 'Data/waves.json');
        this.load.json('difficulties', 'Data/difficulties.json');
        this.load.audio('sfx_laser1', 'Sounds/sfx_laser1.ogg');
        this.load.audio('sfx_laser2', 'Sounds/sfx_laser2.ogg');
    }

    create() {
        const titleY: number = this.scale.height * 0.3;
        this.add.text(this.scale.width / 2, titleY, 'CODA SHMUP',
            {fontSize: '72px', color: '#fff', fontFamily: 'future'}).setOrigin(0.5);
        this.add.text(this.scale.width / 2, titleY + 72, 'Press SPACE to start',
            {fontSize: '32px', color: '#fff'}).setOrigin(0.5);

        this.createDifficultySelector(titleY + 192);

        // Ignore the OS key repeat: SPACE may still be held from the previous game
        this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
            if (event.repeat)
                return;

            this.scene.launch(GameConstants.SceneKeys.MAIN_UI);
            this.scene.start(GameConstants.SceneKeys.MAIN_GAME);
        });

        console.log("HomeScene created");
    }

    // LEFT and RIGHT cycle through the difficulties of difficulties.json, the choice is saved between sessions
    private createDifficultySelector(y: number) {
        const difficulties = this.cache.json.get('difficulties') as DifficultiesData;
        const difficultyKeys: string[] = Object.keys(difficulties);

        this.saveManager?.load();
        const savedKey: string = this.saveManager?.getData(SaveConstants.Keys.DIFFICULTY) ?? GameConstants.DEFAULT_DIFFICULTY;
        let index: number = Math.max(0, difficultyKeys.indexOf(savedKey));

        const centerX: number = this.scale.width / 2;
        const difficultyText = this.add.text(centerX, y, '', {fontSize: '48px', color: '#fff', fontFamily: 'future'})
            .setOrigin(0.5);
        this.add.text(centerX, y + 72, 'LEFT / RIGHT to change the difficulty', {fontSize: '32px', color: '#fff'})
            .setOrigin(0.5);

        const select = (newIndex: number, save: boolean) => {
            index = Phaser.Math.Wrap(newIndex, 0, difficultyKeys.length);
            const key: string = difficultyKeys[index];

            difficultyText.setText(difficulties[key].label);
            this.registry.set(RegistryConstants.Keys.DIFFICULTY, key);
            if (save)
                this.saveManager?.setData(SaveConstants.Keys.DIFFICULTY, key);
        };
        select(index, false);

        this.input.keyboard?.on('keydown-LEFT', () => select(index - 1, true));
        this.input.keyboard?.on('keydown-RIGHT', () => select(index + 1, true));
    }
}
