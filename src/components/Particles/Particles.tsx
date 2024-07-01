import { useFrame } from "@react-three/fiber";
import { useMemo } from "react"

import * as animations from "../../animations";
import useStore from "../../store";


const Particles = () => {
  const particlesRef = useStore(store => store.particlesRef);
  
  // initialize particles list
  const COUNT = useMemo(() => 1_000_000, []); 
  
  // initialize attributes and their default values
  const attributes = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const curl = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      positions[i3 + 0] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      velocities[i3 + 0] = 0;
      velocities[i3 + 1] = 0;
      velocities[i3 + 2] = 0;
      colors[i3 + 0] = 1;
      colors[i3 + 1] = 1;
      colors[i3 + 2] = 1;
      curl[i] = 0;
    }
    
    return { colors, curl, positions, velocities };
  }, [COUNT]);

  // initial uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  
  // set the time uniform on each frame
  useFrame((state) => {
    if (!particlesRef.current) return;
    particlesRef.current.material.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  // animations
  animations.useOneParticle();
  animations.useLinePlaneAndCube();
  animations.useSphereAndMath();
  animations.useImage();
  animations.useHead();
  animations.useGalaxy();

  return useMemo(() => (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={attributes.positions} count={COUNT} itemSize={3} />
        <bufferAttribute attach="attributes-velocity" array={attributes.velocities} count={COUNT} itemSize={3} />
        <bufferAttribute attach="attributes-aColor" array={attributes.colors} count={COUNT} itemSize={3} />
        <bufferAttribute attach="attributes-aCurl" array={attributes.curl} count={COUNT} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial uniforms={uniforms} transparent />
    </points>
  ), [])
}
 
export default Particles;