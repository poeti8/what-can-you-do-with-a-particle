import { Canvas } from "@react-three/fiber";

import Scene from "./components/Scene";
import Text from "./components/Text";

const App = () => {
  return (
    <>
      {/* Three.js scene */}
      <Canvas id="webgl" camera={{ fov: 45, position: [0, 0, 10], near: 0.0001, far: 500 }}>
        <Scene />
      </Canvas>

      {/* HTML text that displays particle count */}
      <Text />
    </>
  );
};

export default App;
