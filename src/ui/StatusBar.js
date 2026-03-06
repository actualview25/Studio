// =======================================
// ACTUAL VIEW STUDIO - STATUS BAR
// =======================================

export class StatusBar {
    constructor(app) {
        this.app = app;
        this.element = document.getElementById('status');
    }

    updatePathType(type) {
        if (!this.element || !window.pathTools) return;
        
        const color = window.pathTools.pathColors[type];
        const hexColor = '#' + (color ? color.toString(16).padStart(6, '0') : 'ffcc00');
        this.element.innerHTML = `النوع الحالي: <span style="color:${hexColor};">${type}</span>`;
    }

    setMeasureMode() {
        if (!this.element) return;
        this.element.innerHTML = '📏 وضع القياس: اختر النقطة الأولى';
    }

    setMeasureSecondPoint() {
        if (!this.element) return;
        this.element.innerHTML = '📏 اختر النقطة الثانية';
    }

    setHotspotMode() {
        if (!this.element) return;
        this.element.innerHTML = '📍 وضع النقاط: اختر موقع النقطة';
    }

    setMessage(message, duration = 3000) {
        if (!this.element) return;
        
        const original = this.element.innerHTML;
        this.element.innerHTML = message;
        
        if (duration > 0) {
            setTimeout(() => {
                this.element.innerHTML = original;
            }, duration);
        }
    }

    showLoader(message) {
        if (!this.element) return;
        this.element.innerHTML = `⏳ ${message || 'جاري التحميل...'}`;
    }

    hideLoader() {
        this.updatePathType(window.pathTools?.currentPathType || 'EL');
    }

    showError(message) {
        if (!this.element) return;
        this.element.innerHTML = `❌ ${message}`;
        this.element.style.color = '#ff4444';
        
        setTimeout(() => {
            this.element.style.color = '';
            this.updatePathType(window.pathTools?.currentPathType || 'EL');
        }, 3000);
    }

    showSuccess(message) {
        if (!this.element) return;
        this.element.innerHTML = `✅ ${message}`;
        
        setTimeout(() => {
            this.updatePathType(window.pathTools?.currentPathType || 'EL');
        }, 2000);
    }
}