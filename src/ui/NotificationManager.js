// =======================================
// ACTUAL VIEW STUDIO - NOTIFICATION MANAGER
// =======================================

export class NotificationManager {
    constructor(app) {
        this.app = app;
        this.container = this.createContainer();
    }

    createContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                z-index: 10001; display: flex; flex-direction: column; gap: 10px;
                pointer-events: none; width: 100%; max-width: 400px;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 3000) {
        const colors = {
            info: { bg: '#4a6c8f', border: '#88aaff' },
            success: { bg: '#27ae60', border: '#2ecc71' },
            error: { bg: '#c0392b', border: '#e74c3c' },
            warning: { bg: '#e67e22', border: '#f39c12' }
        };

        const color = colors[type] || colors.info;

        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${color.bg}; color: white; padding: 12px 24px;
            border-radius: 30px; border: 2px solid ${color.border};
            box-shadow: 0 4px 15px rgba(0,0,0,0.3); margin-bottom: 10px;
            animation: slideDown 0.3s ease; direction: rtl; text-align: center;
            font-weight: 500; pointer-events: auto; backdrop-filter: blur(5px);
        `;
        notification.textContent = message;
        
        this.container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    error(message, duration = 4000) {
        this.show(message, 'error', duration);
    }

    warning(message, duration = 3000) {
        this.show(message, 'warning', duration);
    }

    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }

    progress(message, percent) {
        const id = 'progress-notification';
        let notification = document.getElementById(id);
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = id;
            notification.style.cssText = `
                background: #4a6c8f; color: white; padding: 15px;
                border-radius: 30px; border: 2px solid #88aaff;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3); margin-bottom: 10px;
                animation: slideDown 0.3s ease; direction: rtl; text-align: center;
                position: relative; overflow: hidden;
            `;
            
            const progressBar = document.createElement('div');
            progressBar.id = 'progress-bar';
            progressBar.style.cssText = `
                position: absolute; bottom: 0; left: 0; height: 4px;
                background: #88aaff; width: 0%; transition: width 0.3s;
            `;
            notification.appendChild(progressBar);
            
            const text = document.createElement('div');
            text.id = 'progress-text';
            text.style.position = 'relative';
            text.style.zIndex = '1';
            notification.appendChild(text);
            
            this.container.appendChild(notification);
        }
        
        document.getElementById('progress-text').textContent = message;
        document.getElementById('progress-bar').style.width = percent + '%';
        
        if (percent >= 100) {
            setTimeout(() => notification.remove(), 1000);
        }
    }
}