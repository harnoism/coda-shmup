import IComponent from "./IComponent.ts";
import Entity from "../entities/Entity.ts";
import GameConstants from "../GameConstants.ts";

export default class Health extends Phaser.Events.EventEmitter implements IComponent {
    public enabled: boolean = true;

    public static readonly CHANGE_EVENT: string = 'change';
    public static readonly DEATH_EVENT: string = 'death';

    private _current: number;
    private readonly _max: number;
    private readonly _entity: Entity;

    public get current(): number {
        return this._current;
    }

    public get max(): number {
        return this._max;
    }

    public constructor(value: number, entity: Entity) {
        super();

        this._current = value;
        this._max = value;
        this._entity = entity;
    }

    public damage(amount: number, emitEvents: boolean = true): void {
        if (!this.enabled || amount <= 0) return;
        this.adjust(-amount, emitEvents);
    }

    public heal(amount: number, emitEvents: boolean = true): void {
        if (!this.enabled || amount <= 0) return;
        this.adjust(amount, emitEvents);
    }

    private adjust(delta: number, emitEvents: boolean = true): void {
        if (!this.enabled)
            return;

        const prev: number = this._current;
        this._current = Phaser.Math.Clamp(this._current + delta, 0, this._max);

        if (emitEvents && this._current !== prev) {
            this.emit(Health.CHANGE_EVENT, this._current);

            const sceneEvents = this._entity.scene.events;
            if (delta < 0) {
                sceneEvents.emit(GameConstants.Events.ENTITY_DAMAGED_EVENT, this._entity);
            }

            if (this._current <= 0 && prev > 0) {
                sceneEvents.emit(GameConstants.Events.ENTITY_DIED_EVENT, this._entity);
                this.emit(Health.DEATH_EVENT);
            }
        }
    }
}