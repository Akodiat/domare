import * as THREE from 'three';

const t = new THREE.Vector3();
const r = new THREE.Quaternion();
const s = new THREE.Vector3();
const e = new THREE.Euler(0, Math.PI, 0);

class FisheyeCamera extends THREE.PerspectiveCamera {
    constructor(resolution, detail = 32) {
        super();
        this.position.set(0, 0, 1);

        const radius = resolution/2;
        this.outerCamera = new THREE.OrthographicCamera(
            resolution / -2, resolution / 2,
            resolution / 2, resolution / -2,
            1, radius * 2
        );
        this.outerCamera.position.set(0, 0, radius * 2);
        this.outerCamera.zoom = 1;
        this.outerCamera.updateProjectionMatrix();

        this.outerScene = new THREE.Scene();

        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(resolution);
        cubeRenderTarget.texture.flipY = true;
        cubeRenderTarget.texture.type = THREE.HalfFloatType;
        //cubeRenderTarget.texture.isRenderTargetTexture = false;

        this.cubeCamera = new THREE.CubeCamera(0.01, 1000, cubeRenderTarget);

        const sphereMaterial = new THREE.MeshBasicMaterial({
            envMap: cubeRenderTarget.texture
        });

        const sphereGeometry = new THREE.IcosahedronGeometry(radius, detail);
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.outerScene.add(sphere);
    }

    update(renderer, scene) {
        this.cubeCamera.update(renderer, scene);

        // Apply camera position and rotation, flip the Y axis
        this.matrixWorld.decompose(t, r, s);
        this.cubeCamera.position.copy(t);
        this.cubeCamera.quaternion.setFromEuler(e).premultiply(r);
    }
}

export {FisheyeCamera};