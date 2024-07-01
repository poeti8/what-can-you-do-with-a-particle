import { useEffect, useRef } from "react";
import gsap from "gsap";

import { fragmentShader, vertexShader } from "./sphereAndSpinningTopShaders";
import { showParticleCount } from "../../utils";
import useStore, { Stage } from "../../store";

function useSphereAndSpinningTop() {
  const stage = useStore(store => store.stage);
  const setStage = useStore(store => store.setStage);
  const particles = useStore(store => store.particlesRef.current);
  const isStageDone = useRef(false);

  useEffect(() => {
    if (!particles) return;
    if (stage !== Stage.SphereAndSpinningTop) return;

    const material = particles.material;
    const positionAttribute = particles.geometry.attributes.position;

    // draw 10,000 particles (out of 1,000,000)
    // draw 2,000 particles first for the sphere
    const COUNT = 10_000;
    const SPHERE_COUNT = 2000;
    particles.geometry.setDrawRange(0, SPHERE_COUNT); // [start, count]

    // initialize material for the sphere and spinning top stage
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
        if (progress >= 0.75 && isStageDone.current !== true) {
          isStageDone.current = true;
          setStage(Stage.Image);
          setTimeout(() => {
            const animations = timeline.getChildren();
            animations.forEach((animation) => {
              animation.kill();
            });
          }, 500);
        }
      }
    });

    // sphere geometry
    const spherePositions = new Float32Array(SPHERE_COUNT * 3);
    for (let i = 0; i < SPHERE_COUNT; i++) {
      const i3 = i * 3;
      const r = 1.3;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      spherePositions[i3 + 0] = r * Math.cos(phi) * Math.cos(theta);
      spherePositions[i3 + 1] = r * Math.cos(phi) * Math.sin(theta);
      spherePositions[i3 + 2] = r * Math.sin(phi);
    }

    // change the shape to sphere
    timeline.to(positionAttribute.array, {
      // @ts-ignore
      endArray: spherePositions,
      duration: 1,
      onUpdate: () => {
        positionAttribute.needsUpdate = true;
      }
    });

    const count = { value: 512 };
    timeline.to(count, {
      value: SPHERE_COUNT,
      duration: 0.75,
      onUpdate() {
        showParticleCount(count.value);
      }
    }, "<");

    // update particles size as the shape is a-changin'
    timeline.to(material.uniforms.uPointSize, {
      value: 4,
      duration: 1,
    }, "<");

    // rotate the sphere
    timeline.to(particles.rotation, {
      x: -2.5,
      y: -0.5, 
      z: -1,
      duration: 2,
    }, "<");

    // spinning top geometry
    const spinningTopPositions = new Float32Array(COUNT * 3);
    function calculateRadius(m: number, n1: number, n2: number, n3: number, a: number, b: number, theta: number) {
      return Math.pow(
        Math.pow(Math.abs(1 / a * Math.cos(m * theta / 4)), n2) +
        Math.pow(Math.abs(1 / b * Math.sin(m * theta / 4)), n3),
        -1 / n1
      );
    }
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;    
      const theta = ((Math.random() - 0.5) * 2) * Math.PI;
      const phi = (Math.random() - 0.5) * Math.PI;    
      const r = 1.1;
      const r1 = calculateRadius(4, 2, 1, 1, 1.5, 1.5, theta);
      const r2 = calculateRadius(4, 0.4, 0.8, 0.9, 1, 1, phi);      
      spinningTopPositions[i3 + 0] = r * r1 * Math.cos(theta) * r2 * Math.cos(phi);
      spinningTopPositions[i3 + 1] = r * r1 * Math.sin(theta) * r2 * Math.cos(phi);
      spinningTopPositions[i3 + 2] = r * r2 * Math.sin(phi);
    }

    // move sphere up a bit
    timeline.to(particles.position, {
      y: 1, 
      duration: 1,
    }, "<50%");

    // change the shape into spinning top
    // @ts-ignore
    timeline.to(positionAttribute.array, {
      endArray: spinningTopPositions,
      duration: 1,
      onUpdate: () => {
        // increase the draw count since it's moving from
        // drawing the sphere (2,000 particles) to drawing the spinning top (10,000 particles)
        if (particles.geometry.drawRange.count !== COUNT) {
          // draw 10,000 particles (out of 1,000,000)
          particles.geometry.setDrawRange(0, COUNT);
        }
        
        positionAttribute.needsUpdate = true;
      }
    }, "<20%");

    // update the particles count text
    timeline.to(count, {
      value: COUNT,
      duration: 1,
      onUpdate() {
        showParticleCount(count.value);
      }
    }, "<");

    // change the size of particles as the shape is a-changin'
    timeline.to(material.uniforms.uPointSize, {
      value: 2,
      duration: 1,
    }, "<");

    // transition the spinning top from up to down to have "dropping" effect
    timeline.to(particles.position, {
      y: 0, 
      duration: 1,
      ease: "bounce.out",
    }, "<10%");

    // rotate the spinning top
    timeline.to(particles.rotation, {
      x: -2.5,
      y: -1, 
      z: -2.87,
      duration: 0.5,
    }, "<");
    timeline.to(particles.rotation, {
      x: -1.27,
      y: 0.35, 
      z: 17.8,
      duration: 2,
    }, "<55%");

  }, [stage]);
}

export default useSphereAndSpinningTop;