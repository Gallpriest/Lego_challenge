import {
    Object3D,
    Event,
    Group,
    Mesh,
    BufferGeometry,
    MeshStandardMaterial,
    MeshBasicMaterial,
    PlaneGeometry,
    Vector3,
    RingGeometry,
    Clock,
    EdgesGeometry,
    LineSegments
} from 'three';
import gsap from 'gsap';

import Game from './game';
import { Target } from './targets';

class TowerSystem {
    game: Game;
    bases: Object3D<Event>[];
    tools: Object3D<Event>[];
    activeBase: Mesh | null;
    activeTower: Tower | null;
    towers: Record<string, Tower> = {};
    targets = [];
    towerIntersections: any[];
    pointer: Group | null;
    clock: Clock;
    pointerFrameId: null | number;

    constructor(game: Game) {
        this.game = game;
        this.bases = [];
        this.tools = [];
        this.pointer = null;
        this.activeBase = null;
        this.activeTower = null;
        this.pointerFrameId = null;
        this.towerIntersections = [];
        this.clock = new Clock();
    }

    improveTowerStats = () => {
        for (const key in this.towers) {
            this.towers[key].attackSpeed -= 125;
        }

        this.game.state.payForImprovement();
    };

    /** Reset all towers and settings */
    resetTowerSystem = () => {
        this.activeBase = null;
        this.activeTower = null;
        this.game.scene.remove(this.pointer!);
        this.pointer!.userData.added = false;
        this.pointerFrameId && window.cancelAnimationFrame(this.pointerFrameId);

        for (const key in this.towers) {
            this.towers[key].created = false;
            this.towers[key].toggleRangeGroup(0);
            this.toggleTowerMaterials(0, this.towers[key]);
        }

        this.bases.forEach((base) => (base.userData.occupied = false));
    };

    toggleTowersRange = (value: number) => {
        for (const key in this.towers) {
            this.towers[key].toggleRangeGroup(value);
        }
    };

    /** Assign "Crystall" model as a pointer for a base */
    assignPointer = (model: Group) => {
        this.pointer = model;
        this.pointer!.userData.added = false;
    };

    /** Start pointer animation  */
    pointerAnimation = () => {
        this.pointer!.rotation.y += 0.01;
        this.pointerFrameId = window.requestAnimationFrame(this.pointerAnimation);
    };

    /** Add pointer while hovering over the tower */
    addPointerOverTower = (value: boolean, position?: Vector3) => {
        if (value && position && !this.pointer!.userData.added) {
            this.pointer!.userData.added = true;
            this.pointer!.position.set(position.x, position.y + 6, position.z);
            this.game.scene.add(this.pointer!);
            this.pointerAnimation();
        }

        if (!value && this.game.scene.getObjectByName('Crystall')) {
            this.pointer!.userData.added = false;
            this.game.scene.remove(this.pointer!);
            window.cancelAnimationFrame(this.pointerFrameId!);
            this.pointerFrameId = null;
        }
    };

    removePointer = () => {
        this.game.scene.remove(this.pointer!);
    };

    /** Update the active tower material while dragging over the scene and bases */
    toggleTowerMaterials = (value: number, tower: Tower | null) => {
        if (tower && !tower.created) {
            gsap.to(tower.model.scale, {
                x: value,
                y: value,
                z: value,
                duration: 0.25
            });
        }
    };

    /** Update active base for placing a tower while performing D&D */
    updateActiveBase = (mesh: Mesh<BufferGeometry, MeshStandardMaterial> | null) => {
        this.activeBase = mesh;
    };

    /** Finalise tower creation after placing it on the active base */
    addTower = (tower: Tower) => {
        this.towers[tower.uuid] = tower;
        this.game.scene.add(tower.model);
        this.towerIntersections.push(tower.model);
    };

    /** Add new model tower bases */
    addBases(meshes: Object3D<Event>[]) {
        this.bases = meshes;
    }

    addTools = (meshes: Object3D<Event>[]) => {
        this.tools = meshes;
    };

    toggleTools = (value: boolean) => {
        this.tools.forEach((mesh) => {
            const tool = mesh as Group;
            const base = this.bases.find((b) => b.uuid === tool.userData.base)!;

            if (!base.userData.occupied) {
                tool.traverse((o) => {
                    o.visible = value;
                });
            }
        });
    };

