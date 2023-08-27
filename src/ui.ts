import Game from './game';

const startButton = document.body.querySelector('.js-start-game') as HTMLButtonElement;
const previewModal = document.body.querySelector('.js-start-preview') as HTMLDivElement;
const menu = document.body.querySelector('.js-menu') as HTMLUListElement;

/** Initialize UI functionality after Game bootstrap */
function initUI(game: Game) {
    function toggleUI() {
        previewModal.classList.toggle('preview--hide');
        menu.classList.toggle('menu--hidden');
    }

    if (startButton) {
        startButton.addEventListener('pointerup', () => {
            game.startGame();
            toggleUI();
        });
    }
}

export { initUI };
