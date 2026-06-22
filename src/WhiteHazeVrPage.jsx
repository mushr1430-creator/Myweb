import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  ArrowDown,
  ArrowLeft,
  Expand,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { assetPath, routePath } from './paths.js'

const VIDEO_SOURCE = assetPath('/videos/white-haze-180-web.mp4')

const CONCEPT_IMAGES = [
  { src: assetPath('/white-haze-concepts/01-barrier.webp'), en: 'BARRIER', zh: '白霭区屏障' },
  { src: assetPath('/white-haze-concepts/02-watchtower-wide.webp'), en: 'WATCH TOWER', zh: '林场望火塔' },
  { src: assetPath('/white-haze-concepts/03-watchtower-close.webp'), en: 'WATCH TOWER / CLOSE VIEW', zh: '望火塔近景' },
  { src: assetPath('/white-haze-concepts/04-white-mist.webp'), en: 'WHITE MIST', zh: '白霭氛围探索' },
  { src: assetPath('/white-haze-concepts/05-world-map.webp'), en: 'WORLD BUILDING', zh: '世界观与场景设定' },
  { src: assetPath('/white-haze-concepts/06-underground-neutral.webp'), en: 'UNDERGROUND / NEUTRAL', zh: '地下实验空间' },
  { src: assetPath('/white-haze-concepts/07-underground-red.webp'), en: 'UNDERGROUND / RED STATE', zh: '地下空间警戒状态' },
  { src: assetPath('/white-haze-concepts/08-main-night.webp'), en: 'MAIN ARCHITECTURE / 01', zh: '主建筑夜景' },
  { src: assetPath('/white-haze-concepts/09-main-close.webp'), en: 'MAIN ARCHITECTURE / 02', zh: '主建筑近景' },
  { src: assetPath('/white-haze-concepts/10-main-wide.webp'), en: 'MAIN ARCHITECTURE / 03', zh: '主建筑全景' },
]

