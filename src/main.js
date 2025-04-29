import * as THREE from 'three';

import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {FisheyeCamera} from './fisheye.js';

let canvas, camera, scene, renderer, stats;
let cube, torus;
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

    new RGBELoader().setPath(
        'textures/equirectangular/'
    ).load('quarry_01_1k.hdr', texture => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
    });

    const material2 = new THREE.MeshStandardMaterial({
        roughness: 0.1,
        metalness: 0
    });

    cube = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), material2);
    scene.add(cube);

    torus = new THREE.Mesh(new THREE.TorusKnotGeometry(1.5, 0.3, 128, 16), material2);
    scene.add(torus);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;

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

    const time = msTime / 1000;

    cube.position.x = Math.cos(time) * 3;
    cube.position.y = Math.sin(time) * 3;
    cube.position.z = Math.sin(time) * 3;

    cube.rotation.x = time * 0.2;
    cube.rotation.y = time * 0.3;

    torus.position.x = Math.cos(time + 10) * 3;
    torus.position.y = Math.sin(time + 10) * 3;
    torus.position.z = Math.sin(time + 10) * 3;

    torus.rotation.x = time * 0.2;
    torus.rotation.y = time * 0.3;


    controls.update();
    camera.update(renderer, scene);
    renderer.render(camera.outerScene, camera.outerCamera);

    stats.update();
}