export const vertexShader = `
  void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
    gl_PointSize = 64.0;
  }
`;

export const fragmentShader = `
  uniform float uCircle;
  uniform float uTriangle;

  #define PI 3.14159265359
  #define TWO_PI 6.28318530718

  vec2 rotate(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    mat2 m = mat2(c, s, -s, c);
    return m * v;
  }
  
  void main() {
    vec2 uv = gl_PointCoord;
    vec3 color = vec3(1.0);
    color *= 0.92; // decrease brightness a bit

    float alpha = 1.0;
    
    // circle shape
    float radius = mix(1.0, 0.5, uCircle);
    vec2 distance = uv - vec2(0.5);
    float circle = 1.0 - step(radius, length(distance));
    alpha = circle;

    // tirangle shape
    vec2 st = uv * 2.0 - 1.0;
    st = rotate(st, PI);
    int N = 3;
    float a = atan(st.x,st.y)+PI;
    float r = TWO_PI/float(N);
    float d = cos(floor(.5+a/r)*r-a)*length(st);
    float triangle = 1.0 - step(0.5, d);

    float shape = 1.0 - step(radius, mix(length(distance), d, uTriangle));

    alpha = shape;

    gl_FragColor = vec4(color, alpha);
  }
`;