function formatTime(value) {
  if (!Number.isFinite(value)) return '00:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function VrPlayer() {
  const mountRef = useRef(null)
  const videoRef = useRef(null)
  const viewRef = useRef({ yaw: 0, pitch: 0 })
  const refreshViewRef = useRef(() => {})
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mount = mountRef.current
    const video = videoRef.current
    if (!mount || !video) return undefined

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050606)

    const camera = new THREE.PerspectiveCamera(74, 1, 0.1, 300)
    camera.position.set(0, 0, 0.01)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const texture = new THREE.VideoTexture(video)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = false
    // 原片为左右眼并排（SBS），桌面交互视图使用左眼画面。
    texture.repeat.set(0.5, 1)
    texture.offset.set(0, 0)

    const geometry = new THREE.SphereGeometry(100, 72, 48, 0, Math.PI, 0, Math.PI)
    geometry.scale(-1, 1, 1)
    const material = new THREE.MeshBasicMaterial({ map: texture })
    const dome = new THREE.Mesh(geometry, material)
    scene.add(dome)

    let pointerDown = false
    let lastX = 0
    let lastY = 0
    let animationFrame = 0
    let rendering = true

    const updateCamera = () => {
      const { yaw, pitch } = viewRef.current
      const yawRad = THREE.MathUtils.degToRad(yaw)
      const pitchRad = THREE.MathUtils.degToRad(pitch)
      camera.lookAt(
        Math.sin(yawRad) * Math.cos(pitchRad),
        Math.sin(pitchRad),
        Math.cos(yawRad) * Math.cos(pitchRad),
      )
    }
    refreshViewRef.current = updateCamera

    const resize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }

    const onPointerDown = (event) => {
      pointerDown = true
      lastX = event.clientX
      lastY = event.clientY
      renderer.domElement.setPointerCapture(event.pointerId)
      mount.classList.add('is-dragging')
    }

    const onPointerMove = (event) => {
      if (!pointerDown) return
      const deltaX = event.clientX - lastX
      const deltaY = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      viewRef.current.yaw = THREE.MathUtils.clamp(viewRef.current.yaw - deltaX * 0.12, -88, 88)
      viewRef.current.pitch = THREE.MathUtils.clamp(viewRef.current.pitch + deltaY * 0.1, -68, 68)
      updateCamera()
    }

    const onPointerUp = (event) => {
      pointerDown = false
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId)
      }
      mount.classList.remove('is-dragging')
    }

    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      camera.fov = THREE.MathUtils.clamp(camera.fov + event.deltaY * 0.025, 42, 92)
      camera.updateProjectionMatrix()
    }

    const render = () => {
      if (!rendering) return
      renderer.render(scene, camera)
      animationFrame = window.requestAnimationFrame(render)
    }

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !rendering) {
        rendering = true
        render()
      }
      if (entry.isIntersecting) {
        video.muted = true
        video.play().catch(() => {})
      } else {
        if (!video.paused) video.pause()
        if (rendering) {
          rendering = false
          window.cancelAnimationFrame(animationFrame)
        }
      }
    }, { threshold: 0.01 })

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    visibilityObserver.observe(mount)
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
    resize()
    updateCamera()
    render()

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      visibilityObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      renderer.domElement.removeEventListener('wheel', onWheel)
      geometry.dispose()
      material.dispose()
      texture.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      refreshViewRef.current = () => {}
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    const onDuration = () => setDuration(video.duration || 0)
    const onTime = () => setCurrentTime(video.currentTime)
    const onPlaying = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onReady = () => setReady(true)
    video.addEventListener('loadedmetadata', onDuration)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('play', onPlaying)
    video.addEventListener('pause', onPause)
    video.addEventListener('canplay', onReady)
    onDuration()
    onTime()
    if (video.readyState >= 3) onReady()
    return () => {
      video.removeEventListener('loadedmetadata', onDuration)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('play', onPlaying)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('canplay', onReady)
    }
  }, [])

  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      try {
        await video.play()
      } catch {
        video.muted = true
        setMuted(true)
        await video.play()
      }
    } else video.pause()
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  const resetView = () => {
    viewRef.current = { yaw: 0, pitch: 0 }
    refreshViewRef.current()
  }

  const enterFullscreen = async () => {
    if (mountRef.current?.requestFullscreen) await mountRef.current.requestFullscreen()
  }

  const seek = (event) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Number(event.target.value)
    setCurrentTime(video.currentTime)
  }

  return (
    <div className="vr-player-shell">
      <video ref={videoRef} className="vr-source-video" src={VIDEO_SOURCE} muted playsInline preload="metadata" />
      <div ref={mountRef} className="vr-canvas" aria-label="可拖拽观看的180度VR视频画面" />

      <div className="vr-player-topline">
        <span><i /> 180° VR</span>
        <span>SBS · 8K MASTER / 4K STREAM</span>
      </div>

      {!playing && (
        <button className="vr-center-play" type="button" onClick={togglePlay} aria-label="播放白霭区VR影片">
          <Play size={30} fill="currentColor" />
          <span>{ready ? 'PLAY THE FILM' : 'LOADING FILM'}</span>
        </button>
      )}

      <div className="vr-drag-hint"><Expand size={15} /> 拖动视角 · Ctrl + 滚轮缩放</div>

      <div className="vr-controls">
        <button type="button" onClick={togglePlay} aria-label={playing ? '暂停' : '播放'}>
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <span className="vr-time">{formatTime(currentTime)}</span>
        <input
          aria-label="视频进度"
          type="range"
          min="0"
          max={duration || 0}
          step="0.05"
          value={Math.min(currentTime, duration || 0)}
          onChange={seek}
        />
        <span className="vr-time">{formatTime(duration)}</span>
        <button type="button" onClick={toggleMute} aria-label={muted ? '打开声音' : '静音'}>
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
        <button type="button" onClick={resetView} aria-label="重置视角"><RotateCcw size={18} /></button>
        <button type="button" onClick={enterFullscreen} aria-label="全屏播放"><Maximize2 size={18} /></button>
      </div>
    </div>
  )
}

