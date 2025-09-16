// 标签页切换功能
document.addEventListener('DOMContentLoaded', function() {
    // 获取所有标签页
    const tabs = document.querySelectorAll('.tab');
    // 获取所有内容区域
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 为每个标签页添加点击事件
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // 阻止事件冒泡
            if (e.target.classList.contains('tab-close')) {
                return;
            }
            
            const targetTab = tab.getAttribute('data-tab');
            
            // 移除所有标签页的激活状态
            tabs.forEach(t => t.classList.remove('active'));
            // 为当前标签页添加激活状态
            tab.classList.add('active');
            
            // 隐藏所有内容区域
            tabContents.forEach(content => content.classList.remove('active'));
            // 显示目标内容区域
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
    
    // 标签页关闭功能
    const closeButtons = document.querySelectorAll('.tab-close');
    closeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const tab = button.closest('.tab');
            const tabId = tab.getAttribute('data-tab');
            
            // 如果关闭的是当前激活的标签页，切换到第一个标签页
            if (tab.classList.contains('active')) {
                tabs[0].click();
            }
            
            // 移除标签页
            tab.remove();
        });
    });
    
    // 添加新标签页功能
    const addTabButton = document.querySelector('.tab-add');
    addTabButton.addEventListener('click', () => {
        // 这里可以添加新标签页的逻辑
        console.log('添加新标签页');
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
    if (settingsButtons.length > 0) {
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
    }
    
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
    
    // 全部启动按钮
    const startAllButton = document.querySelector('.quick-actions .btn-primary');
    if (startAllButton) {
        startAllButton.addEventListener('click', function() {
            startAllModules();
        });
    }
    
    // 全部停止按钮
    const stopAllButton = document.querySelector('.quick-actions .btn-secondary');
    if (stopAllButton) {
        stopAllButton.addEventListener('click', function() {
            stopAllModules();
        });
    }
});

// 切换到指定标签页
function switchToTab(tabName) {
    // 更新导航标签
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    const targetTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // 更新内容区域
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    const targetContent = document.getElementById(`${tabName}-tab`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

// 启动模块
function startModule(moduleCard) {
    const statusElement = moduleCard.querySelector('.module-status');
    const startButton = moduleCard.querySelector('.btn-start');
    const stopButton = moduleCard.querySelector('.btn-stop');
    const tabStatus = document.querySelector(`.tab[data-tab="${moduleCard.getAttribute('data-module')}"] .tab-status`);
    
    // 更新状态显示
    if (statusElement) {
        statusElement.textContent = '运行中';
        statusElement.className = 'module-status running';
    }
    
    // 更新标签页状态指示器
    if (tabStatus) {
        tabStatus.className = 'tab-status tab-status-running';
    }
    
    // 切换按钮
    if (startButton) startButton.style.display = 'none';
    if (stopButton) stopButton.style.display = 'inline-block';
    
    // 这里可以添加实际的启动逻辑
    console.log(`启动模块: ${moduleCard.getAttribute('data-module')}`);
}

// 停止模块
function stopModule(moduleCard) {
    const statusElement = moduleCard.querySelector('.module-status');
    const startButton = moduleCard.querySelector('.btn-start');
    const stopButton = moduleCard.querySelector('.btn-stop');
    const tabStatus = document.querySelector(`.tab[data-tab="${moduleCard.getAttribute('data-module')}"] .tab-status`);
    
    // 更新状态显示
    if (statusElement) {
        statusElement.textContent = '已停止';
        statusElement.className = 'module-status stopped';
    }
    
    // 更新标签页状态指示器
    if (tabStatus) {
        tabStatus.className = 'tab-status tab-status-stopped';
    }
    
    // 切换按钮
    if (startButton) startButton.style.display = 'inline-block';
    if (stopButton) stopButton.style.display = 'none';
    
    // 这里可以添加实际的停止逻辑
    console.log(`停止模块: ${moduleCard.getAttribute('data-module')}`);
}

// 启动所有模块
function startAllModules() {
    const moduleCards = document.querySelectorAll('.module-card');
    moduleCards.forEach(card => {
        const statusElement = card.querySelector('.module-status');
        if (statusElement && statusElement.classList.contains('stopped')) {
            startModule(card);
        }
    });
}

// 停止所有模块
function stopAllModules() {
    const moduleCards = document.querySelectorAll('.module-card');
    moduleCards.forEach(card => {
        const statusElement = card.querySelector('.module-status');
        if (statusElement && statusElement.classList.contains('running')) {
            stopModule(card);
        }
    });
}

// 保存设置
function saveSettings(button) {
    const form = button.closest('.settings-form');
    if (!form) return;
    
    // 这里可以添加实际的保存逻辑
    console.log('保存设置');
    
    // 显示保存成功的提示
    alert('设置已保存！');
}