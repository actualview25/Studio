// =======================================
// ACTUAL VIEW STUDIO - PATH TOOLS
// =======================================

export class PathTools {
    constructor(app) {
        this.app = app;
        this.scene = app.scene;
        this.pathColors = {
            EL: 0xffaa00,
            AC: 0x0033cc,
            WP: 0x0044aa,
            WA: 0xff0000,
            GS: 0x006633
        };
        this.currentPathType = 'EL';
        this.selectedPoints = [];
        this.paths = [];
        this.tempLine = null;
        this.pointMarkers = [];
        this.markerPreview = null;
        this.drawMode = false;
    }

    init() {
        this.setupMarkerPreview();
        console.log('🛤️ PathTools جاهز');
    }

    setupMarkerPreview() {
        const geometry = new THREE.SphereGeometry(8, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: this.pathColors[this.currentPathType],
            emissive: this.pathColors[this.currentPathType],
            emissiveIntensity: 0.8
        });
        this.markerPreview = new THREE.Mesh(geometry, material);
        this.scene.add(this.markerPreview);
        this.markerPreview.visible = false;
    }

    setType(type) {
        this.currentPathType = type;
        if (this.markerPreview) {
            this.markerPreview.material.color.setHex(this.pathColors[type]);
            this.markerPreview.material.emissive.setHex(this.pathColors[type]);
        }
        if (window.uiManager) window.uiManager.updateStatus(type);
        console.log(`🎨 تم تغيير نوع المسار إلى: ${type}`);
    }

    startDraw() {
        this.drawMode = true;
        document.body.style.cursor = 'crosshair';
        if (this.markerPreview) this.markerPreview.visible = true;
    }

    stopDraw() {
        this.drawMode = false;
        document.body.style.cursor = 'default';
        if (this.markerPreview) this.markerPreview.visible = false;
    }

    addPoint(position) {
        if (!this.drawMode) return;
        
        this.selectedPoints.push(position.clone());
        console.log(`📍 نقطة ${this.selectedPoints.length} مضافة - النوع: ${this.currentPathType}`);
        this.addPointMarker(position);
        this.updateTempLine();
    }

    addPointMarker(position) {
        const geometry = new THREE.SphereGeometry(6, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: this.pathColors[this.currentPathType],
            emissive: this.pathColors[this.currentPathType],
            emissiveIntensity: 0.6
        });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        this.scene.add(marker);
        this.pointMarkers.push(marker);
    }

    updateTempLine() {
        if (this.tempLine) {
            this.scene.remove(this.tempLine);
            this.tempLine.geometry.dispose();
            this.tempLine = null;
        }
        if (this.selectedPoints.length >= 2) {
            const geometry = new THREE.BufferGeometry().setFromPoints(this.selectedPoints);
            const material = new THREE.LineBasicMaterial({ color: this.pathColors[this.currentPathType] });
            this.tempLine = new THREE.Line(geometry, material);
            this.scene.add(this.tempLine);
        }
    }

    saveCurrentPath() {
        if (this.selectedPoints.length < 2) {
            alert('⚠️ أضف نقطتين على الأقل');
            return;
        }
        
        if (this.tempLine) this.scene.remove(this.tempLine);
        this.createStraightPath(this.selectedPoints);
        this.clearCurrentDrawing();
        
        if (window.sceneManager?.currentScene) {
            const sceneId = window.sceneManager.currentScene.id;
            
            const pathsData = this.paths.map(p => ({
                type: p.userData.type,
                color: '#' + this.pathColors[p.userData.type].toString(16).padStart(6, '0'),
                points: p.userData.points.map(pt => ({ x: pt.x, y: pt.y, z: pt.z }))
            }));
            
            window.sceneManager.pathsStorage[sceneId] = pathsData;
            window.sceneManager.currentScene.paths = pathsData;
            window.sceneManager.saveScenes();
            
            if (window.projectManager) window.projectManager.saveCurrentProject();
            
            console.log(`✅ تم حفظ ${pathsData.length} مسار في المشهد: ${window.sceneManager.currentScene.name}`);
            alert(`✅ تم تثبيت ${pathsData.length} مسار بنجاح`);
        }
    }

    createStraightPath(points, type = null) {
        if (points.length < 2) return;
        
        const pathType = type || this.currentPathType;
        const color = this.pathColors[pathType];
        const pathId = `path-${Date.now()}-${Math.random()}`;
        let createdCount = 0;
        
        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];
            
            const direction = new THREE.Vector3().subVectors(end, start);
            const distance = direction.length();
            if (distance < 5) continue;
            
            const cylinderGeo = new THREE.CylinderGeometry(3.5, 3.5, distance, 12);
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
            
            const cylinder = new THREE.Mesh(cylinderGeo, new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.4
            }));
            cylinder.applyQuaternion(quaternion);
            
            const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            cylinder.position.copy(center);
            
            cylinder.userData = { type: pathType, pathId: pathId, points: [start.clone(), end.clone()] };
            this.scene.add(cylinder);
            this.paths.push(cylinder);
            createdCount++;
        }
        
        if (createdCount > 0) {
            console.log(`🛤️ تم إنشاء ${createdCount} قطعة مسار من نوع ${pathType}`);
        }
    }

    clearCurrentDrawing() {
        this.selectedPoints = [];
        this.pointMarkers.forEach(m => this.scene.remove(m));
        this.pointMarkers = [];
        if (this.tempLine) {
            this.scene.remove(this.tempLine);
            this.tempLine.geometry.dispose();
            this.tempLine = null;
        }
    }

    clearAll() {
        this.paths.forEach(p => {
            this.scene.remove(p);
            if (p.geometry) p.geometry.dispose();
            if (p.material) {
                if (Array.isArray(p.material)) {
                    p.material.forEach(m => m.dispose());
                } else {
                    p.material.dispose();
                }
            }
        });
        this.paths = [];
        this.clearCurrentDrawing();
        console.log('🗑️ تم مسح جميع المسارات');
    }

    toggleLayer(type, visible) {
        let count = 0;
        this.paths.forEach(p => {
            if (p.userData.type === type) {
                p.visible = visible;
                count++;
            }
        });
        console.log(`${visible ? '👁️ إظهار' : '👁️ إخفاء'} ${count} مسار من نوع ${type}`);
    }

    updatePreview(position) {
        if (this.drawMode && this.markerPreview && position) {
            this.markerPreview.position.copy(position);
        }
    }

    getPathsByType(type) {
        return this.paths.filter(p => p.userData.type === type);
    }

    getPathCount() {
        return this.paths.length;
    }

    getTypes() {
        return Object.keys(this.pathColors);
    }

    dispose() {
        this.clearAll();
        if (this.markerPreview) {
            this.scene.remove(this.markerPreview);
            this.markerPreview.geometry.dispose();
            this.markerPreview.material.dispose();
            this.markerPreview = null;
        }
    }
}