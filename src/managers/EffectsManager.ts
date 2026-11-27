import {GameObjects, Scene} from "phaser";
import Enemy from "../entities/Enemy.ts";
import Entity from "../entities/Entity.ts";
import Player from "../entities/Player.ts";
import GameConstants from "../GameConstants.ts";

type ParticleConfig = Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
type EffectName = 'muzzleFlash' | 'impact' | 'impactFlash' | 'debris' | 'trail';

// Plays the visual effects (explosions, particles, flashes, trails) by listening to the events of the scene:
// the entities don't know anything about them
export default class EffectsManager {
    private static readonly EXPLOSION_KEY: string = 'explosionPink';
    private static readonly MAX_EXPLOSIONS: number = 32;
    private static readonly DEPTH: number = 10;
    private static readonly PLAYER_COLOR: number = GameConstants.PlayerTheme.EFFECT_COLOR;
    private static readonly DAMAGE_COLOR: number = GameConstants.PlayerTheme.DAMAGE_COLOR;

    private static readonly EFFECTS: Record<EffectName, ParticleConfig> = {
        muzzleFlash: {speed: {min: 40, max: 140}, lifespan: 150, scale: {start: 0.4, end: 0}, alpha: {start: 1, end: 0}},
        impact: {speed: {min: 80, max: 300}, lifespan: 300, scale: {start: 0.6, end: 0}, alpha: {start: 1, end: 0}},
        impactFlash: {speed: 0, lifespan: 100, scale: {start: 1.4, end: 0}, alpha: {start: 1, end: 0}},
        debris: {speed: {min: 150, max: 550}, lifespan: {min: 400, max: 800}, scale: {start: 0.9, end: 0}, alpha: {start: 1, end: 0}},
        trail: {speed: 0, lifespan: 220, scale: {start: 0.5, end: 0}, alpha: {start: 0.7, end: 0}}
    };

    private readonly _scene: Scene;
    private readonly _explosions: GameObjects.Group;
    // One emitter per effect and color: the color of an emitter can't change per burst
    private readonly _emitters: Map<string, GameObjects.Particles.ParticleEmitter> = new Map();

    public constructor(scene: Scene) {
        this._scene = scene;

        if (!scene.anims.exists(EffectsManager.EXPLOSION_KEY)) {
            scene.anims.create({
                key: EffectsManager.EXPLOSION_KEY,
                frames: scene.anims.generateFrameNumbers(EffectsManager.EXPLOSION_KEY, {start: 0, end: 9}),
                frameRate: 24
            });
        }
        this._explosions = scene.add.group({
            classType: GameObjects.Sprite,
            defaultKey: EffectsManager.EXPLOSION_KEY,
            maxSize: EffectsManager.MAX_EXPLOSIONS
        });

        scene.events.on(GameConstants.Events.ENTITY_DIED_EVENT, this.onEntityDied, this);
        scene.events.on(GameConstants.Events.ENTITY_DAMAGED_EVENT, this.onEntityDamaged, this);
        scene.events.on(GameConstants.Events.BULLET_FIRED_EVENT, this.onBulletFired, this);
        scene.events.on(GameConstants.Events.BULLET_HIT_EVENT, this.onBulletHit, this);
        scene.events.on(GameConstants.Events.BULLET_TRAIL_EVENT, this.onTrail, this);
        scene.events.on(GameConstants.Events.PLAYER_TRAIL_EVENT, this.onTrail, this);
    }

    public destroy() {
        this._scene.events.off(GameConstants.Events.ENTITY_DIED_EVENT, this.onEntityDied, this);
        this._scene.events.off(GameConstants.Events.ENTITY_DAMAGED_EVENT, this.onEntityDamaged, this);
        this._scene.events.off(GameConstants.Events.BULLET_FIRED_EVENT, this.onBulletFired, this);
        this._scene.events.off(GameConstants.Events.BULLET_HIT_EVENT, this.onBulletHit, this);
        this._scene.events.off(GameConstants.Events.BULLET_TRAIL_EVENT, this.onTrail, this);
        this._scene.events.off(GameConstants.Events.PLAYER_TRAIL_EVENT, this.onTrail, this);

        // The emitters and explosions are game objects: the scene destroys them
        this._emitters.clear();
    }

    private onEntityDied(entity: Entity) {
        if (entity instanceof Enemy) {
            this.playExplosion(entity.x, entity.y, entity.displayWidth * 2);
            this.burst('debris', entity.effectColor, entity.x, entity.y, entity.isBoss ? 80 : 20);

            if (entity.isBoss) {
                this._scene.cameras.main.shake(500, 0.02);
                this._scene.cameras.main.flash(300, 255, 255, 255);
            }
        } else if (entity instanceof Player) {
            this.playExplosion(entity.x, entity.y, entity.displayWidth * 3);
            this.burst('debris', EffectsManager.PLAYER_COLOR, entity.x, entity.y, 40);
            this._scene.cameras.main.shake(300, 0.02);
        }
    }

    private onEntityDamaged(entity: Entity) {
        if (entity instanceof Player) {
            this._scene.cameras.main.flash(120, 255, 40, 80);
            this.burst('impact', EffectsManager.DAMAGE_COLOR, entity.x, entity.y, 12);
        }
    }

    private onBulletFired(x: number, y: number, color: number) {
        this.burst('muzzleFlash', color, x, y, 2);
    }

    private onBulletHit(x: number, y: number, color: number) {
        this.burst('impact', color, x, y, 6);
        this.burst('impactFlash', 0xffffff, x, y, 1);
    }

    private onTrail(x: number, y: number, color: number) {
        this.getEmitter('trail', color).emitParticleAt(x, y, 1);
    }

    private playExplosion(x: number, y: number, size: number) {
        const explosion = this._explosions.get(x, y) as GameObjects.Sprite | null;
        if (!explosion)
            return;

        explosion.setActive(true).setVisible(true).setPosition(x, y).setDepth(EffectsManager.DEPTH)
            .setBlendMode(Phaser.BlendModes.ADD).setScale(size / explosion.width);
        explosion.play(EffectsManager.EXPLOSION_KEY);
        explosion.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            explosion.setActive(false).setVisible(false);
        });
    }

    private burst(effect: EffectName, color: number, x: number, y: number, count: number) {
        this.getEmitter(effect, color).explode(count, x, y);
    }

    private getEmitter(effect: EffectName, color: number): GameObjects.Particles.ParticleEmitter {
        const cacheKey: string = effect + '-' + color;
        let emitter = this._emitters.get(cacheKey);
        if (!emitter) {
            emitter = this._scene.add.particles(0, 0, 'sprites', {
                ...EffectsManager.EFFECTS[effect], frame: 'spark', tint: color, blendMode: 'ADD', emitting: false
            }).setDepth(EffectsManager.DEPTH);
            this._emitters.set(cacheKey, emitter);
        }

        return emitter;
    }
}
