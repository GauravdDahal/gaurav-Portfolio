/* ── Fetch data and render everything ── */
async function init() {
  const res = await fetch('/api/data');
  const d = await res.json();

  renderHero(d);
  renderAbout(d.about);
  renderSkills(d.skills);
  renderExperience(d.experience);
  renderProjects(d.projects);
  renderCerts(d.certifications);
  renderContact(d.contact);
  renderFooter(d.meta);
  startTypewriter(d.typewriterPhrases);
  initObserver();
  initPopHover();
}

function renderHero(d) {
  const m = d.meta;
  document.title = `${m.name} – ${m.title}`;
  document.getElementById('hero-eyebrow').innerHTML =
    `${m.location} <span>//</span> ${m.education}`;
  const [first, ...rest] = m.name.split(' ');
  document.getElementById('hero-name').innerHTML =
    `${first}<br/><em>${rest.join(' ')}</em>`;
  document.getElementById('hero-sub').textContent = m.tagline;
}

function renderAbout(about) {
  const text = document.getElementById('about-text');
  text.innerHTML = about.paragraphs.map(p => `<p>${p}</p>`).join('');

  const stats = document.getElementById('about-stats');
  stats.innerHTML = about.stats.map((s, i) => `
    <div class="stat-card pop-hover bounce-target delay-${i + 2}">
      <div class="stat-num">${s.num}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');
}

function renderSkills(skills) {
  const container = document.getElementById('skills-container');
  const delays = ['delay-2','delay-3','delay-4','delay-5','delay-6'];
  container.innerHTML = skills.map((group, i) => `
    <div class="skill-group bounce-target ${delays[i] || ''}">
      <div class="skill-group-label">${group.group}</div>
      <div class="skill-pills">
        ${group.items.map(item => `
          <span class="pill ${item.highlight ? 'highlight' : ''} pill-pop">${item.name}</span>
        `).join('')}
      </div>
    </div>`).join('');
}

function renderExperience(exp) {
  const tl = document.getElementById('timeline');
  const delays = ['delay-2','delay-3','delay-4','delay-5'];
  tl.innerHTML = exp.map((job, i) => `
    <div class="tl-item bounce-left ${delays[i] || ''} pop-hover">
      <div class="tl-header">
        <div class="tl-role">${job.role}</div>
        <div class="tl-period">${job.period}</div>
      </div>
      <div class="tl-company">${job.company}</div>
      <ul class="tl-bullets">
        ${job.bullets.map(b => `<li>${b}</li>`).join('')}
      </ul>
    </div>`).join('');
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  const delays = ['delay-2','delay-3','delay-4','delay-5'];
  grid.innerHTML = projects.map((p, i) => `
    <div class="proj-card pop-hover bounce-target ${delays[i] || ''}">
      <div class="proj-icon">${p.icon}</div>
      <div class="proj-name">${p.name}</div>
      <div class="proj-desc">${p.desc}</div>
      <div class="proj-tags">${p.tags.map(t => `<span class="proj-tag">${t}</span>`).join('')}</div>
      ${p.link ? `<a href="${p.link}" target="_blank" class="proj-link">View Project ↗</a>` : ''}
    </div>`).join('');
}

function renderCerts(certs) {
  const grid = document.getElementById('certs-grid');
  const delays = ['delay-2','delay-3','delay-4','delay-5','delay-6'];
  grid.innerHTML = certs.map((c, i) => `
    <div class="cert-card pop-hover bounce-target ${delays[i] || ''}">
      <div class="cert-icon">${c.icon}</div>
      <div class="cert-name">${c.name}</div>
    </div>`).join('');
}

function renderContact(c) {
  document.getElementById('contact-text').innerHTML = `
    <p>${c.contactBlurb}</p>
    <p>${c.contactBlurb2}</p>`;

  document.getElementById('contact-links').innerHTML = `
    <a href="mailto:${c.email}" class="contact-link pop-hover bounce-target delay-2">
      <span class="contact-link-icon">✉</span>${c.email}
    </a>
    <a href="tel:${c.phone.replace(/\s/g,'')}" class="contact-link pop-hover bounce-target delay-3">
      <span class="contact-link-icon">📞</span>${c.phone}
    </a>
    <a href="${c.github}" target="_blank" class="contact-link pop-hover bounce-target delay-4">
      <span class="contact-link-icon">⌥</span>${c.githubLabel}
    </a>
    <a href="${c.linkedin}" target="_blank" class="contact-link pop-hover bounce-target delay-5">
      <span class="contact-link-icon">in</span>${c.linkedinLabel}
    </a>`;
}

function renderFooter(meta) {
  document.getElementById('footer').innerHTML =
    `Built with intent · <span>${meta.name}</span> · ${meta.location} · ${meta.footerYear}`;
}

/* ── Typewriter ── */
function startTypewriter(phrases) {
  let phraseIdx = 0, charIdx = 0, deleting = false;
  const el = document.getElementById('typed-text');
  function type() {
    const phrase = phrases[phraseIdx];
    if (!deleting) {
      el.textContent = phrase.slice(0, ++charIdx);
      if (charIdx === phrase.length) { deleting = true; setTimeout(type, 2000); return; }
    } else {
      el.textContent = phrase.slice(0, --charIdx);
      if (charIdx === 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; }
    }
    setTimeout(type, deleting ? 40 : 80);
  }
  type();
}

/* ── Scroll observer ── */
function initObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('bounced');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.bounce-target, .bounce-left').forEach(el => observer.observe(el));
}

/* ── Pop spring on hover ── */
function initPopHover() {
  document.querySelectorAll('.pop-hover, .pill-pop, .btn').forEach(el => {
    el.addEventListener('mouseenter', () => {
      el.classList.remove('do-pop');
      void el.offsetWidth;
      el.classList.add('do-pop');
    });
    el.addEventListener('animationend', () => el.classList.remove('do-pop'));
  });
}

init();
