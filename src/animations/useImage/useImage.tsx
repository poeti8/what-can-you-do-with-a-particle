import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";

import { fragmentShader, vertexShader } from "./imageShaders";
import { showParticleCount } from "../../utils";
import useStore, { Stage } from "../../store";

import imagePath from "../../../assets/image.jpg";

function useImage() {
  const [image, setImage] = useState<HTMLImageElement>();
  const [imagePositions, setImagePositions] = useState<Float32Array>();
  const [imageColors, setImageColors] = useState<Float32Array>();
  const stage = useStore(store => store.stage);
  const setStage = useStore(store => store.setStage);
  const particles = useStore(store => store.particlesRef.current);
  const camera = useThree(context => context.camera);
  const isStageDone = useRef(false);

  // load the image
  useEffect(() => {
    // if already loaded then skip
    if (image) return;

    const img = new Image();
    img.src = imagePath;
    img.onload = () => { 
      // when the image is loaded create a canvas element
      // and draw the image on the canvas element
      // so i can read the image data, which is the color of each pixel
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      const imageData = ctx!.getImageData(0, 0, img.width, img.height).data;

      const imageLength = img.width * img.height;
      const imagePositions = new Float32Array(imageLength * 3);
      const imageColors = new Float32Array(imageLength * 3);

      // for each pixel on the image set a particle's color and position to that pixel
      for (let i = 0; i < imageLength; i++) {
        const i3 = i * 3;
        const i4 = i * 4;
        const r = imageData[i4 + 0] / 255;
        const g = imageData[i4 + 1] / 255;
        const b = imageData[i4 + 2] / 255;
        imagePositions[i3 + 0] = ((i % img.width) / img.width - 0.5) * 3 * (img.width / img.height);
        imagePositions[i3 + 1] = (1.0 - Math.floor(i / img.width) / img.height - 0.5) * 3;
        imagePositions[i3 + 2] = 0;
        imageColors[i3 + 0] = r;
        imageColors[i3 + 1] = g;
        imageColors[i3 + 2] = b;
      }

      setImagePositions(imagePositions);
      setImageColors(imageColors);
      setImage(img);
    };
  }, [image]);

  useEffect(() => {
    if (!imageColors) return;
    if (!imagePositions) return;
    if (!image) return;
    if (!particles) return;
    if (stage !== Stage.Image) return;

    const material = particles.material;
    const positionAttribute = particles.geometry.attributes.position;
    const colorAttribute = particles.geometry.attributes.aColor;

    // draw 50,000 particles (out of 1,000,000)
    const imageLength = image.width * image.height;
    particles.geometry.setDrawRange(0, imageLength); // [start, count]

    // initialize material for the image stage
    material.uniforms.uDistortion = { value: 0 };
    material.uniforms.uDepthByLuminance = { value: 0 };
    material.uniforms.uNoiseWaveAmpitude = { value: 0 };
    material.uniforms.uAlpha = { value: 1 };
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
        if (progress >= 0.6 && isStageDone.current !== true) {
          isStageDone.current = true;
          const animations = timeline.getChildren();
          animations.forEach((animation) => {
            animation.kill();
          });
          setStage(Stage.Head);
        }
      }
    });
    
    // distort the previous shape
    // using noise inside the shaders
    timeline.to(material.uniforms.uDistortion, {
      value: 1.5,
      duration: 2,
    });

    // update the particles count text
    const count = { value: 10000 };
    timeline.to(count, {
      value: imageLength,
      duration: 1,
      onUpdate() {
        showParticleCount(count.value);
      }
    }, "<");

    // reset particles rotation
    timeline.to(particles.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.5,
    }, "<");

    // move camera farther
    timeline.to(camera.position, {
      z: "+=1.5",
      duration: 1,
      onUpdate: () => {
        camera.lookAt(lookAt);
      }
    }, "<");
    

    // finish distortion
    timeline.to(material.uniforms.uDistortion, {
      value: 0,
      duration: 2,
    }, "<90%");

    // change positions to form an image
    // @ts-ignore
    timeline.to(positionAttribute.array, {
      endArray: imagePositions,
      duration: 1,
      onUpdate: () => {
        positionAttribute.needsUpdate = true;
      }
    }, "<10%");

    // set the particles' color to the colors grabbed from the pixels of the image
    // @ts-ignore
    timeline.to(colorAttribute.array, {
      endArray: imageColors,
      duration: 1,
      onUpdate: () => {
        colorAttribute.needsUpdate = true;
      }
    }, "<30%");

    // smaller particles
    timeline.to(material.uniforms.uPointSize, {
      value: 2,
      duration: 1,
    }, "<");

    // give depth by displacing the particles
    timeline.to(material.uniforms.uDepthByLuminance, {
      value: 0.2,
      duration: 1,
    }, "<");

    // slowly move the particles on wave motion
    timeline.to(material.uniforms.uNoiseWaveAmpitude, {
      value: 0.1,
      duration: 1,
    }, "<");

    // move camera closer to image
    timeline.to(camera.position, {
      z: "-=2",
      duration: 0.5,
      onUpdate: () => {
        camera.lookAt(lookAt);
      }
    }, "<90%");


    // look at the image from the side
    const lookAt = new THREE.Vector3(0, 0, 0);
    timeline.to(camera.position, {
      x: 2.42,
      y: 0.14,
      z: 2.5,
      duration: 1.5,
      ease: "power4.out",
      onUpdate: () => {
        camera.lookAt(lookAt);
      }
    }, "<80%");
    timeline.to(particles.position, {
      x: 0,
      duration: 2,
    }, "<");

    // rotate the image
    timeline.to(particles.rotation, {
      y: -0.5,
      duration: 2,
    }, "<");
    timeline.to(particles.rotation, {
      y: -1,
      duration: 3,
      ease: "linear",
    }, "<65%");

    // go behind the image
    timeline.to(camera.position, {
      x: 1.5,
      y: 0.1,
      z: 1.6,
      duration: 2,
      ease: "linear",
    }, "<");

    timeline.to(material.uniforms.uDepthByLuminance, {
      value: 30,
      ease: "linear",
      duration: 4,
    }, "<0.1");

    // fade out the image
    timeline.to(material.uniforms.uAlpha, {
      value: 0,
      duration: 1.5,
    }, "<");

  }, [image, imageColors, imagePositions, stage]);
}

export default useImage;