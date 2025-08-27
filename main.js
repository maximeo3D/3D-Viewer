import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a); // Dark background for HDR

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// HDR Environment Loading
const rgbeLoader = new RGBELoader();
rgbeLoader.setDataType(THREE.HalfFloatType);

// Load HDR environment map
rgbeLoader.load(
    'Textures/HDR/default.hdr',
    function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        
        // Set as scene environment
        scene.environment = texture;
        
        // Also set as scene background for a nice skybox effect
        scene.background = texture;
        
        // Hide loading message
        document.getElementById('loading').style.display = 'none';
        
        console.log('HDR environment loaded successfully');
    },
    function (progress) {
        console.log('Loading HDR:', (progress.loaded / progress.total * 100) + '%');
    },
    function (error) {
        console.error('Error loading HDR:', error);
        document.getElementById('loading').textContent = 'Error loading HDR environment';
    }
);

// Lighting - reduced since we have HDR environment
const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
scene.add(ambientLight);

// Create a reflective cube to show off the HDR environment
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    metalness: 0.9,
    roughness: 0.1,
    envMapIntensity: 1.0
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 2;
controls.maxDistance = 20;

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    controls.update();
    renderer.render(scene, camera);
}

// Start the animation loop
animate();
