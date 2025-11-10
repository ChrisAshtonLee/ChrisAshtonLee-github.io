import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
camera.position.z = 5;
const ptgeometry = new THREE.BufferGeometry();
const positions = [];
for (i  =0; i<20; i++ ){
    positions.push(Math.random()*10-5, Math.random()*10-5, Math.random()*10-5);
}
ptgeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
const ptmaterial = new THREE.PointsMaterial({ color: 0xff0000, size: 0.15, sizeAttenuation: true });
const points = new THREE.Points(ptgeometry, ptmaterial);
scene.add(points);
positions.push(1, 1, 1);
function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}
animate();