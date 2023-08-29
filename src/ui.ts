import Game from './game';

const startButton = document.body.querySelector('.js-start-game') as HTMLButtonElement;
const rulesButton = document.body.querySelector('.js-show-rules') as HTMLButtonElement;
const closeRulesButton = document.body.querySelector('.js-close-rules') as HTMLButtonElement;

/** Initialize UI functionality after Game bootstrap */
function initUI(game: Game) {
    startButton.addEventListener('pointerup', () => {
        game.startGame();
        game.toggleUI();
        startButton.style.display = 'none';
    });

    rulesButton.addEventListener('pointerup', () => {
        document.body.querySelector('#rules-modal')?.classList.toggle('js-modal-show');
    });

    closeRulesButton.addEventListener('pointerup', () => {
        closeRulesButton.closest('#rules-modal')?.classList.toggle('js-modal-show');
    });
}

export { initUI };
