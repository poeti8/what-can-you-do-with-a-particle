import { useEffect, useRef } from "react";
import gsap from "gsap";

import { fragmentShader, vertexShader } from "./lineAndPlaneShaders";
import { showParticleCount } from "../../utils";
import useStore, { Stage } from "../../store";

function useLinePlaneAndCube() {
  const stage = useStore(store => store.stage);
  const setStage = useStore(store => store.setStage);
  const particles = useStore(store => store.particlesRef.current);
  const isStageDone = useRef(false);
  
  useEffect(() => {
    if (!particles) return;
    if (stage !== Stage.LinePlaneAndCube) return;

    const material = particles.material;
    const positionAttribute = particles.geometry.attributes.position;

    // draw 512 particles (out of 1,000,000)
    const COUNT_LINE = 8;
    const COUNT_PLANE = COUNT_LINE * COUNT_LINE; // 64
    const COUNT_CUBE = COUNT_LINE * COUNT_PLANE; // 512
    particles.geometry.setDrawRange(0, COUNT_CUBE); // [start, count]

    // intialize material for the line, plane, and cube scene
    material.uniforms.uPointSize = { value: 64 };
    material.vertexShader = vertexShader;
    material.fragmentShader = fragmentShader;
    material.needsUpdate = true;

    
    // create gsap timeline for animations
    const timeline = gsap.timeline({
      ease: "power3.inOut",
      onUpdate: () => {
        // switch to the next stage before the animation is complete to
        // achieve a smoother transition
        const progress = timeline.totalProgress();
        if (progress >= 0.5 && isStageDone.current !== true) {
          isStageDone.current = true;
          setStage(Stage.SphereAndSpinningTop);
          setTimeout(() => {
            const animations = timeline.getChildren();
            animations.forEach((animation) => {
              animation.kill();
            });
          }, 500);
        }
      }
    });

    // spread the particles in line
    const linePositions = new Float32Array(COUNT_CUBE * 3);
    for (let x = 0; x < COUNT_LINE; x++) {
      for (let y = 0; y < COUNT_LINE; y++) {
        for (let z = 0; z < COUNT_LINE; z++) {
          const i = ((z * COUNT_LINE * COUNT_LINE) + (y * COUNT_LINE) + x) * 3;
          linePositions[i + 0] = (x / COUNT_LINE - 0.5) * 6;
          linePositions[i + 1] = 0;
          linePositions[i + 2] = 0;
        }
      }
    }

    timeline.to(positionAttribute.array, {
      // @ts-ignore
      endArray: linePositions,
      duration: 1,
      onUpdate: () => {
        positionAttribute.needsUpdate = true;
      }
    });

    // update the particles count text
    const count = { value: 1 };
    timeline.to(count, {
      value: 8,
      duration: 0.5,
      onUpdate() {
        const value = Math.floor(count.value);
        showParticleCount(value);
        if (value === 2) {
          document.querySelector(".name")!.textContent = "Particles";
        }
      }
    }, "<");

    // change the size of particles as the shape is a-changin'
    timeline.to(material.uniforms.uPointSize, {
      value: 32,
      duration: 1,
    }, "<");

    // spread the particles in plane
    const planePositions = new Float32Array(COUNT_CUBE * 3);
    for (let x = 0; x < COUNT_LINE; x++) {
      for (let y = 0; y < COUNT_LINE; y++) {
        for (let z = 0; z < COUNT_LINE; z++) {
          const i = ((z * COUNT_LINE * COUNT_LINE) + (y * COUNT_LINE) + x) * 3;
          planePositions[i + 0] = (x / COUNT_LINE - 0.5) * 4;
          planePositions[i + 1] = (y / COUNT_LINE - 0.5) * 4;
          planePositions[i + 2] = 0;
        }
      }
    }

    timeline.to(positionAttribute.array, {
      // @ts-ignore
      endArray: planePositions,
      duration: 0.75,
      delay: 0.25,
      onUpdate: () => {
        positionAttribute.needsUpdate = true;
      }
    });

    // update the particles count text
    timeline.to(count, {
      value: 64,
      duration: 0.5,
      onUpdate() {
        showParticleCount(count.value);
      }
    }, "<");

    // change the size of particles as the shape is a-changin'
    timeline.to(material.uniforms.uPointSize, {
      value: 16,
      duration: 0.75,
    }, "<");

    // spread the particles in cube
    const cubePositions = new Float32Array(COUNT_CUBE * 3);
    for (let x = 0; x < COUNT_LINE; x++) {
      for (let y = 0; y < COUNT_LINE; y++) {
        for (let z = 0; z < COUNT_LINE; z++) {
          const i = ((z * COUNT_LINE * COUNT_LINE) + (y * COUNT_LINE) + x) * 3;
          cubePositions[i + 0] = (x / COUNT_LINE - 0.5) * 3;
          cubePositions[i + 1] = (y / COUNT_LINE - 0.5) * 3;
          cubePositions[i + 2] = (z / COUNT_LINE - 0.5) * 3;
        }
      }
    }

    timeline.to(positionAttribute.array, {
      // @ts-ignore
      endArray: cubePositions,
      duration: 1,
      delay: 0.25,
      onUpdate: () => {
        positionAttribute.needsUpdate = true;
      }
    });

    // update the particles count text
    timeline.to(count, {
      value: 512,
      duration: 0.75,
      onUpdate() {
        showParticleCount(count.value);
      }
    }, "<");

    // change the size of particles as the shape is a-changin'
    timeline.to(material.uniforms.uPointSize, {
      value: 8,
      duration: 1,
    }, "<");
    
    // rotate cube
    timeline.to(particles.rotation, {
      x: 0.55, 
      y: -0.9, 
      duration: 1.25,
    }, "<");

    timeline.to(particles.rotation, {
      x: 0.65, 
      y: -1.75,
      duration: 5,
    }, "<30%");

  }, [stage]);
}

export default useLinePlaneAndCube;