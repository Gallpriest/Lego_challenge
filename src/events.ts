import Game from './game';

type MenuToggleOptions = {
    elem: HTMLElement;
    fromMenu: boolean;
    globalState: Game['state']['globalState'];
    toggleState: boolean;
};

class GameEvents {
    prevPointX = 0;
    prevPointZ = 0;

    game: Game;
    constructor(game: Game) {
        this.game = game;

        this.initListeners();
    }

    /** Initialize global event listeners */
    initListeners() {
        const menu = document.body.querySelector('.js-menu') as HTMLDivElement;
        const restartBtn = document.body.querySelector('.js-restart-game') as HTMLButtonElement;
        const playAgainBtn = document.body.querySelector('.js-victory-game') as HTMLButtonElement;

        window.addEventListener('resize', this.resizeListener);
        window.addEventListener('pointermove', this.raycasterGameListener);
        window.addEventListener('pointermove', this.towerHoverListener);
        window.addEventListener('pointerup', this.towerAddListener);

        menu.addEventListener('pointerup', this.towerCreateListener);
        restartBtn.addEventListener('pointerup', this.restartPointerListener);
        playAgainBtn.addEventListener('pointerup', this.victoryPointerListener);
    }

    /** Restart the game listener */
    restartPointerListener = () => {
        this.game.restartGame();
        document.body.querySelector('#restart-modal')?.classList.toggle('js-modal-show');
    };

    /** Restart the game listener */
    victoryPointerListener = () => {
        this.game.restartGame();
        document.body.querySelector('#victory-modal')?.classList.toggle('js-modal-show');
    };

    /** Resize event listener */
    resizeListener = () => {
        this.game.settings.size.width = window.innerWidth;
        this.game.settings.size.height = window.innerHeight;
        this.game.renderer.setSize(this.game.settings.size.width, this.game.settings.size.height);
        this.game.camera.aspect = this.game.settings.size.width / this.game.settings.size.height;

        this.game.camera.updateProjectionMatrix();
    };

    /** Game main raycaster listener */
    raycasterGameListener = (event: PointerEvent) => {
        const x = (event.clientX / this.game.settings.size.width) * 2 - 1;
        const y = -(event.clientY / this.game.settings.size.height) * 2 + 1;

        this.game.state.updatePointerVector(x, y);
    };

    /** Reset UI states */
    resetEvents = () => {
        const elem = document.body.querySelector('.js-tower-active') as HTMLElement;

        if (elem) {
            this.toggleCreationMenu({ elem, fromMenu: false, globalState: 'default', toggleState: false });
        }
    };

    /** Toggle menu state */
    toggleCreationMenu = (options: MenuToggleOptions) => {
        const { elem, globalState } = options;

        this.game.state.updateGlobalState(globalState);
        elem.classList.toggle('js-tower-active');
    };

    /** Tower button creation event listener */
    towerCreateListener = (event: PointerEvent) => {
        const elem = event.target as HTMLElement;

        if (elem.closest('.js-tower-active')) {
            this.toggleCreationMenu({
                elem: elem.closest('.js-ui-create-tower')!,
                fromMenu: true,
                globalState: 'default',
                toggleState: false
            });

            return;
        }

        if (elem.closest('.js-ui-create-tower')) {
            this.toggleCreationMenu({
                elem: elem.closest('.js-ui-create-tower')!,
                fromMenu: true,
                globalState: 'creation',
                toggleState: true
            });

            return;
        }
    };

    /** Tower adding listener */
    towerAddListener = () => {
        if (this.game.towers.activeTower && !this.game.towers.activeTower.created && this.game.state.money >= 50) {
            this.game.towers.activeTower.placeTheTower();
            this.game.state.payForTower();
            this.game.updateUIStats();
        }
    };

    /** Tower dragging listener */
    towerHoverListener = () => {
        if (this.game.state.globalState === 'creation') {
            window.requestAnimationFrame(() => {
                const result = this.game.getIntersections(this.game.towers.bases);
                if (result.length && !result[0].object.userData.occupied) {
                    this.game.towers.activeTower = this.game.towers.towers[result[0].object.userData.towerId];
                    this.game.towers.addPointerOverTower(true, result[0].object.position);
                } else {
                    this.game.towers.addPointerOverTower(false);
                    this.game.towers.activeTower = null;
                }
            });
        }
    };
}

export default GameEvents;
