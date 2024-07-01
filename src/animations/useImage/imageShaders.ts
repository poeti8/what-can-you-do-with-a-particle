import noise from "../../shaders/noise";

export const vertexShader = `
  attribute vec3 aColor;

  uniform float uPointSize;
  uniform float uTime;
  uniform float uDistortion;
  uniform float uDepthByLuminance;
  uniform float uNoiseWaveAmpitude;

  varying vec3 vColor;

  ${noise}

  void main() {
    vec3 pos = position;

    // distort particles (before image is shown)
    pos += curlNoise(pos * 0.8 + uTime * 0.3) * uDistortion;

    // color is coming from the data grabbed from the image
    vec3 color = aColor;
    
    // animate particles in a wave motion slowly
    color += snoise(vec3(pos.xy * 2.0, uTime * 1.0)) * uNoiseWaveAmpitude;
    
    // displace the z postion based on how bright each particle is
    // brigher particles get closer to the camera
    // this would give the image a 3d looking effect
    float luminance = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
    pos.z += luminance * uDepthByLuminance;
    
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
    gl_PointSize = uPointSize;

    // pass the color to the fragment shader to be used there
    vColor = color;
  }
`;

export const fragmentShader = `
  varying vec3 vColor;
  uniform float uAlpha;

  void main() {
    // use the color calculated and coming from the vertex shader
    vec3 color = vColor;
    color *= 0.92; // decrease brightness a bit
    gl_FragColor = vec4(color, uAlpha);
  }
`;