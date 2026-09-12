import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { gsap } from "gsap";
import { HOME_BACKGROUND_FRAGMENT } from "./home-background.js";
import PROJECT_CATALOG from "./project-catalog.json";

// Set hidden to false to restore a project to All Projects.
const PROJECTS = PROJECT_CATALOG.filter((project) => !project.hidden);

const VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  #define PI 3.14159265359
  uniform float uScrollSpeed;

  void main() {
    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 newPosition = position;
    newPosition.z = sin(uv.x * PI) * 0.2;
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    viewPosition.x += pow(worldPosition.y, 2.0) * 0.1;
    viewPosition.x += sin(uv.y * PI) * uScrollSpeed * 2.0;
    gl_Position = projectionMatrix * viewPosition;
    vUv = uv;
    vWorldPosition = worldPosition;
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uZoom;
  uniform vec2 uPlaneSizes;
  uniform vec2 uImageSizes;
  uniform float uRevealProgress;
  uniform float uHoverProgress;
  uniform sampler2D uCoverDisplacement;
  uniform vec2 uCoverPointer;
  uniform vec2 uCoverResolution;
  uniform float uCoverTime;
  uniform float uCoverActive;

  // The portrait's five-octave noise gives the inverted patch its torn edge.
  float coverRandom(vec2 point) {
    return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float coverNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 fraction = fract(point);
    vec2 blend = fraction * fraction * (3.0 - 2.0 * fraction);
    return mix(
      mix(coverRandom(cell), coverRandom(cell + vec2(1.0, 0.0)), blend.x),
      mix(coverRandom(cell + vec2(0.0, 1.0)), coverRandom(cell + vec2(1.0)), blend.x),
      blend.y
    );
  }

  float coverFbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rotation = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int octave = 0; octave < 5; octave++) {
      value += amplitude * coverNoise(point);
      point = rotation * point * 2.0 + vec2(100.0);
      amplitude *= 0.5;
    }
    return value;
  }

  vec3 applyCoverHover(vec3 baseColor, vec2 imageUv) {
    if (uCoverActive < 0.001 || !gl_FrontFacing) return baseColor;
    // Screen coordinates keep the brush under the cursor on curved, rotating covers.
    vec2 screenUv = gl_FragCoord.xy / uCoverResolution;
    vec2 offset = (screenUv - uCoverPointer) * vec2(1.0, uCoverResolution.y / uCoverResolution.x);
    if (dot(offset, offset) > 0.0196) return baseColor;
    float circle = (1.0 - smoothstep(0.018 - 0.018 * 16.1, 0.018 + 0.018 * 16.1, dot(offset, offset) * 4.0)) * 3.5;
    float noise = coverFbm(imageUv * 20.0 + vec2(-0.1, 0.08) * uCoverTime);
    // Avoid GLSL reserved identifiers: a shader compile failure hides every cover.
    float inkMask = step(3.5, noise + circle * circle) * uCoverActive;
    vec2 displacement = texture2D(uCoverDisplacement, screenUv).rg;
    vec4 shiftedColor = texture2D(uTexture, clamp(imageUv - displacement * 0.1, vec2(0.001), vec2(0.999)));
    // Match the portrait's RGB inversion before Three's linear-light output pass.
    vec3 inverted = 1.0 - sRGBTransferOETF(shiftedColor).rgb;
    return mix(baseColor, sRGBTransferEOTF(vec4(inverted, 1.0)).rgb, inkMask);
  }

  float roundedBoxSDF(vec2 centerPosition, vec2 size, float radius) {
    return length(max(abs(centerPosition) - size + radius, 0.0)) - radius;
  }

  vec4 blurredTexture(vec2 uv) {
    vec2 off = vec2(40.0 / 1024.0);
    vec4 sum = vec4(0.0);
    sum += texture2D(uTexture, uv + vec2(-off.x, -off.y));
    sum += texture2D(uTexture, uv + vec2(0.0, -off.y)) * 2.0;
    sum += texture2D(uTexture, uv + vec2(off.x, -off.y));
    sum += texture2D(uTexture, uv + vec2(-off.x, 0.0)) * 2.0;
    sum += texture2D(uTexture, uv) * 4.0;
    sum += texture2D(uTexture, uv + vec2(off.x, 0.0)) * 2.0;
    sum += texture2D(uTexture, uv + vec2(-off.x, off.y));
    sum += texture2D(uTexture, uv + vec2(0.0, off.y)) * 2.0;
    sum += texture2D(uTexture, uv + vec2(off.x, off.y));
    return sum / 16.0;
  }

  void main() {
    vec2 ratio = vec2(
      min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
      min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
    );
    vec2 imageUv = vUv * ratio + (1.0 - ratio) * 0.5;
    imageUv = (imageUv - 0.5) / uZoom + 0.5;

    vec4 textureColor = gl_FrontFacing ? texture2D(uTexture, imageUv) : blurredTexture(imageUv);
    float progress = clamp(uRevealProgress, 0.0, 1.0);
    vec2 size = vec2(max(progress * 0.5, 0.001));
    float radius = min(0.05, progress * 0.05);
    float distanceToEdge = roundedBoxSDF(vUv - 0.5, size, radius);
    float mask = 1.0 - smoothstep(-0.002, 0.002, distanceToEdge);
    float hoverBrightness = mix(1.0, 0.58, clamp(uHoverProgress, 0.0, 1.0));
    float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edgeGlow = 1.0 - smoothstep(0.0, 0.14, edgeDistance);
    vec3 glowColor = mix(vec3(0.12, 0.28, 0.82), vec3(0.5, 0.12, 0.78), vUv.y);
    float glowStrength = mix(0.08, 0.13, clamp(uHoverProgress, 0.0, 1.0));
    vec3 finalColor = textureColor.rgb * hoverBrightness + glowColor * edgeGlow * glowStrength;
    finalColor = applyCoverHover(finalColor, imageUv);
    gl_FragColor = vec4(finalColor, textureColor.a * mask);
  }
