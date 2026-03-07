// =======================================
// ACTUAL VIEW STUDIO - MAIN ENTRY POINT
// =======================================

import { SceneManager } from './src/core/SceneManager.js';
import { ProjectManager } from './src/core/ProjectManager.js';
import { HotspotSystem } from './src/core/HotspotSystem.js';
import { PathTools } from './src/tools/PathTools.js';
import { MeasurementTools } from './src/tools/MeasurementTools.js';
import { ExportTools } from './src/tools/ExportTools.js';
import { UIManager } from './src/ui/UIManager.js';

class ActualViewStudio {
    constructor() {
        console.log('🚀 بدء تشغيل ACTUAL VIEW STUDIO...');
        
        // تهيئة Three.js
        this.initThree();
        
        // تهيئة المكونات
        this.initComponents();
        
        // تحميل البانوراما الافتراضية
        this.loadDefaultPanorama();
        
        // أحداث
        this.setupEvents();
        
        // بدء الحركة
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

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.autoRotate = true;
        
        // إضاءة
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
        // مديري المشروع
        window.sceneManager = new SceneManager();
        window.projectManager = new ProjectManager();
        window.hotspotSystem = HotspotSystem;
        
        // أدوات
        window.pathTools = new PathTools(this);
        window.measurementTools = new MeasurementTools(this);
        window.exportTools = new ExportTools(this);
        
        // واجهة المستخدم
        window.uiManager = new UIManager(this);
        
        // تهيئة الأدوات
        window.pathTools.init();
        
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
            (error) => {
                console.warn('⚠️ فشل تحميل البانوراما الافتراضية:', error);
            }
        );
    }

    loadSceneImage(imageData) {
        if (!this.sphereMesh || !this.sphereMesh.material) return;

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
            const point = hits[0].point.clone();

            if (window.measurementTools?.measureMode) {
                window.measurementTools.handleClick(point);
            } else if (this.hotspotMode) {
                this.addHotspot(point);
                this.hotspotMode = null;
                document.body.style.cursor = 'default';
            } else if (window.pathTools?.drawMode) {
                window.pathTools.addPoint(point);
            }
        }
    }

    onMouseMove(e) {
        if (!window.pathTools?.drawMode || !this.sphereMesh) return;
        
        const mouse = new THREE.Vector2();
        mouse.x = (e.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(e.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        const hits = raycaster.intersectObject(this.sphereMesh);

        if (hits.length) {
            window.pathTools.updatePreview(hits[0].point);
        }
    }

    onKeyDown(e) {
        if (!window.pathTools?.drawMode) return;
        
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
        if (window.pathTools?.selectedPoints?.length > 0) {
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
        if (!window.sceneManager?.currentScene) {
            alert('❌ لا يوجد مشهد نشط');
            return;
        }

        if (this.hotspotMode === 'INFO') {
            const title = prompt('📝 أدخل عنوان المعلومات:');
            if (!title) return;
            const content = prompt('📄 أدخل نص المعلومات:');
            if (!content) return;

            window.sceneManager.addHotspot(
                window.sceneManager.currentScene.id,
                'INFO',
                position,
                { title, content }
            );
            
            window.hotspotSystem?.create(position, 'INFO', { title, content }, `hotspot-${Date.now()}`);
            
        } else if (this.hotspotMode === 'SCENE') {
            const otherScenes = window.sceneManager.scenes.filter(s => s.id !== window.sceneManager.currentScene.id);
            
            if (otherScenes.length === 0) {
                alert('❌ لا يوجد مشاهد أخرى');
                return;
            }

            let sceneList = '';
            otherScenes.forEach((s, index) => sceneList += `${index + 1}. ${s.name}\n`);
            
            const choice = prompt(`اختر المشهد للانتقال إليه:\n\n${sceneList}\nأدخل الرقم:`);
            if (!choice) return;

            const selectedIndex = parseInt(choice) - 1;
            if (selectedIndex < 0 || selectedIndex >= otherScenes.length) {
                alert('❌ اختيار غير صالح');
                return;
            }

            const targetScene = otherScenes[selectedIndex];
            const description = prompt('📝 أدخل وصفاً لهذه النقطة:') || `انتقال إلى ${targetScene.name}`;

            const hotspot = window.sceneManager.addHotspot(
                window.sceneManager.currentScene.id,
                'SCENE',
                position,
                { targetSceneId: targetScene.id, targetSceneName: targetScene.name, description }
            );
            
            if (hotspot) {
                window.hotspotSystem?.create(
                    position, 
                    'SCENE', 
                    { targetSceneId: targetScene.id, targetSceneName: targetScene.name }, 
                    hotspot.id
                );
            }
        }
        
        if (window.uiManager) {
            window.uiManager.updateSceneList();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        
        if (window.hotspotSystem) {
            window.hotspotSystem.updatePositions();
        }
    }
}

// تشغيل التطبيق بعد تحميل الصفحة
window.addEventListener('load', () => {
    window.app = new ActualViewStudio();
});

// للوصول من Console
window.ActualViewStudio = ActualViewStudio;
