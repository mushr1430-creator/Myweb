import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { gsap } from "gsap";

const PROJECT_CATALOG = [
  { title: "星舵 Star Helm", image: "/assets/star-helm-projects-cover.png", route: "/project/kapsul" },
  { title: "艺术与科技双年展", image: "/assets/art-tech-biennale-projects.png", route: "/project/ling-ling-2" },
  { title: "Framia", image: "/assets/framia-ux-cover.png", route: "https://framia.converge.ai/zh-CN/", newTab: true },
  { title: "Combos", image: "/assets/combos-visual-cover.png", route: "https://combos.converge.ai/", newTab: true },
  { title: "京东 AI 导购", image: "/assets/jd-ai-ux-cover.png", route: null, hidden: true },
  { title: "Multimedia Design", image: "/assets/framia-projects.png", route: "/project/the-fantastic-bowl" },
  { title: "策展", image: "/assets/curatorial-projects-cover.png", route: "/project/irvine-company", hidden: true },
  { title: "VR 影片：白霭区", image: "/assets/vr-white-mist-landscape.jpg", route: "/project/four-sigmatic" }
];

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
    gl_FragColor = vec4(finalColor, textureColor.a * mask);
  }
`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const modulo = (value, length) => ((value % length) + length) % length;

class InteractionSound {
  constructor(button) {
    this.button = button;
    this.enabled = false;
    this.context = null;
    button.addEventListener("click", () => this.toggle());
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled && !this.context) {
      this.context = new AudioContext();
    }
    this.button.setAttribute("aria-pressed", String(this.enabled));
    this.button.setAttribute("aria-label", this.enabled ? "关闭交互声音" : "开启交互声音");
    this.button.querySelector("img").src = this.enabled ? "/assets/sound-active.svg" : "/assets/sound-muted.svg";
    this.play("click");
  }

  play(kind = "hover") {
    if (!this.enabled || !this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(kind === "click" ? 330 : 520, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "click" ? 480 : 420, now + 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
  }
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
    this.install();
  }

  install() {
    window.addEventListener("wheel", (event) => {
      if (!this.app.isSpiralActive()) return;
      event.preventDefault();
      this.targetWheelDeltaY += event.deltaY * this.wheelSensitivity;
      this.targetWheelDeltaY = clamp(this.targetWheelDeltaY, -this.maxWheelSpeed, this.maxWheelSpeed);
      this.wheelDirection = event.deltaY > 0 ? 1 : -1;
      document.querySelector(".scroll-hint")?.classList.add("is-hidden");
    }, { passive: false });

    this.canvas.addEventListener("pointerdown", (event) => {
      this.pointerDown = true;
      this.dragging = false;
      this.touchStartX = event.clientX;
      this.lastTouchX = event.clientX;
      this.touchVelocityX = 0;
      this.canvas.setPointerCapture?.(event.pointerId);
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.pointerDown || !this.app.isSpiralActive()) return;
      const distance = event.clientX - this.touchStartX;
      if (!this.dragging && Math.abs(distance) > 8) this.dragging = true;
      if (!this.dragging) return;
      const motion = -(event.clientX - this.lastTouchX) * 0.5;
      this.touchVelocityX = event.clientX - this.lastTouchX;
      this.targetWheelDeltaY -= motion * 0.003;
      this.targetWheelDeltaY = clamp(this.targetWheelDeltaY, -this.maxWheelSpeed, this.maxWheelSpeed);
      this.wheelDirection = motion < 0 ? 1 : -1;
      this.lastTouchX = event.clientX;
    });

    const release = (event) => {
      if (!this.pointerDown) return;
      this.targetWheelDeltaY -= this.touchVelocityX * 0.002;
      this.targetWheelDeltaY = clamp(this.targetWheelDeltaY, -this.maxWheelSpeed, this.maxWheelSpeed);
      this.pointerDown = false;
      this.canvas.releasePointerCapture?.(event.pointerId);
      window.setTimeout(() => { this.dragging = false; }, 0);
    };
    this.canvas.addEventListener("pointerup", release);
    this.canvas.addEventListener("pointercancel", release);
  }

  update() {
    this.wheelDeltaY += (this.targetWheelDeltaY - this.wheelDeltaY) * this.easing;
    this.scrollOffset += this.wheelDeltaY;
    if (Math.abs(this.targetWheelDeltaY) < this.minWheelSpeed) {
      this.targetWheelDeltaY = this.wheelDirection * this.minWheelSpeed;
    }
    this.targetWheelDeltaY *= 0.9;
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
    this.uniforms.uScrollSpeed.value = this.experience.controls.wheelDeltaY;
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

class PortfolioExperience {
  constructor() {
    this.canvas = document.querySelector("canvas.webgl");
    this.loading = document.querySelector(".loading-screen");
    this.loadingValue = document.querySelector(".loading-value");
    this.loadingBar = document.querySelector(".loading-track span");
    this.hoverLabel = document.querySelector(".hover-project");
    this.pointer = new THREE.Vector2(2, 2);
    this.raycaster = new THREE.Raycaster();
    this.hoveredPlane = null;
    this.lastTime = performance.now();
    this.sound = new InteractionSound(document.querySelector(".sound-button"));

    document.documentElement.classList.add("is-spiral");
    this.setupRenderer();
    this.controls = new SpiralControls(this.canvas, this);
    this.setupInputs();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
    this.load();
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
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  async load() {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => {
      const progress = Math.round(loaded / total * 100);
      this.loadingValue.textContent = String(progress);
      this.loadingBar.style.transform = `scaleX(${progress / 100})`;
    };
    const loader = new THREE.TextureLoader(manager);
    const textures = new Map();
    await Promise.all(PROJECTS.map(async (project) => {
      const texture = await loader.loadAsync(project.image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      textures.set(project.image, texture);
    }));
    this.world = new World(this, textures);
    window.setTimeout(() => {
      this.loading.classList.add("is-complete");
      this.world.revealProjects();
      gsap.from([".brand", ".project-nav a", ".sound-button"], { opacity: 0, y: -20, duration: 0.7, ease: "power3.out", stagger: 0.06 });
    }, 280);
  }

  setupInputs() {
    window.addEventListener("pointermove", (event) => {
      this.pointer.x = event.clientX / window.innerWidth * 2 - 1;
      this.pointer.y = -(event.clientY / window.innerHeight * 2 - 1);
    });
    this.canvas.addEventListener("pointerleave", () => this.pointer.set(2, 2));
    this.canvas.addEventListener("click", () => {
      if (!this.isSpiralActive() || this.controls.dragging || !this.hoveredPlane?.project.route) return;
      this.sound.play("click");
      const project = this.hoveredPlane.project;
      if (project.newTab) {
        window.open(project.route, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = project.route;
      }
    });
    window.addEventListener("resize", () => this.resize());
  }

  isSpiralActive() {
    return this.loading.classList.contains("is-complete");
  }

  resize() {
    this.camera.fov = window.innerWidth < 900 ? 45 : 35;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(window.innerWidth, window.innerHeight);
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
      this.sound.play("hover");
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
    const delta = Math.min(time - this.lastTime, 50);
    this.lastTime = time;
    if (this.world) {
      this.controls.update();
      this.world.update(delta, this.controls.scrollOffset);
      this.updateRaycaster();
    }
    this.composer.render();
    requestAnimationFrame(this.animate);
  }
}

try {
  new PortfolioExperience();
} catch (_error) {
  document.querySelector(".loading-screen")?.classList.add("is-complete");
}
