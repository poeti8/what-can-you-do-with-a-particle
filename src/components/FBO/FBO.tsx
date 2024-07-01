import { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import useStore from "../../store";

const FBO = () => {
  const meshRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null!);
  const fbo = useStore(store => store.fboRef.current);
  
  // set width and height for texture that is being going to be rendered by the fbo
  // the amount of vertices is equal to width x height (1000 x 1000 = 1,000,000)
  const [width, height] = useMemo(() => [1000, 1000], []);

  // create FBO (frame-buffer object) to render positions and velocities as texture to GPU
  // then do the calculation on the GPU and get back new positions and velocities as texture
  useEffect(() => {
    fbo.positions.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
    fbo.positions.renderTarget2 = fbo.positions.renderTarget?.clone();

    fbo.velocities.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
    fbo.velocities.renderTarget2 = fbo.velocities.renderTarget?.clone();
    
    fbo.mesh = meshRef.current;

    return () => {
      fbo.positions.renderTarget?.dispose();
      fbo.positions.renderTarget2?.dispose();
      fbo.velocities.renderTarget?.dispose();
      fbo.velocities.renderTarget2?.dispose();
    }
  }, []);

  // the fbo needs its own scene and camera
  // use orthographic camera, because a perspective camera might render a texture 
  // that its pixels are not square or don't have the same width or height
  const scene = useMemo(() => new THREE.Scene(), []);
  const camera = useMemo(() => {
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1);
  }, []);

  const checkIsInitialized = useCallback(() => {
    if (!fbo.positions.vertexShader) return false;
    if (!fbo.positions.fragmentShader) return false;
    if (!fbo.velocities.vertexShader) return false;
    if (!fbo.velocities.fragmentShader) return false;
    if (!fbo.mesh?.material.uniforms.uPositionsTexture?.value) return false;
    if (!fbo.mesh?.material.uniforms.uVelocitiesTexture?.value) return false;
    return true;
  }, []);

  useFrame((state, delta) => {
    if (!checkIsInitialized()) return;

    // set delta time uniform value
    fbo.mesh!.material.uniforms.uDeltaTime.value = delta;
    fbo.mesh!.material.uniforms.uTime.value = state.clock.getElapsedTime();

    // swap render targets
    // renderTarget2 would be the current data grabbed from the renderTarget
    // renderTarget would be the previous renderTarget acting as an empty render target to save new data on the next frame
    const temp = fbo.velocities.renderTarget;
    fbo.velocities.renderTarget = fbo.velocities.renderTarget2;
    fbo.velocities.renderTarget2 = temp;

    // render velocity texture using renderTarget
    fbo.mesh!.material.vertexShader = fbo.velocities.vertexShader!;
    fbo.mesh!.material.fragmentShader = fbo.velocities.fragmentShader!;
    fbo.mesh!.material.needsUpdate = true;
    // @ts-ignore
    state.gl.setRenderTarget(fbo.velocities.renderTarget!);
    state.gl.clear();
    state.gl.render(scene, camera);

    // the texture is now the current velocities
    // save it as uniform to be used by the shaders
    fbo.mesh!.material.uniforms.uVelocitiesTexture.value = fbo.velocities.renderTarget!.texture;

    // everything goes as the same for the positions
    const temp2 = fbo.positions.renderTarget;
    fbo.positions.renderTarget = fbo.positions.renderTarget2;
    fbo.positions.renderTarget2 = temp2;

    fbo.mesh!.material.vertexShader = fbo.positions.vertexShader!;
    fbo.mesh!.material.fragmentShader = fbo.positions.fragmentShader!;
    fbo.mesh!.material.needsUpdate = true;
    // @ts-ignore
    state.gl.setRenderTarget(fbo.positions.renderTarget!);
    state.gl.clear();
    state.gl.render(scene, camera);

    fbo.mesh!.material.uniforms.uPositionsTexture.value = fbo.positions.renderTarget!.texture;
    
    // make sure to reset the render target
    // because outside of this component we want to actullay render our scene
    state.gl.setRenderTarget(null);
  });
  
  // a square plane geometry for the mesh
  const attributes = useMemo(() => {
    const geometry = new Float32Array([
      -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
    ]);
    return { geometry }
  }, []);

  // uniforms for the fbo shader
  // set the data to undefined to fill it later
  const unifroms = useMemo(() => ({
    uResolution: { value: new THREE.Vector2(width, height) },
    uPositionsTexture: { value: null },
    uVelocitiesTexture: { value: null },
    uMass: { value: 10 },
    uBlackholeMass: { value: 1000 },
    uG: { value: 25 },
    uDeltaTime: { value: 0 },
    uTime: { value: 0 },
  }), []);
  
  return createPortal(
      (
        <>
          <mesh ref={meshRef}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" array={attributes.geometry} count={attributes.geometry.length / 3} itemSize={3} />
            </bufferGeometry>
            <shaderMaterial uniforms={unifroms} />
          </mesh>
        </>
      ), 
      scene, 
      { camera }
    );
}

export default FBO;