import {
    Scene,
    Color,
    Event,
    Object3D,
    Raycaster,
    WebGLRenderer,
    PerspectiveCamera,
    Mesh,
    Vector3,
    Group,
    Fog
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'lil-gui';

import { GamePath, WaterBlock } from './path';
import GameState from './state';
import GameUtils from './utils';
import GameEvents from './events';
import GameLights from './lights';
import { TowerSystem } from './towers';
import { TargetSystem } from './targets';

class Game {
    /** ThreeJS values */
    scene: Scene;
    loader: GLTFLoader;
    dracoLoader: DRACOLoader;
    canvas: HTMLElement;
    raycaster: Raycaster;
    controls: OrbitControls;
    renderer: WebGLRenderer;
    camera: PerspectiveCamera;

    /** Game values */
    path: GamePath;
    state: GameState;
    utils: GameUtils;
    events: GameEvents;
    lights: GameLights;
    models: Record<string, GLTF | null>;
    towers: TowerSystem;
    targets: TargetSystem;

    /** Game GUI (only in devmode=true) */
    gui: GUI | null;
    guiParameters: Record<string, any>;

    interalTargetsID: null | number;

    settings = {
        size: {
            width: window.innerWidth,
            height: window.innerHeight
        },
        aspect: window.innerWidth / window.innerHeight
    };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.scene = new Scene();
        this.loader = new GLTFLoader();
        this.dracoLoader = new DRACOLoader();
        this.raycaster = new Raycaster();
        this.camera = new PerspectiveCamera();
        this.renderer = new WebGLRenderer({ canvas });
        this.controls = new OrbitControls(this.camera, this.canvas);

        this.utils = new GameUtils();
        this.path = new GamePath(this);
        this.state = new GameState(this);
        this.lights = new GameLights(this);
        this.events = new GameEvents(this);
        this.towers = new TowerSystem(this);
        this.targets = new TargetSystem(this);
        this.models = {};
        this.interalTargetsID = null;

        this.gui = null;
        this.guiParameters = {};

        this.updateUIStats();
        this.setupGame();
        this.loadModels();
        this.mainLoop();

        this.dracoLoader.setDecoderPath('/draco/');
        this.loader.setDRACOLoader(this.dracoLoader);
    }

    updateUIStats = (health?: number, targets?: number, money?: number) => {
        document.body.querySelector('.js-health-stat')!.textContent = `${health ?? this.state.totalHealth}`;
        document.body.querySelector('.js-target-stat')!.textContent = `${targets ?? this.targets.amount}`;
        document.body.querySelector('.js-money-stat')!.textContent = `${money ?? this.state.money}`;
    };

    /** Start the game by sending enemies */
    startSendingTargets = () => {
        if (!this.interalTargetsID) {
            this.interalTargetsID = setInterval(() => {
                this.targets.createTarget();
            }, this.targets.frequency);
        }
    };

    /** Restart the game by reseting the settings */
    restartGame = () => {
        this.toggleUI();
        this.updateUIStats(3, 30, 50);
        this.state.resetHealth();
        this.targets.resetTargetSystem();
        this.towers.resetTowerSystem();

        this.startSendingTargets();
    };

    /** Start game by updating game settings */
    startGame = () => {
        this.state.notifyObservers('preview');
    };

    /** Setup GUI tooling */
    setupGUI = () => {
        if (this.state.devmode) {
            this.gui = new GUI();

            /** scene */
            const folderScene = this.gui.addFolder('scene');
            this.guiParameters.color = { cssColor: '#eeb9e0' };
            folderScene
                .addColor(this.guiParameters.color, 'cssColor')
                .name('Scene color')
                .onChange((value: string) => (this.scene.background = new Color(value)));

            /** camera */
            const camerFolder = this.gui.addFolder('camera');
            camerFolder.add(this.camera.position, 'x').min(-50).max(50).step(1).name('Camera |x| pos');
            camerFolder.add(this.camera.position, 'y').min(-50).max(50).step(1).name('Camera |x| pos');
            camerFolder.add(this.camera.position, 'z').min(-50).max(50).step(1).name('Camera |x| pos');
        }
    };

    /** Main game setup */
    setupGame = () => {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupRaycaster();
        this.setupOrbitControls();
        this.state.addSubscriptions('preview', this.state.updateGameState, this.startSendingTargets);
    };

    /** Setup scene */
    setupScene = () => {
        this.scene.background = new Color('#279EFF');
    };

    /** Setup initial camera settings */
    setupCamera = () => {
        this.camera.fov = 75;
        this.camera.near = 0.1;
        this.camera.far = 1000;
        this.camera.aspect = this.settings.aspect;
        this.camera.position.set(6, 20, 5);
        this.camera.updateProjectionMatrix();
        this.scene.add(this.camera);
    };

    /** Setup initial raycaster settings */
    setupRaycaster = () => {
        this.raycaster.near = 0.1;
        this.raycaster.far = 1000;
    };

    /** Setup intial renderer settings */
    setupRenderer = () => {
        this.renderer.setSize(this.settings.size.width, this.settings.size.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    /** Setup intial orbit control settings */
    setupOrbitControls = () => {
        this.controls.rotateSpeed = 0.7;
        this.controls.maxPolarAngle = Math.PI / 2.2;

        this.controls.update();
    };

    setupScenePath() {
        this.path.updateInitialPoint(new Vector3(15, 0, -9));
        this.path
            .go('left', 4)
            .go('forward', 8)
            .go('left', 3)
            .go('backward', 3)
            .go('left', 3)
            .go('forward', 3)
            .go('left', 4)
            .go('backward', 9)
            .go('right', 5)
            .output();
    }

    /** Get intersections with raycaster */
    getIntersections = (objects: Object3D<Event>[]) => {
        this.raycaster.setFromCamera(this.state.pointerVector, this.camera);
        return this.raycaster.intersectObjects(objects);
    };

    /** Load all scene models and store */
    loadModels = () => {
        ['water', 'boat', 'cannon', 'crystall', 'map'].forEach((key: string) => {
            this.loader.load(`/${key}.glb`, (gltf) => {
                this.models[key] = gltf;
                this.adjustModelSettings(key, gltf);
            });
        });
    };

    toggleUI = () => {
        document.body.querySelector('.menu__list')!.classList.toggle('js-disabled');
    };

    generateFog = () => {
        this.scene.fog = new Fog(0xcccccc, 10, 40);
    };

    generateSea = async () => {
        for (let i = 0; i < 64; i++) {
            const g = new Group();
            g.position.z = i - 32.5;
            g.position.x = -32;
            g.position.y = 0.5;

            for (let i = 0; i < 64; i++) {
                const mesh = this.models['water']!.scenes[0].clone();
                const water = new WaterBlock(mesh, i, ['x', i], ['z', 0]);
                g.add(water.mesh);
            }

            this.scene.add(g);
        }
    };

    /** Adjust model settings depending on a model */
    adjustModelSettings = (key: string, model: GLTF) => {
        switch (key) {
            case 'map':
                const centerVector = this.utils.getBoxCenter(
                    model.scenes[0].children.find((child: any) => child.name.includes('Base'))!
                );
                const base = model.scenes[0].children.find((c) => c.name.includes('Base')) as Mesh<any, any>;
                base.material.transparent = true;
                base.material.opacity = 0;
                this.scene.add(model.scenes[0]);
                this.controls.target.set(centerVector.x, 0, centerVector.y);
                this.controls.update();
                this.towers.addBases(
                    this.models['map']!.scenes[0].children.filter((child) => child.name.includes('Tower_point'))
                );
                this.towers.applyTowersToBases();
                this.setupScenePath();
                break;
            case 'cannon':
                const mesh = model.scenes[0].children.find((mesh) => mesh.name.includes('Shoot'))! as Mesh<any, any>;
                mesh.material.transparent = true;
                mesh.material.opacity = 0;
                break;
            case 'crystall':
                this.towers.assignPointer(model.scenes[0]);
                break;
            case 'boat':
                model.scenes[0].scale.set(0.85, 0.85, 0.85);
                break;
            default:
                return;
        }
    };

    /** Main game loop */
    mainLoop = () => {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);

        window.requestAnimationFrame(this.mainLoop);
    };
}

export default Game;
