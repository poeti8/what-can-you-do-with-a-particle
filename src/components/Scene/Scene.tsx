import { useEffect } from "react";

import useStore, { Stage } from "../../store";
import Particles from "../Particles";
import FBO from "../FBO";
import { OrbitControls } from "@react-three/drei";

const Scene = () => {
  const setStage = useStore(store => store.setStage);

  // start the first stage
  useEffect(() => {
    setStage(Stage.OneParticle);
  }, []);

  return (
    <>
      <color args={["#021119"]} attach="background" />

      <Particles />
      <FBO />
    </>
  );
};

export default Scene;
