import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";

import { showParticleCount } from "../../utils";
import useStore, { Stage } from "../../store";
import * as shaders from "./galaxyShaders";

function useGalaxy() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializingAttempts, setInitializingAttempts] = useState(0);
  const fbo = useStore(store => store.fboRef.current);
  const stage = useStore(store => store.stage);
  const particles = useStore(store => store.particlesRef.current);
  const camera = useThree(context => context.camera);
  
  useFrame(() => {
    if (stage !== Stage.Galaxy) return;

    // on each frame use the position texture rendered by the fbo for the positions
    const uPositionsTexture = fbo.positions.renderTarget?.texture;
    if (uPositionsTexture) {
      particles!.material.uniforms.uPositionsTexture.value = uPositionsTexture;
    };
  });
  
  useEffect(() => {
    if (!particles) return;
    if (isInitialized) return;
    if (stage !== Stage.Galaxy) return;

    // make sure everything is initialized
    if (!fbo.mesh) {
      setInitializingAttempts(state => state + 1);
      return;
    }
    
    const material = particles.material;
    const positionAttribute = particles.geometry.attributes.position;
    const velocityAttribute = particles.geometry.attributes.velocity;

    // draw 1,000,000 particles (out of 1,000,000)
    const WIDTH = 1000;
    const HEIGHT = 1000;
    const COUNT = WIDTH * HEIGHT;
    particles.geometry.setDrawRange(0, COUNT); // [start, count]

    // intialize the material for the galaxy scene
    material.uniforms.uPositionsTexture = { value: null };
    material.uniforms.uPointSize = { value: 1 };
    material.vertexShader = shaders.vertexShader;
    material.fragmentShader = shaders.fragmentShader;
    material.blending = THREE.AdditiveBlending;
    material.needsUpdate = true;

    const positionData = new Float32Array(COUNT * 4);
    const velocityData = new Float32Array(COUNT * 4);
    
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      // position of each pixel on the position texture
      // which will be used to get the actual position
      positionAttribute.array[i3 + 0] = (i % WIDTH) / WIDTH;
      positionAttribute.array[i3 + 1] = i / WIDTH / HEIGHT;
      positionAttribute.array[i3 + 2] = 0;
      velocityAttribute.array[i3 + 0] = 0;
      velocityAttribute.array[i3 + 1] = 0;
      velocityAttribute.array[i3 + 2] = 0;

      // initial position and velocity values for the texture
      // distribute the particles randomly on a circle, but make sure to do it uniformly
      // this prevents from having a high density of particles at the center of the circle
      const u = Math.random() + Math.random();
      const r = 600 * (u > 1 ? 2 - u : u);
      positionData[i4 + 0] = (Math.random() - 0.5) * r;
      positionData[i4 + 1] = (Math.random() - 0.5) * r;
      positionData[i4 + 2] = 0;
      positionData[i4 + 3] = 0;
      // initial velocity to nudge each a little
      const v = new THREE.Vector3(positionData[i4 + 0], positionData[i4 + 1])
        .normalize().applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2).multiplyScalar(0.5);
      velocityData[i4 + 0] = v.x;
      velocityData[i4 + 1] = v.y;
      velocityData[i4 + 2] = 0;
      velocityData[i4 + 3] = 0;
    }

    positionAttribute.needsUpdate = true;
    velocityAttribute.needsUpdate = true;
    
    // initialize fbo (frame-buffer object) to calculate positions and velocities on the gpu
    fbo.positions.vertexShader = shaders.positionsVertexShader;
    fbo.positions.fragmentShader = shaders.positionsFragmentShader;
    fbo.velocities.vertexShader = shaders.velocitiesVertexShader;
    fbo.velocities.fragmentShader = shaders.velocitiesFragmentShader;
    // use current positions and velocities as initial value for the fbo
    fbo.mesh!.material.uniforms.uPositionsTexture.value = new THREE.DataTexture(
      positionData,
      WIDTH, HEIGHT, THREE.RGBAFormat, THREE.FloatType
    );
    fbo.mesh!.material.uniforms.uPositionsTexture.value.needsUpdate = true;
    fbo.mesh!.material.uniforms.uVelocitiesTexture.value = new THREE.DataTexture(
      velocityData,
      WIDTH, HEIGHT, THREE.RGBAFormat, THREE.FloatType
    );
    fbo.mesh!.material.uniforms.uVelocitiesTexture.value.needsUpdate = true;


    // create gsap timeline for animations
    const timeline = gsap.timeline({ ease: "power1.inOut" });
    
    // reset previous camera and particles changes
    particles.rotation.set(0, 0, 0);
    particles.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    camera.position.set(0, 0, -2);

    // update the particles count text
    const count = { value : 250000 };
    timeline.to(count, {
      value: COUNT,
      duration: 3,
      onUpdate() {
        showParticleCount(count.value);
      }
    });

    // move camera to far away
    timeline.to(camera.position, {
      z: 380,
      duration: 4,
      ease: "none"
    }, "<");

    // move camera back to begining
    timeline.to(camera.position, {
      z: 0,
      duration: 5,
      ease: "none"
    });

    // rotate the camera while moving towards the center
    timeline.to(camera.rotation, {
      z: -Math.PI * 2,
      duration: 15,
      ease: "none",
    }, "<");

    // fade out the particles count text
    timeline.to(".text", {
      opacity: 0,
      duration: 1.5,
      onComplete() {
        setTimeout(() => {
          const elm = document.createElement("div");
          elm.classList.add("msg")
          document.body.appendChild(elm);
        }, 10000);
      }
    }, "<3");
    
    setIsInitialized(true);
  }, [stage, isInitialized, initializingAttempts]);
}

export default useGalaxy;