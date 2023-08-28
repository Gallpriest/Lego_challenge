import { Vector2 } from 'three';

import Game from './game';

type ObserversState = {
    preview: Function[];
    towersCreation: Function[];
    towersCancelCreation: Function[];
};

class GameState {
    game: Game;
    totalHealth: number;
    globalState: 'default' | 'creation';
    money: number;
    previewObservers: ObserversState;

    active: boolean = false;
    devmode: boolean = true;
    pointerVector: Vector2;
    draggableObject: null | any;

    constructor(game: Game) {
        this.game = game;
        this.pointerVector = new Vector2();
        this.previewObservers = {
            preview: [],
            towersCreation: [],
            towersCancelCreation: []
        };
        this.draggableObject = null;
        this.globalState = 'default';
        this.totalHealth = 3;
        this.money = 50;
    }

    addMoney = (value: number) => {
        this.money += value;
    };

    payForTower = () => {
        this.money -= 50;
    };

    /** Reduce the total health on the current map */
    reduceHealth = () => {
        this.totalHealth -= 1;
        this.game.updateUIStats();

        if (this.totalHealth === 0) {
            this.game.targets.cancelInterval();
            this.game.targets.deleteAllTargets();
        }
    };

    resetHealth = () => {
        this.totalHealth = 3;
    };

    /** Update the global state while performing CRUD actions */
    updateGlobalState = (value: typeof this.globalState) => {
        this.globalState = value;

        if (value === 'creation') this.game.towers.toggleTowersRange(1);

        if (value === 'default') this.game.towers.toggleTowersRange(0);
    };

    /** Update the draggable object and start moving event */
    updateDraggableObject = (obj: any | null) => {
        this.draggableObject = obj;
    };

    /** Initialize the game by calling observers and changing settings */
    notifyObservers = (type: keyof typeof this.previewObservers) => {
        this.previewObservers[type].forEach((observer) => observer());
    };

    /** Subscribe observers for the game start */
    subscribeObserver = (type: keyof typeof this.previewObservers, func: Function) => {
        this.previewObservers[type].push(func);
    };

    /** Add functions into state observer */
    addSubscriptions = (type: keyof typeof this.previewObservers, ...funcs: Function[]) => {
        funcs.forEach((fn) => this.subscribeObserver(type, fn));
    };

    /** Update global game state */
    updateGameState = (value?: boolean) => {
        this.active = value ?? !this.active;
    };

    /** Update game mode */
    updateMode = (value: boolean) => {
        this.devmode = value;
    };

    /** Update global raycaster normalized vector */
    updatePointerVector = (x: number, y: number) => {
        this.pointerVector.x = x;
        this.pointerVector.y = y;
    };
}

export default GameState;
