import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { assetPath, routePath } from './paths.js'

const explorationPosters = [
  {
    id: '01',
    src: assetPath('/biennale/exploration-01.png'),
    title: '主视觉构成 / 青绿与品红',
    meta: 'COMPOSITION · CYAN / MAGENTA',
  },
  {
    id: '02',
    src: assetPath('/biennale/exploration-02.png'),
    title: '主视觉构成 / 深蓝与高明黄',
    meta: 'COMPOSITION · NAVY / YELLOW',
  },
  {
    id: '03',
    src: assetPath('/biennale/exploration-03.png'),
    title: '色彩探索 / 橙红与荧光绿',
    meta: 'COLOR STUDY · ORANGE / GREEN',
  },
  {
    id: '04',
    src: assetPath('/biennale/exploration-04.png'),
    title: '色彩探索 / 品红与青色块面',
    meta: 'COLOR STUDY · MAGENTA / CYAN',
  },
]

const finalPosters = [
  {
    id: '05',
    src: assetPath('/biennale/final-horizontal.jpg'),
    title: '横向主视觉',
    meta: 'FINAL KEY VISUAL · HORIZONTAL',
  },
  {
    id: '06',
    src: assetPath('/biennale/final-poster-01.png'),
    title: '竖版主视觉方案 A',
    meta: 'FINAL POSTER · VERSION A',
  },
  {
    id: '07',
    src: assetPath('/biennale/final-poster-02.png'),
    title: '竖版主视觉方案 B',
    meta: 'FINAL POSTER · VERSION B',
  },
]

function BiennalePage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = '艺术与科技双年展 · Visual System'
    window.scrollTo(0, 0)

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible')
      })
    }, { threshold: 0.14 })

    document.querySelectorAll('.biennale-reveal').forEach((node) => observer.observe(node))

    return () => {
      document.title = previousTitle
      observer.disconnect()
    }
  }, [])

  return (
    <main className="biennale-page">
      <header className="biennale-case-header">
        <a href={routePath('/')}><ArrowLeft size={18} /> 返回作品</a>
        <span>ZHANG D.<small>PORTFOLIO</small></span>
        <p>VISUAL SYSTEM / 2025</p>
      </header>

      <section className="biennale-logo-motion" id="logo-motion">
        <div className="biennale-case-shell">
          <div className="biennale-section-head biennale-reveal">
            <span>01 / DYNAMIC LOGO</span>
            <h2>Logo 变化动效</h2>
            <p>将圆环形态拆解为可旋转、可重组的动态符号，使展览标识从静态识别延展为时间中的视觉事件。</p>
          </div>
          <div className="biennale-motion-frame biennale-reveal">
            <video autoPlay muted loop playsInline controls>
              <source src={assetPath('/biennale/logo-motion.mp4')} type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <section className="biennale-exploration">
        <div className="biennale-case-shell">
          <div className="biennale-section-head biennale-reveal">
            <span>02 / VISUAL COMPOSITION · COLOR STUDIES</span>
            <h2>主视觉构成与色彩探索</h2>
            <p>前期方案以曲面切割和强对比色彩为主要方法，测试图片、中文标题、英文信息与展览色彩之间的张力。</p>
          </div>
          <div className="biennale-poster-grid">
            {explorationPosters.map((poster) => (
              <article className="biennale-poster-card biennale-reveal" key={poster.id}>
                <figure>
                  <img src={poster.src} alt={poster.title} />
                </figure>
                <div>
                  <span>({poster.id})</span>
                  <p>{poster.meta}</p>
                  <h3>{poster.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="biennale-final">
        <div className="biennale-case-shell">
          <div className="biennale-section-head biennale-reveal">
            <span>03 / FINAL KEY VISUAL SYSTEM</span>
            <h2>最终主视觉方案</h2>
            <p>最终方案收束为青色、品红、深蓝三组核心色，并通过大曲面遮罩和信息块面建立清晰的展览传播层级。</p>
          </div>

          <article className="biennale-final-wide biennale-reveal">
            <figure><img src={finalPosters[0].src} alt={finalPosters[0].title} /></figure>
            <div>
              <span>({finalPosters[0].id})</span>
              <p>{finalPosters[0].meta}</p>
              <h3>{finalPosters[0].title}</h3>
            </div>
          </article>

          <div className="biennale-final-grid">
            {finalPosters.slice(1).map((poster) => (
              <article className="biennale-final-card biennale-reveal" key={poster.id}>
                <figure>
                  <img src={poster.src} alt={poster.title} />
                </figure>
                <div>
                  <span>({poster.id})</span>
                  <p>{poster.meta}</p>
                  <h3>{poster.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="biennale-onsite">
        <div className="biennale-case-shell">
          <div className="biennale-section-head biennale-reveal">
            <span>04 / ON-SITE DISPLAY</span>
            <h2>现场展示图</h2>
            <p>主视觉在建筑外立面大屏中落地，品红色块与双年展标识形成远距离识别点。</p>
          </div>
          <figure className="biennale-onsite-image biennale-reveal">
            <img src={assetPath('/biennale/onsite-display.png')} alt="艺术与科技双年展现场展示图" />
          </figure>
          <a className="biennale-ending-home biennale-reveal" href={routePath('/')}>
            <ArrowLeft size={25} />
            <span>返回主界面</span>
          </a>
        </div>
      </section>
    </main>
  )
}

export default BiennalePage
