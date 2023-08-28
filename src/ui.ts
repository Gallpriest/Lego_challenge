import Game from './game';

const startButton = document.body.querySelector('.js-start-game') as HTMLButtonElement;

/** Initialize UI functionality after Game bootstrap */
function initUI(game: Game) {
    if (startButton) {
        startButton.addEventListener('pointerup', () => {
            game.startGame();
            document.body.querySelector('.js-disabled')?.classList.toggle('js-disabled');
            startButton.style.display = 'none';
        });
    }
}

export { initUI };
