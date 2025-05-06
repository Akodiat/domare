import * as THREE from 'three';

// Use globals here to avoid
// initialising them every frame in "FisheyeCamera.update()"
const t = new THREE.Vector3();
const r = new THREE.Quaternion();
const s = new THREE.Vector3();
const e = new THREE.Euler(0, Math.PI, 0);

class FisheyeCamera extends THREE.PerspectiveCamera {
    /**
     * Construct a Fisheye lens canera
     * @param {number} resolution Resolution in pixels (expexts a single number,
     * since the canvas will be square)
     * @param {THREE.Euler} tilt Tilt of the dome in Euler angles (radians)
     * @param {number} detail Smoothness of the icosphere used for the Fisheye effect
     */
    constructor(resolution, tilt = new THREE.Euler(0, 0, 0), detail = 32) {
        super();
        this.position.set(0, 0, 1);

        const radius = resolution/2;
        this.outerCamera = new THREE.OrthographicCamera();
        this.outerCamera.zoom = 1;
        this.outerCamera.near = 1;
        this.outerScene = new THREE.Scene();

        this.cubeCamera = new THREE.CubeCamera(0.01, 1000);

        const sphereMaterial = new THREE.MeshBasicMaterial();

        const sphereGeometry = new THREE.IcosahedronGeometry(1, detail);
        this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.sphere.scale.multiplyScalar(radius);
        this.outerScene.add(this.sphere);

        this.offset = new THREE.Vector3();
        this.tilt = tilt;

        this.setResolution(resolution);
    }

    /**
     * Set or update resolution
     * @param {*} resolution Resolution in pixels (expects a single number,
     * since the canvas will be square).
     */
    setResolution(resolution) {
        const radius = resolution/2;
        this.outerCamera.left = resolution / -2;
        this.outerCamera.right = resolution / 2;
        this.outerCamera.top = resolution / 2;
        this.outerCamera.bottom = resolution / -2;
        this.outerCamera.position.set(0, 0, radius * 2);
        this.outerCamera.far = radius * 2;
        this.outerCamera.updateProjectionMatrix();

        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(resolution);
        cubeRenderTarget.texture.flipY = true;
        cubeRenderTarget.texture.type = THREE.HalfFloatType;
        cubeRenderTarget.texture.isRenderTargetTexture = false;
        this.cubeCamera.renderTarget = cubeRenderTarget;

        this.sphere.material.envMap = cubeRenderTarget.texture;
        this.sphere.scale.set(radius, radius, radius);
    }

    /**
     * Update camera and the inner render target. Call this for each frame.
     * @param {*} renderer
     * @param {*} scene
     */
    update(renderer, scene) {
        // Apply camera position and rotation, flip the Y axis
        this.matrixWorld.decompose(t, r, s);
        this.cubeCamera.position.copy(t);
        const e2 = new THREE.Euler(e.x+this.tilt.x, e.y+this.tilt.y, e.z+this.tilt.z)
        this.cubeCamera.quaternion.setFromEuler(e2).premultiply(r);

        // Offset camera (for e.g. eye separation)
        this.cubeCamera.position.add(this.localToWorld(this.offset.clone()));

        this.cubeCamera.update(renderer, scene);
    }
}

/**
 * Convinience function to get a promise
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise}
 */
function canvasToBlob(canvas) {
    return new Promise(resolve => {
        canvas.toBlob(resolve);
    });
};

/**
 * Write a sequence of images to the user drive
 * @param {THREE.WebGLRenderer} renderer
 * @param {FisheyeCamera} camera
 * @param {THREE.Scene} scene
 * @param {(number, number)=>void} animate Animation loop function
 * @param {number} duration Duration in seconds
 * @param {number} fps Number of frames per second
 * @param {number} eyeSep Distance between eyes
 */
async function saveImageSequence(
    renderer, camera, scene, animate=null,
    duration = 0.5, fps = 60, eyeSep = 0.064
) {
    renderer.setAnimationLoop(null); // Stop auto animation
    if (window.showDirectoryPicker === undefined) {
        document.getElementById('unsupportedModal').open = true;
        return;
    }
    const dirHandle = await window.showDirectoryPicker();
    const nFrames = duration * fps;
    const dt = duration / nFrames;
    const maxDig = nFrames.toString().length;

    const eyes = [{
            name: "LEFT",
            deltaPos: new THREE.Vector3(-eyeSep/2, 0, 0)
        }, {
            name: "RIGHT",
            deltaPos: new THREE.Vector3(eyeSep/2, 0, 0)
    }];
    for (const eye of eyes) {
        eye.subDir = await dirHandle.getDirectoryHandle(eye.name, {create: true});
    }

    let i = 0;
    const step = async () => {
        // Log progress
        console.log(`Saving frame ${i+1}/${nFrames} (${(100*(i+1)/nFrames).toPrecision(3)}%), t = ${((i+1)*dt).toPrecision(3)}s`);

        // Call animation loop
        if (animate !== null) {
            animate(undefined, dt);
        }

        // Offset and save camera for each eye
        for (const eye of eyes) {
            camera.offset.copy(eye.deltaPos);
            camera.update(renderer, scene);
            renderer.render(camera.outerScene, camera.outerCamera);
            const blob = await canvasToBlob(renderer.domElement);

            // Create handles for file and writable stream
            const fileHandle = await eye.subDir.getFileHandle(
                `Bildsekvens_${eye.name}_${i.toString().padStart(maxDig, "0")}.png`,
                {create: true}
            )
            const writableStream = await fileHandle.createWritable();
            writableStream.write(blob);
            writableStream.close();
        }
        i++;
        if (i<nFrames) {
            requestAnimationFrame(step);
        } else {
            // Continue auto animation
            renderer.setAnimationLoop(animate);

            // Reset offset
            camera.offset.set(0, 0, 0);
        }
    }
    requestAnimationFrame(step);
}

export {FisheyeCamera, saveImageSequence};