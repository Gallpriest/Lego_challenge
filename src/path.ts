import { Group, PlaneGeometry, MeshBasicMaterial, Vector3, Mesh, Clock } from 'three';

import Game from './game';

class GamePath {
    game: Game;
    pathsGroup: Group = new Group();
    mesh: any;

    readonly geometry: PlaneGeometry;
    readonly material: MeshBasicMaterial;
    readonly rotation = -Math.PI / 2;
    readonly coordY = 1.2;
    readonly directions = {
        forward: 'z|+',
        backward: 'z|-',
        left: 'x|-',
        right: 'x|+'
    };
    readonly shifts = [
        [0.5, 0.5],
        [0.5, -0.5],
        [-0.5, 0.5],
        [-0.5, -0.5]
    ];

    initialCoordinates: Vector3;
    startingCoordinates: Vector3;
    controlPoints: { points: Vector3; direction?: 'forward' | 'backward' | 'left' | 'right' }[] = [];
    size = 2;

    constructor(game: Game) {
        this.game = game;
        this.startingCoordinates = new Vector3(0, 0, 0);
        this.initialCoordinates = this.startingCoordinates.clone();
        this.geometry = new PlaneGeometry(this.size, this.size, 2, 2);
        this.material = new MeshBasicMaterial({ color: 'yellow', transparent: true, opacity: 0.8, wireframe: true });

        this.addControlPoint(this.startingCoordinates.clone());
        this.initGroup();
    }

    /** Update path intial point */
    updateInitialPoint(vector: Vector3) {
        this.startingCoordinates = vector;
        this.initialCoordinates = this.startingCoordinates.clone();
    }

    /** Initialize a path group */
    initGroup() {
        this.pathsGroup = new Group();
        this.pathsGroup.position.y = 0.7;
        this.pathsGroup.name = 'paths_three_group';
        this.pathsGroup.uuid = this.game.utils.getUUID();
    }

    /** Add a new control point */
    addControlPoint(vector: Vector3, direction?: 'forward' | 'backward' | 'left' | 'right') {
        this.controlPoints.push({ points: vector, direction });
    }

    /** Add a new direction with a number of steps */
    go(direction: keyof typeof this.directions, steps: number) {
        const constantCoordinate = direction === 'forward' || direction === 'backward' ? 'x' : 'z';

        for (let i = 0; i < steps; i++) {
            const mesh = new Mesh(this.geometry, this.material);

            const [coordinate, value] = this.directions[direction].split('|') as ['x' | 'y' | 'z', string];

            const increment = i === 0 ? (this.controlPoints.length >= 2 ? this.size : 0) : this.size;

            this.startingCoordinates[coordinate] += Number(value + increment);

            mesh.name = 'path_three_block';
            mesh.uuid = this.game.utils.getUUID();
            mesh.position[coordinate] = this.startingCoordinates[coordinate];
            mesh.position[constantCoordinate] = this.startingCoordinates[constantCoordinate];
            mesh.position.y = this.coordY;
            mesh.rotation.x = this.rotation;

            for (let j = 0; j < 4; j++) {
                const [v1, v2] = this.shifts[j];
                const mesh = this.game.models['lego_water']!.scenes[0].clone();
                const water = new WaterBlock(
                    mesh,
                    j + i,
                    [coordinate, this.startingCoordinates[coordinate] + v1],
                    [constantCoordinate, this.startingCoordinates[constantCoordinate] + v2]
                );
                this.pathsGroup.add(water.mesh);
            }
        }

        this.addControlPoint(this.startingCoordinates.clone(), direction);

        return this;
    }

    /** Render the result of the path group */
    output() {
        this.game.scene.add(this.pathsGroup);

        return this;
    }
}

type Coordinate = ['x' | 'y' | 'z', number];

class WaterBlock {
    mesh: Group;
    clock: Clock;
    index: number;

    constructor(mesh: Group, index: number, coordOne: Coordinate, coordTwo: Coordinate) {
        this.mesh = mesh;
        this.clock = new Clock();
        this.index = index;

        this.setPosition(coordOne, coordTwo);
        this.startAnimation();
    }

    setPosition = (first: Coordinate, second: Coordinate) => {
        this.mesh.position[first[0]] = first[1];
        this.mesh.position[second[0]] = second[1];
    };

    startAnimation = () => {
        const t = this.clock.getElapsedTime() + this.index;
        this.mesh.position.y = Math.sin(t) * 0.25;
        window.requestAnimationFrame(this.startAnimation);
    };
}

export { GamePath, WaterBlock };
