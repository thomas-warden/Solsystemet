import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { SceneHost } from './lib/scene-host.js';

// These materials describe Earth. They are not a generic renderer for other subjects.
const vertex = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const surfaceFragment = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D cloudMap;
  uniform vec3 sunDirection;
  uniform float cloudAmount;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float sunlight = dot(normal, sunDirection);
    vec3 surface = texture2D(dayMap, vUv).rgb;
    float ocean = (1.0 - smoothstep(0.001, 0.015, surface.r)) *
      smoothstep(0.0005, 0.004, surface.b - surface.r);
    surface = mix(surface, vec3(0.004, 0.022, 0.052), ocean * 0.88);
    float clouds = texture2D(cloudMap, vUv + vec2(-0.002, 0.001)).r;
    float shadow = 1.0 - pow(clouds, 1.4) * cloudAmount * 0.23;
    vec3 color = surface * (vec3(0.009, 0.016, 0.023) +
      vec3(1.42, 1.36, 1.25) * max(sunlight, 0.0) * shadow);
    // A restrained color-derived water mask suggests reflection; no height map is implied.
    float water = smoothstep(0.012, 0.08, surface.b - surface.r) *
      (1.0 - smoothstep(0.12, 0.3, surface.g));
    vec3 halfDirection = normalize(sunDirection + viewDirection);
    float glint = pow(max(dot(normal, halfDirection), 0.0), 150.0);
    color += vec3(0.42, 0.51, 0.56) * glint * water * max(sunlight, 0.0);
    float darkness = 1.0 - smoothstep(-0.17, 0.08, sunlight);
    color += texture2D(nightMap, vUv).rgb * darkness * 1.25;
    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 4.0);
    color += vec3(0.05, 0.19, 0.29) * rim * smoothstep(-0.16, 0.4, sunlight) * 0.5;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const cloudFragment = `
  uniform sampler2D cloudMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    float density = pow(texture2D(cloudMap, vUv).r, 1.15);
    float sunlight = dot(normalize(vWorldNormal), sunDirection);
    vec3 color = vec3(0.91, 0.96, 1.0) * (0.025 + 1.12 * max(sunlight, 0.0));
    gl_FragColor = vec4(color, density * 0.93);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const atmosphereFragment = `
  uniform vec3 sunDirection;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float rim = pow(1.0 - abs(dot(normal, viewDirection)), 3.0);
    float light = smoothstep(-0.3, 0.45, dot(normal, sunDirection));
    gl_FragColor = vec4(vec3(0.11, 0.37, 0.57), rim * (0.04 + light * 0.49));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class EarthScene {
  constructor(canvas, { onStateChange = () => {}, onError = () => {} } = {}) {
    this.canvas = canvas;
    this.disposed = false;
    this.textures = [];
    this.abort = new AbortController();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.5 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.debug.onShaderError = () => { throw new Error('The Earth material could not render.'); };
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    this.camera.position.set(0, 0.12, 4);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.65;
    this.controls.minDistance = 2.45;
    this.controls.maxDistance = 8;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = Math.PI - 0.12;
    this.world = new THREE.Group();
    this.world.rotation.set(0, -1.92, 0.12);
    this.scene.add(this.world);
    this.geometry = new THREE.SphereGeometry(1, 128, 80);
    this.sunDirection = new THREE.Vector3();
    this.setSunlight(-48);

    this.host = new SceneHost({
      element: canvas,
      update: context => this.update(context),
      render: () => this.renderer.render(this.scene, this.camera),
      onStateChange,
      onError,
      onMotionPreferenceChange: reduced => {
        this.controls.enableDamping = !reduced;
        this.controls.update();
      },
    });
    this.controls.enableDamping = !this.host.state.reducedMotion;
    this.controls.addEventListener('change', () => this.host.invalidate());
    this.controls.addEventListener('start', () => this.host.setHeld(true));
    this.controls.addEventListener('end', () => this.host.setHeld(false));
    this.onKey = event => this.keyboard(event);
    canvas.addEventListener('keydown', this.onKey);
    this.onContextLost = event => {
      event.preventDefault();
      this.host.leave();
      onError(new Error('The interactive view lost its graphics connection.'));
    };
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize(true);
  }

  async texture(path, width, height, colorSpace) {
    const response = await fetch(path, { signal: this.abort.signal });
    if (!response.ok) throw new Error('An Earth image could not load.');
    const limit = Math.min(4096, this.renderer.capabilities.maxTextureSize,
      matchMedia('(max-width: 680px)').matches ? 2048 : 4096);
    const factor = Math.min(1, limit / width);
    const bitmap = await createImageBitmap(await response.blob(), {
      imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none',
      resizeWidth: Math.round(width * factor), resizeHeight: Math.round(height * factor), resizeQuality: 'high',
    });
    if (this.disposed) { bitmap.close(); throw new DOMException('Scene closed', 'AbortError'); }
    const texture = new THREE.Texture(bitmap);
    texture.flipY = false;
    texture.colorSpace = colorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    this.textures.push(texture);
    return texture;
  }

  async load() {
    const timeout = setTimeout(() => this.abort.abort(), 20000);
    try {
      const [day, clouds, night] = await Promise.all([
        this.texture('./assets/earth-day.jpg', 5400, 2700, THREE.SRGBColorSpace),
        this.texture('./assets/earth-clouds.jpg', 2048, 1024, THREE.NoColorSpace),
        this.texture('./assets/earth-night.jpg', 4096, 2048, THREE.SRGBColorSpace),
      ]);
      if (this.disposed) return;
      this.surface = new THREE.Mesh(this.geometry, new THREE.ShaderMaterial({
        vertexShader: vertex, fragmentShader: surfaceFragment,
        uniforms: { dayMap: { value: day }, nightMap: { value: night }, cloudMap: { value: clouds },
          sunDirection: { value: this.sunDirection }, cloudAmount: { value: 1 } },
      }));
      this.clouds = new THREE.Mesh(this.geometry, new THREE.ShaderMaterial({
        vertexShader: vertex, fragmentShader: cloudFragment, transparent: true, depthWrite: false,
        uniforms: { cloudMap: { value: clouds }, sunDirection: { value: this.sunDirection } },
      }));
      this.clouds.scale.setScalar(1.006);
      this.atmosphere = new THREE.Mesh(this.geometry, new THREE.ShaderMaterial({
        vertexShader: vertex, fragmentShader: atmosphereFragment, transparent: true, depthWrite: false,
        side: THREE.BackSide, blending: THREE.AdditiveBlending,
        uniforms: { sunDirection: { value: this.sunDirection } },
      }));
      this.atmosphere.scale.setScalar(1.018);
      this.world.add(this.surface, this.clouds, this.atmosphere);
      this.controls.update();
      // Compile and upload once before declaring the view ready.
      this.renderer.render(this.scene, this.camera);
      this.host.enter();
    } finally { clearTimeout(timeout); }
  }

  update({ dt, running, reducedMotion }) {
    if (running && dt) {
      this.world.rotation.y += dt * 0.025;
      this.clouds.rotation.y += dt * 0.0015;
    }
    // A restarted scheduler begins at dt=0. Keep controls responsive to the
    // next pointer event even when the paused scene has no further frames.
    this.controls.dampingFactor = reducedMotion ? 1 : 1 - Math.exp(-(dt || 1 / 60) * 8);
    const cameraChanged = this.controls.update();
    return { changed: (running && dt > 0) || cameraChanged, needsFrame: cameraChanged && this.controls.enableDamping };
  }

  setSunlight(degrees) {
    const angle = THREE.MathUtils.degToRad(degrees);
    this.sunDirection.set(Math.sin(angle), 0.18, Math.cos(angle)).normalize();
    this.host?.invalidate();
  }

  setClouds(visible) {
    this.clouds.visible = visible;
    this.surface.material.uniforms.cloudAmount.value = visible ? 1 : 0;
    this.host.invalidate();
  }

  fitDistance() { return 1.2 / (Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * Math.min(1, this.camera.aspect)); }

  resize(initial = false) {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (!rect.width || !rect.height || this.disposed) return;
    const oldFit = this.fitDistance();
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height, false);
    if (initial) this.camera.position.set(0, 0.12, this.fitDistance());
    else this.camera.position.multiplyScalar(this.fitDistance() / oldFit);
    this.controls.update();
    this.host?.invalidate();
  }

  zoom(factor) {
    this.camera.position.setLength(THREE.MathUtils.clamp(this.camera.position.length() * factor, this.controls.minDistance, this.controls.maxDistance));
    this.controls.update(); this.host.invalidate();
  }

  keyboard(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) return;
    event.preventDefault();
    if (['+', '='].includes(event.key)) return this.zoom(0.86);
    if (event.key === '-') return this.zoom(1 / 0.86);
    const position = new THREE.Spherical().setFromVector3(this.camera.position);
    if (event.key === 'ArrowLeft') position.theta -= 0.1;
    if (event.key === 'ArrowRight') position.theta += 0.1;
    if (event.key === 'ArrowUp') position.phi = Math.max(0.12, position.phi - 0.1);
    if (event.key === 'ArrowDown') position.phi = Math.min(Math.PI - 0.12, position.phi + 0.1);
    this.camera.position.setFromSpherical(position);
    this.controls.update(); this.host.invalidate();
  }

  reset() {
    this.world.rotation.set(0, -1.92, 0.12);
    this.clouds.rotation.y = 0;
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 0.12, this.fitDistance());
    this.controls.update(); this.setSunlight(-48); this.setClouds(true);
    this.host.enter({ resetTime: true });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    this.host.destroy();
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('keydown', this.onKey);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.controls.dispose();
    this.geometry.dispose();
    for (const mesh of [this.surface, this.clouds, this.atmosphere]) mesh?.material.dispose();
    for (const texture of this.textures) { texture.dispose(); texture.image.close(); }
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.scene.clear();
  }
}
