import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
//lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);
const boids = [];
const numBoids = 20;
const perceptionRadius = 7;
const maxSpeed = 0.2;
const maxForce = 0.3;
const separationFactor= 1.5;
const alignmentFactor= 1.0;
const cohesionFactor= 1.0;
const boundsFactor =1.0;
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);

camera.position.z = 35;

const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
const positionRange =20;
for (let i  =0; i<20; i++ ){
    const sphereMaterial = new THREE.MeshStandardMaterial({color: new THREE.Color(Math.random(), Math.random(), Math.random())});
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    const x = (Math.random() - 0.5) * positionRange;
    const y = (Math.random() - 0.5) * positionRange;
    const z = (Math.random() - 0.5) * positionRange;
    sphere.position.set(x, y, z);
    sphere.velocity = new THREE.Vector3(((Math.random() - 0.5)*maxSpeed, (Math.random() - 0.5)*maxSpeed,( Math.random() - 0.5)*maxSpeed));
    boids.push(sphere);
    scene.add(sphere);
}


function checkBounds(boid) {
            const steer = new THREE.Vector3();
            const turnFactor = 0.2; // How sharply they turn

            if (boid.position.x > positionRange) {
                steer.x = -turnFactor;
            } else if (boid.position.x < -positionRange) {
                steer.x = turnFactor;
            }
            if (boid.position.y > positionRange) {
                steer.y = -turnFactor;
            } else if (boid.position.y < -positionRange) {
                steer.y = turnFactor;
            }
            if (boid.position.z > positionRange) {
                steer.z = -turnFactor;
            } else if (boid.position.z < -positionRange) {
                steer.z = turnFactor;
            }
            return steer;
        }
function animate() {
    requestAnimationFrame(animate);
    const accelerations = [];
    for (let boid of boids){
        const alignment = new THREE.Vector3();
        const cohesion = new THREE.Vector3();
        const separation = new THREE.Vector3();
        let neighborCount =0;
        for (let other of boids){
            const d = boid.position.distanceTo(other.position);
            if (other !== boid && d < perceptionRadius){
                alignment.add(other.velocity);
                cohesion.add(other.position);
                const diff = new THREE.Vector3().subVectors(boid.position, other.position);
                diff.divideScalar(d * d);
                separation.add(diff);
                neighborCount++;
               
            }
        }
        const frameAcceleration = new THREE.Vector3();
        if (neighborCount >0){
            alignment.divideScalar(neighborCount);
            alignment.sub(boid.velocity);
            alignment.clampLength(0, maxForce);
            cohesion.divideScalar(neighborCount);
            cohesion.sub(boid.position);
            cohesion.clampLength(0, maxForce);
            separation.divideScalar(neighborCount);
            
            separation.clampLength(0, maxForce);
           
        }
         const boundsSteer = checkBounds(boid);
         frameAcceleration.add(alignment.multiplyScalar(alignmentFactor));
         frameAcceleration.add(cohesion.multiplyScalar(cohesionFactor));
         frameAcceleration.add(separation.multiplyScalar(separationFactor));    
         frameAcceleration.add(boundsSteer.multiplyScalar(boundsFactor));
         accelerations.push(frameAcceleration);
 
    }
    for (let i =0; i<boids.length; i++){
        const boid = boids[i];
        const acc = accelerations[i];  
        boid.velocity.add(acc);
        boid.velocity.clampLength(0, maxSpeed);
        boid.position.add(boid.velocity);
    }
    renderer.render(scene, camera);
}
animate();