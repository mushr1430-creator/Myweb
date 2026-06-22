import { useEffect, useRef } from 'react'
import { ArrowDown, ArrowLeft } from 'lucide-react'
import { assetPath, routePath } from './paths.js'

const interactionSteps = [
  ['01', 'PALM / 托举', '以手掌定位和牵引飞船，建立低门槛的基础移动控制。'],
  ['02', 'PINCH / 捏合', '捏合手势发射飞船，并在空间中生成黑洞与白洞。'],
  ['03', 'DUAL FORCE / 双力场', '利用引力吸附与斥力击退，调整轨迹、避开障碍并收集星币。'],
  ['04', 'ARRIVAL / 抵达', '持续修正航向，在虚实融合的空间中抵达目标点位。'],
]

const planets = [
  { name: '糖果星球', en: 'CANDY PLANET', image: assetPath('/star-helm/planet-candy.webp'), copy: '轻快、丰盛、充满好奇心。玩家在甜蜜碎片之间寻找自由的飞行节奏。' },
  { name: '沙之星球', en: 'DESERT PLANET', image: assetPath('/star-helm/planet-desert.webp'), copy: '低饱和、缓慢而克制。阻力让每一次微小修正都变得重要。' },
  { name: '海之星球', en: 'OCEAN PLANET', image: assetPath('/star-helm/planet-ocean.webp'), copy: '流动、变化、难以保持直线。玩家在拉近与推远之间顺应环境。' },
]

const technologies = [
  ['UNITY 2022.3 LTS', '主开发引擎与物理系统'],
  ['ROKID UXR SDK', '手势识别与空间定位'],
  ['OPENXR / XR ORIGIN', '现实空间与虚拟坐标校准'],
  ['BLENDER', '星球、飞船与障碍资产搭建'],
  ['HYPER3D', 'AI 辅助模型生成'],
  ['KIRO', '协同代码开发与功能脚本'],
]

const visualGuidelines = [
  ['visual-guideline-01.png', '星舵 Slogan 与字体设计'],
  ['visual-guideline-02.png', '星舵 UI 设计与游戏界面'],
  ['visual-guideline-03.png', '星舵 Logo 标准样式及规范'],
  ['visual-guideline-04.png', '星舵星球与关卡美术资产制作'],
  ['visual-guideline-05.png', '星舵飞船、障碍物与黑白洞美术资产制作'],
]

