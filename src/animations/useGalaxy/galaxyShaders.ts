// use positions texture rendered by frame-buffer object (fbo)
// to use as current position for the particles 
export const vertexShader = `
  uniform sampler2D uPositionsTexture;
  uniform float uPointSize;

  void main() {
    vec2 locationOnTexture = position.xy;
    vec4 pos = texture2D(uPositionsTexture, locationOnTexture);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos.xyz, 1.0);
    gl_PointSize = uPointSize;
  }
`;

export const fragmentShader = `
  void main() {
    vec3 color = vec3(1.0);
    gl_FragColor = vec4(color, 0.3);
  }
`;

// positions texture rendred by frame-buffer object (fbo)
// uses velocities texture to update itself
export const positionsVertexShader = `
  void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

export const positionsFragmentShader = `
  uniform sampler2D uPositionsTexture;
  uniform sampler2D uVelocitiesTexture;
  uniform vec2 uResolution;
  uniform float uDeltaTime;

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec3 position = texture2D(uPositionsTexture, uv).rgb;
    vec4 velocity = texture2D(uVelocitiesTexture, uv).rgba;

    position += velocity.xyz * uDeltaTime;
    
    gl_FragColor = vec4(position, 1.0);
  }
`;

// velocities texture rendred by frame-buffer object (fbo)
// uses current positions texture to calculate velocity
export const velocitiesVertexShader = `
  void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

export const velocitiesFragmentShader = `
  uniform sampler2D uPositionsTexture;
  uniform sampler2D uVelocitiesTexture;
  uniform vec2 uResolution;
  uniform float uMass;
  uniform float uBlackholeMass;
  uniform float uG;
  uniform float uDeltaTime;
  uniform float uTime;

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec3 position = texture2D(uPositionsTexture, uv).rgb;
    vec3 velocity = texture2D(uVelocitiesTexture, uv).rgb;
    
    vec3 distance = vec3(0.0) - position;
    float distanceSquared = clamp(dot(distance, distance), 100000.0, 1000000000000.0);
    vec3 force = uG * normalize(distance) * ((uBlackholeMass * uMass) / distanceSquared);
    
    vec3 acceleration = force / uMass;
    velocity += acceleration * uDeltaTime;

    gl_FragColor = vec4(velocity, 1.0);
  }
`;