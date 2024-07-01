import { useEffect } from "react";
import gsap from "gsap";

import { fragmentShader, vertexShader } from "./oneParrticleShaders";
import useStore, { Stage } from "../../store";
import { wait } from "../../utils";

function useOneParticle() {
  const stage = useStore(store => store.stage);
  const setStage = useStore(store => store.setStage);
  const particles = useStore(store => store.particlesRef.current);
  
  useEffect(() => {
    if (!particles) return;
    if (stage !== Stage.OneParticle) return;

    const material = particles.material;
    const positionAttribute = particles.geometry.attributes.position;

    // draw only 1 particle (out of 1,000,000)
    particles.geometry.setDrawRange(0, 1); // [start, count]

    // set the starting position to the outside of view
    positionAttribute.setXYZ(0, 0, -5, 0); // [index, x, y, z]
    positionAttribute.needsUpdate = true;

    // intialize material for the one particle scene
    material.vertexShader = vertexShader;
    material.fragmentShader = fragmentShader;
    material.uniforms.uCircle = { value: 0 };
    material.uniforms.uTriangle = { value: 0 };
    material.needsUpdate = true;
    
    // create gsap timeline for animations
    const timeline = gsap.timeline({
      ease: "power3.inOut", 
      onComplete: () => {
        wait(500).then(() => {
          setStage(Stage.LinePlaneAndCube);
        });
      } 
    });

    // animate the 1 particle into the view
    const endPosition = [0, 0, 0];
    timeline.to(positionAttribute.array, {
      endArray: endPosition,
      duration: 1.5,
      onUpdate: () => {
        positionAttribute.needsUpdate = true;
      }
    });

    // animate the particle count text into the view
    gsap.set(".text", { y: 100 });
    
    timeline.to(".text", {
      y: 0,
      opacity: 0.9,
      duration: 1,
    }, "<0.5");

    // change the shape of the particle
    timeline.to(material.uniforms.uCircle, {
      value: 1,
      duration: 0.5,
      delay: 0.5,
    });
    timeline.to(material.uniforms.uTriangle, {
      value: 1,
      duration: 0.5,
      delay: 0.3,
    });
    timeline.to(material.uniforms.uCircle, {
      value: 0,
      duration: 0.4,
      delay: 0.3,
    });
    timeline.to(material.uniforms.uTriangle, {
      value: 0,
      duration: 0.4,
    }, "<");

  }, [stage]);
}

export default useOneParticle;