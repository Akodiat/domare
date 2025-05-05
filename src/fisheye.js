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

        this.setResolution(resolution);
    }

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

    update(renderer, scene) {
        this.cubeCamera.update(renderer, scene);

        // Apply camera position and rotation, flip the Y axis
        this.matrixWorld.decompose(t, r, s);
        this.cubeCamera.position.copy(t);
        this.cubeCamera.quaternion.setFromEuler(e).premultiply(r);
    }
}

export {FisheyeCamera};