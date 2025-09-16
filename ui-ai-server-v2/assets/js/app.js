(function(){
  const MODULES = [
    { key:'dify', name:'Dify', defaultPort:3000 },
    { key:'n8n', name:'n8n', defaultPort:5678 },
    { key:'ragflow', name:'RAGFlow', defaultPort:9400 },
    { key:'oneapi', name:'OneAPI', defaultPort:3001 },
  ];

  const DEFAULT_SETTINGS = {
    autoLaunchOnBoot: false,
    autoStartModulesOnAppStart: false,
    theme: 'auto' // 'auto' | 'light' | 'dark'
  };

  const state = {
    modules: loadModules(),
    settings: loadSettings()
  };

  function loadModules(){
    const raw = localStorage.getItem('modules');
    if(raw){
      try{ return JSON.parse(raw);}catch{ /* fallthrough */ }
    }
    const initial = {};
    MODULES.forEach(m=>{ initial[m.key] = { running:false, port:m.defaultPort }; });
    localStorage.setItem('modules', JSON.stringify(initial));
    return initial;
  }

  function saveModules(){ localStorage.setItem('modules', JSON.stringify(state.modules)); }

  function loadSettings(){
    const raw = localStorage.getItem('settings');
    if(raw){ try{ return { ...DEFAULT_SETTINGS, ...JSON.parse(raw)} }catch{ /* */ } }
    localStorage.setItem('settings', JSON.stringify(DEFAULT_SETTINGS));
    return { ...DEFAULT_SETTINGS };
  }

  function saveSettings(){ localStorage.setItem('settings', JSON.stringify(state.settings)); }

  // Theme
  function applyTheme(){
    const html = document.documentElement;
    const desired = state.settings.theme;
    if(desired === 'auto'){
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', prefersDark ? 'dark':'light');
    }else{
      html.setAttribute('data-theme', desired);
    }
  }

  function bindThemeToggle(){
    const btn = document.querySelector('[data-action="toggle-theme"]');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      const map = { auto:'light', light:'dark', dark:'auto' };
      state.settings.theme = map[state.settings.theme] || 'auto';
      saveSettings();
      applyTheme();
      updateThemeIndicator(btn);
    });
    updateThemeIndicator(btn);
  }

  function updateThemeIndicator(btn){
    const t = state.settings.theme;
    const txt = t==='auto'?'自动':(t==='light'?'浅色':'深色');
    btn.textContent = `主题：${txt}`;
  }

  // Header status badges
  function refreshHeaderBadges(){
    MODULES.forEach(m=>{
      const el = document.querySelector(`[data-module-badge="${m.key}"]`);
      if(!el) return;
      const running = !!state.modules[m.key]?.running;
      const dot = el.querySelector('.dot-status');
      const label = el.querySelector('.label');
      dot.classList.toggle('dot-ok', running);
      dot.classList.toggle('dot-off', !running);
      label.textContent = running ? '运行中' : '未启动';
    });
  }

  // Home modules cards
  function renderHome(){
    const list = document.querySelector('[data-modules-grid]');
    if(!list) return;
    list.innerHTML = '';
    MODULES.forEach(m=>{
      const mod = state.modules[m.key];
      const card = document.createElement('div');
      card.className = 'card span-6';
      card.innerHTML = `
        <div class="card-header">
          <div class="card-title">${m.name}
            <span class="status-chip ${mod.running?'status-running':'status-stopped'}" style="margin-left:8px">
              <span class="dot-status ${mod.running?'dot-ok':'dot-off'}"></span>
              ${mod.running?'运行中':'未启动'}
            </span>
          </div>
          <div class="badge"><span class="dot-status ${mod.running?'dot-ok':'dot-off'}"></span><span>端口 ${mod.port}</span></div>
        </div>
        <div class="card-body">
          <div class="kv">
            <div class="key">服务名</div><div class="val">${m.key}</div>
            <div class="key">当前状态</div><div class="val">${mod.running?'运行中':'未启动'}</div>
            <div class="key">占用端口</div><div class="val">${mod.port}</div>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn ${mod.running?'warn':''}" data-action="toggle" data-key="${m.key}">${mod.running?'停止':'启动'}</button>
          <a class="btn secondary" href="${m.key}.html">设置</a>
        </div>`;
      list.appendChild(card);
    });

    list.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-action="toggle"]');
      if(!btn) return;
      const key = btn.getAttribute('data-key');
      const running = !!state.modules[key].running;
      state.modules[key].running = !running;
      saveModules();
      renderHome();
      refreshHeaderBadges();
    });
  }

  // Module settings pages
  function bindModuleSettings(){
    const page = document.querySelector('[data-page-module]');
    if(!page) return;
    const key = page.getAttribute('data-page-module');
    const mod = state.modules[key];
    const portInput = document.querySelector('#port');
    const startBtn = document.querySelector('#btn-start');
    const stopBtn = document.querySelector('#btn-stop');
    const statusText = document.querySelector('[data-status-text]');

    if(portInput){ portInput.value = mod.port; }
    updateButtons();

    startBtn?.addEventListener('click', ()=>{
      state.modules[key].running = true; saveModules(); updateButtons(); refreshHeaderBadges();
    });
    stopBtn?.addEventListener('click', ()=>{
      state.modules[key].running = false; saveModules(); updateButtons(); refreshHeaderBadges();
    });

    document.querySelector('#btn-save')?.addEventListener('click', ()=>{
      const v = parseInt(portInput.value,10);
      if(!Number.isFinite(v) || v<=0 || v>65535){ alert('请输入有效端口 1-65535'); return; }
      state.modules[key].port = v; saveModules(); renderHome(); refreshHeaderBadges();
      toast('配置已保存');
    });

    function updateButtons(){
      const running = !!state.modules[key].running;
      statusText.textContent = running? '运行中':'未启动';
      statusText.className = `status-chip ${running?'status-running':'status-stopped'}`;
      startBtn.disabled = running; stopBtn.disabled = !running;
    }
  }

  // Settings page
  function bindSettings(){
    const page = document.querySelector('[data-page="settings"]');
    if(!page) return;
    const cbBoot = document.querySelector('#autoLaunchOnBoot');
    const cbAutoStart = document.querySelector('#autoStartModulesOnAppStart');
    const selTheme = document.querySelector('#theme');

    cbBoot.checked = !!state.settings.autoLaunchOnBoot;
    cbAutoStart.checked = !!state.settings.autoStartModulesOnAppStart;
    selTheme.value = state.settings.theme;

    document.querySelector('#btn-save-settings')?.addEventListener('click', ()=>{
      state.settings.autoLaunchOnBoot = cbBoot.checked;
      state.settings.autoStartModulesOnAppStart = cbAutoStart.checked;
      state.settings.theme = selTheme.value;
      saveSettings(); applyTheme(); toast('设置已保存');
    });
  }

  // Simple toast
  function toast(message){
    let el = document.createElement('div');
    el.textContent = message;
    el.style.cssText = 'position:fixed;left:50%;top:20px;transform:translateX(-50%);padding:10px 14px;border:1px solid var(--border);background:var(--bg-elev);color:var(--text);border-radius:10px;z-index:1000;box-shadow:var(--shadow)';
    document.body.appendChild(el);
    setTimeout(()=>{ el.remove(); }, 1600);
  }

  // Highlight active tab
  function markActiveTab(){
    const path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.tab').forEach(a=>{
      const href = a.getAttribute('href') || '';
      if(href.endsWith(path)) a.classList.add('active');
    });
  }

  function initHeader(){
    refreshHeaderBadges();
    bindThemeToggle();
    markActiveTab();
  }

  // Auto-start modules on first load if setting enabled (simulation)
  function autoStartOnAppStart(){
    if(state.settings.autoStartModulesOnAppStart){
      let changed = false;
      MODULES.forEach(m=>{ if(!state.modules[m.key].running){ state.modules[m.key].running = true; changed = true; }});
      if(changed) saveModules();
    }
  }

  // Boot
  document.addEventListener('DOMContentLoaded', ()=>{
    // Apply theme early
    applyTheme();
    autoStartOnAppStart();
    initHeader();
    renderHome();
    bindModuleSettings();
    bindSettings();
  });
})();
