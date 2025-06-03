import * as THREE from 'three';
import {FisheyeCamera, saveImageSequence} from './domare.js';

import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

let canvas, camera, scene, renderer, stats;
let clock, mixer;
let controls;

init();

/**
 * Initialise scene
 */
function init() {
    canvas = document.getElementById("threeCanvas");
    scene = new THREE.Scene();

    if (window.showDirectoryPicker === undefined) {
        document.getElementById('unsupportedModal').open = true;
    }

    const resolutionInput = document.getElementById("resolution");
    resolutionInput.oninput = () => {
        setResolution(resolutionInput.valueAsNumber);
    }
    const resolution = resolutionInput.valueAsNumber;

    const tiltInput = document.getElementById("tilt");
    tiltInput.oninput = () => {
        camera.tilt.x = tiltInput.valueAsNumber * Math.PI / 180;
    }

    const spanInput = document.getElementById("span");
    spanInput.oninput = () => {
        camera.span = spanInput.valueAsNumber;
        setResolution(resolutionInput.valueAsNumber);
    }

    camera = new FisheyeCamera(resolution);
    camera.tilt.x = tiltInput.valueAsNumber * Math.PI / 180;

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvas,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setAnimationLoop(animate);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    setResolution(resolution);

    // Show performance statistics (FPS)
    stats = new Stats();
    document.body.appendChild(stats.dom);

    // Add a default cube
    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({color: 0x575757})
    );
    scene.add(cube);

    // Load models throught input
    const modelInput = document.getElementById("modelInput");
    modelInput.onchange = () => {
        scene.remove(cube); // Remove default cube
        const loader = new GLTFLoader();
        for (const uploadedFile of modelInput.files) {
            const url = URL.createObjectURL(uploadedFile);
            addModel(url, loader, ()=>URL.revokeObjectURL(url));
        }
    }

    // Add a default background
    addBackground("textures/equirectangular/quarry_01_1k.hdr");

    // Load background throught input
    const backgroundInput = document.getElementById("backgroundInput");
    backgroundInput.onchange = () => {
        const url = URL.createObjectURL(backgroundInput.files[0]);
        addBackground(url, undefined, ()=>URL.revokeObjectURL(url));
    }

    // Setup orbit controls (for moving around the scene)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;

    // Setup clock (for use in animation loop)
    clock = new THREE.Clock();

    // Expose relevant functions and objects
    window.camera = camera;
    window.addBackground = addBackground;
    window.addModel = addModel;
    window.saveImageSequence = () => saveImageSequence(
        renderer, camera, scene, animate,
        document.getElementById("duration").valueAsNumber,
        document.getElementById("framerate").valueAsNumber,
        document.getElementById("eyeSep").valueAsNumber,
    );
}

/**
 * Set or change the resolution of the 3D canvas
 * @param {number} resolution
 */
function setResolution(resolution) {
    canvas.width = resolution;
    canvas.height = resolution;

    renderer.setSize(resolution, resolution);

    if (controls) {
        camera.setResolution(resolution);
        controls.object = camera;
    }
}

/**
 * Load a background from path
 * @param {string} url Path to HDR background
 * @param {RGBELoader} loader
 * @param {()=>void} callback Function to be run once the background is loaded
 */
function addBackground(url, loader=new RGBELoader(), callback=()=>{}) {
    loader.load(url, texture => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
        callback();
    }, undefined, ()=>{
        callback();
    });
}

/**
 * Load a 3D model from path
 * @param {string} url Path to glTF 3D model
 * @param {GLTFLoader} loader
 * @param {()=>void} callback Function to be run once the model is loaded
 */
function addModel(url, loader=new GLTFLoader(), callback=()=>{}) {
    loader.load(url, gltf => {
        scene.add(gltf.scene);

        if (gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(gltf.scene);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
        }
        callback();
    }, undefined, ()=>{
        callback();
    });
}

/**
 * Animation loop
 * @param {number} timestamp Timestamp in milliseconds (not used here)
 * @param {number} delta Time delta in seconds since last frame
 */
function animate(timestamp, delta=clock.getDelta()) {
    controls.update(delta);
    camera.update(renderer, scene);
    renderer.render(camera.outerScene, camera.outerCamera);

    if (mixer) {
        mixer.update(delta);
    }

    stats.update();
}