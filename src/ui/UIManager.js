// =======================================
// ACTUAL VIEW STUDIO - UI MANAGER (UPDATED)
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
        
        console.log('🎨 UIManager جاهز مع جميع المكونات');
    }

    // دوال مختصرة للاستخدام السريع
    updateSceneList() {
        this.scenePanel.updateList();
    }

    updatePathType(type) {
        this.statusBar.updatePathType(type);
    }

    showLoader(message) {
        this.statusBar.showLoader(message);
    }

    hideLoader() {
        this.statusBar.hideLoader();
    }

    showNotification(message, type = 'info') {
        this.notificationManager.show(message, type);
    }

    showSuccess(message) {
        this.notificationManager.success(message);
    }

    showError(message) {
        this.notificationManager.error(message);
    }

    showModal(type, data) {
        if (type === 'addScene') {
            this.modalManager.showAddSceneModal();
        } else if (type === 'hotspot') {
            this.modalManager.showHotspotModal(data.type, data.position);
        }
    }

    addNewScene() {
        this.modalManager.showAddSceneModal();
    }
}