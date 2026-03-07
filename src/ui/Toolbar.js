// =======================================
// ACTUAL VIEW STUDIO - TOOLBAR
// =======================================

export class Toolbar {
    constructor(app) {
        this.app = app;
        this.buttons = {};
        this.init();
    }

    init() {
        this.captureButtons();
        this.setupEvents();
    }

    captureButtons() {
        this.buttons = {
            draw: document.getElementById('toggleDraw'),
            measure: document.getElementById('toggleMeasure'),
            finalize: document.getElementById('finalizePath'),
            clear: document.getElementById('clearAll'),
            rotate: document.getElementById('toggleRotate'),
            hotspotScene: document.getElementById('hotspotScene'),
            hotspotInfo: document.getElementById('hotspotInfo'),
            export: document.getElementById('exportTour')
        };
    }

    setupEvents() {
        if (this.buttons.draw) {
            this.buttons.draw.addEventListener('click', () => this.toggleDraw());
        }
        
        if (this.buttons.measure) {
            this.buttons.measure.addEventListener('click', () => this.toggleMeasure());
        }
        
        if (this.buttons.finalize) {
            this.buttons.finalize.addEventListener('click', () => this.finalizePath());
        }
        
        if (this.buttons.clear) {
            this.buttons.clear.addEventListener('click', () => this.clearAll());
        }
        
        if (this.buttons.rotate) {
            this.buttons.rotate.addEventListener('click', () => this.toggleRotate());
        }
        
        if (this.buttons.hotspotScene) {
            this.buttons.hotspotScene.addEventListener('click', () => this.setHotspotMode('SCENE'));
        }
        
        if (this.buttons.hotspotInfo) {
            this.buttons.hotspotInfo.addEventListener('click', () => this.setHotspotMode('INFO'));
        }
        
        if (this.buttons.export) {
            this.buttons.export.addEventListener('click', () => this.exportTour());
        }
    }

    toggleDraw() {
        if (window.measurementTools?.measureMode) {
            window.measurementTools.setMode(false);
            this.updateButton('measure', '📏 تفعيل القياس');
        }
        
        if (window.pathTools?.drawMode) {
            window.pathTools.stopDraw();
            this.updateButton('draw', '✏️ تفعيل الرسم');
        } else {
            window.pathTools?.startDraw();
            this.updateButton('draw', '⛔ إيقاف الرسم');
        }
    }

    toggleMeasure() {
        if (window.pathTools?.drawMode) {
            window.pathTools.stopDraw();
            this.updateButton('draw', '✏️ تفعيل الرسم');
        }
        
        const newMode = !window.measurementTools?.measureMode;
        window.measurementTools?.setMode(newMode);
        this.updateButton('measure', newMode ? '📏 إيقاف القياس' : '📏 تفعيل القياس');
    }

    finalizePath() {
        window.pathTools?.saveCurrentPath();
    }

    clearAll() {
        if (confirm('🗑️ هل أنت متأكد من مسح جميع المسارات؟')) {
            window.pathTools?.clearAll();
        }
    }

    toggleRotate() {
        if (this.app.controls) {
            this.app.controls.autoRotate = !this.app.controls.autoRotate;
            this.updateButton('rotate', 
                this.app.controls.autoRotate ? '⏸️ إيقاف التدوير' : '▶️ تشغيل التدوير'
            );
        }
    }

    setHotspotMode(mode) {
        this.app.hotspotMode = mode;
        document.body.style.cursor = 'cell';
        
        if (window.pathTools?.drawMode) {
            window.pathTools.stopDraw();
            this.updateButton('draw', '✏️ تفعيل الرسم');
        }
        
        if (window.measurementTools?.measureMode) {
            window.measurementTools.setMode(false);
            this.updateButton('measure', '📏 تفعيل القياس');
        }
    }

    exportTour() {
        if (window.exportTools) {
            window.uiManager?.showLoader('جاري تحضير الجولة...');
            setTimeout(() => {
                const projectName = `tour-${Date.now()}`;
                window.exportTools.exportTour(projectName, window.sceneManager?.scenes || []);
                window.uiManager?.hideLoader();
            }, 100);
        }
    }

    updateButton(name, text) {
        if (this.buttons[name]) {
            this.buttons[name].textContent = text;
        }
    }

    setButtonActive(name, active) {
        if (this.buttons[name]) {
            if (active) {
                this.buttons[name].classList.add('active');
            } else {
                this.buttons[name].classList.remove('active');
            }
        }
    }
}
