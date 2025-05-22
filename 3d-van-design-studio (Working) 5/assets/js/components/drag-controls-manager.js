/**
 * Drag Controls Manager component for the Van Builder
 */
class DragControlsManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.dragControls = null;
        this.draggableObjects = [];
        this.enabled = false;
        this.raycaster = new THREE.Raycaster();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Initialize dragPlane
        this.intersection = new THREE.Vector3();

        this.init();
    }

    init() {
        this.dragControls = new THREE.DragControls(
            this.draggableObjects,
            this.sceneManager.camera,
            this.sceneManager.renderer.domElement
        );
        this.dragControls.transformGroup = true; // Drag the whole model
        this.setupEventListeners();
    }

    setupEventListeners() {
        let initialIntersection = new THREE.Vector3();

        this.dragControls.addEventListener('dragstart', (event) => {
            this.sceneManager.controls.enabled = false;

            // Set the drag plane based on the object's position
            this.dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), event.object.position);

            // Calculate the initial intersection point
            this.raycaster.setFromCamera(this.getMousePosition(event), this.sceneManager.camera);
            this.raycaster.ray.intersectPlane(this.dragPlane, initialIntersection);

            // Store the initial position of the dragged object
            event.object.userData.initialPosition = event.object.position.clone();
        });

        this.dragControls.addEventListener('drag', (event) => {
            const object = event.object;

            if (object.userData.isFurniture) {
                this.raycaster.setFromCamera(this.getMousePosition(event), this.sceneManager.camera);

                if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
                    // Calculate the offset from the initial intersection
                    const offset = new THREE.Vector3().subVectors(this.intersection, initialIntersection);

                    // Apply the offset to the object's initial position, maintaining the Y position
                    object.position.x = object.userData.initialPosition.x + offset.x;
                    object.position.z = object.userData.initialPosition.z + offset.z;
                    object.position.y = object.userData.currentHeight;
                }
            }
        });

        this.dragControls.addEventListener('dragend', () => {
            this.sceneManager.controls.enabled = true;
        });
    }

    addDraggableObject(object) {
        if (!this.draggableObjects.includes(object)) {
            object.userData.currentHeight = object.position.y;
            this.draggableObjects.push(object);
        }
    }

    removeDraggableObject(object) {
        const index = this.draggableObjects.indexOf(object);
        if (index > -1) {
            this.draggableObjects.splice(index, 1);
        }
    
}

enable() {
this.enabled = true;
this.dragControls.enabled = true;
}

disable() {
this.enabled = false;
this.dragControls.enabled = false;
}

toggle() {
if (this.enabled) {
this.disable();
} else {
this.enable();
}
}
}
