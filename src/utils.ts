import { Box3, Vector3, MathUtils, Object3D, Event } from 'three';

class GameUtils {
    /** Get calculated center vector of an object */
    getBoxCenter = (threeObject: Object3D<Event>) => {
        return this.getBox(threeObject).getCenter(new Vector3(0, 0, 0));
    };

    /** Get a box3 min and max values of an object */
    getBox = (threeObject: Object3D<Event>) => {
        return new Box3().setFromObject(threeObject);
    };

    /** Get uuid */
    getUUID = () => {
        return MathUtils.generateUUID();
    };
}

export default GameUtils;
