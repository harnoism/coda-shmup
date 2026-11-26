import {Physics} from 'phaser';
import {BulletData} from "../gameData/BulletData.ts";
import {SpreadShotData} from "../gameData/SpreadShotData.ts";
import Bullet from "../entities/Bullet.ts";
import Entity from "../entities/Entity.ts";
import GameConstants from "../GameConstants.ts";
import IComponent from "./IComponent.ts";

export default class Weapon implements IComponent {
    public enabled: boolean = true;

    private readonly _bullets: Physics.Arcade.Group;
    private readonly _bulletData: BulletData;

    constructor(bullets: Physics.Arcade.Group, bulletData: BulletData) {
        if (!bullets) {
            console.error("Weapon 'bullets' group cannot be null or undefined");
        }

        this._bullets = bullets;
        this._bulletData = bulletData;
    }

    // Shoots forward, or along direction (normalized) when given
    public shoot(source: Entity, direction?: Phaser.Math.Vector2) {
        if (!this.enabled)
            return;

        if (!this._bullets)
            return;

        const bullet: Bullet = this._bullets.get() as Bullet;
        if (bullet) {
            // Get forward vector of the source entity
            const sourceForward: Phaser.Math.Vector2 = direction ?? new Phaser.Math.Vector2(1, 0).rotate(source.rotation);
            const bulletVelocity: Phaser.Math.Vector2 = sourceForward.clone().scale(this._bulletData.speed);
            bullet.enable(source.x + sourceForward.x * source.arcadeBody.radius, source.y + sourceForward.y * source.arcadeBody.radius,
                bulletVelocity.x, bulletVelocity.y, this._bulletData);
            source.scene.events.emit(GameConstants.Events.BULLET_FIRED_EVENT, bullet.x, bullet.y, this._bulletData.color);

            // Maths way
            // const forwardVectorX: number = Math.cos(source.rotation);
            // const forwardVectorY: number = Math.sin(source.rotation);
            // const bulletVelocityX: number = forwardVectorX * this._bulletData.speed;
            // const bulletVelocityY: number = forwardVectorY * this._bulletData.speed;
            // bullet.enable(source.x + forwardVectorX * source.arcadeBody.radius, source.y + forwardVectorY * source.arcadeBody.radius,
            //     bulletVelocityX, bulletVelocityY, this._bulletData);
        }
    }

    // Shoots a fan of bullets evenly spaced and centered on direction, or on the source forward when not given
    public shootSpread(source: Entity, spread: SpreadShotData, direction?: Phaser.Math.Vector2) {
        const centerDirection: Phaser.Math.Vector2 = direction ?? new Phaser.Math.Vector2(1, 0).rotate(source.rotation);
        const count: number = Math.max(1, Math.floor(spread.count));
        const totalAngle: number = Phaser.Math.DegToRad(spread.angle);

        // A full circle has no end bullet: dividing by count avoids a double bullet where the fan closes
        const isFullCircle: boolean = spread.angle >= 360;
        const step: number = count > 1 ? totalAngle / (isFullCircle ? count : count - 1) : 0;

        for (let i: number = 0; i < count; i++) {
            this.shoot(source, centerDirection.clone().rotate((i - (count - 1) / 2) * step));
        }
    }
}
