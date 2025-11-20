import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;
const renderer = new THREE.WebGLRenderer();
const container = document.getElementById('boid-container');
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
// ... your lighting ...
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);
let inputMode = 'click';
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentZDepth = 0; // Default Z position (adjustable by scroll)
let previewMesh = null;

let isDragging = false;
let startMousePosition = new THREE.Vector2();
let endMousePosition = new THREE.Vector2();
const selectedPoints = new Set(); // Stores references to the permanent THREE.Mesh objects
let selectionBoxMesh = null; // Visual cube/box to show the selection area
const PERMANENT_POINT_COLOR = 0x00ff00; // Define a base color for clarity
const SELECTED_COLOR = 0xffff00;        // Define a color for selected points (Orange)
const placementPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

const deleteButton = document.getElementById('deleteButton');
const selectionCountDisplay = document.getElementById('selectionCount');
const pointCountDisplay = document.getElementById('pointCount');
// --- Initialization Block ---
// Create a small sphere for the preview (red and transparent)
const previewGeometry = new THREE.SphereGeometry(0.3, 16, 16);
const previewMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
previewMesh = new THREE.Mesh(previewGeometry, previewMaterial);
previewMesh.visible = false;
scene.add(previewMesh);
document.querySelectorAll('input[name="inputMode"]').forEach(radio => {
    radio.addEventListener('change', (event) => {
        inputMode = event.target.value;
        if (inputMode !== 'click') {
            previewMesh.visible = false;
            // Disable camera controls when clicking is enabled
            controls.enabled = true;
        } else {
             controls.enabled = false;
        }
    });
});
window.addEventListener('mousedown', (event) => {
    // Check if the user is in the 'click to place' mode or a 'select' mode
    if (inputMode !== 'click') return; 

    // Left mouse button starts drag (0 is primary button)
    if (event.button === 0) {
        isDragging = true;
        startMousePosition.set(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        // Copy start to end until moved
        endMousePosition.copy(startMousePosition);
        
        // Clear any previous visual selection box and hide preview mesh
        if (selectionBoxMesh) scene.remove(selectionBoxMesh);
        if (previewMesh) previewMesh.visible = false;
    }
}, false);

// --- Mouse Move (Update Drag) ---
window.addEventListener('mousemove', (event) => {
    // Existing logic for 'click to place' preview remains here.
    
    if (isDragging) {
        // Update end position
        endMousePosition.set(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        // Visually represent the selection box (optional, but helpful)
        updateSelectionBoxVisual(); 
    }
}, false);

// --- Mouse Up (End Drag & Select Points) ---
window.addEventListener('mouseup', (event) => {
    if (isDragging && event.button === 0) {
        isDragging = false;
        
        // If the drag was very small, treat it as a single click and do nothing (or implement single-point select)
        if (startMousePosition.distanceTo(endMousePosition) < 0.01) {
            if (selectionBoxMesh) scene.remove(selectionBoxMesh);
            return; 
        }

        // Perform the selection calculation
        selectPointsInBox();
        
        // Clean up the visual selection box after selection
        if (selectionBoxMesh) scene.remove(selectionBoxMesh);
    }
}, false);
window.addEventListener('mousemove', (event) => {
    if (inputMode !== 'click') return;

    // Calculate mouse position in normalized device coordinates (NDC) (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update the plane to match the current Z depth
    placementPlane.constant = -currentZDepth;

    // Raycast to find intersection with the placement plane
    raycaster.setFromCamera(mouse, camera);
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(placementPlane, intersectionPoint);

    if (intersectionPoint) {
        previewMesh.position.copy(intersectionPoint);
        previewMesh.visible = true;
    } else {
        previewMesh.visible = false;
    }
}, false);
window.addEventListener('wheel', (event) => {
    if (inputMode !== 'click') return;
    
    // Adjust Z depth based on scroll direction
    // You can adjust the scroll sensitivity (e.g., * 0.1)
    currentZDepth += event.deltaY * 0.01; 
    currentZDepth = Math.min(Math.max(currentZDepth, -50), 50); // Clamp Z within a range

    document.getElementById('currentDepth').textContent = currentZDepth.toFixed(2);
    
    // Re-trigger mousemove logic to instantly update preview position on the new plane
    window.dispatchEvent(new MouseEvent('mousemove', event)); 
}, false);

// --- 4. Right Mouse Button Click (Place Point) ---
window.addEventListener('contextmenu', (event) => {
    // Prevent the default browser context menu
    event.preventDefault();

    if (inputMode !== 'click' || !previewMesh.visible) return;

    // Get the final position from the preview mesh
    const finalPosition = previewMesh.position.clone();
    
    // 💡 Implement point creation and sending to server here!
    addPermanentPoint(finalPosition);
    
}, false);
const userPoints = [];

function addPermanentPoint(position) {
    // 1. Create a permanent sphere (e.g., green, opaque)
    const permanentMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00, // Random color for distinction
        metalness: 0.2,
        roughness: 0.5
    });
    const permanentMesh = new THREE.Mesh(previewGeometry, permanentMaterial);
    permanentMesh.position.copy(position);
    
    scene.add(permanentMesh);

    // 2. Store the point data
    userPoints.push({
        x: position.x,
        y: position.y,
        z: position.z
    });
    const computeButton = document.getElementById('computeButton');
    document.getElementById('pointCount').textContent = userPoints.length;

    // Enable button only if there are enough points (Tukey/Convex Hull usually needs >= 4)
    if (userPoints.length >= 4) {
        computeButton.disabled = false;
    }
    console.log(`Point added: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
    
    // 3. Optional: Trigger a server computation immediately after placement
    // You would typically wait until the user is done placing points.
    // For testing, you could call a function here to fetch new results:
    // sendPointsToServer(userPoints);
}
document.getElementById('computeButton').addEventListener('click', () => {
    // Disable the button and clear previous results/feedback
    const button = document.getElementById('computeButton');
    const feedback = document.getElementById('feedback');
    button.disabled = true;
    feedback.innerHTML = 'Computing...';

    // Call the function to send data
    sendPointsToServer(userPoints);
});
// --- 1. Define your input points ---
async function sendPointsToServer(points) {
    const feedback = document.getElementById('feedback');
    const button = document.getElementById('computeButton');
    const k = Math.floor(points.length / 2); // Example k-value for the median

    try {
        const response = await fetch('http://127.0.0.1:5000/compute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                primal_points: points,
                k: k
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        // --- Process the result ---
        processContourResult(data);
        
        feedback.innerHTML = `<span style="color: green;">Success! ${data.vertices.length} vertices received.</span>`;

    } catch (error) {
        console.error("Computation Failed:", error);
        feedback.innerHTML = `<span style="color: red;">Failed: ${error.message || 'Check console.'}</span>`;
        button.disabled = false;
    } finally {
        // Re-enable the button if computation failed, keep disabled if successful for now
        if (button.disabled && feedback.innerHTML.includes('Failed')) {
            button.disabled = false;
        }
    }
}

// --- Placeholder for Contour Rendering ---
// This function needs to be implemented to take the JSON response and create the geometry
function processContourResult(data) {
    // 1. Remove any previous contour meshes (if implemented)

    // 2. Map vertices back to THREE.Vector3
    const verticesVec3 = data.vertices.map(v => new THREE.Vector3(v.x, v.y, v.z));
    
    // 3. Create a BufferGeometry
    const contourGeometry = new THREE.BufferGeometry().setFromPoints(verticesVec3);
    
    // 4. Set the indices (faces/triangles)
    const indices = [];
    for (const face of data.faces) {
        indices.push(face.v1, face.v2, face.v3);
    }
    contourGeometry.setIndex(indices);
    
    // Calculate normals for correct lighting
    contourGeometry.computeVertexNormals();

    // 5. Create a material and mesh
    const contourMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff, // Cyan color for the result
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
    });

    const contourMesh = new THREE.Mesh(contourGeometry, contourMaterial);
    scene.add(contourMesh);
    
    // Optionally store the mesh reference if you need to remove it later
}

function updateSelectionBoxVisual() {
    if (selectionBoxMesh) scene.remove(selectionBoxMesh);

    // Create a normalized square in NDC space defined by the drag start and end
    const minX = Math.min(startMousePosition.x, endMousePosition.x);
    const maxX = Math.max(startMousePosition.x, endMousePosition.x);
    const minY = Math.min(startMousePosition.y, endMousePosition.y);
    const maxY = Math.max(startMousePosition.y, endMousePosition.y);
    
    // Create the geometry that represents the frustum.
    // We use the raycaster and camera to define a temporary bounding volume.
    
    // NOTE: Creating a proper 3D bounding box from 2D screen space (a frustum) 
    // for objects at varying depths is highly complex. 
    // For simplicity, we'll implement the actual selection logic in selectPointsInBox 
    // and skip a complex frustum visualization here. We'll just rely on the 
    // selection function.
}

// --- 2. Selects points whose 3D bounds intersect the 2D screen box ---
function selectPointsInBox() {
    // 1. Clear previous selections
    selectedPoints.forEach(mesh => mesh.material.color.setHex(PERMANENT_POINT_COLOR));
    selectedPoints.clear();

    // 2. Normalize screen positions
    const xMin = Math.min(startMousePosition.x, endMousePosition.x);
    const xMax = Math.max(startMousePosition.x, endMousePosition.x);
    const yMin = Math.min(startMousePosition.y, endMousePosition.y);
    const yMax = Math.max(startMousePosition.y, endMousePosition.y);
    
    // 3. Loop through all permanent meshes in the scene
    scene.traverse((object) => {
        // Only consider permanent meshes (we'll identify them by checking against userPoints)
        if (object.isMesh && object !== previewMesh && object.geometry.type === 'SphereGeometry') {
            
            // Convert the object's 3D world position to 2D screen space (NDC)
            const position = object.position.clone();
            position.project(camera); // position is now in NDC space (-1 to 1)

            const objX = position.x;
            const objY = position.y;
            
            // Check if the projected point is inside the 2D selection box
            if (objX >= xMin && objX <= xMax && objY >= yMin && objY <= yMax) {
                
                // Select the point
                selectedPoints.add(object);
                object.material.color.setHex(SELECTED_COLOR);
            }
        }
    });

    // 4. Update UI
    selectionCountDisplay.textContent = selectedPoints.size;
    deleteButton.disabled = selectedPoints.size === 0;
}
deleteButton.addEventListener('click', () => {
    if (selectedPoints.size === 0) return;

    // 1. Convert Set to Array for easier iteration
    const meshesToDelete = Array.from(selectedPoints);

    // 2. Remove Meshes and Data
    meshesToDelete.forEach(mesh => {
        // Remove from scene
        scene.remove(mesh);

        // Find and remove the corresponding data point from the userPoints array
        // We use the position as a unique identifier (since we used it to create the point)
        const index = userPoints.findIndex(p => 
            p.x === mesh.position.x && 
            p.y === mesh.position.y && 
            p.z === mesh.position.z
        );

        if (index > -1) {
            userPoints.splice(index, 1);
        }
        
        // Dispose of the geometry and material to free memory (best practice)
        mesh.geometry.dispose();
        mesh.material.dispose();
    });

    // 3. Clear the selection and update UI
    selectedPoints.clear();
    selectionCountDisplay.textContent = 0;
    pointCountDisplay.textContent = userPoints.length;
    deleteButton.disabled = true;

    // Optional: Check if re-computation is needed if points were deleted
    const computeButton = document.getElementById('computeButton');
    computeButton.disabled = userPoints.length < 4;
});
// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();