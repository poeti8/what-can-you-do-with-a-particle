import { MutableRefObject, createRef } from "react";
import { create } from "zustand";
import * as THREE from "three";

enum Stage {
  Loading = "Loading",
  OneParticle = "OneParticle",
  LinePlaneAndCube = "LinePlaneAndCube",
  SphereAndSpinningTop = "SphereAndSpinningTop",
  Image = "Image",
  Head = "Head",
  Galaxy = "Galaxy",
}

// particles ref
type ParticlesRef = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null;
const particlesRef = createRef<ParticlesRef>() as MutableRefObject<ParticlesRef>;
particlesRef.current = null;

// ref for pausing and reversing the animations
const pause = createRef<boolean>() as MutableRefObject<boolean>;
const reverse = createRef<boolean>() as MutableRefObject<boolean>;
pause.current = false;
reverse.current = false;

// fbo ref
type FBO = {
  renderTarget: THREE.RenderTarget | null;
  renderTarget2: THREE.RenderTarget | null;
  fragmentShader: string | null;
  vertexShader: string | null;
}
type FBORef = {
  positions: FBO;
  velocities: FBO;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null;
};
const fboRef = createRef<FBORef>() as MutableRefObject<FBORef>;
fboRef.current = { positions: {} as any, velocities: {} as any, mesh: null };

interface State {
  fboRef: MutableRefObject<FBORef>,
  particlesRef: MutableRefObject<ParticlesRef>,
  pause: MutableRefObject<boolean>;
  reverse: MutableRefObject<boolean>;
  setStage: (stage: Stage) => void;
  stage: Stage;
}

const useStore = create<State>((set) => ({
  fboRef,
  particlesRef,
  pause,
  reverse,
  setStage: (stage) => set({ stage }),
  stage: Stage.Loading
}));

export { Stage, type State };
export default useStore;
