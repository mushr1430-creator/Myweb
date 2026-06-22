import { lazy, Suspense, useEffect, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  MoveUpRight,
} from 'lucide-react'
import { assetPath, currentRoutePath, routePath } from './paths.js'

const WhiteHazeVrPage = lazy(() => import('./WhiteHazeVrPage.jsx'))
const StarHelmPage = lazy(() => import('./StarHelmPage.jsx'))
const BiennalePage = lazy(() => import('./BiennalePage.jsx'))

const projects = [
  {
    id: '01',
    title: 'VR 影片《白霭区》',
    enTitle: 'WHITE HAZE DISTRICT',
    type: 'VR EXPERIENCE · SPATIAL',
    year: '2025',
    description: '探索 VR 影像中的空间叙事与观看节奏，让体验在虚拟环境中保持自然、连贯与富有情绪。',
    visual: 'vr',
  },
  {
    id: '02',
    title: 'AR 游戏——星舵',
    enTitle: 'STAR HELM · AR GAME',
    type: 'AR EXPERIENCE · GAME DESIGN',
    year: '2025',
    description: '以星球探索为主题，将角色、空间与交互线索组织成富有想象力的 AR 游戏体验。',
    visual: 'star-helm',
  },
  {
    id: '03',
    title: '艺术与科技双年展',
    enTitle: 'CHINA·HANGZHOU\nArt and Technology Biennale',
    type: 'VISUAL SYSTEM · MOTION',
    year: '2025',
    description: '以动态核心图形建立展览视觉系统，在秩序、流动与数字感之间寻找新的传播语法。',
    visual: 'biennale',
  },
]

function Logo() {
  return (
    <a className="logo" href="#top" aria-label="返回首页">
      <span className="logo-mark"><i /><i /></span>
      <span>ZDY.<small>PORTFOLIO</small></span>
    </a>
  )
}

const projectCovers = {
  jd: { src: assetPath('/cover-jd-ai.png'), ratio: '1920 / 1080' },
  biennale: { src: assetPath('/cover-biennale-hover-v2.png'), ratio: '1608 / 538' },
  'star-helm': {
    src: assetPath('/cover-star-helm-clean.png'),
    hoverSrc: assetPath('/cover-star-helm-title.png'),
    ratio: '1282 / 542',
  },
  vr: { src: assetPath('/project-pale-nav-clean-v2.png'), ratio: '1722 / 726' },
}

function ProjectVisual({ project }) {
  const cover = projectCovers[project.visual]
  if (project.visual === 'biennale') {
    return (
      <div className="project-art static-project-cover biennale-cover" style={{ aspectRatio: cover.ratio }}>
        <img className="biennale-base" src={cover.src} alt="艺术与科技双年展项目封面" />
      </div>
    )
  }
  if (project.visual === 'star-helm') {
    return (
      <div className="project-art static-project-cover star-helm-cover" style={{ aspectRatio: cover.ratio }}>
        <img className="star-helm-base" src={cover.src} alt="星舵AR游戏项目场景封面" />
        <img className="star-helm-title-layer" src={cover.hoverSrc} alt="" aria-hidden="true" />
      </div>
    )
  }
  if (project.visual === 'vr') {
    return (
      <div className="project-art static-project-cover white-haze-cover" style={{ aspectRatio: cover.ratio }}>
        <img className="white-haze-base" src={cover.src} alt="白霭区项目场景封面" />
        <div className="white-haze-overlay" aria-hidden="true">
          <i className="white-haze-top-line" />
          <span className="white-haze-symbols">× ◆ ▪▪ ＋ ＋ ＋ ＋ ＋ ＋ ＋ ＋</span>
          <strong>PALE NAV</strong>
          <i className="white-haze-hatch" />
          <i className="white-haze-bottom-line" />
        </div>
      </div>
    )
  }
  return (
    <div className="project-art static-project-cover" style={{ aspectRatio: cover.ratio }}>
      <img src={cover.src} alt={`${project.title}项目封面`} />
    </div>
  )
}

