import type {EnemyData} from '../gameData/EnemyData.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import SineMovement from "../components/SineMovement.ts";
import Weapon from "../components/Weapon.ts";

export default class Enemy extends Entity {
    private static readonly DEFAULT_EFFECT_COLOR: string = "#f25f5c";

    private _data: EnemyData;
    private _shootTimerConfig: Phaser.Types.Time.TimerEventConfig;
    private _shootTimer: Phaser.Time.TimerEvent | undefined;
    private _target: Entity;
    private readonly _directionToTarget: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    // Can't rely on isTinted for the hit flash: some enemies are permanently tinted
    private _isHit: boolean = false;

    // Color of the particles when this enemy dies: its tint, else its bullets color
    public get effectColor(): number {
        const hexColor: string = this._data.tint ?? this._data.weapon?.bullet.color ?? Enemy.DEFAULT_EFFECT_COLOR;
        return Phaser.Display.Color.HexStringToColor(hexColor).color;
    }

    public get isBoss(): boolean {
        return this._data.boss === true;
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group, target: Entity, data: EnemyData) {
        this._target = target;
        this._data = data;

        this.addComponent(new Health(data.health, this));
        this.addComponent(new Movement(data.movement.speed));
        if (data.movement.sine) {
            this.addComponent(new SineMovement(data.movement.sine.amplitude, data.movement.sine.frequency));
        }

        // Listen once per enemy, not on every enable(): pooled enemies are reused many times
        const health = this.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, () => {
            this._isHit = true;
            this.setTintFill(0xffffff);

            if (health?.current == 0)
            {
                this.disableBody();
            }

            this.scene.time.delayedCall(50, () => {
                this._isHit = false;
                this.applyBaseTint();

                if (health?.current == 0)
                {
                    this.disable();
                }
            });
        });

        this.applyBaseTint();

        // Only enemies with a weapon shoot
        if (data.weapon) {
            this.addComponent(new Weapon(bulletsGroup, {
                ...data.weapon.bullet,
                color: Phaser.Display.Color.HexStringToColor(data.weapon.bullet.color).color
            }));

            this._shootTimerConfig = {
                delay: Phaser.Math.Between(data.weapon.shootDelayMin, data.weapon.shootDelayMax),
                callback: this.shoot,
                callbackScope: this,
                loop: true
            };
            this._shootTimer = this.scene.time.addEvent(this._shootTimerConfig);
        }

        // Create animation when enemy is about to shoot in the global animation manager
        if (!this.scene.anims.exists('ufoShoot')) {
            this.scene.anims.create({
                key: 'ufoShoot',
                frames: [
                    {key: 'sprites', frame: 'ufoRed'},
                    {key: 'sprites', frame: 'ufoRed-shoot0'},
                    {key: 'sprites', frame: 'ufoRed-shoot1'}
                ],
                frameRate: 4,
            });
        }

        this.arcadeBody.setCircle(this.displayWidth / 2);
        // Other enemies must not push a boss around
        this.arcadeBody.setImmovable(this.isBoss);
    }

    public enable(x: number, y: number) {
        this.enableBody(true, x, y, true, true);
        this._shootTimer?.reset(this._shootTimerConfig);

        // Restore the state of a pooled enemy: health without emitting events, tint and sine wave
        const health = this.getComponent(Health);
        health?.heal(health!.max, false);
        this._isHit = false;
        this.applyBaseTint();
        this.getComponent(SineMovement)?.reset();
        this.setScale(1);
    }

    // A boss only takes a scratch when the player rams it, other enemies are destroyed
    public onPlayerContact() {
        const health = this.getComponent(Health);
        health?.damage(this.isBoss ? 1 : health.max);
    }

    public disable() {
        this.stop();
        this.removeAllListeners(Phaser.Animations.Events.ANIMATION_COMPLETE);
        this.scene.tweens.killTweensOf(this);

        this.disableBody(true, true);
        if (this._shootTimer)
            this._shootTimer.paused = true;
    }

    private applyBaseTint() {
        if (this._data.tint) {
            this.setTint(Phaser.Display.Color.HexStringToColor(this._data.tint).color);
        } else {
            this.clearTint();
        }
    }

    private shoot() {
        if (this._data.shootAnimation) {
            this.play(this._data.shootAnimation);
            this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                this.setTexture('sprites', this._data.texture);
                this.fire();
            });
        } else {
            this.scene.tweens.add({
                targets: this,
                scale: 1.15,
                duration: 250,
                yoyo: true,
                onComplete: () => this.fire()
            });
        }
    }

    private fire() {
        if (!this.active)
            return;

        this.getComponent(Weapon)?.shootSpread(this, this._data.weapon!.spread);
        this.scene.sound.play('sfx_laser2');
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime)

        // Direction to the target: (target - me), normalized to keep only the direction
        this._directionToTarget.set(this._target.x - this.x, this._target.y - this.y);
        const distanceToTarget: number = this._directionToTarget.length();
        this._directionToTarget.normalize();
        this.rotation = this._directionToTarget.angle();

        // Slow down while flashing after a hit
        const scaledDeltaTime: number = this._isHit ? deltaTime * 0.5 : deltaTime;
        const stopDistance: number | undefined = this._data.movement.stopDistance;
        if (stopDistance === undefined || distanceToTarget > stopDistance) {
            this.getComponent(Movement)?.move(this, this._directionToTarget, scaledDeltaTime);
        }
        this.getComponent(SineMovement)?.move(this, this._directionToTarget, scaledDeltaTime);
    }
}
