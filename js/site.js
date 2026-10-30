/* Itaboraí TV — o que faz a página parecer uma transmissão ao vivo.
   Cada bloco é independente: se um falhar, os outros seguem. */
;(() => {
  const doc = document
  const parado = matchMedia('(prefers-reduced-motion: reduce)').matches
  const conexao = navigator.connection || {}
  const economia = conexao.saveData === true || /2g/.test(conexao.effectiveType || '')
  const ZAP = '5521964235899'
  const API = 'https://itaboraitv.com.br/wp-json/wp/v2'

  /* WhatsApp com a mensagem já escrita. */
  doc.querySelectorAll('[data-zap]').forEach((a) => {
    a.href = `https://wa.me/${ZAP}?text=${encodeURIComponent(a.dataset.zap)}`
  })

  /* Relógio de Itaboraí no selo "ao vivo". */
  const relogio = doc.querySelector('[data-relogio]')
  if (relogio) {
    const fmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    const bater = () => { relogio.textContent = fmt.format(new Date()) }
    bater()
    setInterval(bater, 15000)
  }

  /* Cabeçalho ganha fundo quando sai do hero. */
  const cabecalho = doc.getElementById('cabecalho')
  const marcar = () => cabecalho.classList.toggle('rolou', scrollY > 40)
  addEventListener('scroll', marcar, { passive: true })
  marcar()

  /* Tarja da TV: troca como numa transmissão. */
  const tarja = doc.querySelector('.tv .tarja')
  if (tarja && !parado) {
    const chapeu = tarja.querySelector('[data-tarja-chapeu]')
    const texto = tarja.querySelector('[data-tarja-texto]')
    const roteiro = [
      ['Itaboraí TV', 'Anderson Pedrinha, repórter'],
      ['Trânsito', 'BR-101 com lentidão sentido Região dos Lagos'],
      ['Cidade', 'Caminhada Rosa reúne moradores no Centro'],
      ['Trânsito', 'Situação na passarela de Manilha às 18h'],
    ]
    let i = 0
    tarja.classList.add('troca')
    setInterval(() => {
      tarja.classList.add('sai')
      setTimeout(() => {
        i = (i + 1) % roteiro.length
        chapeu.textContent = roteiro[i][0]
        texto.textContent = roteiro[i][1]
        tarja.classList.remove('sai', 'troca')
        void tarja.offsetWidth
        tarja.classList.add('troca')
      }, 380)
    }, 4800)
  }

  /* Plantão: a fita é duplicada para o laço não ter emenda. */
  const fita = doc.querySelector('[data-plantao]')
  const montarFita = (itens) => {
    if (!fita) return
    if (itens) {
      fita.textContent = ''
      for (const { titulo, link } of itens) {
        const li = doc.createElement('li')
        const a = doc.createElement('a')
        a.href = link
        a.textContent = titulo
        li.append(a)
        fita.append(li)
      }
    }
    fita.querySelectorAll('[aria-hidden]').forEach((n) => n.remove())
    const originais = [...fita.children]
    for (const li of originais) {
      const copia = li.cloneNode(true)
      copia.setAttribute('aria-hidden', 'true')
      copia.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'))
      fita.append(copia)
    }
    fita.style.setProperty('--dur', `${Math.max(30, fita.scrollWidth / 2 / 70)}s`)
  }
  montarFita()

  /* ── Notícias ao vivo do WordPress atual ─────────────────────────── */
  const grade = doc.querySelector('[data-manchetes]')
  const filtros = doc.querySelector('[data-filtros]')
  const botaoMais = doc.querySelector('[data-mais]')
  const decodificar = (html) => {
    const t = doc.createElement('textarea')
    t.innerHTML = html
    return t.value
  }
  const limpar = (html) => decodificar(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  const nomeCat = (n) => {
    const s = decodificar(n).toLocaleLowerCase('pt-BR')
    return s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1)
  }
  const dataFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })

  const normalizar = (p) => {
    const emb = p._embedded || {}
    const midia = (emb['wp:featuredmedia'] || [])[0] || {}
    const tamanhos = (midia.media_details && midia.media_details.sizes) || {}
    const img = (tamanhos.medium_large || tamanhos.large || {}).source_url || midia.source_url || null
    const cats = (emb['wp:term'] || []).flat().filter((t) => t && t.taxonomy === 'category')
    return {
      titulo: limpar(p.title.rendered),
      link: p.link,
      data: p.date,
      resumo: limpar(p.excerpt.rendered),
      img,
      cat: cats[0] ? nomeCat(cats[0].name) : 'Notícias',
    }
  }

  const cartao = (n, destaque) => {
    const art = doc.createElement('article')
    art.className = destaque ? 'nota nota--destaque' : 'nota'
    const a = doc.createElement('a')
    a.href = n.link
    const fig = doc.createElement('figure')
    fig.className = 'nota__img'
    const img = doc.createElement('img')
    img.loading = 'lazy'
    img.alt = ''
    if (n.img) {
      img.src = n.img
      img.onerror = () => { fig.classList.add('nota__img--vazia'); img.src = 'img/logo.png' }
    } else {
      fig.classList.add('nota__img--vazia')
      img.src = 'img/logo.png'
    }
    fig.append(img)
    const corpo = doc.createElement('div')
    corpo.className = 'nota__corpo'
    const meta = doc.createElement('p')
    meta.className = 'nota__meta'
    const cat = doc.createElement('span')
    cat.className = 'nota__cat'
    cat.textContent = n.cat
    const quando = doc.createElement('time')
    quando.dateTime = n.data
    quando.textContent = dataFmt.format(new Date(n.data))
    meta.append(cat, quando)
    const h = doc.createElement('h3')
    h.className = 'nota__titulo'
    h.textContent = n.titulo
    corpo.append(meta, h)
    if (destaque && n.resumo) {
      const r = doc.createElement('p')
      r.className = 'nota__resumo'
      r.textContent = n.resumo
      corpo.append(r)
    }
    a.append(fig, corpo)
    art.append(a)
    return art
  }

  let catAtual = ''
  let pagina = 1
  let totalPaginas = 1

  const buscar = async (cat, pag) => {
    const q = new URLSearchParams({ per_page: '7', page: String(pag), _embed: 'wp:featuredmedia,wp:term' })
    if (cat) q.set('categories', cat)
    const r = await fetch(`${API}/posts?${q}`)
    if (!r.ok) throw new Error(`API ${r.status}`)
    totalPaginas = Number(r.headers.get('X-WP-TotalPages')) || 1
    return (await r.json()).map(normalizar)
  }

  const desenhar = (lista, anexar) => {
    if (!anexar) {
      grade.textContent = ''
      // Destaque: a mais recente que tem foto.
      const iDest = Math.max(0, lista.findIndex((n) => n.img))
      const [dest] = lista.splice(iDest, 1)
      if (dest) grade.append(cartao(dest, true))
      lista = lista.slice(0, 6)
    }
    for (const n of lista) grade.append(cartao(n, false))
    botaoMais.hidden = pagina >= totalPaginas
  }

  const carregar = async (cat) => {
    grade.classList.add('carregando')
    try {
      pagina = 1
      const lista = await buscar(cat, 1)
      if (lista.length) desenhar(lista, false)
      return lista
    } catch {
      botaoMais.hidden = true
      return null
    } finally {
      grade.classList.remove('carregando')
    }
  }

  if (grade) {
    carregar('').then((lista) => {
      if (lista && lista.length) montarFita(lista.slice(0, 8))
    })

    fetch(`${API}/categories?per_page=20&hide_empty=true&_fields=id,name,count`)
      .then((r) => (r.ok ? r.json() : []))
      .then((cats) => {
        cats
          .filter((c) => !/itabora/i.test(c.name))
          .sort((a, b) => b.count - a.count)
          .forEach((c) => {
            const b = doc.createElement('button')
            b.type = 'button'
            b.className = 'filtro'
            b.dataset.cat = c.id
            b.setAttribute('aria-pressed', 'false')
            b.textContent = nomeCat(c.name)
            filtros.append(b)
          })
      })
      .catch(() => {})

    filtros.addEventListener('click', (ev) => {
      const b = ev.target.closest('.filtro')
      if (!b || b.getAttribute('aria-pressed') === 'true') return
      filtros.querySelectorAll('.filtro').forEach((f) => f.setAttribute('aria-pressed', String(f === b)))
      catAtual = b.dataset.cat
      carregar(catAtual)
    })

    botaoMais.addEventListener('click', async () => {
      botaoMais.disabled = true
      try {
        pagina += 1
        desenhar(await buscar(catAtual, pagina), true)
      } catch {
        botaoMais.hidden = true
      } finally {
        botaoMais.disabled = false
      }
    })
  }

  /* ── Radar: cena do Spline em iframe, recortada no disco ─────────── */
  const disco = doc.querySelector('[data-radar]')
  if (disco && !parado && !economia) {
    const escalar = () => disco.style.setProperty('--escala', (disco.clientWidth / 196).toFixed(3))
    escalar()
    addEventListener('resize', escalar, { passive: true })
    new IntersectionObserver((entradas, obs) => {
      if (!entradas[0].isIntersecting) return
      obs.disconnect()
      const f = doc.createElement('iframe')
      f.src = disco.dataset.embed
      f.title = 'Radar'
      f.tabIndex = -1
      f.setAttribute('loading', 'eager')
      f.addEventListener('load', () => setTimeout(() => disco.classList.add('no-ar'), 1200), { once: true })
      disco.append(f)
    }, { rootMargin: '600px 0px' }).observe(disco)
  }

  /* Pontos da cobertura acendem um por vez. */
  const pontos = [...doc.querySelectorAll('[data-pontos] .ponto')]
  const agora = doc.querySelector('[data-radar-agora]')
  if (pontos.length) {
    let k = 0
    const acender = () => {
      pontos.forEach((p, i) => p.classList.toggle('ativo', i === k))
      if (agora) agora.textContent = pontos[k].querySelector('.ponto__lugar').textContent
    }
    acender()
    if (!parado) setInterval(() => { k = (k + 1) % pontos.length; acender() }, 2800)
  }

  /* ── Conversa de WhatsApp que se escreve sozinha ─────────────────── */
  const conversa = doc.querySelector('[data-conversa]')
  if (conversa) {
    const msgs = [...conversa.children]
    const digitando = doc.querySelector('[data-digitando]')
    const status = doc.querySelector('[data-zap-status]')
    if (parado) msgs.forEach((m) => m.classList.add('on'))
    else {
      let rodando = false
      let visivel = false
      const espera = (ms) => new Promise((r) => setTimeout(r, ms))
      const rodar = async () => {
        rodando = true
        while (visivel && !doc.hidden) {
          msgs.forEach((m) => m.classList.remove('on'))
          await espera(700)
          for (const m of msgs) {
            if (m.classList.contains('msg--eles')) {
              digitando.classList.add('on')
              status.textContent = 'digitando…'
              await espera(1500)
              digitando.classList.remove('on')
              status.textContent = 'online'
            } else await espera(900)
            m.classList.add('on')
          }
          await espera(5000)
        }
        rodando = false
      }
      new IntersectionObserver(([e]) => {
        visivel = e.isIntersecting
        if (visivel && !rodando) rodar()
      }, { threshold: 0.35 }).observe(conversa)
      doc.addEventListener('visibilitychange', () => { if (!doc.hidden && visivel && !rodando) rodar() })
    }
  }

  /* ── Fundo vivo (WebGL do kit) na seção de anúncio ───────────────── */
  const tela = doc.querySelector('[data-vivo] .vivo')
  if (tela) {
    const host = tela.closest('[data-vivo]')
    const gl = tela.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!gl) tela.remove()
    else {
      const sonda = doc.createElement('span')
      sonda.style.display = 'none'
      host.append(sonda)
      const cor = (nome) => {
        sonda.style.color = `var(${nome})`
        const c = getComputedStyle(sonda).color
        const n = (c.match(/[\d.]+/g) || []).map(Number)
        return c.startsWith('color(') ? n.slice(0, 3) : n.slice(0, 3).map((v) => v / 255)
      }
      const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'
      const fs = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform vec3 bg,c1,c2,c3;
float b(vec2 p,vec2 c,float s){vec2 d=p-c;return exp(-dot(d,d)/s);}
void main(){
  vec2 uv=gl_FragCoord.xy/r;float a=r.x/r.y;vec2 p=vec2(uv.x*a,uv.y);
  p+=.06*vec2(sin(p.y*4.+t*.7),cos(p.x*4.+t*.6));
  vec3 col=bg;
  col=mix(col,c1,b(p,vec2(a*(.25+.2*sin(t*.31)),.78+.08*cos(t*.43)),.10));
  col=mix(col,c2,b(p,vec2(a*(.85+.12*cos(t*.27)),.52+.16*sin(t*.22)),.09));
  col=mix(col,c1,.6*b(p,vec2(a*(.5+.3*cos(t*.19)),.30+.1*sin(t*.37)),.07));
  col=mix(col,c3,.75*b(p,vec2(m.x*a,m.y),.035));
  float g=fract(sin(dot(gl_FragCoord.xy+fract(t)*91.,vec2(12.9898,78.233)))*43758.5453);
  col+=(g-.5)*.05;
  gl_FragColor=vec4(col,1.);
}`
      const sombra = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s }
      const prog = gl.createProgram()
      gl.attachShader(prog, sombra(gl.VERTEX_SHADER, vs))
      gl.attachShader(prog, sombra(gl.FRAGMENT_SHADER, fs))
      gl.linkProgram(prog)
      gl.useProgram(prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(prog, 'p')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      const U = (n) => gl.getUniformLocation(prog, n)
      gl.uniform3fv(U('bg'), cor('--vivo-bg'))
      gl.uniform3fv(U('c1'), cor('--vivo-1'))
      gl.uniform3fv(U('c2'), cor('--vivo-2'))
      gl.uniform3fv(U('c3'), cor('--vivo-3'))
      const escala = Math.min(devicePixelRatio || 1, 1.5) * 0.5
      const ajustar = () => {
        tela.width = Math.max(1, Math.round(host.clientWidth * escala))
        tela.height = Math.max(1, Math.round(host.clientHeight * escala))
        gl.viewport(0, 0, tela.width, tela.height)
      }
      ajustar()
      let mx = 0.72, my = 0.6, tx = mx, ty = my, livre = true
      const seguir = (ev) => {
        const rr = host.getBoundingClientRect()
        tx = (ev.clientX - rr.left) / rr.width
        ty = 1 - (ev.clientY - rr.top) / rr.height
        livre = false
      }
      host.addEventListener('pointermove', seguir, { passive: true })
      host.addEventListener('pointerleave', () => { livre = true }, { passive: true })
      const t0 = performance.now()
      const pintar = (agoraT) => {
        const t = (agoraT - t0) / 1000
        if (livre) { tx = 0.62 + 0.24 * Math.sin(t * 0.4); ty = 0.6 + 0.15 * Math.cos(t * 0.33) }
        mx += (tx - mx) * 0.06
        my += (ty - my) * 0.06
        gl.uniform2f(U('r'), tela.width, tela.height)
        gl.uniform1f(U('t'), t)
        gl.uniform2f(U('m'), mx, my)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
      if (parado) pintar(t0 + 4000)
      else {
        let visivel = false
        let pedido = 0
        const laco = (tt) => { pintar(tt); pedido = visivel ? requestAnimationFrame(laco) : 0 }
        new IntersectionObserver(([e]) => {
          visivel = e.isIntersecting
          if (visivel && !pedido) pedido = requestAnimationFrame(laco)
        }).observe(host)
        addEventListener('resize', ajustar, { passive: true })
      }
    }
  }
})()
