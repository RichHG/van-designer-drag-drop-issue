class SceneManager {
// In scene-manager.js
constructor(canvasId) {
    this.canvasId = canvasId;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = null;
    this.mouse = null;
    this.gridHelper = null;
    this.measurementHelper = null;
    this.selectedObject = null;
    this.dragControlsManager = null; // Add this line

    // Event callbacks
    this.onObjectSelected = null;
    this.onObjectDeselected = null;

    this.init();
}


init() {
// Create scene
this.scene = new THREE.Scene();
this.scene.background = new THREE.Color(0xf0f0f0);

// Create camera
this.camera = new THREE.PerspectiveCamera(
45,
this.getAspectRatio(),
0.1,
1000
);
this.camera.position.set(5, 3, 5);

// Create renderer
this.renderer = new THREE.WebGLRenderer({ antialias: true });
this.renderer.setSize(this.getWidth(), this.getHeight());
this.renderer.shadowMap.enabled = true;
this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Add renderer to DOM
const container = document.getElementById(this.canvasId);
container.appendChild(this.renderer.domElement);

// Create orbit controls
this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
this.controls.enableDamping = true;
this.controls.dampingFactor = 0.25;
this.controls.screenSpacePanning = false;
this.controls.maxPolarAngle = Math.PI / 2;
  
  // Initialize drag controls manager - Add this line here
    this.dragControlsManager = new DragControlsManager(this);

// Create raycaster for object selection
this.raycaster = new THREE.Raycaster();
this.mouse = new THREE.Vector2();

// Add lights
this.addLights();

// Add grid
this.addGrid();

// Add event listeners
this.addEventListeners();

// Start animation loop
this.animate();
}

addLights() {
// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
this.scene.add(ambientLight);

// Directional light (sun)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 10);
directionalLight.castShadow = true;

// Configure shadow properties
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;

this.scene.add(directionalLight);

// Hemisphere light (sky and ground)
const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x202020, 0.5);
this.scene.add(hemisphereLight);
}

addGrid() {
if (this.gridHelper) {
this.scene.remove(this.gridHelper);
}

this.gridHelper = new THREE.GridHelper(20, 20, 0x000000, 0x808080);
this.gridHelper.position.y = 0; // Change from -0.001 to 0 or to match your van's base
this.scene.add(this.gridHelper);

// Ground plane
const size = 20;
const groundGeometry = new THREE.PlaneGeometry(size, size);
const groundMaterial = new THREE.MeshBasicMaterial({
color: 0xfafafa,
side: THREE.DoubleSide
});
const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.position.y = -0.00; // Adjust this to match the grid position
this.scene.add(groundPlane);

// Measurement helper
this.measurementHelper = new THREE.AxesHelper(5);
this.measurementHelper.visible = false;
this.scene.add(this.measurementHelper);
}

addEventListeners() {
const canvas = this.renderer.domElement;

// Mouse click for object selection
canvas.addEventListener('click', (event) => {
this.handleMouseClick(event);
});

// Mouse move for hover effect
canvas.addEventListener('mousemove', (event) => {
this.handleMouseMove(event);
});
}

handleMouseClick(event) {
// Calculate mouse position in normalized device coordinates
const rect = this.renderer.domElement.getBoundingClientRect();
this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

// Update the picking ray with the camera and mouse position
this.raycaster.setFromCamera(this.mouse, this.camera);

// Calculate objects intersecting the picking ray
const intersects = this.raycaster.intersectObjects(this.scene.children, true);

if (intersects.length > 0) {
// Find the first object that is selectable (has userData)
let selectedObject = null;

for (let i = 0; i < intersects.length; i++) {
// Find the parent object that has our userData
let parent = intersects[i].object;
while (parent && !parent.userData.isVan && !parent.userData.isFurniture) {
parent = parent.parent;
}

if (parent) {
selectedObject = parent;
break;
}
}

if (selectedObject) {
this.selectObject(selectedObject);
} else {
this.deselectObject();
}
} else {
this.deselectObject();
}
}

handleMouseMove(event) {
// Calculate mouse position in normalized device coordinates
const rect = this.renderer.domElement.getBoundingClientRect();
this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

// Update the picking ray with the camera and mouse position
this.raycaster.setFromCamera(this.mouse, this.camera);

// Calculate objects intersecting the picking ray
const intersects = this.raycaster.intersectObjects(this.scene.children, true);

// Reset cursor
this.renderer.domElement.style.cursor = 'default';

if (intersects.length > 0) {
// Find the first object that is selectable (has userData)
for (let i = 0; i < intersects.length; i++) {
// Find the parent object that has our userData
let parent = intersects[i].object;
while (parent && !parent.userData.isVan && !parent.userData.isFurniture) {
parent = parent.parent;
}

if (parent) {
// Change cursor to indicate object is selectable
this.renderer.domElement.style.cursor = 'pointer';
break;
}
}
}
}

