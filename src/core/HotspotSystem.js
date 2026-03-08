// =======================================
// ACTUAL VIEW STUDIO - HOTSPOT SYSTEM
// =======================================
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
export const HotspotSystem = {
    markers: {},
    backgroundSpheres: {},
    
    create: function(position, type, data, id) {
        const bgSphere = this.createBackgroundSphere(position, type, id);
        const icon = this.createIcon(position, type, data, id);
        return { bgSphere, icon };
    },
    
    createBackgroundSphere: function(position, type, id) {
        const color = type === 'SCENE' ? 0x44aaff : 0xffaa44;
        const geometry = new THREE.SphereGeometry(12, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.15
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        sphere.userData = { type: 'hotspot-background', hotspotId: id, hotspotType: type };
        
        if (window.app?.scene) {
            window.app.scene.add(sphere);
        }
        this.backgroundSpheres[id] = sphere;
        
        return sphere;
    },
    
    createIcon: function(position, type, data, id) {
        const div = document.createElement('div');
        div.className = 'hotspot-marker';
        div.setAttribute('data-id', id);
        div.setAttribute('data-type', type);
        
        const iconUrl = type === 'SCENE' ? 'assets/icons/hotspot.png' : 'assets/icons/info.png';
        const borderColor = type === 'SCENE' ? '#44aaff' : '#ffaa44';
        const displayText = type === 'SCENE' 
            ? (data.targetSceneName || 'انتقال') 
            : (data.title || 'معلومات');
        
        div.innerHTML = `
            <img src="${iconUrl}" alt="${type}" style="border: 2px solid ${borderColor}; border-radius: 50%; background: rgba(0,0,0,0.3); width: 40px; height: 40px; pointer-events: none;">
            <div class="hotspot-label" style="border-color: ${borderColor};">${displayText}</div>
        `;
        
        div._worldPosition = position.clone();
        
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            if (type === 'INFO') {
                this.showInfoWindow(data.title, data.content);
            } else {
                if (window.sceneManager && data.targetSceneId) {
                    window.sceneManager.switchToScene(data.targetSceneId);
                }
            }
        });

        document.body.appendChild(div);
        this.markers[id] = div;
        
        return div;
    },
    
    rebuild: function(hotspots) {
        this.clear();
        
        if (!hotspots || hotspots.length === 0) return;
        
        hotspots.forEach(h => {
            const pos = new THREE.Vector3(h.position.x, h.position.y, h.position.z);
            this.create(pos, h.type, h.data, h.id);
        });
        
        this.updatePositions();
        console.log(`✅ تم إنشاء ${hotspots.length} نقطة`);
    },
    
    updatePositions: function() {
        if (!window.app?.camera) return;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        Object.values(this.markers).forEach(icon => {
            if (!icon._worldPosition) return;
            
            const pos = icon._worldPosition.clone().project(window.app.camera);
            
            if (pos.z > 1) {
                icon.style.display = 'none';
                return;
            }
            
            const x = (pos.x * 0.5 + 0.5) * width;
            const y = (-pos.y * 0.5 + 0.5) * height;
            
            icon.style.left = x + 'px';
            icon.style.top = y + 'px';
            
            icon.style.display = (x < -100 || x > width + 100 || y < -100 || y > height + 100) ? 'none' : 'block';
        });
    },
    
    showInfoWindow: function(title, content) {
        document.querySelectorAll('.custom-info-window').forEach(el => el.remove());
        
        const win = document.createElement('div');
        win.className = 'custom-info-window';
        win.innerHTML = `
            <div class="window-header">
                <img src="assets/icons/info.png">
                <h3>${title || 'معلومات'}</h3>
            </div>
            <div class="window-content">${content || ''}</div>
            <button class="window-close">حسناً</button>
        `;
        
        win.querySelector('.window-close').onclick = () => win.remove();
        document.body.appendChild(win);
        
        setTimeout(() => win.remove(), 5000);
    },
    
    clear: function() {
        Object.values(this.markers).forEach(icon => {
            if (icon && icon.parentNode) icon.parentNode.removeChild(icon);
        });
        this.markers = {};
        
        Object.values(this.backgroundSpheres).forEach(sphere => {
            if (sphere && window.app?.scene) window.app.scene.remove(sphere);
        });
        this.backgroundSpheres = {};
    },
    
    remove: function(id) {
        if (this.markers[id]?.parentNode) {
            this.markers[id].parentNode.removeChild(this.markers[id]);
            delete this.markers[id];
        }
        if (this.backgroundSpheres[id] && window.app?.scene) {
            window.app.scene.remove(this.backgroundSpheres[id]);
            delete this.backgroundSpheres[id];
        }
    }
};
