import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import * as dat from 'three/examples/jsm/libs/dat.gui.module.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import smoke2url from './particlePack_1/PNG (Transparent)/smoke_02.png';

let scene, camera, renderer, sizes, controls, material, mesh, stats;

// https://unsplash.com/photos/XPDXhRy92Oc

function init() {
  const gui = new dat.GUI({ width: 300 });

  stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    get aspect() {
      return this.width / this.height;
    },
    get pixelRatio() {
      return Math.min(window.devicePixelRatio, 2);
    },
  };

  scene = new THREE.Scene();

  /**
   * Textures
   */
  const textureLoader = new THREE.TextureLoader();

  const smoke2 = textureLoader.load(smoke2url);

  /**
   * Axes Helper
   */
  const axesHelper = new THREE.AxesHelper(4);
  scene.add(axesHelper);

  /**
   * Cameras
   */
  camera = new THREE.PerspectiveCamera(85, sizes.aspect, 1, 500);
  camera.position.z = 42;
  camera.position.y = 40;
  scene.add(camera);

  /**
   * Sky
   */
  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);

  /**
   * Tornado
   */

  const parameters = {
    count: 10_000,
    radius: 5,
    height: 30,
    curviness: 7,
    range: 2,
    particleSize: 600,
    curvinessChangeRate: 1,
  };

  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(parameters.count * 3);

  for (let i = 0; i < parameters.count; i++) {
    const ix = i * 3;
    const iy = ix + 1;
    const iz = iy + 1;
    const angle = Math.random() * Math.PI * 2;
    const y = parameters.height * (i / parameters.count);
    const radius = parameters.radius * (i / parameters.count);
    positions[ix] = Math.sin(angle) * radius;
    positions[iy] = y;
    positions[iz] = Math.cos(angle) * radius;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  material = new THREE.ShaderMaterial({
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uSize: { value: parameters.particleSize },
      uPixelRatio: { value: sizes.pixelRatio },
      uTime: { value: 0 },
      uSpeed: { value: 10 },
      uHeight: { value: parameters.height },
      uCurviness: { value: parameters.curviness },
      uCurvinessChangeRate: { value: parameters.curvinessChangeRate },
      uRange: { value: parameters.range },
      uTexture: { value: smoke2 },
    },
    vertexShader: `
      uniform float uSize;
      uniform float uTime;
      uniform float uSpeed;
      uniform float uHeight;
      uniform float uCurviness;
      uniform float uCurvinessChangeRate;
      uniform float uRange;
      uniform float uPixelRatio;

      varying vec4 vNormal;
      varying vec2 vUv;

      void main() {

        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        float angle = atan(modelPosition.x, modelPosition.z);
        float distanceToCenter = length(modelPosition.xz);
        float speed = 1.0 - (modelPosition.y / uHeight);
        modelPosition.x = sin(angle + uTime * speed * uSpeed) * distanceToCenter;
        modelPosition.x = modelPosition.x + sin(uTime * uCurvinessChangeRate + (modelPosition.y / uCurviness)) * uRange;
        modelPosition.z = cos(angle + uTime * speed * uSpeed) * distanceToCenter;
        modelPosition.z = modelPosition.z + cos(uTime * uCurvinessChangeRate + (modelPosition.y / uCurviness)) * uRange;
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectedPosition = projectionMatrix * viewPosition;

        vNormal = vec4(normal, 1.0);
        gl_Position = projectedPosition;
        gl_PointSize = uSize * uPixelRatio;
        gl_PointSize *= (1.0 / - viewPosition.z);
      }
    `,
    fragmentShader: `
      varying vec4 vNormal;
      uniform sampler2D uTexture;

      void main() {
        vec2 uv = (vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
        vec4 textureColor = texture2D(uTexture, uv);
        gl_FragColor = textureColor;
      }
    `,
  });

  gui.add(parameters, 'count').min(100).max(1_000_000).step(100);
  gui.add(parameters, 'radius').min(1).max(100).step(0.1);
  gui.add(parameters, 'height').min(1).max(100).step(0.1);
  // gui.add(material.uniforms.uHeight, 'value').min(1).max(100).step(0.1).name('');
  gui
    .add(material.uniforms.uCurviness, 'value')
    .min(0)
    .max(21)
    .step(0.1)
    .name('curviness');
  gui
    .add(material.uniforms.uCurvinessChangeRate, 'value')
    .min(0)
    .max(10)
    .step(0.001)
    .name('curviness rate change');
  gui
    .add(material.uniforms.uRange, 'value')
    .min(0)
    .max(10)
    .step(0.1)
    .name('range');
  gui
    .add(material.uniforms.uSize, 'value')
    .min(1)
    .max(5000)
    .step(0.1)
    .name('size');
  gui
    .add(material.uniforms.uSpeed, 'value')
    .min(1)
    .max(100)
    .step(0.1)
    .name('speed');

  mesh = new THREE.Points(geometry, material);

  mesh.scale.set(1, 1, 1);

  scene.add(mesh);

  /**
   * Ground
   */

  const groundSize = 100;
  const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 1);
  const groundMaterial = new THREE.MeshBasicMaterial({
    color: '#69b581',
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI * 0.5;
  ground.position.y = -0.8;
  scene.add(ground);

  /**
   * Renderer
   */

  renderer = new THREE.WebGLRenderer({
    antialias: sizes.pixelRatio < 1.5,
  });

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);
  document.body.appendChild(renderer.domElement);

  /**
   * Controls
   */
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  /**
   * Event Listeners
   */
  window.addEventListener('resize', handleWindowResize);

  render();
}

function handleWindowResize() {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.aspect;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);
}

const clock = new THREE.Clock();

function render() {
  stats.begin();

  controls.update();

  const elapsedTime = clock.getElapsedTime();

  material.uniforms.uTime.value = elapsedTime;

  renderer.render(scene, camera);

  requestAnimationFrame(render);

  stats.end();
}

init();