// 标签页切换功能
document.addEventListener('DOMContentLoaded', function() {
    // 获取所有标签页按钮
    const tabButtons = document.querySelectorAll('.nav-tab');
    // 获取所有内容区域
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 为每个标签页按钮添加点击事件
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // 移除所有按钮的激活状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // 为当前按钮添加激活状态
            button.classList.add('active');
            
            // 隐藏所有内容区域
            tabContents.forEach(content => content.classList.remove('active'));
            // 显示目标内容区域
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
    
    // 模块卡片点击事件
    const moduleCards = document.querySelectorAll('.module-card');
    moduleCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // 防止点击按钮时触发卡片事件
            if (e.target.closest('button')) return;
            
            const module = card.getAttribute('data-module');
            // 切换到对应的模块设置标签页
            switchToTab(module);
        });
    });
    
    // 模块设置按钮事件
    const settingsButtons = document.querySelectorAll('.btn-settings');
    settingsButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const moduleCard = e.target.closest('.module-card');
            if (moduleCard) {
                const module = moduleCard.getAttribute('data-module');
                switchToTab(module);
            }
        });
    });
    
    // 启动/停止按钮事件
    const startButtons = document.querySelectorAll('.btn-start');
    const stopButtons = document.querySelectorAll('.btn-stop');
    
    startButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const moduleCard = this.closest('.module-card');
            if (moduleCard) {
                startModule(moduleCard);
            }
        });
    });
    
    stopButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const moduleCard = this.closest('.module-card');
            if (moduleCard) {
                stopModule(moduleCard);
            }
        });
    });
    
    // 保存设置按钮事件
    const saveButtons = document.querySelectorAll('.btn-primary');
    saveButtons.forEach(button => {
        button.addEventListener('click', function() {
            saveSettings(this);
        });
    });
});

// 切换到指定标签页
function switchToTab(tabName) {
    // 更新导航标签
    const tabButtons = document.querySelectorAll('.nav-tab');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-tab[data-tab="${tabName}"]`).classList.add('active');
    
    // 更新内容区域
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// 启动模块
function startModule(moduleCard) {
    const statusBadge = moduleCard.querySelector('.status-badge');
    const startButton = moduleCard.querySelector('.btn-start');
    const stopButton = moduleCard.querySelector('.btn-stop');
    
    // 更新状态显示
    statusBadge.textContent = '运行中';
    statusBadge.className = 'status-badge status-running';
    
    // 切换按钮
    if (startButton) startButton.style.display = 'none';
    if (stopButton) stopButton.style.display = 'inline-block';
    
    // 这里可以添加实际的启动逻辑
    console.log(`启动模块: ${moduleCard.getAttribute('data-module')}`);
}

// 停止模块
function stopModule(moduleCard) {
    const statusBadge = moduleCard.querySelector('.status-badge');
    const startButton = moduleCard.querySelector('.btn-start');
    const stopButton = moduleCard.querySelector('.btn-stop');
    
    // 更新状态显示
    statusBadge.textContent = '已停止';
    statusBadge.className = 'status-badge status-stopped';
    
    // 切换按钮
    if (startButton) startButton.style.display = 'inline-block';
    if (stopButton) stopButton.style.display = 'none';
    
    // 这里可以添加实际的停止逻辑
    console.log(`停止模块: ${moduleCard.getAttribute('data-module')}`);
}

// 保存设置
function saveSettings(button) {
    const form = button.closest('.settings-form');
    const formData = new FormData(form);
    
    // 这里可以添加实际的保存逻辑
    console.log('保存设置');
    
    // 显示保存成功的提示
    alert('设置已保存！');
}