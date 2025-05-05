import * as THREE from 'three';

import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FisheyeCamera} from './fisheye.js';

let canvas, camera, scene, renderer, stats;
let clock, mixer;
let controls;

// https://discourse.threejs.org/t/fisheye-camera-tested-with-bruno-simons-level1-code/56787
init();

function setResolution(resolution) {
    canvas.width = resolution;
    canvas.height = resolution;

    renderer.setSize(resolution, resolution);

    camera = new FisheyeCamera(resolution);
}

function init() {
    canvas = document.getElementById("threeCanvas");
    scene = new THREE.Scene();
    //scene.rotation.y = 0.5; // avoid flying objects occluding the sun

    if (window.showDirectoryPicker === undefined) {
        document.getElementById('unsupportedModal').open = true;
    }

    const resolutionInput = document.getElementById("resolution");
    resolutionInput.onchange = () => {
        setResolution(resolutionInput.valueAsNumber);
    }
    const resolution = resolutionInput.valueAsNumber;

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvas,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setAnimationLoop(animate);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    setResolution(resolution);

    stats = new Stats();
    document.body.appendChild(stats.dom);

    window.uploads = {};

    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({color: 0x575757})
    );
    scene.add(cube);

    const modelInput = document.getElementById("modelInput");
    modelInput.onchange = () => {
        scene.remove(cube); // Remove default cube
        const loader = new GLTFLoader();
        for (const uploadedFile of modelInput.files) {
            const url = URL.createObjectURL(uploadedFile);
            loader.load(url, gltf => {
                window.uploads[uploadedFile.name.split(".").slice(0, -1).join(".")] = gltf.scene;
                scene.add(gltf.scene);

                if (gltf.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(gltf.scene);
                    const action = mixer.clipAction(gltf.animations[0]);
                    action.play();
                }

                URL.revokeObjectURL(url);
            }, undefined, ()=>{
                URL.revokeObjectURL(url)
            });
        }
    }

    new RGBELoader().load("textures/equirectangular/quarry_01_1k.hdr", texture => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
    });

    const backgroundInput = document.getElementById("backgroundInput");
    backgroundInput.onchange = () => {
        const url = URL.createObjectURL(backgroundInput.files[0]);
        new RGBELoader().load(url, texture => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = texture;
            scene.environment = texture;

            URL.revokeObjectURL(url);
        }, undefined, ()=>{
            URL.revokeObjectURL(url)
        });
    }

    controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;

    clock = new THREE.Clock();

    window.saveImages = () => saveImages(
        renderer,
        document.getElementById("duration").valueAsNumber,
        document.getElementById("framerate").valueAsNumber,
    );
}

async function saveImages(renderer, duration = 0.5, fps = 60) {
    renderer.setAnimationLoop(null); // Stop auto animation
    if (window.showDirectoryPicker === undefined) {
        document.getElementById('unsupportedModal').open = true;
        return;
    }
    const dirHandle = await window.showDirectoryPicker();
    const dt = duration / fps
    const iMax = duration * fps;
    const maxDig = iMax.toString().length;
    let i = 0;
    const step = () => {
        animate(i * dt * 1000);
        renderer.domElement.toBlob(blob => {
            // create a new handle
            dirHandle.getFileHandle(
                `Bildsekvens.${i.toString().padStart(maxDig, "0")}.png`,
                {create: true}
            ).then(fileHandle=>fileHandle.createWritable().then(writableStream=>{
                writableStream.write(blob);
                writableStream.close();

                i++;
                if (i<iMax) {
                    requestAnimationFrame(step);
                } else {
                    // Continue auto animation
                    renderer.setAnimationLoop(animate);
                }
            }));
        }, "image/png", 1.0);
    }
    requestAnimationFrame(step);
}

function animate(msTime) {
    controls.update();
    camera.update(renderer, scene);
    renderer.render(camera.outerScene, camera.outerCamera);

    if (mixer) {
        const delta = clock.getDelta();
        mixer.update(delta);
    }

    stats.update();
}