selectObject(object) {
// Deselect previous object if any
if (this.selectedObject) {
this.deselectObject();
}

// Set new selected object
this.selectedObject = object;

// Add selection outline
this.addSelectionOutline(object);

// Call the callback if defined
if (this.onObjectSelected) {
this.onObjectSelected(object);
}
}

deselectObject() {
if (this.selectedObject) {
// Remove selection outline
this.removeSelectionOutline(this.selectedObject);

// Call the callback if defined
if (this.onObjectDeselected) {
this.onObjectDeselected();
}

// Clear selected object
this.selectedObject = null;
}
}

addSelectionOutline(object) {
// Add a simple outline effect by creating a copy of the object with a slightly larger scale
object.traverse((child) => {
if (child.isMesh) {
child.userData.originalMaterial = child.material;

// Create a copy of the material with emissive color
const outlineMaterial = child.material.clone();
outlineMaterial.emissive.set(0x2194ce);
outlineMaterial.emissiveIntensity = 0.3;

// Apply the outline material
child.material = outlineMaterial;
}
});
}

removeSelectionOutline(object) {
// Restore original materials
object.traverse((child) => {
if (child.isMesh && child.userData.originalMaterial) {
child.material = child.userData.originalMaterial;
delete child.userData.originalMaterial;
}
});
}

  
  addToScene(object) {
    this.scene.add(object);
    
    // Add to draggable objects if it's furniture
    if (object.userData.isFurniture) {
        this.dragControlsManager.addDraggableObject(object);
    }
}


removeFromScene(object) {
    this.scene.remove(object);
    
    // Remove from draggable objects
    if (object.userData.isFurniture) {
        this.dragControlsManager.removeDraggableObject(object);
    }
}


clearScene(keepLightsAndGrid = false) {
// Remove all objects from the scene
const objectsToRemove = [];

this.scene.traverse((object) => {
// Keep lights and grid if specified
const isLight = object instanceof THREE.Light;
const isGrid = object === this.gridHelper || object === this.measurementHelper;

if (!isLight && !isGrid) {
objectsToRemove.push(object);
}
});

// Remove objects
objectsToRemove.forEach((object) => {
if (object.parent === this.scene) {
this.scene.remove(object);
}
});

// Clear selected object
this.selectedObject = null;
}

focusOnObject(object) {
// Calculate bounding box
const boundingBox = new THREE.Box3().setFromObject(object);
const center = boundingBox.getCenter(new THREE.Vector3());
const size = boundingBox.getSize(new THREE.Vector3());

// Calculate camera position
const maxDim = Math.max(size.x, size.y, size.z);
const fov = this.camera.fov * (Math.PI / 180);
let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));

// Set camera position and target
this.camera.position.set(center.x + cameraZ * 0.5, center.y + cameraZ * 0.5, center.z + cameraZ * 0.5);
this.controls.target.copy(center);
this.controls.update();
}

resetCamera() {
// Reset camera to default position
this.camera.position.set(5, 3, 5);
this.controls.target.set(0, 0, 0);
this.controls.update();
}

toggleGrid() {
if (this.gridHelper) {
this.gridHelper.visible = !this.gridHelper.visible;
}
}

toggleMeasurements() {
if (this.measurementHelper) {
this.measurementHelper.visible = !this.measurementHelper.visible;
}
}

getPositionInFrontOfCamera(distance = 2) {
// Calculate position in front of camera
const position = new THREE.Vector3(0, 0, -distance);
position.applyQuaternion(this.camera.quaternion);
position.add(this.camera.position);

// Ensure the object is placed on the ground
position.y = 0;

return position;
}

getWidth() {
const container = document.getElementById(this.canvasId);
return container.clientWidth;
}

getHeight() {
const container = document.getElementById(this.canvasId);
return container.clientHeight;
}

getAspectRatio() {
return this.getWidth() / this.getHeight();
}

onWindowResize() {
// Update camera aspect ratio
this.camera.aspect = this.getAspectRatio();
this.camera.updateProjectionMatrix();

// Update renderer size
this.renderer.setSize(this.getWidth(), this.getHeight());
}

animate() {
requestAnimationFrame(() => this.animate());

// Update controls
this.controls.update();

// Render scene
this.renderer.render(this.scene, this.camera);
}
}