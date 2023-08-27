import './styles/global.css';

import Game from './game';
import { initUI } from './ui';

const canvas = document.getElementById('root');

function bootstrap() {
    if (canvas) {
        const game = new Game(canvas as HTMLCanvasElement);
        initUI(game);
    }
}

bootstrap();
