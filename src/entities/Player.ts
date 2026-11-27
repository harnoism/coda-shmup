import {Input, Scene} from "phaser";
import {PlayerShipData, PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import type {BulletData} from "../gameData/BulletData.ts";
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";
import GameConstants from "../GameConstants.ts";

export default class Player extends Entity {
    // Milliseconds between two engine trail particles while the ship moves
    private static readonly TRAIL_INTERVAL: number = 45;

    private readonly _bulletData: BulletData = {
        width: 12,
        height: 4,
        color: GameConstants.PlayerTheme.BULLET_COLOR,
        speed: 1024,
        damage: 1
    };

    private readonly _cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    private _playerShipData: PlayerShipData;
    private _rateOfFire: number;
    private _lastShotTime: number;
    private readonly _moveDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private readonly _shootDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private _targets: Phaser.Physics.Arcade.Group[] = [];
    private _trailTimer: number = 0;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'sprites');

        if (this.scene.input.keyboard) {
            this._cursorKeys = this.scene.input.keyboard.createCursorKeys();

            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.ONE).on('down', () => this.selectPlayerShip(1));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.TWO).on('down', () => this.selectPlayerShip(2));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.THREE).on('down', () => this.selectPlayerShip(3));
        }
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group, health: number) {
        this.addComponent(new Health(health, this));
        this.addComponent(new Movement());
        this.addComponent(new Weapon(bulletsGroup, this._bulletData));

        this.angle = -90;

        this.selectPlayerShip(1);

        this._rateOfFire = 0.5;
        this._lastShotTime = 0;

        this.getComponent(Health)?.on(Health.CHANGE_EVENT, () => {
            this.arcadeBody.setEnable(false);

            this.scene.time.delayedCall(50, () => {
                // A dead player stays disabled
                if (this.active)
                    this.arcadeBody.setEnable(true);
            });
        });
    }

    public selectPlayerShip(playerShipDataId: number) {
        const playerShipsData = this.scene.cache.json.get('playerShips') as PlayerShipsData;
        this._playerShipData = playerShipsData[playerShipDataId];

        this.setTexture('sprites', this._playerShipData.texture);
        const bodyData = this._playerShipData.body;
        this.arcadeBody.setCircle(bodyData.radius, bodyData.offsetX, bodyData.offsetY);

        this.getComponent(Movement)?.setSpeed(this._playerShipData.movementSpeed);
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        // Build the move direction from the arrow keys
        this._moveDirection.set(0, 0);
        if (this._cursorKeys.left.isDown)
            this._moveDirection.x -= 1;
        if (this._cursorKeys.right.isDown)
            this._moveDirection.x += 1;
        if (this._cursorKeys.up.isDown)
            this._moveDirection.y -= 1;
        if (this._cursorKeys.down.isDown)
            this._moveDirection.y += 1;

        if (this._moveDirection.lengthSq() > 0) {
            this._moveDirection.normalize();
            this.getComponent(Movement)?.move(this, this._moveDirection, deltaTime);

            // Face the move direction
            this.rotation = this._moveDirection.angle();

            this.emitTrail(deltaTime);
        }

        // Stop player from leaving the arena
        this.x = Phaser.Math.Clamp(this.x, this.displayWidth / 2, GameConstants.ARENA_WIDTH - this.displayWidth / 2);
        this.y = Phaser.Math.Clamp(this.y, this.displayHeight / 2, GameConstants.ARENA_HEIGHT - this.displayHeight / 2);

        // Shoot automatically at the nearest enemy
        if (timeSinceLaunch - this._lastShotTime > this._rateOfFire * 1000) {
            const nearestTarget = this.findNearestTarget();
            if (nearestTarget) {
                this._shootDirection.set(nearestTarget.x - this.x, nearestTarget.y - this.y).normalize();
                this.getComponent(Weapon)?.shoot(this, this._shootDirection);
                this.scene.sound.play('sfx_laser1');

                this._lastShotTime = timeSinceLaunch;
            }
        }
    }

    // Engine particles behind the ship, drawn by the EffectsManager
    private emitTrail(deltaTime: number) {
        this._trailTimer += deltaTime;
        if (this._trailTimer < Player.TRAIL_INTERVAL)
            return;

        this._trailTimer = 0;
        const behindX: number = this.x - Math.cos(this.rotation) * this.displayWidth * 0.4;
        const behindY: number = this.y - Math.sin(this.rotation) * this.displayWidth * 0.4;
        this.scene.events.emit(GameConstants.Events.PLAYER_TRAIL_EVENT, behindX, behindY, GameConstants.PlayerTheme.EFFECT_COLOR);
    }

    public setTargets(targets: Phaser.Physics.Arcade.Group[]) {
        this._targets = targets;
    }

    private findNearestTarget(): Entity | null {
        return this.scene.physics.closest(this, this._targets.flatMap(group => group.getMatching('active', true))) as Entity | null;
    }
}
