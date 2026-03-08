// =======================================
// ACTUAL VIEW STUDIO - UI MANAGER (محسن بالكامل)
// =======================================

import { Toolbar } from './Toolbar.js';
import { ScenePanel } from './ScenePanel.js';
import { StatusBar } from './StatusBar.js';
import { ModalManager } from './ModalManager.js';
import { NotificationManager } from './NotificationManager.js';

export class UIManager {
    constructor(app) {
        this.app = app;
        
        // تهيئة المكونات
        this.toolbar = new Toolbar(app);
        this.scenePanel = new ScenePanel(app);
        this.statusBar = new StatusBar(app);
        this.modalManager = new ModalManager(app);
        this.notificationManager = new NotificationManager(app);
        
        // ألوان المسارات (للدالة updateStatus)
        this.pathColors = {
            EL: '#ffaa00',
            AC: '#0033cc',
            WP: '#0044aa',
            WA: '#ff0000',
            GS: '#006633'
        };
        
        console.log('🎨 UIManager جاهز مع جميع المكونات');
    }

    // ==================== دوال المسارات ====================

    /**
     * تحديث شريط الحالة بنوع المسار الحالي
     * @param {string} type - نوع المسار (EL, AC, WP, WA, GS)
     */
    updateStatus(type) {
        const statusEl = document.getElementById('status');
        if (!statusEl) {
            console.warn('⚠️ عنصر #status غير موجود');
            return;
        }

        const color = this.pathColors[type] || '#ffcc00';
        const typeNames = {
            EL: 'EL - كهرباء',
            AC: 'AC - تكييف',
            WP: 'WP - مياه',
            WA: 'WA - صرف صحي',
            GS: 'GS - غاز'
        };
        
        statusEl.innerHTML = `النوع الحالي: <span style="color:${color};">${typeNames[type] || type}</span>`;
        console.log(`📊 تحديث الحالة إلى: ${type}`);
    }

    /**
     * الحصول على لون النوع
     * @param {string} type 
     * @returns {string} اللون بصيغة hex
     */
    getColor(type) {
        return this.pathColors[type] || '#ffcc00';
    }

    // ==================== دوال المشاهد ====================

    /**
     * تحديث قائمة المشاهد
     */
    updateSceneList() {
        if (this.scenePanel) {
            this.scenePanel.updateList();
        } else {
            console.warn('⚠️ scenePanel غير جاهز');
        }
    }

    /**
     * تحديث نوع المسار (للتوافق مع الإصدارات القديمة)
     * @param {string} type 
     */
    updatePathType(type) {
        this.updateStatus(type);
    }

    // ==================== دوال التحميل ====================

    /**
     * إظهار شاشة التحميل
     * @param {string} message 
     */
    showLoader(message) {
        if (this.statusBar) {
            this.statusBar.showLoader(message);
        } else {
            // إنشاء loader مؤقت إذا لم يكن موجوداً
            const loader = document.getElementById('loader');
            if (loader) {
                loader.style.display = 'flex';
                loader.textContent = message || '⏳ جاري التحميل...';
            } else {
                const newLoader = document.createElement('div');
                newLoader.id = 'loader';
                newLoader.style.cssText = `
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.8);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    z-index: 10000;
                    backdrop-filter: blur(5px);
                `;
                newLoader.textContent = message || '⏳ جاري التحميل...';
                document.body.appendChild(newLoader);
            }
        }
    }

    /**
     * إخفاء شاشة التحميل
     */
    hideLoader() {
        if (this.statusBar) {
            this.statusBar.hideLoader();
        } else {
            const loader = document.getElementById('loader');
            if (loader) {
                loader.style.display = 'none';
            }
        }
    }

    // ==================== دوال الإشعارات ====================

    /**
     * إظهار إشعار
     * @param {string} message 
     * @param {string} type 
     */
    showNotification(message, type = 'info') {
        if (this.notificationManager) {
            this.notificationManager.show(message, type);
        } else {
            // إشعار بسيط مؤقت
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: ${this.getNotificationColor(type)};
                color: white;
                padding: 10px 20px;
                border-radius: 30px;
                z-index: 10001;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                animation: slideDown 0.3s;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => notification.remove(), 3000);
        }
    }

    /**
     * الحصول على لون الإشعار
     * @param {string} type 
     * @returns {string} 
     */
    getNotificationColor(type) {
        const colors = {
            info: '#4a6c8f',
            success: '#27ae60',
            error: '#c0392b',
            warning: '#e67e22'
        };
        return colors[type] || colors.info;
    }

    /**
     * إظهار إشعار نجاح
     * @param {string} message 
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * إظهار إشعار خطأ
     * @param {string} message 
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    // ==================== دوال النوافذ ====================

    /**
     * إظهار نافذة منبثقة
     * @param {string} type 
     * @param {any} data 
     */
    showModal(type, data) {
        if (this.modalManager) {
            if (type === 'addScene') {
                this.modalManager.showAddSceneModal();
            } else if (type === 'hotspot') {
                this.modalManager.showHotspotModal(data.type, data.position);
            } else if (type === 'info') {
                this.modalManager.showInfoModal(data);
            } else if (type === 'scene') {
                this.modalManager.showSceneModal(data);
            }
        } else {
            console.warn('⚠️ modalManager غير جاهز');
            // استخدام prompt بسيط كبديل
            if (type === 'addScene') {
                this.addNewSceneSimple();
            }
        }
    }

    /**
     * إضافة مشهد جديد (نسخة بسيطة)
     */
    addNewSceneSimple() {
        const name = prompt('📝 أدخل اسم المشهد:');
        if (!name) return;
        
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
            
            this.showLoader('جاري إضافة المشهد...');
            
            try {
                if (window.sceneManager) {
                    const scene = await window.sceneManager.addScene(name, file);
                    if (scene) {
                        window.sceneManager.switchToScene(scene.id);
                        this.updateSceneList();
                        this.showSuccess(`✅ تم إضافة المشهد: "${name}"`);
                    }
                }
            } catch (error) {
                console.error('❌ خطأ:', error);
                this.showError('فشل إضافة المشهد');
            }
            
            this.hideLoader();
            document.body.removeChild(input);
        };
        
        input.click();
    }

    /**
     * إضافة مشهد جديد (الطريقة الرئيسية)
     */
    addNewScene() {
        this.showModal('addScene');
    }

    // ==================== دوال إضافية ====================

    /**
     * تحديث شريط التقدم
     * @param {number} percent 
     * @param {string} message 
     */
    updateProgress(percent, message) {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
        if (progressText) {
            progressText.textContent = message || `${percent}%`;
        }
    }

    /**
     * تصدير إحصائيات واجهة المستخدم
     * @returns {Object}
     */
    getStats() {
        return {
            components: {
                toolbar: !!this.toolbar,
                scenePanel: !!this.scenePanel,
                statusBar: !!this.statusBar,
                modalManager: !!this.modalManager,
                notificationManager: !!this.notificationManager
            },
            status: document.getElementById('status') ? 'موجود' : 'غير موجود',
            loader: document.getElementById('loader') ? 'موجود' : 'غير موجود'
        };
    }
}
