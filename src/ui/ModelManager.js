// =======================================
// ACTUAL VIEW STUDIO - MODAL MANAGER
// =======================================

export class ModalManager {
    constructor(app) {
        this.app = app;
        this.activeModal = null;
    }

    showAddSceneModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(20,30,40,0.95); padding: 30px; border-radius: 16px;
            z-index: 10000; direction: rtl; border: 2px solid #4a6c8f; color: white;
            min-width: 300px; backdrop-filter: blur(10px); box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        `;
        
        modal.innerHTML = `
            <h3 style="margin-top:0; color:#88aaff;">📝 إضافة مشهد جديد</h3>
            <input type="text" id="modalSceneName" placeholder="أدخل اسم المشهد" 
                   style="width:100%; padding:10px; margin:10px 0; background:#1a2a3a; 
                          border:1px solid #4a6c8f; color:white; border-radius:6px;">
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button id="modalCancelBtn" style="background:#c0392b; border:none; 
                        color:white; padding:8px 16px; border-radius:6px; cursor:pointer;">إلغاء</button>
                <button id="modalConfirmBtn" style="background:#27ae60; border:none; 
                        color:white; padding:8px 16px; border-radius:6px; cursor:pointer;">التالي</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.activeModal = modal;
        
        document.getElementById('modalCancelBtn').onclick = () => this.close();
        document.getElementById('modalConfirmBtn').onclick = () => this.confirmAddScene();
        
        document.getElementById('modalSceneName').focus();
    }

    confirmAddScene() {
        const name = document.getElementById('modalSceneName').value.trim();
        this.close();
        
        if (!name) {
            alert('❌ الرجاء إدخال اسم صحيح');
            return;
        }

        this.showFilePicker(name);
    }

    showFilePicker(sceneName) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) {
                document.body.removeChild(input);
                return;
            }

            window.uiManager?.showLoader('جاري إضافة المشهد...');

            try {
                const scene = await window.sceneManager?.addScene(sceneName, file);
                if (scene) {
                    window.sceneManager?.switchToScene(scene.id);
                    window.uiManager?.hideLoader();
                    alert(`✅ تم إضافة المشهد: "${sceneName}"`);
                }
            } catch (error) {
                console.error('❌ خطأ:', error);
                alert('فشل إضافة المشهد');
                window.uiManager?.hideLoader();
            }

            document.body.removeChild(input);
        };

        input.click();
    }

    showHotspotModal(type, position) {
        if (type === 'INFO') {
            this.showInfoModal(position);
        } else {
            this.showSceneModal(position);
        }
    }

    showInfoModal(position) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = this.getModalStyle();
        
        modal.innerHTML = `
            <h3 style="margin-top:0; color:#ffaa44;">ℹ️ إضافة نقطة معلومات</h3>
            <input type="text" id="modalInfoTitle" placeholder="العنوان" 
                   style="width:100%; padding:10px; margin:10px 0; background:#1a2a3a; 
                          border:1px solid #ffaa44; color:white; border-radius:6px;">
            <textarea id="modalInfoContent" placeholder="المحتوى" rows="4"
                   style="width:100%; padding:10px; margin:10px 0; background:#1a2a3a; 
                          border:1px solid #ffaa44; color:white; border-radius:6px;"></textarea>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button id="modalCancelBtn" style="background:#c0392b;">إلغاء</button>
                <button id="modalConfirmBtn" style="background:#27ae60;">حفظ</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.activeModal = modal;
        
        document.getElementById('modalCancelBtn').onclick = () => this.close();
        document.getElementById('modalConfirmBtn').onclick = () => {
            const title = document.getElementById('modalInfoTitle').value.trim();
            const content = document.getElementById('modalInfoContent').value.trim();
            this.close();
            
            if (title && content && window.sceneManager?.currentScene) {
                window.sceneManager.addHotspot(
                    window.sceneManager.currentScene.id,
                    'INFO',
                    position,
                    { title, content }
                );
            }
        };
    }

    showSceneModal(position) {
        const otherScenes = window.sceneManager?.scenes.filter(
            s => s.id !== window.sceneManager?.currentScene?.id
        ) || [];
        
        if (otherScenes.length === 0) {
            alert('❌ لا يوجد مشاهد أخرى');
            return;
        }

        let options = '';
        otherScenes.forEach((s, i) => {
            options += `<option value="${s.id}">${i+1}. ${s.name}</option>`;
        });

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = this.getModalStyle();
        
        modal.innerHTML = `
            <h3 style="margin-top:0; color:#44aaff;">🎯 إضافة نقطة انتقال</h3>
            <select id="modalSceneSelect" style="width:100%; padding:10px; margin:10px 0; 
                    background:#1a2a3a; border:1px solid #44aaff; color:white; border-radius:6px;">
                ${options}
            </select>
            <input type="text" id="modalSceneDesc" placeholder="وصف النقطة" 
                   style="width:100%; padding:10px; margin:10px 0; background:#1a2a3a; 
                          border:1px solid #44aaff; color:white; border-radius:6px;">
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button id="modalCancelBtn" style="background:#c0392b;">إلغاء</button>
                <button id="modalConfirmBtn" style="background:#27ae60;">حفظ</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.activeModal = modal;
        
        document.getElementById('modalCancelBtn').onclick = () => this.close();
        document.getElementById('modalConfirmBtn').onclick = () => {
            const targetId = document.getElementById('modalSceneSelect').value;
            const description = document.getElementById('modalSceneDesc').value.trim();
            const targetScene = otherScenes.find(s => s.id === targetId);
            
            this.close();
            
            if (targetScene && window.sceneManager?.currentScene) {
                window.sceneManager.addHotspot(
                    window.sceneManager.currentScene.id,
                    'SCENE',
                    position,
                    { 
                        targetSceneId: targetId, 
                        targetSceneName: targetScene.name,
                        description: description || `انتقال إلى ${targetScene.name}`
                    }
                );
            }
        };
    }

    getModalStyle() {
        return `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(20,30,40,0.95); padding: 30px; border-radius: 16px;
            z-index: 10000; direction: rtl; border: 2px solid #4a6c8f; color: white;
            min-width: 350px; backdrop-filter: blur(10px); box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        `;
    }

    close() {
        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
        }
    }
}