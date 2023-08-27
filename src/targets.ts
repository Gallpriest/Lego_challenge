import { Clock, Mesh, Vector3 } from 'three';
import gsap from 'gsap';

import Game from './game';

class Target {
    game: Game;
    mesh: Mesh;
    uuid: string;
    speed: number;
    clock: Clock;

    readonly halfRotation = 1.57;
    readonly rotationSpeed = 0.23;
    readonly switches: ('+' | '-')[] = ['-', '-', '+', '+', '-', '-', '+', '+', '+'];

    turn: number;
    prevTurn: number;
    triggered: boolean;
    pointsReached: number;
    targetFrameId: number | null;
    controlPoints: { points: Vector3; direction?: 'forward' | 'backward' | 'left' | 'right' }[] = [];

    constructor(game: Game) {
        this.game = game;
        this.mesh = this.game.models['lego_boat']?.scenes[0].clone() as any;
        this.clock = new Clock();

        this.speed = 0.025;
        this.prevTurn = 0;
        this.triggered = false;
        this.pointsReached = 1;
        this.targetFrameId = null;
        this.uuid = this.game.utils.getUUID();
        this.turn = this.roundValue(Math.PI / 2);
        this.controlPoints = [...this.game.path.controlPoints];

        this.applySettings();
        this.addTarget();
        this.moveTarget();
    }

    /** Apply default target settings */
    applySettings = () => {
        this.mesh.userData = { health: 0 };
        this.mesh.uuid = this.uuid;
        this.mesh.position.y = 1.3;
        this.mesh.position.z = this.game.path.initialCoordinates.z;
        this.mesh.position.x = this.game.path.initialCoordinates.x;
    };

    /** Add the target to the scene */
    addTarget = () => {
        this.game.scene.add(this.mesh);
    };

    /** Remove the target from the scene */
    removeTarget = () => {
        this.game.targets.deleteTarget(this, true);
    };

    /** Round valur with precision = 2 */
    roundValue = (value: number) => {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    };

    /** Increase the point counter */
    increasePoint = () => {
        this.pointsReached += 1;
    };

    /** Apply turn animation for the target */
    makeTurn = () => {
        if (this.triggered) {
            this.triggered = false;
            this.mesh.rotation.y = this.prevTurn;
            return;
        } else {
            const negative = this.switches[this.pointsReached - 1] === '-';
            const nextRotation = this.roundValue(
                negative ? this.mesh.rotation.y + this.turn : this.mesh.rotation.y - this.turn
            );

            gsap.fromTo(
                this.mesh.rotation,
                { y: this.prevTurn },
                {
                    y: nextRotation,
                    duration: 1.15,
                    ease: 'power2.out'
                }
            );

            this.prevTurn = nextRotation;
        }
    };

    /** Execute target movement */
    moveTarget = () => {
        const point = this.controlPoints[this.pointsReached];

        const t = this.clock.getElapsedTime();

        switch (true) {
            case point.direction === 'forward' && this.mesh.position.z < point.points.z:
                this.mesh.position.z += this.speed;
                this.mesh.rotation.z = Math.sin(t) * 0.13;
                break;
            case point.direction === 'backward' && this.mesh.position.z > point.points.z:
                this.mesh.position.z -= this.speed;
                this.mesh.rotation.z = Math.sin(t) * 0.13;
                break;
            case point.direction === 'right' && this.mesh.position.x < point.points.x:
                this.mesh.position.x += this.speed;
                this.mesh.rotation.z = Math.sin(t) * 0.13;
                break;
            case point.direction === 'left' && this.mesh.position.x > point.points.x:
                this.mesh.position.x -= this.speed;
                this.mesh.rotation.z = Math.sin(t) * 0.13;
                break;
            default:
                this.increasePoint();
                this.makeTurn();
                break;
        }

        /** loop the movement if the target still exists */
        if (this.pointsReached === this.controlPoints.length) {
            this.removeTarget();
            return;
        }

        this.targetFrameId = window.requestAnimationFrame(this.moveTarget);
    };
}

class TargetSystem {
    game: Game;
    targets: Target[];
    frequency: number;
    amount: number;

    constructor(game: Game) {
        this.game = game;
        this.frequency = 2600;
        this.amount = 2;
        this.targets = [];
    }

    /** Reset target system values */
    resetTargetSystem = () => {
        this.amount = 2;
        this.targets = [];
    };

    /** Decrease an amount of targets to be generated */
    decreaseAmount = () => {
        this.amount -= 1;

        if (this.amount === 0) {
            clearInterval(this.game.interalTargetsID!);
            this.game.interalTargetsID = null;
        }
    };

    /** Create a new target */
    createTarget = () => {
        this.decreaseAmount();

        const target = new Target(this.game);

        this.targets.push(target);
    };

    /** Delete the target by uuid */
    deleteTarget = (target: Target, reduceHealth: boolean) => {
        this.targets = this.targets.filter((tgt) => {
            if (tgt.uuid === target.uuid) {
                this.game.scene.remove(target.mesh);
                window.cancelAnimationFrame(target.targetFrameId!);
                reduceHealth && this.game.state.reduceHealth();
                return false;
            }

            return true;
        });

        if (
            this.targets.length === 0 &&
            this.game.state.totalHealth > 0 &&
            !document.body.querySelector('.js-modal-show')
        ) {
            this.game.events.resetEvents();
            document.body.querySelector('#victory-modal')?.classList.toggle('js-modal-show');
            return;
        }

        if (this.game.state.totalHealth === 0 && !document.body.querySelector('.js-modal-show')) {
            this.game.events.resetEvents();
            document.body.querySelector('#restart-modal')?.classList.toggle('js-modal-show');
            return;
        }
    };
}

export { Target, TargetSystem };
