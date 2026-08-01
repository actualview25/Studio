// =======================================
// ACTUAL VIEW STUDIO - MAIN ENTRY POINT
// =======================================

const THREE = window.THREE;
const OrbitControls = THREE.OrbitControls;

console.log('✅ THREE loaded:', !!THREE);
console.log('✅ OrbitControls loaded:', !!OrbitControls);

import { SceneManager } from './src/core/SceneManager.js';
import { ProjectManager } from './src/core/ProjectManager.js';
import { HotspotSystem } from './src/core/HotspotSystem.js';
import { PathTools } from './src/tools/PathTools.js';
import { MeasurementTools } from './src/tools/MeasurementTools.js';
import { CalibrationTools } from './src/tools/CalibrationTools.js';
import { ExportTools } from './src/tools/ExportTools.js';
import { UIManager } from './src/ui/UIManager.js';

class ActualViewStudio {

    constructor() {
        console.log('🚀 بدء تشغيل ACTUAL VIEW STUDIO...');
        this.initThree();
        this.initComponents();
        this.loadDefaultPanorama();
        this.setupEvents();
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 0, 0.1);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('container').appendChild(this.renderer.domElement);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.autoRotate = true;
        this.setupLights();
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambientLight);
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight1.position.set(1, 1, 1);
        this.scene.add(dirLight1);
        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight2.position.set(-1, -1, -0.5);
        this.scene.add(dirLight2);
    }

    initComponents() {
        window.sceneManager = new SceneManager();
        window.projectManager = new ProjectManager();
        window.hotspotSystem = HotspotSystem;
        window.pathTools = new PathTools(this);
        window.measurementTools = new MeasurementTools(this);
        window.calibrationTools = new CalibrationTools(this);
        window.exportTools = new ExportTools(this);
        window.uiManager = new UIManager(this);
        window.pathTools.init();
        
        // زر المعايرة
        const calibrateBtn = document.getElementById('calibrateRoom');
        if (calibrateBtn) {
            calibrateBtn.addEventListener('click', () => {
                if (window.calibrationTools.isCalibrating) {
                    window.calibrationTools.cancelCalibration();
                    calibrateBtn.textContent = '🎯 معايرة الغرفة';
                    calibrateBtn.classList.remove('active');
                } else {
                    window.calibrationTools.startCalibration();
                    calibrateBtn.textContent = '⏹️ إيقاف المعايرة';
                    calibrateBtn.classList.add('active');
                }
            });
        }
        
        console.log('✅ جميع المكونات جاهزة');
    }

    loadDefaultPanorama() {
        const loader = new THREE.TextureLoader();
        loader.load(
            'assets/texture/StartPoint.jpg',
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.wrapS = THREE.RepeatWrapping;
                texture.repeat.x = -1;
                const geometry = new THREE.SphereGeometry(500, 64, 64);
                const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
                this.sphereMesh = new THREE.Mesh(geometry, material);
                this.scene.add(this.sphereMesh);
                console.log('✅ تم تحميل البانوراما الافتراضية');
            },
            undefined,
            (error) => console.warn('⚠️ فشل تحميل البانوراما الافتراضية:', error)
        );
    }

    loadSceneImage(imageData) {
        if (!this.sphereMesh || !this.sphereMesh.material) {
            const geometry = new THREE.SphereGeometry(500, 64, 64);
            const material = new THREE.MeshBasicMaterial({ color: 0x333344, side: THREE.BackSide });
            this.sphereMesh = new THREE.Mesh(geometry, material);
            this.scene.add(this.sphereMesh);
        }
        const img = new Image();
        img.onload = () => {
            const texture = new THREE.CanvasTexture(img);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.wrapS = THREE.RepeatWrapping;
            texture.repeat.x = -1;
            this.sphereMesh.material.map = texture;
            this.sphereMesh.material.needsUpdate = true;
            console.log('✅ تم تحميل صورة المشهد الجديد');
        };
        img.onerror = (err) => console.error('❌ فشل تحميل الصورة:', err);
        img.src = imageData;
    }

    setupEvents() {
        this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('resize', () => this.onResize());
    }

    onClick(e) {
        if (!this.sphereMesh || e.target !== this.renderer.domElement) return;
        const mouse = new THREE.Vector2();
        mouse.x = (e.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(e.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const hits = raycaster.intersectObject(this.sphereMesh);
        if (hits.length) {
            const surfacePoint = hits[0].point.clone();
            const direction = surfacePoint.clone().normalize();
            const offsetPoint = direction.multiplyScalar(502);
            
            // المعايرة أولاً
            if (window.calibrationTools && window.calibrationTools.isCalibrating) {
                window.calibrationTools.handleCalibrationClick(offsetPoint);
                return;
            }
            
            // القياس (يدعم النموذج المعاير)
            if (window.measurementTools && window.measurementTools.measureMode) {
                window.measurementTools.handleClick(offsetPoint);
            } else if (this.hotspotMode) {
                this.addHotspot(surfacePoint);
            } else if (window.pathTools && window.pathTools.drawMode) {
                window.pathTools.addPoint(offsetPoint);
            }
        }
    }

    onMouseMove(e) {
        if (!window.pathTools || !window.pathTools.drawMode || !this.sphereMesh) return;
        const mouse = new THREE.Vector2();
        mouse.x = (e.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(e.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const hits = raycaster.intersectObject(this.sphereMesh);
        if (hits.length) window.pathTools.updatePreview(hits[0].point);
    }

    onKeyDown(e) {
        if (!window.pathTools || !window.pathTools.drawMode) return;
        switch(e.key) {
            case 'Enter': e.preventDefault(); window.pathTools.saveCurrentPath(); break;
            case 'Backspace': e.preventDefault(); this.undoLastPoint(); break;
            case 'Escape': e.preventDefault(); window.pathTools.clearCurrentDrawing(); break;
            case '1': window.pathTools.setType('EL'); break;
            case '2': window.pathTools.setType('AC'); break;
            case '3': window.pathTools.setType('WP'); break;
            case '4': window.pathTools.setType('WA'); break;
            case '5': window.pathTools.setType('GS'); break;
        }
    }

    undoLastPoint() {
        if (window.pathTools && window.pathTools.selectedPoints && window.pathTools.selectedPoints.length > 0) {
            window.pathTools.selectedPoints.pop();
            const last = window.pathTools.pointMarkers.pop();
            if (last) this.scene.remove(last);
            window.pathTools.updateTempLine();
        }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (window.hotspotSystem) window.hotspotSystem.updatePositions();
    }

    addHotspot(position) {
        if (!window.sceneManager || !window.sceneManager.currentScene) {
            alert('❌ لا يوجد مشهد نشط');
            this.hotspotMode = null;
            document.body.style.cursor = 'default';
            return;
        }
        if (this.hotspotMode === 'INFO') {
            const title = prompt('📝 أدخل عنوان المعلومات:');
            if (!title) { this.hotspotMode = null; document.body.style.cursor = 'default'; return; }
            const content = prompt('📄 أدخل نص المعلومات:');
            if (!content) { this.hotspotMode = null; document.body.style.cursor = 'default'; return; }
            window.sceneManager.addHotspot(window.sceneManager.currentScene.id, 'INFO', position, { title, content });
            if (window.hotspotSystem) window.hotspotSystem.create(position, 'INFO', { title, content }, `hotspot-${Date.now()}`);
        } else if (this.hotspotMode === 'SCENE') {
            const otherScenes = window.sceneManager.scenes.filter(s => s.id !== window.sceneManager.currentScene.id);
            if (otherScenes.length === 0) { alert('❌ لا يوجد مشاهد أخرى'); this.hotspotMode = null; document.body.style.cursor = 'default'; return; }
            let sceneList = '';
            otherScenes.forEach((s, index) => { sceneList += `${index + 1}. ${s.name}\n`; });
            const choice = prompt(`اختر المشهد للانتقال إليه:\n\n${sceneList}\nأدخل الرقم:`);
            if (!choice) { this.hotspotMode = null; document.body.style.cursor = 'default'; return; }
            const selectedIndex = parseInt(choice) - 1;
            if (selectedIndex < 0 || selectedIndex >= otherScenes.length || isNaN(selectedIndex)) {
                alert('❌ اختيار غير صالح'); this.hotspotMode = null; document.body.style.cursor = 'default'; return;
            }
            const targetScene = otherScenes[selectedIndex];
            const description = prompt('📝 أدخل وصفاً:', `انتقال إلى ${targetScene.name}`) || `انتقال إلى ${targetScene.name}`;
            const hotspot = window.sceneManager.addHotspot(window.sceneManager.currentScene.id, 'SCENE', position, { targetSceneId: targetScene.id, targetSceneName: targetScene.name, description });
            if (hotspot && window.hotspotSystem) window.hotspotSystem.create(position, 'SCENE', { targetSceneId: targetScene.id, targetSceneName: targetScene.name, description }, hotspot.id);
        }
        this.hotspotMode = null;
        document.body.style.cursor = 'default';
        if (window.uiManager) { window.uiManager.updateSceneList(); window.uiManager.showSuccess('تم إضافة النقطة بنجاح'); }
        const sceneBtn = document.getElementById('hotspotScene'); const infoBtn = document.getElementById('hotspotInfo');
        if (sceneBtn) sceneBtn.classList.remove('active');
        if (infoBtn) infoBtn.classList.remove('active');
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer) this.renderer.render(this.scene, this.camera);
        if (window.hotspotSystem) window.hotspotSystem.updatePositions();
    }
}

window.addEventListener('load', () => { window.app = new ActualViewStudio(); });
window.ActualViewStudio = ActualViewStudio;
