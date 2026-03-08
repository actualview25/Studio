// =======================================
// ACTUAL VIEW STUDIO - SCENE MANAGER
// =======================================
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';


export class SceneManager {
    constructor() {
        this.scenes = [];
        this.currentScene = null;
        this.db = null;
        this.measurements = {};
        this.pathsStorage = {};
        this.initDB();
    }

    initDB() {
        const request = indexedDB.open('ActualViewDB', 1);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('scenes')) {
                db.createObjectStore('scenes', { keyPath: 'id' });
            }
        };

        request.onsuccess = (e) => {
            this.db = e.target.result;
            this.loadScenes();
        };
    }

    loadScenes() {
        if (!this.db) return;
        const tx = this.db.transaction('scenes', 'readonly');
        const store = tx.objectStore('scenes');
        const request = store.getAll();

        request.onsuccess = () => {
            this.scenes = request.result || [];
            this.scenes.forEach(scene => {
                if (scene.measurements) this.measurements[scene.id] = scene.measurements;
                if (scene.paths) this.pathsStorage[scene.id] = scene.paths;
            });
            if (window.uiManager?.updateSceneList) window.uiManager.updateSceneList();
        };
    }

    saveScenes() {
        if (!this.db) return;
        const tx = this.db.transaction('scenes', 'readwrite');
        const store = tx.objectStore('scenes');
        store.clear();
        
        this.scenes = this.scenes.map(scene => ({
            id: scene.id,
            name: scene.name,
            originalImage: scene.originalImage,
            paths: this.pathsStorage[scene.id] || [],
            hotspots: scene.hotspots || [],
            measurements: this.measurements[scene.id] || [],
            order: scene.order
        }));
        
        this.scenes.forEach(scene => store.add(scene));
        if (window.uiManager?.updateSceneList) window.uiManager.updateSceneList();
    }

    async addScene(name, imageFile) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const scene = {
                    id: `scene-${Date.now()}-${Math.random()}`,
                    name: name,
                    originalImage: e.target.result,
                    paths: [],
                    hotspots: [],
                    measurements: [],
                    order: this.scenes.length
                };
                this.scenes.push(scene);
                this.measurements[scene.id] = [];
                this.pathsStorage[scene.id] = [];
                this.saveScenes();
                resolve(scene);
            };
            reader.readAsDataURL(imageFile);
        });
    }

    addHotspot(sceneId, type, position, data) {
        const scene = this.scenes.find(s => s.id === sceneId);
        if (!scene) return null;

        const hotspot = {
            id: `hotspot-${Date.now()}-${Math.random()}`,
            type: type,
            position: { x: position.x, y: position.y, z: position.z },
            data: data
        };

        if (!scene.hotspots) scene.hotspots = [];
        scene.hotspots.push(hotspot);
        this.saveScenes();
        return hotspot;
    }

    addMeasurement(sceneId, measurement) {
        if (!this.measurements[sceneId]) this.measurements[sceneId] = [];
        this.measurements[sceneId].push({
            ...measurement,
            id: `measure-${Date.now()}-${Math.random()}`
        });
        this.saveScenes();
    }

    switchToScene(sceneId) {
    const sceneData = this.scenes.find(s => s.id === sceneId);
    if (!sceneData) return false;

    console.log('🔄 التبديل إلى المشهد:', sceneData.name);

    // حفظ المسارات الحالية
    if (this.currentScene && window.pathTools?.paths?.length > 0) {
        this.pathsStorage[this.currentScene.id] = window.pathTools.paths.map(p => ({
            type: p.userData.type,
            color: '#' + window.pathTools.pathColors[p.userData.type].toString(16).padStart(6, '0'),
            points: p.userData.points.map(pt => ({ x: pt.x, y: pt.y, z: pt.z }))
        }));
        this.saveScenes();
    }

    this.currentScene = sceneData;

    // تنظيف المشهد الحالي
    if (window.pathTools) window.pathTools.clearAll();
    if (window.hotspotSystem) window.hotspotSystem.clear();
    if (window.measurementTools) window.measurementTools.measureGroups?.forEach(g => window.app?.scene?.remove(g));

    // ✅ الأهم: تحميل صورة المشهد الجديد
    if (window.app && sceneData.originalImage) {
        console.log('📸 تحميل صورة المشهد:', sceneData.name);
        window.app.loadSceneImage(sceneData.originalImage);
    } else {
        console.warn('⚠️ لا توجد صورة للمشهد:', sceneData.name);
        // إذا لم توجد صورة، استخدم البانوراما الافتراضية
        if (window.app) window.app.loadDefaultPanorama();
    }

    // إعادة بناء المسارات
    if (sceneData.paths?.length > 0 && window.pathTools) {
        sceneData.paths.forEach(pathData => {
            const points = pathData.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
            window.pathTools.createStraightPath(points, pathData.type);
        });
    }

    // إعادة بناء الهوتسبوتات
    if (sceneData.hotspots?.length > 0 && window.hotspotSystem) {
        window.hotspotSystem.rebuild(sceneData.hotspots);
    }

    // إعادة بناء القياسات
    if (sceneData.measurements?.length > 0 && window.measurementTools) {
        window.measurementTools.showMeasurements(sceneId);
    }

    // ✅ تحديث لوحة المشاهد
    if (window.uiManager) {
        window.uiManager.updateSceneList();
    }

    this.saveScenes();
    console.log('✅ تم التبديل إلى المشهد:', sceneData.name);
    return true;
}

    deleteScene(sceneId) {
        const index = this.scenes.findIndex(s => s.id === sceneId);
        if (index !== -1) {
            this.scenes.splice(index, 1);
            delete this.measurements[sceneId];
            delete this.pathsStorage[sceneId];
            
            if (this.currentScene?.id === sceneId) {
                if (this.scenes.length > 0) {
                    this.switchToScene(this.scenes[0].id);
                } else {
                    this.currentScene = null;
                }
            }
            this.saveScenes();
        }
    }
}
