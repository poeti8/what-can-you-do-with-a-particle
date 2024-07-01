export const vertexShader = `
  uniform float uPointSize;

  void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
    gl_PointSize = uPointSize;
  }
`;

export const fragmentShader = `
  void main() {
    vec3 color = vec3(1.0);
    color *= 0.92; // decrease brightness a bit
    gl_FragColor = vec4(color, 1.0);
  }
`;