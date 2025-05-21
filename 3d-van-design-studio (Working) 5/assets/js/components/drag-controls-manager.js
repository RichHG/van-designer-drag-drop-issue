/**
 * Drag Controls Manager component for the Van Builder
 */
class DragControlsManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.dragControls = null;
        this.draggableObjects = [];
        this.enabled = false;
        
        this.init();
    }

    init() {
        // Create drag controls
        this.dragControls = new THREE.DragControls(
            this.draggableObjects,
            this.sceneManager.camera,
            this.sceneManager.renderer.domElement
        );

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Disable orbit controls while dragging
        this.dragControls.addEventListener('dragstart', () => {
            this.sceneManager.controls.enabled = false;
        });

        this.dragControls.addEventListener('dragend', () => {
            this.sceneManager.controls.enabled = true;
        });

        // Keep objects at their current height while dragging
        this.dragControls.addEventListener('drag', (event) => {
            const object = event.object;
            if (object.userData.isFurniture) {
                // Maintain the current Y position
                object.position.y = object.userData.currentHeight || 0;
            }
        });
    }

    addDraggableObject(object) {
        if (!this.draggableObjects.includes(object)) {
            // Store the current height
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
