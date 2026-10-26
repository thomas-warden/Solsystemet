#!/usr/bin/env node
// Render the static explanatory globes from the exhibit's credited surface maps.
// Run with the repository served over HTTP, e.g. BASE_URL=http://127.0.0.1:8140/ node scripts/render-tide-illustrations.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'assets/tides');
const base = process.env.BASE_URL || 'http://127.0.0.1:8140/';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_BIN || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/__tide-illustrations.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Tide illustration render</title>' }));
    await page.goto(new URL('__tide-illustrations.html', base).href);
    const illustrations = await page.evaluate(async () => {
      const THREE = await import('./vendor/three.module.js');
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      const scene = new THREE.Scene();
      // Body diameter = 1 / 1.11 = 90.0901% of the tile. Keep this framing
      // explicit so authored SVG ocean outlines align with the solid surface.
      const camera = new THREE.OrthographicCamera(-1.11, 1.11, 1.11, -1.11, .1, 20);
      camera.position.set(0, 0, 4);
      const light = new THREE.DirectionalLight(0xffedcf, 2.9);
      light.position.set(-4, 3, 6);
      scene.add(light, new THREE.AmbientLight(0x8797a7, .38));
      const geometry = new THREE.SphereGeometry(1, 192, 128);
      const loader = new THREE.TextureLoader();
      const load = async (file, colorSpace = THREE.SRGBColorSpace) => {
        const texture = await loader.loadAsync(file);
        texture.colorSpace = colorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return texture;
      };
      const result = {};
      for (const [name, size, file] of [['earth', 768, 'assets/research/earth-nasa-5400.jpg'], ['moon', 384, 'assets/research/moons/moon.jpg']]) {
        renderer.setSize(size, size, false);
        const material = new THREE.MeshStandardMaterial({ map: await load(file), roughness: 1 });
        const globe = new THREE.Mesh(geometry, material);
        // Three's cylindrical map projection: this longitude centres Africa.
        globe.rotation.y = name === 'earth' ? -1.85 : -Math.PI / 2;
        globe.rotation.x = name === 'earth' ? .12 : 0;
        scene.add(globe);
        if (name === 'earth') {
          material.onBeforeCompile = shader => {
            shader.fragmentShader = shader.fragmentShader
              .replace('#include <map_fragment>', `#include <map_fragment>
                float earthWater=(1.-smoothstep(.0003,.008,diffuseColor.r))*smoothstep(.0001,.001,diffuseColor.b-diffuseColor.r);
                diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.004,.025,.060),earthWater*.9);`)
              .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
                roughnessFactor=mix(roughnessFactor,.35,earthWater);`)
              .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
                material.specularColor*=mix(1.,.5,earthWater);`);
          };
          const clouds = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff,
            alphaMap: await load('assets/research/earth-clouds-4k.jpg', THREE.NoColorSpace),
            transparent: true, opacity: .92, depthWrite: false, roughness: 1 }));
          clouds.scale.setScalar(1.007);
          globe.add(clouds);
          const atmosphere = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, side: THREE.BackSide,
            uniforms: { sun: { value: light.position.clone().normalize() } },
            vertexShader: `varying vec3 worldNormal; varying vec3 worldPosition;
              void main(){ vec4 world=modelMatrix*vec4(position,1.); worldPosition=world.xyz;
                worldNormal=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*world; }`,
            fragmentShader: `uniform vec3 sun; varying vec3 worldNormal; varying vec3 worldPosition;
              void main(){ vec3 normal=normalize(worldNormal),view=normalize(cameraPosition-worldPosition);
                float rim=pow(1.-abs(dot(normal,view)),3.5);
                float lit=smoothstep(-.12,.4,dot(normal,sun));
                gl_FragColor=vec4(vec3(.10,.27,.50),rim*lit*.28);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
              }`
          }));
          atmosphere.scale.setScalar(1.018);
          globe.add(atmosphere);
        }
        renderer.render(scene, camera);
        result[name] = renderer.domElement.toDataURL('image/webp', .92);
        globe.traverse(object => { if (object.material) { object.material.map?.dispose(); object.material.alphaMap?.dispose(); object.material.dispose(); } });
        scene.remove(globe);
      }
      geometry.dispose(); renderer.dispose();
      return result;
    });
    if (errors.length) throw new Error(errors.join('\n'));
    fs.mkdirSync(output, { recursive: true });
    for (const [name, data] of Object.entries(illustrations)) {
      const file = path.join(output, name + '.webp');
      fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
      console.log(`${name}: ${fs.statSync(file).size} bytes`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
