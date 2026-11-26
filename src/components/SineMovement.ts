import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

// Makes an entity weave from side to side of its path, following a sine wave
export default class SineMovement implements IComponent {
    public enabled: boolean = true;

    private readonly _amplitude: number;
    private readonly _frequency: number;
    private _elapsed: number = 0;
    private _offset: number = 0;

    // amplitude in pixels, frequency in cycles per second
    public constructor(amplitude: number, frequency: number) {
        this._amplitude = amplitude;
        this._frequency = frequency;
    }

    // Restart the wave: must be called each time a pooled entity is reused
    public reset() {
        this._elapsed = 0;
        this._offset = 0;
    }

    // Adds the sideways displacement, perpendicular to direction (normalized). deltaTime in milliseconds
    public move(entity: Entity, direction: Phaser.Math.Vector2, deltaTime: number) {
        if (!this.enabled)
            return;

        this._elapsed += deltaTime;
        const phase: number = Phaser.Math.PI2 * this._frequency * this._elapsed / 1000;
        const newOffset: number = this._amplitude * Math.sin(phase);

        // Move by the offset change only: the entity swings around its path, wherever the path goes
        const sidewaysStep: number = newOffset - this._offset;
        entity.x -= direction.y * sidewaysStep;
        entity.y += direction.x * sidewaysStep;
        this._offset = newOffset;
    }
}
