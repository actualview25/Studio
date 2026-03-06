// =======================================
// ACTUAL VIEW STUDIO - SCENE PANEL
// =======================================

export class ScenePanel {
    constructor(app) {
        this.app = app;
        this.panel = document.getElementById('scenePanel');
        this.list = document.getElementById('sceneList');
        this.init();
    }

    init() {
        this.setupAddButton();
        this.setupScroll();
    }

    setupAddButton() {
        const addBtn = document.getElementById('addSceneBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                window.uiManager?.addNewScene();
            });
        }
    }

    setupScroll() {
        if (!this.panel || !this.list) return;
        
        const updateScroll = () => {
            const panelHeight = this.panel.clientHeight;
            const header = this.panel.querySelector('.panel-header');
            const headerHeight = header ? header.clientHeight : 50;
            const availableHeight = panelHeight - headerHeight - 20;
            
            this.list.style.maxHeight = availableHeight + 'px';
            this.list.style.overflowY = 'auto';
        };
        
        updateScroll();
        window.addEventListener('resize', updateScroll);
    }

    updateList() {
        if (!this.list || !window.sceneManager) return;

        this.list.innerHTML = '';
        
        const scenes = [...window.sceneManager.scenes].sort((a, b) => (a.order || 0) - (b.order || 0));
        
        scenes.forEach((scene, index) => {
            const item = this.createSceneItem(scene, index);
            this.list.appendChild(item);
        });

        this.scrollToActive();
    }

    createSceneItem(scene, index) {
        const item = document.createElement('div');
        item.className = 'scene-item';
        
        if (window.sceneManager.currentScene?.id === scene.id) {
            item.classList.add('active');
        }
        
        const infoCount = scene.hotspots?.filter(h => h.type === 'INFO').length || 0;
        const sceneCount = scene.hotspots?.filter(h => h.type === 'SCENE').length || 0;
        const totalPoints = infoCount + sceneCount;
        
        item.innerHTML = `
            <span class='scene-icon'>${index === 0 ? '🏠' : '🌄'}</span>
            <span class='scene-name' title='${scene.name}'>${index + 1}. ${scene.name}</span>
            <span class='scene-hotspots'>${totalPoints}</span>
            <button class='delete-scene-btn' data-id='${scene.id}' title='حذف المشهد'>🗑️</button>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-scene-btn')) {
                window.sceneManager?.switchToScene(scene.id);
            }
        });

        const deleteBtn = item.querySelector('.delete-scene-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('🗑️ هل أنت متأكد من حذف هذا المشهد؟')) {
                window.sceneManager?.deleteScene(scene.id);
            }
        });
        
        return item;
    }

    scrollToActive() {
        setTimeout(() => {
            const activeItem = this.list?.querySelector('.scene-item.active');
            if (activeItem) {
                activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    }

    show() {
        if (this.panel) {
            this.panel.style.display = 'block';
        }
    }

    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    }
}