    /** Initialize a new tower instance and add its model to the scene */
    applyTowersToBases = () => {
        this.bases.forEach((mesh, idx) => {
            (mesh as Mesh<any, any>).material = new MeshBasicMaterial({
                color: 'white',
                transparent: true,
                opacity: 0
            });

            this.tools[idx].userData = { base: mesh.uuid };

            const { x, y, z } = this.game.utils.getBoxCenter(mesh);
            const tower = new Tower(this).prepareTower(x, y - 0.95, z);
            mesh.userData = { towerId: tower.uuid, occupied: false };

            this.addTower(tower);
        });

        this.game.towers.toggleTools(false);
    };

    /** Exclude the base after placing a tower on it */
    excludeBase = (uuid: string) => {
        let baseUuid = '';
        this.bases.find((base) => {
            if (base.userData.towerId === uuid) {
                baseUuid = base.uuid;
                return base;
            }
        })!.userData.occupied = true;

        this.tools
            .find((tool) => {
                console.log(tool.userData.base);
                return tool.userData.base === baseUuid;
            })!
            .traverse((o) => {
                o.visible = false;
            });
    };
}

class Tower {
    system: TowerSystem;
    uuid: string;
    model: Group;
    created: boolean;
    range: Record<'x' | 'z', [number, number]>;
    attackSpeed: number;
    shootingIntervalId: number | null;
    focusedTarget: Target | null;
    rangeGroup: Group;

    constructor(system: TowerSystem) {
        this.system = system;
        this.model = new Group();
        this.uuid = '';
        this.rangeGroup = new Group();
        this.focusedTarget = null;
        this.shootingIntervalId = null;
        this.attackSpeed = 1000;
        this.range = {
            x: [0, 0], // [min, max]
            z: [0, 0]
        };
        this.created = false;
    }

    /** Create a new tower model with fresh materials */
    createNewModel = (x: number, y: number, z: number) => {
        this.model = this.system.game.models['cannon']!.scenes[0].clone();
        this.model.name = 'Tower';
        this.model.position.set(x, y, z);
        this.model.scale.set(0, 0, 0);

        this.uuid = this.model.uuid;
    };

    /** Update creation state and fix the tower on the map */
    placeTheTower = () => {
        this.created = true;
        this.model.scale.set(1, 1, 1);
        this.system.excludeBase(this.uuid);
        this.toggleRangeGroup(1);
        this.updateTowerSettings();
        this.towerLoop();
    };

    updateTowerSettings = () => {
        if (Object.keys(this.system.towers).length) {
            this.attackSpeed = Object.values(this.system.towers)[0].attackSpeed;
        }
    };

    toggleRangeGroup = (value: number) => {
        this.rangeGroup.children.forEach((child) => {
            (child as Mesh<any, any>).material.opacity = value;
        });
    };

    /** Update a current target value */
    setNewTarget = (target: Target | null) => {
        this.focusedTarget = target;
    };

    /** Prepare for the game */
    prepareTower = (x: number, y: number, z: number) => {
        this.createNewModel(x, y, z);
        this.defineRange();

        return this;
    };

    /** Define range parameters depending on the placement */
    defineRange = () => {
        const plane = new Mesh(
            new PlaneGeometry(15, 15, 4, 4),
            new MeshBasicMaterial({ color: 'black', transparent: true, opacity: 1, wireframe: false })
        );

        const radius = new Mesh(
            new RingGeometry(8, 8.2, 64),
            new MeshBasicMaterial({ color: 'green', transparent: true, opacity: 0 })
        );
        const edges = new EdgesGeometry(new RingGeometry(8, 8.2, 64));
        const lines = new LineSegments(edges, new MeshBasicMaterial({ color: 'black', transparent: true, opacity: 0 }));

        const center = this.system.game.utils.getBoxCenter(this.model);

        plane.rotation.x = -Math.PI / 2;
        plane.position.y = this.model.position.y + 1;
        plane.position.x = center.x;
        plane.position.z = center.z;

        this.rangeGroup.rotation.x = -Math.PI / 2;
        this.rangeGroup.position.y = this.model.position.y + 1;
        this.rangeGroup.position.x = center.x;
        this.rangeGroup.position.z = center.z;

        this.rangeGroup.add(radius, lines);

        const r = this.system.game.utils.getBox(plane);
        this.range.x = [r.min.x, r.max.x];
        this.range.z = [r.min.z, r.max.z];

        this.system.game.scene.add(this.rangeGroup);
    };