function WhiteHazeVrPage() {
  const pageRef = useRef(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = '白霭区 — 180° VR Film'
    pageRef.current?.scrollTo({ top: 0 })

    const slides = pageRef.current?.querySelectorAll('.vr-concept-slide') ?? []
    const thresholds = Array.from({ length: 101 }, (_, index) => index / 100)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const visibility = Math.max(0, Math.min(1, entry.intersectionRatio))
        const reveal = Math.min(1, visibility * 1.25)
        entry.target.style.setProperty('--concept-opacity', (0.02 + reveal * 0.98).toFixed(3))
        entry.target.style.setProperty('--concept-scale', (1.024 - reveal * 0.024).toFixed(4))
        entry.target.style.setProperty('--concept-shift', `${((1 - reveal) * 32).toFixed(2)}px`)
        entry.target.style.setProperty('--concept-saturation', (0.78 + reveal * 0.22).toFixed(3))
        entry.target.classList.toggle('is-active', visibility > 0.04)
      })
    }, { root: pageRef.current, threshold: thresholds })
    slides.forEach((slide) => observer.observe(slide))

    return () => {
      document.title = previousTitle
      observer.disconnect()
    }
  }, [])

  const scrollToConcepts = (event) => {
    event.preventDefault()
    pageRef.current?.querySelector('#concept-gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="vr-page" ref={pageRef}>
      <header className="vr-page-header">
        <a href={routePath('/')} className="vr-back"><ArrowLeft size={18} /> 返回作品</a>
        <div className="vr-page-brand">ZDY.<small>PORTFOLIO</small></div>
        <span>VR FILM / 2025</span>
      </header>

      <section className="vr-hero">
        <div className="vr-project-meta">
          <span>04 / IMMERSIVE EXPERIENCE</span>
          <h1>白霭区</h1>
          <p>WHITE HAZE DISTRICT</p>
        </div>
        <VrPlayer />
        <a className="vr-scroll-cue" href="#concept-gallery" onClick={scrollToConcepts} aria-label="向下查看白霭区概念设计图">
          <span>SCROLL FOR CONCEPT ART</span>
          <i><ArrowDown size={19} /></i>
        </a>
      </section>

      <section className="vr-concepts" id="concept-gallery" aria-label="白霭区概念设计图">
        {CONCEPT_IMAGES.map((image, index) => (
          <article
            className="vr-concept-slide"
            key={image.src}
            style={{ '--concept-image': `url("${image.src}")` }}
          >
            <div className="vr-concept-frame">
              <img
                src={image.src}
                alt={`白霭区概念设计：${image.zh}`}
                loading={index < 2 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
              />
            </div>
            <div className="vr-concept-meta">
              <span>{String(index + 1).padStart(2, '0')} / {String(CONCEPT_IMAGES.length).padStart(2, '0')}</span>
              <p>{image.en}<small>{image.zh}</small></p>
              <span>CONCEPT DESIGN</span>
            </div>
          </article>
        ))}
      </section>

      <section className="vr-project-copy">
        <div>
          <span>ABOUT THE FILM</span>
          <h2>在 180° 视野中，<br />空间成为叙事本身。</h2>
        </div>
        <p>围绕 VR 影像的空间叙事与沉浸体验展开创作。通过场景视觉、镜头节奏与空间关系的组织，让观众在虚拟环境中获得自然、连贯并富有情绪的观看体验。</p>
        <dl>
          <div><dt>FORMAT</dt><dd>VR180 · SBS</dd></div>
          <div><dt>ROLE</dt><dd>SPATIAL / VISUAL</dd></div>
          <div><dt>YEAR</dt><dd>2025</dd></div>
        </dl>
        <a className="vr-ending-home" href={routePath('/')}>
          <ArrowLeft size={24} />
          <span>RETURN HOME / 返回主界面</span>
        </a>
      </section>
    </main>
  )
}

export default WhiteHazeVrPage
