class TransformControlsManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.transformControls = null;
        this.activeObject = null;
        this.controlsHolder = null;
        this.proxyObject = null;
        this.updateRealObjectFn = null;
        this.initialPosition = new THREE.Vector3();
        this.movementScale = 1.0; // Setting default to 1.0 as you preferred
        this.lastValidPosition = new THREE.Vector3();
        this.isDragging = false;
        
        // Initialize the transform controls
        this.init();
    }
    
    init() {
        console.log("TransformControlsManager: Initializing transform controls");
        
        try {
            // Create a special object to hold the transform controls
            this.controlsHolder = new THREE.Group();
            this.sceneManager.scene.add(this.controlsHolder);
            
            // Create the transform controls
            this.transformControls = new THREE.TransformControls(
                this.sceneManager.camera, 
                this.sceneManager.renderer.domElement
            );
            
            console.log("TransformControls created:", this.transformControls);
            
            // Set default mode to translate (arrows)
            this.transformControls.setMode('translate');
            
            // Set size property for visibility
            this.transformControls.size = 0.75;
            
            // Add transform controls to our holder
            this.controlsHolder.add(this.transformControls);
            
            // Add event listener for transform control dragging
            this.transformControls.addEventListener('dragging-changed', (event) => {
                console.log("TransformControlsManager: Drag state changed:", event.value);
                this.isDragging = event.value;
                
                if (this.isDragging && this.activeObject) {
                    // Store the current position as the starting point for this drag operation
                    this.initialPosition.copy(this.activeObject.position);
                    
                    // Reset the proxy position to the center of the object
                    if (this.proxyObject) {
                        const center = this.getObjectCenter(this.activeObject);
                        this.proxyObject.position.copy(center);
                    }
                    
                    console.log("Drag started. Initial position:", 
                        this.initialPosition.x.toFixed(2),
                        this.initialPosition.y.toFixed(2),
                        this.initialPosition.z.toFixed(2)
                    );
                } else if (!this.isDragging && this.activeObject) {
                    // When drag ends, store the last valid position
                    this.lastValidPosition.copy(this.activeObject.position);
                    
                    // CRITICAL: Update the currentHeight in userData for DragControlsManager
                    this.activeObject.userData.currentHeight = this.activeObject.position.y;
                    
                    console.log("Drag ended. Final position:", 
                        this.lastValidPosition.x.toFixed(2),
                        this.lastValidPosition.y.toFixed(2),
                        this.lastValidPosition.z.toFixed(2),
                        "Updated currentHeight in userData:", this.activeObject.userData.currentHeight
                    );
                }
                
                // Disable orbit controls while using transform controls
                this.sceneManager.controls.enabled = !event.value;
                
                // Disable drag controls while transforming
                if (event.value) {
                    if (this.sceneManager.dragControlsManager) {
                        this.sceneManager.dragControlsManager.disable();
                    }
                } else {
                    if (this.sceneManager.dragControlsManager) {
                        this.sceneManager.dragControlsManager.enable();
                    }
                    
                    // Add to history for undo/redo when done transforming
                    if (this.sceneManager.vanBuilder) {
                        this.sceneManager.vanBuilder.addToHistory();
                    }
                }
            });
            
            // Hide by default
            this.transformControls.visible = false;
            
            console.log("TransformControlsManager: Transform controls initialized successfully");
        } catch (error) {
            console.error("Error creating transform controls:", error);
        }
    }
    
    // Set the size of the transform controls
    setSize(size) {
        if (!this.transformControls) return;
        
        this.transformControls.size = size;
        console.log("TransformControls: Size set to", size);
    }
    
    // Set the movement sensitivity
    setMovementScale(scale) {
        this.movementScale = scale;
        console.log("TransformControls: Movement scale set to", scale);
    }
    
    // Find the center of an object
    getObjectCenter(object) {
        // Calculate the bounding box
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = boundingBox.getCenter(new THREE.Vector3());
        return center;
    }
    
    // Attach transform controls to an object
    attach(object) {
        if (!object) {
            console.error("TransformControlsManager: Cannot attach to null object");
            return;
        }
        
        console.log("TransformControlsManager: Attaching to object", object.uuid);
        
        try {
            // Store the object
            this.activeObject = object;
            
            // Make sure the controls holder is in the scene
            if (!this.controlsHolder.parent) {
                this.sceneManager.scene.add(this.controlsHolder);
            }
            
            // Calculate the object's center for better control placement
            const center = this.getObjectCenter(object);
            
            // Create a proxy object at the center
            const proxy = new THREE.Object3D();
            proxy.position.copy(center);
            
            // Add to scene
            this.sceneManager.scene.add(proxy);
            
            // Store the proxy and initial position
            this.proxyObject = proxy;
            this.initialPosition.copy(object.position);
            this.lastValidPosition.copy(object.position);
            
            // Make sure currentHeight is set if not already
            if (object.userData.currentHeight === undefined) {
                object.userData.currentHeight = object.position.y;
                console.log("Setting initial currentHeight:", object.userData.currentHeight);
            }
            
            // Make the controls visible and attach to proxy
            this.transformControls.visible = true;
            this.transformControls.attach(proxy);
            
            // Add a listener for object changes during transform
            const updateRealObject = (event) => {
                if (!this.activeObject || !this.proxyObject) return;
                
                // Get the delta between the current proxy position and the center
                const deltaX = (this.proxyObject.position.x - center.x) * this.movementScale;
                const deltaY = (this.proxyObject.position.y - center.y) * this.movementScale;
                const deltaZ = (this.proxyObject.position.z - center.z) * this.movementScale;
                
                // Apply the scaled deltas to the object's position at the start of this drag
                const newPosition = new THREE.Vector3(
                    this.initialPosition.x + deltaX,
                    this.initialPosition.y + deltaY,
                    this.initialPosition.z + deltaZ
                );
                
                // Update the object position
                this.activeObject.position.copy(newPosition);
                
                // IMPORTANT: Update currentHeight in userData during movement
                // This ensures drag controls will use the updated height
                this.activeObject.userData.currentHeight = this.activeObject.position.y;
                
                // Log the movement
                console.log("Object moved to:", 
                    this.activeObject.position.x.toFixed(2),
                    this.activeObject.position.y.toFixed(2),
                    this.activeObject.position.z.toFixed(2),
                    "Updated currentHeight:", this.activeObject.userData.currentHeight
                );
                
                // Update matrices
                this.activeObject.updateMatrix();
                this.activeObject.updateMatrixWorld(true);
            };
            
            // Save and attach the listener
            this.updateRealObjectFn = updateRealObject;
            this.transformControls.addEventListener('objectChange', updateRealObject);
            
            console.log("TransformControls attached to proxy at object center:", center);
            console.log("Object position:", 
                object.position.x.toFixed(2),
                object.position.y.toFixed(2),
                object.position.z.toFixed(2),
                "Current userData.currentHeight:", object.userData.currentHeight
            );
            
            // Force a redraw
            this.sceneManager.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
        } catch (error) {
            console.error("Error attaching transform controls:", error);
        }
    }
    
    // Detach transform controls from the current object
    detach() {
        console.log("TransformControlsManager: Detaching transform controls");
        
        try {
            // Make sure the controls exist
            if (!this.transformControls) {
                console.error("Transform controls object doesn't exist");
                return;
            }
            
            // Final update to currentHeight before detaching
            if (this.activeObject) {
                this.activeObject.userData.currentHeight = this.activeObject.position.y;
                console.log("Final currentHeight update on detach:", this.activeObject.userData.currentHeight);
            }
            
            // Remove the event listener
            if (this.updateRealObjectFn) {
                this.transformControls.removeEventListener('objectChange', this.updateRealObjectFn);
                this.updateRealObjectFn = null;
            }
            
            // Detach the controls
            this.transformControls.detach();
            
            // Remove the proxy object if it exists
            if (this.proxyObject) {
                if (this.proxyObject.parent) {
                    this.proxyObject.parent.remove(this.proxyObject);
                }
                this.proxyObject = null;
            }
            
            // Hide the controls
            this.transformControls.visible = false;
            
            // Clear active object reference
            this.activeObject = null;
            this.isDragging = false;
        } catch (error) {
            console.error("Error detaching transform controls:", error);
        }
    }
    
    // Set transform mode (translate, rotate, scale)
    setMode(mode) {
        if (!this.transformControls) return;
        
        if (mode === 'translate' || mode === 'rotate' || mode === 'scale') {
            console.log("TransformControlsManager: Setting mode to", mode);
            this.transformControls.setMode(mode);
            
            // When changing modes, we need to restart our positioning logic
            if (this.activeObject && this.proxyObject) {
                // Update the center reference
                const center = this.getObjectCenter(this.activeObject);
                this.proxyObject.position.copy(center);
                
                // Update the initial position for the new operation
                this.initialPosition.copy(this.activeObject.position);
            }
        }
    }
    
    // Enable the transform controls
    enable() {
        if (this.transformControls) {
            this.transformControls.enabled = true;
            
            // If there's an active object, make the controls visible
            if (this.activeObject) {
                this.transformControls.visible = true;
            }
        }
    }
    
    // Disable the transform controls
    disable() {
        if (this.transformControls) {
            this.transformControls.enabled = false;
            this.transformControls.visible = false;
        }
    }
    
    // Toggle the transform controls
    toggle() {
        if (this.transformControls) {
            if (this.transformControls.enabled) {
                this.disable();
            } else {
                this.enable();
            }
        }
    }
    
    // Update transform controls position to keep centered on the object
    updateControlsPosition() {
        if (!this.activeObject || !this.proxyObject || this.isDragging) return;
        
        // Recalculate the center
        const center = this.getObjectCenter(this.activeObject);
        
        // Update the proxy position without triggering movement
        this.transformControls.removeEventListener('objectChange', this.updateRealObjectFn);
        this.proxyObject.position.copy(center);
        this.transformControls.addEventListener('objectChange', this.updateRealObjectFn);
        
        // Update the initial position reference
        this.initialPosition.copy(this.activeObject.position);
    }
}