    /** Detect a target based on a range */
    detectTarget = () => {
        if (this.focusedTarget) {
            const { x, z } = this.focusedTarget.mesh.position;
            const {
                x: [minX, maxX],
                z: [minZ, maxZ]
            } = this.range;

            if (!Boolean(x >= minX && x <= maxX && z >= minZ && z <= maxZ)) {
                this.setNewTarget(null);
                this.stopShooting();
            }
        } else {
            for (const target of this.system.game.targets.targets) {
                const { x, z } = target.mesh.position;
                const {
                    x: [minX, maxX],
                    z: [minZ, maxZ]
                } = this.range;

                if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
                    if (
                        !this.focusedTarget &&
                        target.mesh.userData.health <= this.system.game.targets.getHealthLevel()
                    ) {
                        this.setNewTarget(target);
                        break;
                    }
                }
            }
        }
    };

    /** Abort shooting process */
    stopShooting = () => {
        clearInterval(this.shootingIntervalId!);
        this.shootingIntervalId = null;
    };

    /** Start shooting at the target */
    shootTarget = () => {
        if (this.focusedTarget && !this.shootingIntervalId) {
            this.shootingIntervalId = setInterval(() => {
                if (this.focusedTarget?.mesh.userData.health >= this.focusedTarget!.health) {
                    this.stopShooting();
                    this.system.game.targets.deleteTarget(this.focusedTarget!, false);
                    this.setNewTarget(null);

                    return;
                }

                if (this.focusedTarget?.mesh.userData.health <= this.focusedTarget!.health) {
                    new Projectile(this.system.game, this);
                }
            }, this.attackSpeed);
        }

        return;
    };

    /** Follow the target after being placed on the base */
    followTarget = () => {
        if (this.focusedTarget) {
            const { x, z } = this.focusedTarget!.mesh.position;
            this.model.lookAt(x, this.model.position.y, z);
        }
    };

    /** Tower frame loop */
    towerLoop = () => {
        if (this.created && this.system.game.targets.targets.length > 0) {
            this.detectTarget();
            this.shootTarget();
            this.followTarget();
        }

        window.requestAnimationFrame(this.towerLoop);
    };
}

class Projectile {
    game: Game;
    tower: Tower;
    mesh: Mesh;
    uuid: string;

    constructor(game: Game, tower: Tower) {
        this.game = game;
        this.tower = tower;
        this.mesh = this.game.models['cannon']!.scenes[0].children.find((obj) =>
            obj.name.includes('Shell')
        )!.clone() as Mesh;
        this.uuid = this.game.utils.getUUID();
        this.mesh.uuid = this.uuid;

        this.setPosition();
        this.animateObject();
    }

    /** Set projectile position and start the animation */
    setPosition() {
        const mesh = this.tower.model.children.find((mesh) => mesh.name.includes('Shoot'))! as Mesh<any, any>;
        const vec = new Vector3();
        mesh.getWorldPosition(vec);

        this.mesh.position.set(vec.x, vec.y, vec.z);
        this.game.scene.add(this.mesh);
        this.mesh.lookAt(this.tower.focusedTarget!.mesh.position);
    }

    /** Perform the object animation towards the current target */
    animateObject = () => {
        gsap.to(this.mesh.position, {
            x: this.tower.focusedTarget!.mesh.position.x,
            y: this.tower.focusedTarget!.mesh.position.y,
            z: this.tower.focusedTarget!.mesh.position.z,
            duration: 0.4,
            onComplete: () => {
                if (
                    this.tower.focusedTarget &&
                    this.tower.focusedTarget?.mesh.userData.health <= this.tower.focusedTarget.health
                ) {
                    this.tower.focusedTarget.mesh.userData.health += 50;
                    this.game.scene.remove(this.mesh);
                } else {
                    this.game.scene.remove(this.mesh);
                }
            }
        });
    };
}

export { TowerSystem, Tower };
