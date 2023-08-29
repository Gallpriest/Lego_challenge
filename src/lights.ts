import { AmbientLight, DirectionalLight, Color, DirectionalLightHelper } from 'three';

import Game from './game';

class GameLights {
    game: Game;
    ambientLight: AmbientLight;
    directionalLight: DirectionalLight;

    constructor(game: Game) {
        this.game = game;
        this.ambientLight = new AmbientLight();
        this.directionalLight = new DirectionalLight();

        this.initGlobalLights();
    }

    /** Initialize global lights */
    initGlobalLights = () => {
        this.addAmbientLight();
        this.addDirectionalLight();
    };

    /** Add ambient light */
    addAmbientLight = () => {
        this.ambientLight.intensity = 0.1;

        this.game.scene.add(this.ambientLight);
    };

    /** Add directional light */
    addDirectionalLight = () => {
        this.directionalLight.intensity = 1;
        this.directionalLight.color = new Color('white');
        this.directionalLight.position.set(-14, 10, 1.5);
        this.directionalLight.rotation.y = 3.14;

        this.game.scene.add(this.directionalLight);
    };
}

export default GameLights;