function rememberProjectPosition() {
  try {
    sessionStorage.setItem('portfolioReturnY', String(window.scrollY))
  } catch {
    // ignore unavailable session storage
  }
}

function PortfolioApp() {
  const [time, setTime] = useState('')
  const [ripples, setRipples] = useState([])

  useEffect(() => {
    const update = () => setTime(new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date()))
    update()
    const timer = setInterval(update, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timers = new Set()
    let pointerFrame = 0
    let pointerX = 0
    let pointerY = 0
    const renderPointer = () => {
      document.documentElement.style.setProperty('--mouse-x', `${pointerX}px`)
      document.documentElement.style.setProperty('--mouse-y', `${pointerY}px`)
      pointerFrame = 0
    }
    const move = (event) => {
      pointerX = event.clientX
      pointerY = event.clientY
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointer)
    }
    const ripple = (event) => {
      if (!event.target.closest?.('.minimal-home, .minimal-contact')) return
      const id = `${Date.now()}-${Math.random()}`
      setRipples((current) => [...current.slice(-4), { id, x: event.clientX, y: event.clientY }])
      const timer = window.setTimeout(() => {
        setRipples((current) => current.filter((item) => item.id !== id))
        timers.delete(timer)
      }, 1900)
      timers.add(timer)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', ripple)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', ripple)
      window.cancelAnimationFrame(pointerFrame)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    let savedY = null
    try {
      savedY = sessionStorage.getItem('portfolioReturnY')
      if (savedY !== null) sessionStorage.removeItem('portfolioReturnY')
    } catch {
      savedY = null
    }
    if (savedY === null) return undefined

    const targetY = Number(savedY)
    if (!Number.isFinite(targetY)) return undefined

    let secondFrame = 0
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: targetY, behavior: 'auto' })
      secondFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, behavior: 'auto' })
      })
    })

    return () => {
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(secondFrame)
    }
  }, [])

  useEffect(() => {
    let frame = 0
    const updateScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const hero = document.querySelector('.hero')
        if (!hero) return
        const range = Math.max(hero.offsetHeight - window.innerHeight, 1)
        const progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / range))
        document.documentElement.style.setProperty('--hero-progress', progress.toFixed(4))
      })
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible')
      })
    }, { threshold: 0.16 })

    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element))
    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })
    window.addEventListener('resize', updateScroll)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', updateScroll)
      window.removeEventListener('resize', updateScroll)
    }
  }, [])

  return (
    <main id="top">
      <div className="pointer-glow" />
      <div className="hero-pointer-ring" aria-hidden="true" />
      <div className="minimal-cursor" aria-hidden="true"><i /><i /><i /><i /></div>
      {ripples.map((ripple) => (
        <i className="page-ripple" key={ripple.id} style={{ left: ripple.x, top: ripple.y }} aria-hidden="true">
          <span /><span /><span />
        </i>
      ))}

      <section className="hero minimal-hero" aria-label="首页">
        <div className="hero-stage minimal-home">
          <video className="hero-video" autoPlay muted loop playsInline>
            <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4" />
          </video>
          <div className="hero-shade" />
          <div className="minimal-glass" />
          <div className="minimal-interaction" />
          <header className="site-header minimal-header shell">
            <a className="minimal-brand" href="#top">ZHANG D.</a>
            <nav aria-label="主导航">
              <a href="#projects">项目</a>
              <a href="#about">关于</a>
              <a href="#contact">联系我</a>
            </nav>
            <div className="minimal-status">UI/UX · 3D · VISUAL</div>
          </header>

          <div className="minimal-scroll-index" aria-hidden="true">
            <span>01 // 04</span><i /> <span>SCROLL ↓</span>
          </div>

          <div className="minimal-title-wrap shell">
            <h1 aria-label="MULTI-DISCIPLINARY DESIGNER">
              <span>MULTI-</span>
              <span>DISCIPLINARY</span>
              <span>DESIGNER</span>
            </h1>
            <p className="minimal-hero-copy">
              <strong>UI/UX DESIGNER · 3D ARTIST · VISUAL DESIGNER</strong>
              DESIGNING INTERFACES, IMAGES AND SPACES AT THE INTERSECTION OF ART, TECHNOLOGY AND PEOPLE.
            </p>
          </div>

          <a className="minimal-down" href="#about" aria-label="向下浏览"><ArrowDown size={40} /></a>
        </div>
      </section>

      <section className="about acid-profile section" id="about">
        <div className="acid-profile-grid" aria-hidden="true" />
        <div className="profile-marquee" aria-hidden="true">
          <span>ZHANG DAIYUAN · PROFILE · UI/UX · 3D ART · VISUAL DESIGN · </span>
          <span>ZHANG DAIYUAN · PROFILE · UI/UX · 3D ART · VISUAL DESIGN · </span>
        </div>
        <div className="shell acid-profile-inner">
          <div className="section-marker acid-profile-marker">
            <span>01</span>
            <p>ABOUT / IDENTITY</p>
          </div>

          <div className="profile-editorial" data-reveal>
            <figure className="profile-photo-large">
              <img src={assetPath('/profile-editorial.png')} alt="张玳源在埃及金字塔前的个人形象照" />
              <figcaption><span>SUBJECT_001</span><span>CAIRO / 2026</span></figcaption>
            </figure>

            <article className="profile-introduction">
              <p className="profile-overline">HELLO / 你好</p>
              <h2>张玳源</h2>
              <p className="profile-role-large">UI/UX DESIGNER<br />3D ARTIST<br />VISUAL DESIGNER</p>
              <p className="profile-bio">现就读于中国美术学院创新设计学院，熟练掌握全套设计软件与AIGC创作工具，研究体验设计、交互设计等领域，拥有跨媒介能力，作品延展至动效、三维和沉浸式影像。</p>
              <div className="profile-tool-icons">
                <span>PS</span><span>AI</span><span>FIG</span><span>AE</span><span>BLD</span><span>UE5</span>
              </div>
            </article>

            <aside className="profile-history">
              <div className="history-column">
                <p className="history-label">EDUCATION</p>
                <div className="history-item"><time>2023 — 2027</time><h3>中国美术学院</h3><p>创新设计学院 · 本科<br />UI/UX 设计方向</p></div>
                <div className="history-item mini-data"><time>PERSONAL</time><h3>2005.04.16</h3><p>杭州 / 中国</p></div>
              </div>

              <div className="history-column">
                <p className="history-label">SELECTED HONORS</p>
                <div className="history-item"><time>2024</time><h3>马利艺术奖学金</h3><p>专业奖学金</p></div>
                <div className="history-item"><time>2025</time><h3>中国美术学院学年奖学金</h3><p>Academic Scholarship</p></div>
                <div className="history-item"><time>2025</time><h3>Spatial Joy AR&AI</h3><p>全球开发大赛 · 校园优秀奖</p></div>
              </div>
            </aside>
          </div>

          <div className="profile-contact-row" data-reveal>
            <a href="mailto:2690881791@qq.com"><span>EMAIL</span><b>2690881791@qq.com</b><ArrowRight size={20} /></a>
            <a href="tel:15025362852"><span>PHONE</span><b>150 2536 2852</b><ArrowRight size={20} /></a>
            <p><span>WECHAT</span><b>Zdy2690881791</b></p>
          </div>

          <div className="soft-skills" data-reveal>
            <h3>SOFT-SKILLS</h3>
            <div className="soft-skill-grid">
              <div><span>创意表达</span><strong>90%</strong></div>
              <div><span>用户研究</span><strong>90%</strong></div>
              <div><span>团队协作</span><strong>90%</strong></div>
              <div><span>时间管理</span><strong>85%</strong></div>
              <div><span>沟通能力</span><strong>90%</strong></div>
              <div><span>抗压能力</span><strong>85%</strong></div>
            </div>
          </div>

          <div className="profile-capability-line" data-reveal>
            <span>平面 / 动效</span><b>Photoshop · Illustrator · Figma · After Effects</b>
            <span>3D / 引擎</span><b>Blender · Unreal Engine 5</b>
            <span>AIGC 工具</span><b>即梦 · nano banana · Codex</b>
          </div>
        </div>
      </section>

      <section className="projects section" id="projects">
        <div className="shell">
          <div className="section-marker light-marker">
            <span>02</span>
            <p>SELECTED WORK / 2025—2026</p>
          </div>
          <div className="projects-heading" data-reveal>
            <h2>SELECTED<br /><span>WORKS.</span></h2>
            <div className="projects-heading-side">
              <p>从产品体验、动态视觉到沉浸空间，<br />每个项目都是一次对新边界的试探。</p>
            </div>
          </div>
        </div>

        <div className="project-list shell index static-project-list">
          {projects.map((project) => {
            const projectHref = project.visual === 'vr'
              ? routePath('/projects/white-haze')
              : project.visual === 'star-helm' ? routePath('/projects/star-helm')
                : project.visual === 'biennale' ? routePath('/projects/biennale') : null
            const ProjectTag = projectHref ? 'a' : 'article'
            return (
            <ProjectTag
              className="project-card static-project-card"
              key={project.id}
              {...(projectHref ? {
                href: projectHref,
                onClick: rememberProjectPosition,
                'aria-label': project.visual === 'vr'
                  ? '观看白霭区180度VR影片'
                  : project.visual === 'star-helm'
                    ? '查看AR游戏星舵项目'
                    : '查看艺术与科技双年展项目',
              } : {})}
            >
              <ProjectVisual project={project} />
              <div className="project-info">
                <div className="project-index">({project.id})</div>
                <div className="project-title">
                  <span>{project.type}</span>
                  <h3>{project.title}</h3>
                  <p>{project.enTitle}</p>
                </div>
                <p className="project-description">{project.description}</p>
                <div className="project-year">{project.year}</div>
                {(project.visual === 'vr' || project.visual === 'star-helm' || project.visual === 'biennale') && <span className="project-arrow" aria-hidden="true"><MoveUpRight size={24} /></span>}
              </div>
            </ProjectTag>
          )})}
        </div>
      </section>

      <footer className="contact minimal-contact" id="contact">
        <div className="contact-inner shell">
          <div className="contact-nav-row">
            <a className="contact-brand" href="#top">ZHANG D.</a>
            <nav aria-label="页尾导航">
              <a href="#projects">项目</a>
              <a href="#about">关于</a>
            </nav>
            <span className="contact-role-pill">UI/UX · 3D · VISUAL</span>
          </div>

          <div className="contact-glass-panel">
            <p>GOT A PROJECT IN MIND?</p>
            <h2>LET’S CONNECT</h2>
      <a href="mailto:2690881791@qq.com" className="contact-message-button">
        联系我
      </a>
          </div>

          <div className="contact-social-row">
            <span>FEEL FREE TO CONNECT WITH ME</span>
            <a href="mailto:2690881791@qq.com">EMAIL</a>
            <a href="tel:15025362852">PHONE</a>
            <span>WECHAT · ZDY2690881791</span>
          </div>
          <div className="contact-legal">© 2026 ZHANG DAIYUAN · HANGZHOU · {time} CST</div>
        </div>
      </footer>
    </main>
  )
}

function App() {
  const pathname = currentRoutePath()
  if (pathname === '/projects/white-haze') {
    return (
      <Suspense fallback={<div className="vr-page-loading">LOADING 180° EXPERIENCE...</div>}>
        <WhiteHazeVrPage />
      </Suspense>
    )
  }
  if (pathname === '/projects/star-helm') {
    return (
      <Suspense fallback={<div className="vr-page-loading">LOADING AR EXPERIENCE...</div>}>
        <StarHelmPage />
      </Suspense>
    )
  }
  if (pathname === '/projects/biennale') {
    return (
      <Suspense fallback={<div className="vr-page-loading">LOADING VISUAL SYSTEM...</div>}>
        <BiennalePage />
      </Suspense>
    )
  }
  return <PortfolioApp />
}

export default App
