import noise from "../../shaders/noise";

export const vertexShader = `
  attribute vec3 velocity;
  attribute vec3 aColor;
  attribute float aCurl;

  uniform float uScale;
  uniform float uPointSize;
  uniform float uTime;
  uniform float uProgressZ;
  uniform float uBlow;

  varying vec3 vPosition;
  varying vec3 vColor;

  ${noise}

  void main() {
    vec3 pos = position;

    pos *= uScale;

    // to get move the particles without looking stiff i apply
    // additional wavy movements with the curl noise
    pos -= curlNoise(pos * aCurl) * 0.1;

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
    gl_PointSize = uPointSize;
    vColor = aColor;
    vPosition = pos;
  }
`;

export const fragmentShader = `
  uniform float uProgressZ;
  uniform float uAlpha;

  varying vec3 vPosition;
  varying vec3 vColor;

  void main() {
    vec3 color = vec3(0.8, 0.8, 0.8);

    // reduce the brightness of the red and the blue colors
    color += step(0.9, vColor.b - vColor.r) * vec3(-0.25, -0.25, 0.1);       
    color += step(0.9, vColor.r - vColor.b) * vec3(0.1, -0.25, -0.25);  

    float alpha = vPosition.z - 0.5;
    alpha += uProgressZ;
    alpha = clamp(alpha, 0.0, 1.0);
    alpha *= uAlpha;

    gl_FragColor = vec4(color, alpha);
  }
`;