`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const modulo = (value, length) => ((value % length) + length) % length;

// A shared version of the portrait's 16x16 velocity field; no extra render pass.
class CoverHover {
  constructor() {
    this.size = 16;
    this.data = new Float32Array(this.size * this.size * 4);
    this.texture = new THREE.DataTexture(this.data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType);
    this.texture.minFilter = this.texture.magFilter = THREE.NearestFilter;
    this.texture.needsUpdate = true;
    this.pointer = new THREE.Vector2(2, 2);
    this.target = new THREE.Vector2(2, 2);
    this.velocity = new THREE.Vector2();
    this.inside = false;
    this.uniforms = {
      uCoverDisplacement: { value: this.texture },
      uCoverPointer: { value: this.pointer },
      uCoverResolution: { value: new THREE.Vector2(1, 1) },
      uCoverTime: { value: 0 },
      uCoverActive: { value: 0 }
    };
  }

  move(x, y) {
    if (!this.inside) {
      this.pointer.set(x, y);
      this.velocity.set(0, 0);
    } else {
      this.velocity.x = clamp(this.velocity.x + x - this.target.x, -0.08, 0.08);
      this.velocity.y = clamp(this.velocity.y + y - this.target.y, -0.08, 0.08);
    }
    this.target.set(x, y);
    this.inside = true;
  }

  leave() {
    this.inside = false;
    this.velocity.set(0, 0);
  }

  reset() {
    this.leave();
    this.uniforms.uCoverActive.value = 0;
    this.data.fill(0);
    this.texture.needsUpdate = true;
  }

  update(delta, enabled) {
    if (!enabled) {
      if (this.inside || this.uniforms.uCoverActive.value) this.reset();
      return;
    }
    const frames = delta / (1000 / 60);
    this.uniforms.uCoverTime.value += delta * 0.003;
    this.pointer.lerp(this.target, 1 - Math.exp(-delta / 160));
    const active = this.uniforms.uCoverActive;
    active.value += ((this.inside ? 1 : 0) - active.value) * (1 - Math.exp(-delta / 80));
    if (!this.inside && active.value < 0.001) { active.value = 0; return; }

    const decay = Math.pow(0.9, frames);
    const x = this.target.x * this.size - 0.5;
    const y = this.target.y * this.size - 0.5;
    const radius = this.size / 4;
    for (let row = 0; row < this.size; row++) {
      for (let column = 0; column < this.size; column++) {
        const index = 4 * (column + this.size * row);
        this.data[index] *= decay;
        this.data[index + 1] *= decay;
        const distance = Math.hypot(x - column, y - row);
        if (this.inside && distance < radius) {
          const weight = Math.min(10, radius / Math.max(distance, 0.001));
          this.data[index] += 3 * this.velocity.x * weight * frames;
          this.data[index + 1] += 3 * this.velocity.y * weight * frames;
        }
      }
    }
    this.velocity.multiplyScalar(Math.pow(0.5, frames));
    this.texture.needsUpdate = true;
  }

  dispose() { this.texture.dispose(); }
}

class SpiralControls {
  constructor(canvas, app) {
    this.canvas = canvas;
    this.app = app;
    this.easing = 0.1;
    this.wheelSensitivity = 0.0004;
    this.maxWheelSpeed = 0.8;
    this.wheelDeltaY = 0;
    this.targetWheelDeltaY = 0;
    this.minWheelSpeed = 0.002;
    this.wheelDirection = 1;
    this.scrollOffset = 0;
    this.pointerDown = false;
    this.dragging = false;
    this.lastTouchX = 0;
    this.touchStartX = 0;
    this.touchVelocityX = 0;
    this.lastTouchY = 0;
    this.touchStartY = 0;
    this.events = new AbortController();
    this.install();
  }

  onWheel(delta) {
    this.targetWheelDeltaY = clamp(this.targetWheelDeltaY + delta * this.wheelSensitivity, -this.maxWheelSpeed, this.maxWheelSpeed);
    if (delta) this.wheelDirection = Math.sign(delta);
    this.app.root.querySelector(".scroll-hint")?.classList.add("is-hidden");
  }

  install() {
    const signal = this.events.signal;
    if (!this.app.embedded) window.addEventListener("wheel", (event) => {
      if (!this.app.isSpiralActive()) return;
      event.preventDefault();
      this.onWheel(event.deltaY);
    }, { passive: false, signal });

    this.canvas.addEventListener("pointerdown", (event) => {
      if (!this.app.isSpiralActive()) return;
      this.pointerDown = true;
      this.dragging = false;
      this.touchStartX = event.clientX;
      this.lastTouchX = event.clientX;
      this.touchStartY = this.lastTouchY = event.clientY;
      this.touchVelocityX = 0;
      this.canvas.setPointerCapture?.(event.pointerId);
    }, { signal });

    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.pointerDown || !this.app.isSpiralActive()) return;
      const distance = event.clientX - this.touchStartX;
      if (!this.dragging && Math.hypot(distance, event.clientY - this.touchStartY) > 8) this.dragging = true;
      if (!this.dragging) return;
      const dx = event.clientX - this.lastTouchX;
      const dy = event.clientY - this.lastTouchY;
      const movement = Math.abs(dy) > Math.abs(dx) ? -dy : dx;
      const motion = -movement * 0.5;
      this.touchVelocityX = movement;
      this.targetWheelDeltaY -= motion * 0.003;
      this.targetWheelDeltaY = clamp(this.targetWheelDeltaY, -this.maxWheelSpeed, this.maxWheelSpeed);
      this.wheelDirection = motion < 0 ? 1 : -1;
      this.lastTouchX = event.clientX;
      this.lastTouchY = event.clientY;
    }, { signal });

    const release = (event) => {
      if (!this.pointerDown) return;
      this.targetWheelDeltaY += this.touchVelocityX * 0.002;
      this.targetWheelDeltaY = clamp(this.targetWheelDeltaY, -this.maxWheelSpeed, this.maxWheelSpeed);
      this.pointerDown = false;
      this.canvas.releasePointerCapture?.(event.pointerId);
      window.setTimeout(() => { this.dragging = false; }, 0);
    };
    this.canvas.addEventListener("pointerup", release, { signal });
    this.canvas.addEventListener("pointercancel", release, { signal });
  }

  update(delta = 1000 / 60) {
    const frames = delta / (1000 / 60);
    this.wheelDeltaY += (this.targetWheelDeltaY - this.wheelDeltaY) * (1 - Math.pow(1 - this.easing, frames));
    this.scrollOffset += this.wheelDeltaY * frames;
    const minimum = this.app.backgroundMotion.matches ? 0 : this.minWheelSpeed;
    if (Math.abs(this.targetWheelDeltaY) < minimum) {
      this.targetWheelDeltaY = this.wheelDirection * minimum;
    }
    this.targetWheelDeltaY *= Math.pow(0.9, frames);
  }

  destroy() {
    this.events.abort();
  }
}

class ProjectPlane {
  constructor(experience, project, index, count, texture) {
    this.experience = experience;
    this.project = project;
    this.index = index;
    this.count = count;
    this.centerIndex = Math.floor(count / 2);
    this.isHovered = false;
    this.hoverProgress = 0;
    this.isHidden = true;
    this.hiddenProgress = 1;

    const image = texture.image;
    this.uniforms = {
      ...experience.coverHover.uniforms,
      uTexture: { value: texture },
      uZoom: { value: 1 },
      uPlaneSizes: { value: new THREE.Vector2(1.7, 1) },
      uImageSizes: { value: new THREE.Vector2(image.naturalWidth || image.width || 1, image.naturalHeight || image.height || 1) },
      uRevealProgress: { value: 0 },
      uHoverProgress: { value: 0 },
      uScrollSpeed: { value: 0 }
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true
    });
    this.geometry = new THREE.PlaneGeometry(1, 1, 8, 8);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.scale.set(1.7, 1, 1);
    this.mesh.userData.projectPlane = this;
    experience.scene.add(this.mesh);
  }

  setHidden(value) {
    this.isHidden = value;
  }

  update(delta, scrollOffset) {
    const hiddenEase = 1 - Math.pow(1 - 0.05, delta * 0.15);
    const hoverEase = 1 - Math.pow(1 - (this.isHovered ? 0.09 : 0.07), delta * 0.2);
    this.hiddenProgress += ((this.isHidden ? 1 : 0) - this.hiddenProgress) * hiddenEase;
    this.hoverProgress += ((this.isHovered ? 1 : 0) - this.hoverProgress) * hoverEase;

    let normalized = modulo(this.index - scrollOffset, this.count);
    const relative = normalized - this.centerIndex;
    const shift = this.isHidden ? 1.5 : -1.5;
    const y = relative * 0.5 - 0.8 - this.hiddenProgress * shift;
    const radius = 2 * (1 - this.hiddenProgress / 2);
    const angle = relative * 0.85;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    this.mesh.position.set(x, y, z);
    this.mesh.rotation.y = -angle + Math.PI / 2;
    const focusScale = 1 + 0.08 * this.hoverProgress;
    this.mesh.scale.set(1.7 * focusScale, focusScale, 1);
    this.mesh.position.z += 0.22 * this.hoverProgress;
    this.mesh.visible = this.hiddenProgress < 0.999;
    this.uniforms.uZoom.value = 1 + 0.05 * this.hoverProgress;
    this.uniforms.uRevealProgress.value = (1 - this.hoverProgress * 0.05) * (1 - this.hiddenProgress);
    this.uniforms.uHoverProgress.value = this.hoverProgress;
    this.uniforms.uScrollSpeed.value = this.experience.backgroundMotion.matches ? 0 : this.experience.controls.wheelDeltaY;
  }
}

class World {
  constructor(experience, textures) {
    this.experience = experience;
    this.projects = [...PROJECTS, ...PROJECTS];
    this.planes = this.projects.map((project, index) => new ProjectPlane(experience, project, index, this.projects.length, textures.get(project.image)));
  }

  revealProjects() {
    this.planes.forEach((plane, index) => {
      window.setTimeout(() => plane.setHidden(false), (index % 4) * 50);
    });
  }

  hideProjects() {
    this.planes.forEach((plane, index) => {
      window.setTimeout(() => plane.setHidden(true), (index % 4) * 30);
    });
  }

  update(delta, scrollOffset) {
    this.planes.forEach((plane) => plane.update(delta, scrollOffset));
  }
}

export class PortfolioExperience {
  constructor({ root = document, embedded = false, onReady, onError } = {}) {
    this.root = root;
    this.embedded = embedded;
    this.active = !embedded;
    this.visible = !embedded;
    this.onReady = onReady;
    this.onError = onError;
    this.events = new AbortController();
    this.canvas = root.querySelector("canvas.webgl");
    this.loading = root.querySelector(".loading-screen");
    this.loadingValue = root.querySelector(".loading-value");
    this.loadingBar = root.querySelector(".loading-track span");
    this.hoverLabel = root.querySelector(".hover-project");
    this.pointer = new THREE.Vector2(2, 2);
    this.coverHover = new CoverHover();
    this.finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    this.raycaster = new THREE.Raycaster();
    this.hoveredPlane = null;
    this.lastTime = performance.now();

    if (!embedded) document.documentElement.classList.add("is-spiral");
    this.setupRenderer();
    this.controls = new SpiralControls(this.canvas, this);
    this.setupInputs();
    this.animate = this.animate.bind(this);
    this.frame = requestAnimationFrame(this.animate);
    this.load().catch((error) => {
      if (this.disposed) return;
      this.loading.classList.add("is-complete");
      this.onError?.(error);
      this.destroy();
    });
  }

  setupRenderer() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(window.innerWidth < 900 ? 45 : 35, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.z = 8;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance", stencil: false, alpha: true });
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setClearColor(0x0e0e0e, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new OutputPass());
    this.backgroundPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        viewport: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: HOME_BACKGROUND_FRAGMENT
    });
    this.composer.addPass(this.backgroundPass);
    // The embedded gallery shares the homepage's existing live background.
    this.backgroundPass.enabled = !this.embedded;
    this.backgroundMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.resize();
  }

  async load() {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => {
      const progress = Math.round(loaded / total * 100);
      if (this.disposed) return;
      this.loadingValue.textContent = String(progress);
      this.loadingBar.style.transform = `scaleX(${progress / 100})`;
    };
    const loader = new THREE.TextureLoader(manager);
    const textures = new Map();
    this.textures = textures;
    await Promise.all(PROJECTS.map(async (project) => {
      const texture = await loader.loadAsync(project.image);
      if (this.disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      textures.set(project.image, texture);
    }));
    if (this.disposed) return;
    this.world = new World(this, textures);
    this.revealTimer = window.setTimeout(() => {
      if (this.disposed) return;
      this.loading.classList.add("is-complete");
      this.world.revealProjects();
      this.onReady?.();
      if (!this.embedded) gsap.from([".brand", ".project-nav a", ".sound-button"], { opacity: 0, y: -20, duration: 0.7, ease: "power3.out", stagger: 0.06 });
    }, 280);
  }

  setupInputs() {
    const signal = this.events.signal;
    window.addEventListener("pointermove", (event) => {
      const bounds = this.canvas.getBoundingClientRect();
      this.pointer.x = (event.clientX - bounds.left) / bounds.width * 2 - 1;
      this.pointer.y = -(event.clientY - bounds.top) / bounds.height * 2 + 1;
      if (event.target === this.canvas && event.pointerType !== "touch" && this.isSpiralActive() && this.finePointer.matches && !this.backgroundMotion.matches) {
        this.coverHover.move((this.pointer.x + 1) / 2, (this.pointer.y + 1) / 2);
      } else this.coverHover.leave();
    }, { signal });
    this.canvas.addEventListener("pointerleave", () => {
      this.pointer.set(2, 2);
      this.coverHover.leave();
    }, { signal });
    window.addEventListener("blur", () => { this.pointer.set(2, 2); this.coverHover.reset(); }, { signal });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.coverHover.reset();
    }, { signal });
    this.canvas.addEventListener("click", () => {
      if (!this.isSpiralActive() || this.controls.dragging || !this.hoveredPlane?.project.route) return;
      const project = this.hoveredPlane.project;
      if (project.newTab) {
        window.open(project.route, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = project.route;
      }
    }, { signal });
    this.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.onError?.(new Error("WebGL context lost"));
      this.destroy();
    }, { signal });
    window.addEventListener("resize", () => this.resize(), { signal });
    if (this.embedded) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.root);
    }
  }

  isSpiralActive() {
    return this.active && !this.disposed && this.loading.classList.contains("is-complete");
  }

  resize() {
    if (this.disposed) return;
    const width = this.embedded ? this.root.clientWidth : window.innerWidth;
    const height = this.embedded ? this.root.clientHeight : window.innerHeight;
    this.camera.fov = width < 900 ? 45 : 35;
    this.camera.aspect = width / Math.max(1, height);
    // Keep the whole helix readable on narrow portrait viewports.
    this.camera.position.z = width / height < 0.8 ? 8 * 0.8 / (width / height) : 8;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.getDrawingBufferSize(this.coverHover.uniforms.uCoverResolution.value);
    this.coverHover.reset();
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(width, height);
    this.backgroundPass.uniforms.viewport.value.set(width, height);
  }

  updateRaycaster() {
    if (!this.world || !this.isSpiralActive()) {
      this.clearHover();
      return;
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(this.world.planes.map((plane) => plane.mesh), false);
    let next = null;
    for (const intersection of intersections) {
      const plane = intersection.object.userData.projectPlane;
      if (!plane || plane.hiddenProgress > 0.01 || !intersection.face) continue;
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
      const worldNormal = intersection.face.normal.clone().applyMatrix3(normalMatrix).normalize();
      if (worldNormal.dot(this.raycaster.ray.direction) >= 0) continue;
      next = plane;
      break;
    }
    if (next === this.hoveredPlane) return;
    this.world.planes.forEach((plane) => { plane.isHovered = plane === next; });
    this.hoveredPlane = next;
    if (next) {
      const hasDetail = Boolean(next.project.route);
      this.canvas.style.cursor = hasDetail ? "pointer" : "default";
      if (hasDetail) {
        this.hoverLabel.href = next.project.route;
        if (next.project.newTab) {
          this.hoverLabel.target = "_blank";
          this.hoverLabel.rel = "noopener noreferrer";
        } else {
          this.hoverLabel.removeAttribute("target");
          this.hoverLabel.removeAttribute("rel");
        }
        this.hoverLabel.removeAttribute("aria-disabled");
      } else {
        this.hoverLabel.removeAttribute("href");
        this.hoverLabel.removeAttribute("target");
        this.hoverLabel.removeAttribute("rel");
        this.hoverLabel.setAttribute("aria-disabled", "true");
      }
      this.hoverLabel.querySelector("img").src = next.project.image;
      this.hoverLabel.querySelector("span").textContent = next.project.title;
      this.hoverLabel.classList.add("is-visible");
      this.hoverLabel.setAttribute("aria-hidden", "false");
      this.hoverLabel.tabIndex = hasDetail ? 0 : -1;
    } else {
      this.clearHover();
    }
  }

  clearHover() {
    if (this.world) this.world.planes.forEach((plane) => { plane.isHovered = false; });
    this.hoveredPlane = null;
    this.canvas.style.cursor = "default";
    this.hoverLabel.classList.remove("is-visible");
    this.hoverLabel.setAttribute("aria-hidden", "true");
    this.hoverLabel.tabIndex = -1;
  }

  animate(time) {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    const delta = Math.min(time - this.lastTime, 50);
    this.lastTime = time;
    if (!this.visible || document.hidden) return;
    if (!this.backgroundMotion.matches) this.backgroundPass.uniforms.time.value += delta * 0.003;
    this.coverHover.update(delta, this.isSpiralActive() && this.finePointer.matches && !this.backgroundMotion.matches);
    if (this.world) {
      if (this.active) this.controls.update(delta);
      this.world.update(delta, this.controls.scrollOffset);
      this.updateRaycaster();
    }
    this.composer.render();
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.revealTimer);
    this.events.abort();
    this.resizeObserver?.disconnect();
    this.controls?.destroy();
    this.coverHover.dispose();
    this.clearHover();
    this.world?.planes.forEach((plane) => { plane.geometry.dispose(); plane.material.dispose(); });
    this.textures?.forEach((texture) => texture.dispose());
    this.composer.passes.forEach((pass) => pass.dispose?.());
    this.composer.dispose();
    this.renderer.dispose();
  }
}