function StarHelmPage() {
  const showcaseVideoRef = useRef(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = '星舵 — AR Game Experience'
    window.scrollTo(0, 0)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible')
      })
    }, { threshold: 0.14 })
    document.querySelectorAll('.star-reveal').forEach((node) => observer.observe(node))

    const showcaseVideo = showcaseVideoRef.current
    const videoObserver = new IntersectionObserver(([entry]) => {
      if (!showcaseVideo) return
      if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
        showcaseVideo.muted = true
        showcaseVideo.play().catch(() => {})
      } else {
        showcaseVideo.pause()
      }
    }, { threshold: [0, 0.45, 0.8] })
    if (showcaseVideo) videoObserver.observe(showcaseVideo)

    return () => {
      document.title = previousTitle
      observer.disconnect()
      videoObserver.disconnect()
    }
  }, [])

  return (
    <main className="star-page">
      <header className="star-header">
        <a href={routePath('/')}><ArrowLeft size={20} /> 返回作品</a>
        <span className="star-header-brand">ZHANG D.<small>PORTFOLIO</small></span>
        <span>AR GAME / 2025</span>
      </header>

      <section className="star-hero">
        <video className="star-hero-video" autoPlay muted loop playsInline poster={assetPath('/cover-star-helm.png')}>
          <source src={assetPath('/videos/star-helm-showcase-web.mp4')} type="video/mp4" />
        </video>
        <div className="star-hero-glass" />
        <div className="star-hero-grid" />

        <div className="star-hero-content">
          <p className="star-hero-index">03 / AR EXPERIENCE · ROKID</p>
          <h1>STAR <span>HELM</span></h1>
          <div className="star-hero-bottom">
            <div>
              <strong>星舵</strong>
              <p>以手势为舵，驶向心中的星辰。</p>
            </div>
            <p>一场基于 AR 手势交互的沉浸式宇宙探索体验。<br />以引力与斥力重构轻量化空间游戏。</p>
          </div>
        </div>

        <a className="star-scroll" href="#star-film">
          <span>EXPLORE THE PROJECT</span><i><ArrowDown size={25} /></i>
        </a>
      </section>

      <section id="star-film" className="star-film" aria-label="星舵完整项目视频">
        <div className="star-film-heading star-shell">
          <span>01 / FULL EXPERIENCE</span>
          <p>SCROLL INTO VIEW · AUTOPLAY</p>
        </div>
        <video
          ref={showcaseVideoRef}
          className="star-showcase-video"
          controls
          muted
          playsInline
          preload="metadata"
          poster={assetPath('/cover-star-helm.png')}
        >
          <source src={assetPath('/videos/star-helm-showcase-web.mp4')} type="video/mp4" />
        </video>
      </section>

      <section className="star-section star-overview" id="star-overview">
        <div className="star-shell star-reveal">
          <div className="star-marker"><span>01</span><p>PROJECT OVERVIEW</p></div>
          <div className="star-overview-grid">
            <h2>用自然手势，<br />重新定义 AR 航行。</h2>
            <div className="star-overview-copy">
              <p>《星舵》依托 Rokid AR Max Pro 的手势与空间能力，摒弃复杂菜单和重竞技框架，以“创意交互机制 + 趣味障碍玩法”为核心。</p>
              <p>玩家通过托举、捏合和双力场，在主题星球之间牵引飞船、规避障碍、收集星币，让每一个手势都成为探索宇宙的语言。</p>
              <dl>
                <div><dt>ROLE</dt><dd>交互 / 视觉 / 3D</dd></div>
                <div><dt>PLATFORM</dt><dd>Rokid AR Max Pro</dd></div>
                <div><dt>ENGINE</dt><dd>Unity 2022.3 LTS</dd></div>
              </dl>
            </div>
          </div>
          <figure className="star-wide-figure"><img src={assetPath('/star-helm/overview.webp')} alt="星舵AR游戏项目概览" /></figure>
        </div>
      </section>

      <section className="star-section star-mechanics">
        <div className="star-shell">
          <div className="star-marker star-reveal"><span>02</span><p>CORE INTERACTION</p></div>
          <div className="star-section-heading star-reveal">
            <h2>ONE GESTURE.<br /><span>MORE POSSIBILITIES.</span></h2>
            <p>低门槛、高趣味。以一套统一手势逻辑，连接不同关卡与场景反馈。</p>
          </div>
          <div className="star-step-grid">
            {interactionSteps.map(([id, title, copy]) => (
              <article className="star-step star-reveal" key={id}>
                <span>{id}</span><h3>{title}</h3><p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="star-mechanic-gallery star-reveal">
            <img src={assetPath('/star-helm/mechanic-field.webp')} alt="星舵双力场玩法" />
            <img src={assetPath('/star-helm/mechanic-pull.webp')} alt="手势牵引飞船" />
            <img src={assetPath('/star-helm/mechanic-push.webp')} alt="手势生成力场" />
          </div>
        </div>
      </section>

      <section className="star-section star-worlds">
        <div className="star-shell">
          <div className="star-marker star-reveal"><span>03</span><p>WORLD BUILDING</p></div>
          <div className="star-section-heading star-reveal">
            <h2>THREE WORLDS.<br /><span>THREE EMOTIONS.</span></h2>
            <p>星球不只是背景，而是视觉情绪、障碍机制与关卡节奏的共同载体。</p>
          </div>
          <div className="star-planet-grid">
            {planets.map((planet, index) => (
              <article className="star-planet star-reveal" key={planet.en}>
                <span>0{index + 1}</span>
                <figure><img src={planet.image} alt={planet.name} /></figure>
                <h3>{planet.en}<small>{planet.name}</small></h3>
                <p>{planet.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="star-section star-visual-system">
        <div className="star-shell">
          <div className="star-marker star-reveal"><span>04</span><p>VISUAL SYSTEM / ASSETS</p></div>

          <div className="star-guideline-hero star-reveal">
            <figure className="star-guideline-logo"><img src={assetPath('/star-helm/logo.webp')} alt="星舵标志" /></figure>
            <div className="star-guideline-copy">
              <p>VISUAL LANGUAGE</p>
              <h2>以手势为舵，<br />驶向心中的星辰。</h2>
              <div className="star-swatches">
                <i style={{ background: '#28cec2' }}>#28CEC2</i>
                <i style={{ background: '#e8a74f' }}>#E8A74F</i>
                <i style={{ background: '#9d7ee0' }}>#9D7EE0</i>
                <i style={{ background: '#edfbef', color: '#101211' }}>#EDFBEF</i>
              </div>
            </div>
          </div>

          <div className="star-guideline-gallery" aria-label="星舵视觉规范与美术资产">
            {visualGuidelines.map(([file, alt]) => (
              <figure className="star-guideline-sheet star-reveal" key={file}>
                <img src={assetPath(`/star-helm/${file}`)} alt={alt} loading="lazy" />
              </figure>
            ))}
          </div>

        </div>
      </section>

      <section className="star-section star-technology">
        <div className="star-shell">
          <div className="star-marker star-reveal"><span>05</span><p>TECHNOLOGY</p></div>
          <div className="star-tech-layout">
            <div className="star-tech-copy star-reveal">
              <h2>技术服务于玩法，<br />而不是成为负担。</h2>
              <p>系统实时追踪 Palm、Wrist 与 IndexTip 等手部骨骼节点，并将多星球复合引力、轨道稳定与 AR 空间校准组织成连续反馈。</p>
            </div>
            <div className="star-tech-list">
              {technologies.map(([title, copy], index) => (
                <article className="star-reveal" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>
              ))}
            </div>
          </div>
          <div className="star-tech-images star-reveal">
            <img src={assetPath('/star-helm/technology-unity-new.png')} alt="Unity手势追踪开发画面" />
            <img src={assetPath('/star-helm/technology-white-hole.png')} alt="白洞AR手势交互演示" />
          </div>
        </div>
      </section>

      <section className="star-section star-demo">
        <div className="star-shell">
          <div className="star-marker star-reveal"><span>06</span><p>IN THE REAL WORLD</p></div>
          <div className="star-demo-heading star-reveal">
            <h2>与现实共舞。</h2>
            <p>从屏幕原型走向真实空间，验证玩家动线、多人观察和空间尺度中的可玩性。</p>
          </div>
          <div className="star-demo-gallery">
            <img className="star-reveal" src={assetPath('/star-helm/demo-interface-03.jpg')} alt="佩戴Rokid眼镜查看星舵玩法说明界面" />
            <img className="star-reveal" src={assetPath('/star-helm/demo-interface-01.png')} alt="星舵星球选择AR界面实景" />
            <img className="star-reveal" src={assetPath('/star-helm/demo-live-02.png')} alt="星舵AR游戏空间实景" />
            <img className="star-reveal" src={assetPath('/star-helm/demo-interface-02.png')} alt="星舵飞船交互AR界面实景" />
          </div>
        </div>
      </section>

      <footer className="star-ending">
        <img className="star-ending-cover" src={assetPath('/star-helm/ending-cover.png')} alt="星舵项目封尾视觉" />
        <a className="star-ending-home" href={routePath('/')}>
          <ArrowLeft size={26} />
          <span>返回主界面</span>
        </a>
      </footer>
    </main>
  )
}

export default StarHelmPage
