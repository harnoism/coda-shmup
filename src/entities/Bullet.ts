import {BulletData} from "../gameData/BulletData.ts";
import GameConstants from "../GameConstants.ts";

export default class Bullet extends Phaser.GameObjects.Rectangle {
    // Milliseconds between two trail particles
    private static readonly TRAIL_INTERVAL: number = 40;

    private _arcadeBody: Phaser.Physics.Arcade.Body;

    private _damage: number = 0;
    private _color: number = 0xffffff;
    private _trailTimer: number = 0;

    public get damage(): number {
        return this._damage;
    }

    public get color(): number {
        return this._color;
    }

    public init() {
        this.scene.physics.add.existing(this);

        this._arcadeBody = this.body as Phaser.Physics.Arcade.Body;
        this._arcadeBody.allowGravity = false;
        this._arcadeBody.setFriction(0, 0);
    }

    public enable(x: number, y: number, velocityX: number, velocityY: number, data: BulletData) {
        this.setPosition(x, y);
        this.setSize(data.width, data.height);
        this.setOrigin(0.5);
        this.setFillStyle(data.color);

        this.scene.physics.world.add(this._arcadeBody);
        this.setActive(true);
        this.setVisible(true);

        this._arcadeBody.setVelocity(velocityX, velocityY);
        this._damage = data.damage;
        this._color = data.color;
        this._trailTimer = 0;

        // Rotate the bullet to face the direction it's moving
        this.setRotation(this._arcadeBody.velocity.angle());

        // Maths way
        // this.setRotation(Math.atan2(velocityY, velocityX));

        // Arcade bodies can't rotate: fit the body to the rotated bullet bounds
        const cos: number = Math.abs(Math.cos(this.rotation));
        const sin: number = Math.abs(Math.sin(this.rotation));
        this._arcadeBody.setSize(data.width * cos + data.height * sin, data.width * sin + data.height * cos);
    }

    public disable() {
        this.scene.physics.world.disableBody(this._arcadeBody);
        this.setActive(false);
        this.setVisible(false);
    }

    update(timeSinceLaunch: number, deltaTime: number) {
        super.update(timeSinceLaunch, deltaTime);

        this._trailTimer += deltaTime;
        if (this._trailTimer >= Bullet.TRAIL_INTERVAL) {
            this._trailTimer = 0;
            this.scene.events.emit(GameConstants.Events.BULLET_TRAIL_EVENT, this.x, this.y, this._color);
        }

        // Recycle bullets when they leave the arena on any side
        if (this.x < -this.displayWidth || this.x > GameConstants.ARENA_WIDTH + this.displayWidth
            || this.y < -this.displayHeight || this.y > GameConstants.ARENA_HEIGHT + this.displayHeight) {
            this.disable();
        }
    }
}