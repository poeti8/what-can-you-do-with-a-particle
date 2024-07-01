import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

import { fragmentShader, vertexShader } from "./headShaders";
import { lerp, showParticleCount } from "../../utils";
import useStore, { Stage } from "../../store";

import headModelPath from "../../../assets/head.gltf";

// preload the model, might not really be needed
useGLTF.preload(headModelPath);

function useHead() {
  const headModel = useGLTF(headModelPath);
  const reachedLips = useRef<boolean[]>(null!);
  const blowOutPositions = useRef<Float32Array>(null!);
  const isStageDone = useRef(false);
  const [headPositions, setHeadPositions] = useState<Float32Array>();
  const stage = useStore(store => store.stage);
  const setStage = useStore(store => store.setStage);
  const particles = useStore(store => store.particlesRef.current);
  const camera = useThree(context => context.camera);

  // position of where the mouth is
  const mouth = useMemo(() => new THREE.Vector3(0, -0.232, 0.24), []);

  // the blow animation
  // will run once the uBlow progress value is more than zero
  useFrame((_state, delta) => {
    if (!particles) return;
    if (!headPositions) return;
    if (stage !== Stage.Head) return;

    const uBlow = particles.material.uniforms.uBlow?.value;
    if (!uBlow) return;
    
    const count = 250_000;
    const positionAttribute = particles.geometry.attributes.position;
    const velocityAttribute = particles.geometry.attributes.velocity;
    const colorAttribute = particles.geometry.attributes.aColor;
    const curlAttribute = particles.geometry.attributes.aCurl;
    const headPositionsLength = headPositions.length / 3;
    const positions = positionAttribute.array;
    const velocities = velocityAttribute.array;
    const colors = colorAttribute.array;
    const curls = curlAttribute.array;
    // all of 250,000 particles are not used to form the head model
    // so i find the amount here, and i add them when the head blows particles to the current head particles
    const notInHeadYetCount = count - headPositionsLength;
    
    // temp vector used to calculate position
    // created here to avoid created a vector inside the loop for each particle
    // has slight performance improvements nonetheless
    const pos = new THREE.Vector3();
    // use force to move the particles which mean with acceleration and velocity
    const forces = new THREE.Vector3();
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos.x = positions[i3 + 0];
      pos.y = positions[i3 + 1];
      pos.z = positions[i3 + 2];

      // if particle has reached the lips, blow it to the target position
      if (reachedLips.current[i]) {
        const targetX = blowOutPositions.current[i3 + 0];
        const targetY = blowOutPositions.current[i3 + 1];
        const targetZ = blowOutPositions.current[i3 + 2];
        const target = new THREE.Vector3(targetX, targetY, targetZ);
        // use linear interpolation to move the particle closer to the target position on each frame
        // instead of jumping there suddenly
        pos.lerp(target, 0.001);
        positions[i3 + 0] = pos.x;
        positions[i3 + 1] = pos.y;
        positions[i3 + 2] = pos.z;
        // add a bit of curliness to the movement with the curl noise
        curls[i] = lerp(curls[i], 2.5, 0.0025);
        continue;
      }

      // if this is particle is already blowed (passed the lips position) then skip to the next particle
      if (pos.z + 0.5 > uBlow) continue;

      // calculate the force that moves the particle to the lips
      forces.set(0, 0, 0);

      const force = mouth.clone().sub(pos);
      const length = force.length();
      // if pretty close to the mouth set that it has reached the mouth
      // so it will be blowed on the next frame
      if (length < 0.01) {
        if (!reachedLips.current[i]) {
          // randomly add particles out of that 250,000 that were not on the head model
          const randomNotHeadParticleIndex = Math.random() * notInHeadYetCount;
          reachedLips.current[i] = true;
          reachedLips.current[randomNotHeadParticleIndex + headPositionsLength] = true;
          // each particle has 5% chance of getting blue or red when is going to be blowed
          if (Math.random() > 0.95) {
            const blueOrRed = Math.random() > 0.5 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
            colors[i3 + 0] = blueOrRed.x;
            colors[i3 + 1] = blueOrRed.y;
            colors[i3 + 2] = blueOrRed.z;
          }
        }
        continue;
      };
      
      // find the force the pull the particle to the mouth
      // and calculate acceleration and velocity
      // and updated the position based on velocity
      const distanceSquared = Math.max(force.lengthSq(), 0.5);
      force.normalize().multiplyScalar(0.5 / distanceSquared);
      forces.add(force);

      const acceleration = forces.divideScalar(1);

      velocities[i3 + 0] += acceleration.x * delta;
      velocities[i3 + 1] += acceleration.y * delta;
      velocities[i3 + 2] += acceleration.z * delta;
      positions[i3 + 0] += velocities[i3 + 0] * delta;
      positions[i3 + 1] += velocities[i3 + 1] * delta;
      positions[i3 + 2] += velocities[i3 + 2] * delta;
    };

    positionAttribute.needsUpdate = true;
    velocityAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    curlAttribute.needsUpdate = true;
  });

  // get the positions from the head model and
  // normalize the positions to the range of [-0.5, 0.5]
  useEffect(() => {
    // get the positions from the model object
    const modelPositions = (headModel.nodes.obj0 as any).geometry.attributes.position.array;

    // find the minimum and the maximum value for each of x, y, and z
    let xmin = 0;
    let xmax = 0;
    let ymin = 0;
    let ymax = 0;
    let zmin = 0;
    let zmax = 0;
    
    for (let i = 0; i < modelPositions.length; i += 3) {
      const x = modelPositions[i + 0];
      const y = modelPositions[i + 1];
      const z = modelPositions[i + 2];
      if (x < xmin) { xmin = x }
      if (x > xmax) { xmax = x }
      if (y < ymin) { ymin = y }
      if (y > ymax) { ymax = y }
      if (z < zmin) { zmin = z }
      if (z > zmax) { zmax = z }
    }

    // calculate the length for each of x, y, and z
    const xlen = xmax - xmin;
    const ylen = ymax - ymin;
    const zlen = zmax - zmin;
    const max = Math.max(xlen, ylen, zlen);

    // normalize each particle's position
    for (let i = 0; i < modelPositions.length; i += 3) {
      const x = modelPositions[i + 0];
      const y = modelPositions[i + 1];
      const z = modelPositions[i + 2];
      modelPositions[i + 0] = ((x - xmin) / max) - 0.5 * (xlen / ylen);
      modelPositions[i + 1] = (y - ymin) / max - 0.5;
      modelPositions[i + 2] = (z - zmin) / max - 0.5;
    }

    setHeadPositions(modelPositions);

  }, [(headModel.nodes.obj0 as any).geometry]);
  
  // animations
  useEffect(() => {
    if (!particles) return;
    if (!headPositions) return;
    if (stage !== Stage.Head) return;
    
    const material = particles.material;
    const positionAttribute = particles.geometry.attributes.position;
    const colorAttribute = particles.geometry.attributes.aColor;
    const curlAttribute = particles.geometry.attributes.aCurl;
    const headColors = (headModel.nodes.obj0 as any).geometry.attributes.color.array;

    // draw 250,000 particles (out of 1,000,000)
    const COUNT = 250_000;
    particles.geometry.setDrawRange(0, COUNT); // [start, count]

    // set bounding sphere radius to something huge to 
    // make sure that particles are rendered even if they're not visible to the camera
    particles.geometry.boundingSphere!.radius = 1000;

    // intialize the material for the head scene
    material.uniforms.uScale = { value: 2.5 };
    material.uniforms.uAlpha = { value: 0.8 };
    material.uniforms.uPointSize = { value: 1 };
    material.uniforms.uProgressZ = { value: -0.5 };
    material.uniforms.uBlow = { value: 0 };
    material.vertexShader = vertexShader;
    material.fragmentShader = fragmentShader;
    material.needsUpdate = true;
    blowOutPositions.current = new Float32Array(COUNT * 3);
    reachedLips.current = new Array(COUNT).fill(false);
    
    // set geometry
    const headPositionsLength = headPositions.length / 3;
    for (let i = 0; i < headPositionsLength; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      positionAttribute.array[i3 + 0] = headPositions[i3 + 0];
      positionAttribute.array[i3 + 1] = headPositions[i3 + 1];
      positionAttribute.array[i3 + 2] = headPositions[i3 + 2];
      // i had already colored the eyes and the mouth with the blender program
      colorAttribute.array[i3 + 0] = headColors[i4 + 0] / 65535; // divide by 65535 to normalize the 16-bit value
      colorAttribute.array[i3 + 1] = headColors[i4 + 1] / 65535; // divide by 65535 to normalize the 16-bit value
      colorAttribute.array[i3 + 2] = headColors[i4 + 2] / 65535; // divide by 65535 to normalize the 16-bit value
      blowOutPositions.current[i3 + 0] = (Math.random() - 0.5) * 5;
      blowOutPositions.current[i3 + 1] = mouth.y * 2.5 + Math.cos(i) * 7;
      blowOutPositions.current[i3 + 2] = mouth.z * 2.5 + 12 + Math.sin(i) * 4;
      reachedLips.current[i] = false;
      curlAttribute.array[i] = 0.1;
    }

    // particles out of the 250,000 that are not part of the head
    // so i place them at the mouth but do not show
    // i add them to the current particles when the blowing time comes
    for (let i = headPositionsLength; i < COUNT; i++) {
      const i3 = i * 3;
      positionAttribute.array[i3 + 0] = mouth.x;
      positionAttribute.array[i3 + 1] = mouth.y;
      positionAttribute.array[i3 + 2] = mouth.z;
      blowOutPositions.current[i3 + 0] = (Math.random() - 0.5) * 5;
      blowOutPositions.current[i3 + 1] = mouth.y * 2.5 + Math.cos(i) * 7;
      blowOutPositions.current[i3 + 2] = mouth.z * 2.5 + 12 + Math.sin(i) * 4;
      reachedLips.current[i] = false;
      curlAttribute.array[i] = 0.1;
    }

    colorAttribute.needsUpdate = true;
    positionAttribute.needsUpdate = true;

    // create gsap timeline for animations
    const timeline = gsap.timeline({
      ease: "power1.inOut",
      onUpdate: () => {
        // switch to the next stage before the animation is complete to
        // achieve a smoother transition
        const progress = timeline.totalProgress();
        if (progress >= 0.75 && isStageDone.current !== true) {
          isStageDone.current = true;
          const animations = timeline.getChildren();
          animations.forEach((animation) => {
            animation.kill();
          });
          setStage(Stage.Galaxy);
        }
      }
    });
    
    // reset previous camera and particles changes
    particles.position.set(0, 0, 0)
    particles.rotation.set(0, 0, 0)
    camera.position.set(0, 0, 13);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // bring the head into the view
    timeline.to(material.uniforms.uProgressZ, {
      value: 2,
      duration: 6,
    });

    // update the particles count text
    const count = { value : 50000 };
    timeline.to(count, {
      value: COUNT,
      duration: 1,
      onUpdate() {
        showParticleCount(count.value);
      }
    }, "<");
    
    // move camera close to the head very slowly
    timeline.to(camera.position, {
      z: 4,
      y: -0.2,
      duration: 10,
    }, "<");


    // a set of rotation animations for the head
    timeline.to(particles.rotation, {
      y: -0.6,
      duration: 1.1,
    },  "<0.9");

    timeline.to(particles.rotation, {
      x: -0.5,
      duration: 1.1,
    },  "<0.2");

    timeline.to(particles.rotation, {
      y: 0.2,
      duration: 1.1,
    },  "<0.9");

    timeline.to(particles.rotation, {
      x: 0.3,
      duration: 1.2,
    },  "<0.2");

    timeline.to(particles.rotation, {
      x: -0.56,
      duration: 2.2,
    },  "<0.9");

    timeline.to(particles.rotation, {
      y: 0.64,
      duration: 3,
    },  "<");

    timeline.to(particles.rotation, {
      y: 1,
      z: 0.85,
      duration: 8,
    },  "<");

    // start the blowing animation
    // the rest of the animations happens above on the "useFrame" section
    timeline.to(material.uniforms.uBlow, {
      value: 1,
      duration: 5
    },  "<");
    
    // move the camera to follow blowed particles
    timeline.to(camera.position, {
      x: 6,
      z: 2,
      y: 1,
      duration: 7,
      ease: "power1.inOut", 
    }, "<1");
    
    // fade out the particles on exit
    timeline.to(material.uniforms.uAlpha, {
      value: 0,
      duration: 2
    },  "<2.5");

  }, [stage, headPositions]);
}

export default useHead;