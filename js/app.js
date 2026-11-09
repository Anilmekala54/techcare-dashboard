/* Tech.Care dashboard — data from the Coalition Technologies FED skills-test API */
(() => {
  'use strict';

  const API_URL = 'https://fedskillstest.coalitiontechnologies.workers.dev';
  // Basic Auth credentials published in the skills-test brief
  const AUTH = 'Basic ' + btoa('coalition:skills-test');
  const DEFAULT_PATIENT = 'Jessica Taylor';

  const $ = (sel) => document.querySelector(sel);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  let patients = [];
  let current = null;
  let chart = null;
  let rangeMonths = 6;

  /* ---------------- helpers ---------------- */
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const formatDob = (s) => {
    // API format: MM/DD/YYYY  ->  "August 23, 1996"
    const [m, d, y] = String(s || '').split('/').map(Number);
    if (!m || !d || !y) return s || '';
    return `${MONTHS[m - 1]} ${d}, ${y}`;
  };

  const monthIndex = (name) => MONTHS.indexOf(name);
  const sortChrono = (hist) =>
    [...hist].sort((a, b) => (a.year - b.year) || (monthIndex(a.month) - monthIndex(b.month)));

  const setLevel = (el, text) => {
    el.textContent = text || '';
    el.classList.remove('is-up', 'is-down');
    const t = String(text || '').toLowerCase();
    if (t.includes('higher')) el.classList.add('is-up');
    else if (t.includes('lower')) el.classList.add('is-down');
  };

  /* ---------------- data ---------------- */
  async function fetchPatients() {
    const res = await fetch(API_URL, { headers: { Authorization: AUTH } });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  /* ---------------- render: patient list ---------------- */
  function renderPatientList() {
    const list = $('#patientList');
    list.innerHTML = patients.map((p, i) => `
      <li class="patient${p === current ? ' is-active' : ''}" data-index="${i}" tabindex="0">
        <img class="patient__photo" src="${esc(p.profile_picture)}" alt="${esc(p.name)}" width="48" height="48" loading="lazy" />
        <div class="patient__meta">
          <p class="patient__name">${esc(p.name)}</p>
          <p class="patient__sub">${esc(p.gender)}, ${esc(p.age)}</p>
        </div>
        <button class="icon-btn patient__more" aria-label="More options for ${esc(p.name)}">
          <img src="assets/more_horiz.svg" alt="" class="ic ic--horiz" />
        </button>
      </li>`).join('');
    refreshScrollbars();
  }

  /* ---------------- render: selected patient ---------------- */
  function renderPatient(p) {
    current = p;
    document.querySelectorAll('.patient').forEach((el) =>
      el.classList.toggle('is-active', patients[el.dataset.index] === p));

    const hist = sortChrono(p.diagnosis_history || []);
    const latest = hist[hist.length - 1];

    if (latest) {
      $('#sysValue').textContent = latest.blood_pressure.systolic.value;
      setLevel($('#sysLevel'), latest.blood_pressure.systolic.levels);
      $('#diaValue').textContent = latest.blood_pressure.diastolic.value;
      setLevel($('#diaLevel'), latest.blood_pressure.diastolic.levels);

      $('#respValue').textContent = `${latest.respiratory_rate.value} bpm`;
      setLevel($('#respLevel'), latest.respiratory_rate.levels);
      $('#tempValue').textContent = `${latest.temperature.value}°F`;
      setLevel($('#tempLevel'), latest.temperature.levels);
      $('#heartValue').textContent = `${latest.heart_rate.value} bpm`;
      setLevel($('#heartLevel'), latest.heart_rate.levels);
    }

    renderChart(hist);

    // Diagnostic list
    const diag = p.diagnostic_list || [];
    $('#diagList').innerHTML = diag.length
      ? diag.map((d) => `
        <li class="table__row">
          <span>${esc(d.name)}</span>
          <span>${esc(d.description)}</span>
          <span>${esc(d.status)}</span>
        </li>`).join('')
      : '<li class="status-msg">No diagnostics on record.</li>';

    // Profile
    const photo = $('#profilePhoto');
    photo.src = p.profile_picture;
    photo.alt = p.name;
    $('#profileName').textContent = p.name;
    $('#dob').textContent = formatDob(p.date_of_birth);
    $('#gender').textContent = p.gender;
    $('#genderIcon').src = `assets/${String(p.gender).toLowerCase() === 'male' ? 'male' : 'female'}.svg`;
    $('#phone').textContent = p.phone_number;
    $('#emergency').textContent = p.emergency_contact;
    $('#insurance').textContent = p.insurance_type;

    // Lab results
    const labs = p.lab_results || [];
    $('#labList').innerHTML = labs.length
      ? labs.map((l, i) => `
        <li class="lab${i === 1 ? ' is-active' : ''}" tabindex="0">
          <span>${esc(l)}</span>
          <button class="icon-btn" aria-label="Download ${esc(l)}"><img src="assets/download.svg" alt="" class="ic ic--download" /></button>
        </li>`).join('')
      : '<li class="status-msg">No lab results.</li>';

    ['#diagList', '#labList'].forEach((s) => { $(s).scrollTop = 0; });
    refreshScrollbars();
  }

  /* ---------------- chart ---------------- */
  function renderChart(histAsc) {
    const data = rangeMonths ? histAsc.slice(-rangeMonths) : histAsc;
    const labels = data.map((h) => `${h.month.slice(0, 3)}, ${h.year}`);
    const sys = data.map((h) => h.blood_pressure.systolic.value);
    const dia = data.map((h) => h.blood_pressure.diastolic.value);

    const all = [...sys, ...dia];
    const min = Math.min(60, Math.floor(Math.min(...all) / 20) * 20);
    const max = Math.max(180, Math.ceil(Math.max(...all) / 20) * 20);

    const ds = (label, values, line, point) => ({
      label, data: values,
      borderColor: line, borderWidth: 2,
      pointBackgroundColor: point, pointBorderColor: '#fff', pointBorderWidth: 1,
      pointRadius: 7, pointHoverRadius: 8,
      tension: 0.4, cubicInterpolationMode: 'monotone', fill: false,
    });

    const css = getComputedStyle(document.documentElement);
    const datasets = [
      ds('Systolic', sys, css.getPropertyValue('--sys-line').trim(), css.getPropertyValue('--sys-point').trim()),
      ds('Diastolic', dia, css.getPropertyValue('--dia-line').trim(), css.getPropertyValue('--dia-point').trim()),
    ];

    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets = datasets;
      chart.options.scales.y.min = min;
      chart.options.scales.y.max = max;
      chart.update();
      return;
    }

    if (typeof Chart === 'undefined') return;
    const tick = { family: 'Manrope', size: 12 };
    chart = new Chart($('#bpChart'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        layout: { padding: { right: 8, top: 4 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#072635', titleFont: { ...tick, weight: '700' }, bodyFont: tick,
            padding: 10, cornerRadius: 8, usePointStyle: true, boxPadding: 4,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: '#072635', font: tick, padding: 6, maxRotation: 0, autoSkip: true, autoSkipPadding: 8,
              // shorter labels on narrow charts: "Oct, 2023" -> "Oct '23"
              callback(value) {
                const label = this.getLabelForValue(value);
                if (this.chart.width >= 520) return label;
                const [m, y] = label.split(', ');
                return `${m} '${String(y).slice(2)}`;
              },
            },
          },
          y: {
            min, max,
            ticks: { stepSize: 20, color: '#072635', font: tick, padding: 18, crossAlign: 'far' },
            grid: { color: '#CBC8D4', drawTicks: false },
            border: { display: true, color: '#CBC8D4' },
          },
        },
      },
    });
  }

  /* ---------------- range dropdown ---------------- */
  function initRange() {
    const wrap = $('.range');
    const btn = $('#rangeBtn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = wrap.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open);
    });
    $('#rangeMenu').addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      rangeMonths = Number(li.dataset.months);
      $('#rangeLabel').textContent = li.textContent;
      document.querySelectorAll('#rangeMenu li').forEach((o) => o.setAttribute('aria-selected', o === li));
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', false);
      if (current) renderChart(sortChrono(current.diagnosis_history || []));
    });
    document.addEventListener('click', () => {
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', false);
    });
  }

  /* ---------------- custom scrollbars (fixed-size thumb, as in the design) ---------------- */
  const scrollbars = [];
  function initScrollbars() {
    document.querySelectorAll('.scroll-wrap').forEach((wrap) => {
      const area = wrap.querySelector('.scroll-area');
      const bar = wrap.querySelector('.scrollbar');
      const thumb = wrap.querySelector('.scrollbar__thumb');
      const thumbH = Number(wrap.dataset.thumb) || 100;
      thumb.style.height = `${thumbH}px`;

      const update = () => {
        const max = area.scrollHeight - area.clientHeight;
        wrap.classList.toggle('no-scroll', max <= 1);
        const travel = bar.clientHeight - thumbH;
        const y = max > 0 ? (area.scrollTop / max) * travel : 0;
        thumb.style.transform = `translateY(${y}px)`;
      };
      area.addEventListener('scroll', update, { passive: true });

      // drag the thumb
      thumb.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        thumb.setPointerCapture(e.pointerId);
        const startY = e.clientY;
        const startTop = area.scrollTop;
        const move = (ev) => {
          const max = area.scrollHeight - area.clientHeight;
          const travel = bar.clientHeight - thumbH;
          area.scrollTop = startTop + ((ev.clientY - startY) / travel) * max;
        };
        const up = () => {
          thumb.removeEventListener('pointermove', move);
          thumb.removeEventListener('pointerup', up);
        };
        thumb.addEventListener('pointermove', move);
        thumb.addEventListener('pointerup', up);
      });

      scrollbars.push(update);
    });
    window.addEventListener('resize', refreshScrollbars);
  }
  function refreshScrollbars() { scrollbars.forEach((fn) => fn()); }

  /* ---------------- mobile menu ---------------- */
  function initMenu() {
    const bar = $('.topbar');
    const btn = $('#menuToggle');
    btn.addEventListener('click', () => {
      const open = bar.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && bar.classList.contains('is-open')) {
        bar.classList.remove('is-open');
        btn.setAttribute('aria-expanded', false);
      }
    });
  }

  /* ---------------- events ---------------- */
  function initEvents() {
    const list = $('#patientList');
    const select = (el) => {
      if (!el) return;
      const p = patients[el.dataset.index];
      if (p && p !== current) renderPatient(p);
    };
    list.addEventListener('click', (e) => select(e.target.closest('.patient')));
    list.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(e.target.closest('.patient')); }
    });
    $('#labList').addEventListener('click', (e) => {
      const li = e.target.closest('.lab');
      if (!li) return;
      document.querySelectorAll('.lab').forEach((l) => l.classList.toggle('is-active', l === li));
    });
  }

  /* ---------------- boot ---------------- */
  async function init() {
    initScrollbars();
    initRange();
    initMenu();
    initEvents();
    try {
      patients = await fetchPatients();
      current = patients.find((p) => p.name === DEFAULT_PATIENT) || patients[0];
      renderPatientList();
      if (current) renderPatient(current);
      // bring the active patient into view
      const active = document.querySelector('.patient.is-active');
      if (active) active.scrollIntoView({ block: 'nearest' });
    } catch (err) {
      console.error(err);
      $('#patientList').innerHTML = '<li class="status-msg">Could not load patients. Please refresh.</li>';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
