/* Sistema de movimento do kit. Roda em toda proposta.
   Só transform e opacity — tudo no compositor, nada de layout. */
;(() => {
  const doc = document
  const corpo = doc.body
  corpo.classList.remove('no-js')
  corpo.classList.add('js')

  // Quebra o texto de um elemento em <span class="classe"> por palavra,
  // devolvendo os espaços como nós de texto: o textContent final é idêntico
  // ao original, e leitor de tela lê a frase inteira.
  const quebrar = (el, classe) => {
    const partes = el.textContent.split(/(\s+)/)
    el.textContent = ''
    const spans = []
    for (const parte of partes) {
      if (!parte) continue
      if (/^\s+$/.test(parte)) {
        el.append(parte)
        continue
      }
      const s = doc.createElement('span')
      s.className = classe
      s.style.setProperty('--i', spans.length)
      s.textContent = parte
      el.append(s)
      spans.push(s)
    }
    return spans
  }

  const limitar = (v) => Math.min(1, Math.max(0, v))

  // A troca de classe acima é síncrona e imediata — precisa acontecer antes
  // de qualquer coisa, inclusive do early-return sob movimento reduzido. O
  // resto (todo o querySelectorAll de atributos data-*) espera o documento
  // terminar de parsear: o script é sempre o último nó do <body>, então
  // qualquer conteúdo real de seção já existe nesse ponto de qualquer jeito;
  // esperar só garante que isso vale mesmo quando o body é montado de forma
  // incremental (como em teste, via injeção após o próprio <script>).
  const iniciar = () => {
    const parado = matchMedia('(prefers-reduced-motion: reduce)').matches

    /* Texto que acende palavra por palavra conforme a rolagem. Parado, já
       nasce todo aceso. */
    const acendiveis = [...doc.querySelectorAll('[data-acende]')].map((el) => ({
      el,
      palavras: quebrar(el, 'p'),
    }))

    /* Barra de WhatsApp do celular: aparece depois do hero, some quando o
       bloco de contato está na tela. É função, não enfeite — roda também
       com movimento reduzido (o CSS só tira a transição). */
    const barra = doc.querySelector('.barra-zap')
    const topo = doc.getElementById('topo')
    const contato = doc.getElementById('contato')

    const pilhas = [...doc.querySelectorAll('[data-pilha]')].map((el) => {
      const cartoes = [...el.children]
      cartoes.forEach((c, n) => c.style.setProperty('--n', n))
      return cartoes
    })

    let pendente = false
    const quadro = () => {
      pendente = false
      const h = innerHeight
      if (barra) {
        let on = topo ? topo.getBoundingClientRect().bottom < h * 0.4 : scrollY > h * 0.6
        if (contato) on = on && contato.getBoundingClientRect().top > h * 0.95
        barra.classList.toggle('on', on)
      }
      if (parado) return
      // No fim da página não há mais rolagem para acender o resto: o que
      // estiver na tela acende inteiro.
      const fim = scrollY + h >= doc.documentElement.scrollHeight - 4
      for (const { el, palavras } of acendiveis) {
        const r = el.getBoundingClientRect()
        const prog = fim && r.top < h ? 1 : limitar((h * 0.85 - r.top) / (r.height + h * 0.35))
        const acesas = Math.ceil(prog * palavras.length)
        palavras.forEach((p, i) => p.classList.toggle('on', i < acesas))
      }
      for (const cartoes of pilhas) {
        cartoes.forEach((c, i) => {
          const prox = cartoes[i + 1]
          if (!prox) return
          const d = prox.getBoundingClientRect().top - c.getBoundingClientRect().top
          const k = limitar(1 - d / c.offsetHeight)
          c.style.transform = k ? `scale(${(1 - k * 0.06).toFixed(3)})` : ''
          c.style.filter = k ? `brightness(${(1 - k * 0.15).toFixed(3)})` : ''
        })
      }
    }
    if (barra || acendiveis.length || pilhas.length) {
      addEventListener(
        'scroll',
        () => {
          if (pendente) return
          pendente = true
          requestAnimationFrame(quadro)
        },
        { passive: true },
      )
      addEventListener('resize', quadro, { passive: true })
      quadro()
    }

    if (parado) {
      doc.querySelectorAll('[data-reveal],[data-revela]').forEach((el) => el.classList.add('is-in'))
      for (const { palavras } of acendiveis) palavras.forEach((p) => p.classList.add('on'))
      return
    }

    /* Título que sobe palavra por palavra. */
    doc.querySelectorAll('[data-palavras]').forEach((el) => quebrar(el, 'w'))

    /* Reveal por scroll. */
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue
          e.target.classList.add('is-in')
          obs.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    )
    doc.querySelectorAll('[data-reveal],[data-revela]').forEach((el) => obs.observe(el))

    /* Contadores. O texto final já está no HTML — a contagem é enfeite por
       cima, nunca a fonte do número. */
    const fmt = new Intl.NumberFormat('pt-BR')
    const contar = (el) => {
      const alvo = Number(el.dataset.count)
      if (!Number.isFinite(alvo)) return
      const final = el.textContent
      const dur = 1400
      const t0 = performance.now()
      const passo = (t) => {
        const p = Math.min(1, (t - t0) / dur)
        const eased = 1 - Math.pow(1 - p, 3)
        if (p < 1) {
          el.textContent = fmt.format(Math.round(alvo * eased))
          requestAnimationFrame(passo)
        } else {
          el.textContent = final
        }
      }
      requestAnimationFrame(passo)
    }
    const obsCount = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue
          contar(e.target)
          obsCount.unobserve(e.target)
        }
      },
      { threshold: 0.6 },
    )
    doc.querySelectorAll('[data-count]').forEach((el) => obsCount.observe(el))

    /* Parallax. */
    const camadas = [...doc.querySelectorAll('[data-parallax]')]
    if (camadas.length) {
      let pendenteP = false
      const mover = () => {
        pendenteP = false
        const meio = innerHeight / 2
        for (const el of camadas) {
          const r = el.getBoundingClientRect()
          const d = (r.top + r.height / 2 - meio) * Number(el.dataset.parallax || 0.2)
          el.style.transform = `translate3d(0, ${(-d).toFixed(1)}px, 0)`
        }
      }
      addEventListener(
        'scroll',
        () => {
          if (pendenteP) return
          pendenteP = true
          requestAnimationFrame(mover)
        },
        { passive: true },
      )
      mover()
    }

    /* Tilt e brilho seguem o ponteiro — só existem onde há ponteiro de
       verdade. No toque, o wow vem da rolagem, não daqui. */
    if (!matchMedia('(hover: hover)').matches) return

    doc.querySelectorAll('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (ev) => {
        const r = el.getBoundingClientRect()
        const x = (ev.clientX - r.left) / r.width - 0.5
        const y = (ev.clientY - r.top) / r.height - 0.5
        el.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`
      })
      el.addEventListener('pointerleave', () => {
        el.style.transform = ''
      })
    })

    doc.querySelectorAll('[data-glow]').forEach((el) => {
      el.addEventListener('pointermove', (ev) => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--gx', `${ev.clientX - r.left}px`)
        el.style.setProperty('--gy', `${ev.clientY - r.top}px`)
      })
    })
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', iniciar)
  } else {
    iniciar()
  }
})()
