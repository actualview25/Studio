// =======================================
// ACTUAL VIEW STUDIO - PLAYER
// =======================================

export class Player {
    constructor(containerId, projectData) {
        this.containerId = containerId;
        this.projectData = projectData;
        this.scenes = [];
        this.currentSceneIndex = 0;
        this.scene3D = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.sphereMesh = null;
        this.allPaths = [];
        this.hotspotMarkers = {};
        this.measurementElements = [];
        this.showMeasurements = false;
        
        this.init();
    }

    init() {
        this.initThree();
        this.setupLights();
        this.loadManifest();
        this.setupEvents();
        this.animate();
    }

    initThree() {
        this.scene3D = new THREE.Scene();
        this.scene3D.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 0.1);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById(this.containerId).appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene3D.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(1, 1, 1);
        this.scene3D.add(dirLight);
    }

    async loadManifest() {
        try {
            const response = await fetch('manifest.json');
            this.projectData = await response.json();
            this.scenes = this.projectData.scenes || [];
            
            this.createUI();
            
            if (this.scenes.length > 0) {
                this.loadScene(0);
            }
        } catch (error) {
            console.error('❌ فشل تحميل manifest.json:', error);
        }
    }

    createUI() {
        // إنشاء شريط الأدوات
        const toolbar = document.createElement('div');
        toolbar.className = 'player-toolbar';
        toolbar.innerHTML = `
            <div class="player-logo">🏗️ Actual View Studio</div>
            <div class="player-controls">
                <button id="playerRotateBtn">⏸️ إيقاف الدوران</button>
                <button id="playerMeasureBtn">📏 إظهار القياسات</button>
            </div>
        `;
        document.body.appendChild(toolbar);

        // إنشاء لوحة المشاهد
        const scenePanel = document.createElement('div');
        scenePanel.className = 'player-scene-panel';
        scenePanel.innerHTML = `
            <div class="player-panel-header">
                <h3>📋 قائمة المشاهد</h3>
            </div>
            <div class="player-scene-list" id="playerSceneList"></div>
        `;
        document.body.appendChild(scenePanel);

        // إنشاء لوحة المسارات
        const pathsPanel = document.createElement('div');
        pathsPanel.className = 'player-paths-panel';
        pathsPanel.innerHTML = `
            <h3>🔘 التحكم بالمسارات</h3>
            <div id="playerPathsList"></div>
        `;
        document.body.appendChild(pathsPanel);

        this.setupUIEvents();
        this.updateSceneList();
        this.createPathsToggle();
    }

    setupUIEvents() {
        document.getElementById('playerRotateBtn')?.addEventListener('click', () => {
            this.controls.autoRotate = !this.controls.autoRotate;
            document.getElementById('playerRotateBtn').textContent = 
                this.controls.autoRotate ? '⏸️ إيقاف الدوران' : '▶️ تشغيل الدوران';
        });

        document.getElementById('playerMeasureBtn')?.addEventListener('click', () => {
            this.showMeasurements = !this.showMeasurements;
            document.getElementById('playerMeasureBtn').textContent = 
                this.showMeasurements ? '📏 إخفاء القياسات' : '📏 إظهار القياسات';
            this.updateMeasurementsVisibility();
        });
    }

    updateSceneList() {
        const list = document.getElementById('playerSceneList');
        if (!list) return;

        list.innerHTML = '';
        
        this.scenes.forEach((scene, index) => {
            const item = document.createElement('div');
            item.className = 'player-scene-item' + (index === this.currentSceneIndex ? ' active' : '');
            item.innerHTML = `
                <span class="player-scene-icon">${index === 0 ? '🏠' : '🌄'}</span>
                <span class="player-scene-name">${scene.name}</span>
                <span class="player-scene-count">${scene.hotspots?.length || 0}</span>
            `;
            item.addEventListener('click', () => this.loadScene(index));
            list.appendChild(item);
        });
    }

    createPathsToggle() {
        const list = document.getElementById('playerPathsList');
        if (!list) return;

        const pathTypes = ['EL', 'AC', 'WP', 'WA', 'GS'];
        const pathColors = {
            EL: '#ffcc00', AC: '#00ccff', WP: '#0066cc', WA: '#ff3300', GS: '#33cc33'
        };

        list.innerHTML = '';
        
        pathTypes.forEach(type => {
            const div = document.createElement('div');
            div.className = 'player-path-item';
            div.innerHTML = `
                <input type="checkbox" id="path-${type}" data-type="${type}">
                <span class="player-path-color" style="background:${pathColors[type]}"></span>
                <label for="path-${type}">${type}</label>
            `;
            div.querySelector('input').addEventListener('change', (e) => {
                this.togglePathsByType(type, e.target.checked);
            });
            list.appendChild(div);
        });
    }

    togglePathsByType(type, visible) {
        this.allPaths.forEach(p => {
            if (p.userData?.type === type) {
                p.visible = visible;
            }
        });
    }

    async loadScene(index) {
        const sceneData = this.scenes[index];
        if (!sceneData) return;

        this.currentSceneIndex = index;

        // تنظيف المشهد الحالي
        if (this.sphereMesh) this.scene3D.remove(this.sphereMesh);
        Object.values(this.hotspotMarkers).forEach(m => m.remove());
        this.allPaths.forEach(p => this.scene3D.remove(p));
        this.allPaths = [];
        this.hotspotMarkers = {};

        // تحميل الصورة
        try {
            const texture = await this.loadTexture(sceneData.image);
            this.sphereMesh = new THREE.Mesh(
                new THREE.SphereGeometry(500, 128, 128),
                new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide })
            );
            this.scene3D.add(this.sphereMesh);

            // بناء المسارات
            if (sceneData.paths) {
                this.buildPaths(sceneData.paths);
            }

            // بناء النقاط
            if (sceneData.hotspots) {
                setTimeout(() => this.buildHotspots(sceneData.hotspots), 200);
            }

            // تحميل القياسات
            if (sceneData.measurements) {
                this.buildMeasurements(sceneData.measurements);
            }

            this.updateSceneList();
        } catch (error) {
            console.error('❌ فشل تحميل المشهد:', error);
        }
    }

    loadTexture(imagePath) {
        return new Promise((resolve, reject) => {
            new THREE.TextureLoader().load(imagePath, resolve, undefined, reject);
        });
    }

    buildPaths(pathsData) {
        pathsData.forEach(pathData => {
            if (!pathData.points || pathData.points.length < 2) return;

            const color = pathData.color || '#ffaa44';
            const points = pathData.points.map(p => new THREE.Vector3(p.x, p.y, p.z));

            for (let i = 0; i < points.length - 1; i++) {
                const start = points[i];
                const end = points[i + 1];

                const direction = new THREE.Vector3().subVectors(end, start);
                const distance = direction.length();

                if (distance < 0.5) continue;

                const cylinder = new THREE.Mesh(
                    new THREE.CylinderGeometry(3.5, 3.5, distance, 12),
                    new THREE.MeshStandardMaterial({ 
                        color: color,
                        emissive: color,
                        emissiveIntensity: 0.3
                    })
                );

                const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                cylinder.position.copy(midpoint);

                cylinder.quaternion.setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    direction.clone().normalize()
                );

                cylinder.visible = false;
                cylinder.userData = { type: pathData.type };

                this.scene3D.add(cylinder);
                this.allPaths.push(cylinder);
            }
        });
    }

    buildHotspots(hotspotsData) {
        hotspotsData.forEach(h => {
            const pos = new THREE.Vector3(h.position.x, h.position.y, h.position.z);
            const element = this.createHotspotElement(h.type, h.data);
            element._worldPosition = pos.clone();
            document.body.appendChild(element);
            this.hotspotMarkers[h.id] = element;
        });
    }

    createHotspotElement(type, data) {
        const div = document.createElement('div');
        div.className = 'player-hotspot';

        const iconUrl = type === 'SCENE' ? 'icon/hotspot.png' : 'icon/info.png';
        const borderColor = type === 'SCENE' ? '#44aaff' : '#ffaa44';
        const displayText = type === 'SCENE' 
            ? (data.targetSceneName || 'انتقال') 
            : (data.title || 'معلومات');

        div.innerHTML = `
            <img src="${iconUrl}" style="border:2px solid ${borderColor}; width:40px; height:40px; border-radius:50%; background:rgba(0,0,0,0.3);">
            <div class="player-hotspot-label" style="border-color:${borderColor};">${displayText}</div>
        `;

        div.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (type === 'INFO') {
                alert(`${data.title}\n${data.content || ''}`);
            } else if (data.targetSceneId) {
                const targetIndex = this.scenes.findIndex(s => s.id === data.targetSceneId);
                if (targetIndex !== -1) {
                    this.loadScene(targetIndex);
                }
            }
        });

        return div;
    }

    buildMeasurements(measurementsData) {
        measurementsData.forEach(m => {
            const element = this.createMeasurementElement(m);
            this.measurementElements.push(element);
        });
    }

    createMeasurementElement(m) {
        const line = document.createElement('div');
        line.className = 'player-measurement-line';
        
        const start = document.createElement('div');
        start.className = 'player-measurement-point';
        
        const end = document.createElement('div');
        end.className = 'player-measurement-point';
        
        const label = document.createElement('div');
        label.className = 'player-measurement-label';
        label.textContent = m.length + ' m';

        line._start = new THREE.Vector3(m.start.x, m.start.y, m.start.z);
        line._end = new THREE.Vector3(m.end.x, m.end.y, m.end.z);
        start._worldPos = new THREE.Vector3(m.start.x, m.start.y, m.start.z);
        end._worldPos = new THREE.Vector3(m.end.x, m.end.y, m.end.z);
        label._worldPos = new THREE.Vector3().addVectors(start._worldPos, end._worldPos).multiplyScalar(0.5);

        document.body.appendChild(line);
        document.body.appendChild(start);
        document.body.appendChild(end);
        document.body.appendChild(label);

        return { line, start, end, label };
    }

    updateMeasurementsVisibility() {
        this.measurementElements.forEach(e => {
            if (e.line) e.line.style.display = this.showMeasurements ? 'block' : 'none';
            if (e.start) e.start.style.display = this.showMeasurements ? 'block' : 'none';
            if (e.end) e.end.style.display = this.showMeasurements ? 'block' : 'none';
            if (e.label) e.label.style.display = this.showMeasurements ? 'block' : 'none';
        });
    }

    updateHotspotsPosition() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        Object.values(this.hotspotMarkers).forEach(el => {
            if (!el._worldPosition) return;

            const projected = el._worldPosition.clone().project(this.camera);

            if (projected.z > 1) {
                el.style.display = 'none';
                return;
            }

            const x = (projected.x * 0.5 + 0.5) * width;
            const y = (-projected.y * 0.5 + 0.5) * height;

            if (x < -100 || x > width + 100 || y < -100 || y > height + 100) {
                el.style.display = 'none';
                return;
            }

            el.style.display = 'block';
            el.style.left = x + 'px';
            el.style.top = y + 'px';
        });
    }

    updateMeasurementPositions() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.measurementElements.forEach(elem => {
            if (!elem.line?._start) return;

            const start = elem.line._start.clone().project(this.camera);
            const end = elem.line._end.clone().project(this.camera);

            if (start.z > 1 || end.z > 1) {
                this.setMeasurementDisplay(elem, 'none');
                return;
            }

            const x1 = (start.x * 0.5 + 0.5) * width;
            const y1 = (-start.y * 0.5 + 0.5) * height;
            const x2 = (end.x * 0.5 + 0.5) * width;
            const y2 = (-end.y * 0.5 + 0.5) * height;

            if (x1 < -100 || x1 > width + 100 || y1 < -100 || y1 > height + 100 ||
                x2 < -100 || x2 > width + 100 || y2 < -100 || y2 > height + 100) {
                this.setMeasurementDisplay(elem, 'none');
                return;
            }

            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;

            elem.line.style.display = this.showMeasurements ? 'block' : 'none';
            elem.line.style.left = x1 + 'px';
            elem.line.style.top = y1 + 'px';
            elem.line.style.width = length + 'px';
            elem.line.style.transform = 'rotate(' + angle + 'deg)';

            elem.start.style.display = this.showMeasurements ? 'block' : 'none';
            elem.start.style.left = x1 + 'px';
            elem.start.style.top = y1 + 'px';

            elem.end.style.display = this.showMeasurements ? 'block' : 'none';
            elem.end.style.left = x2 + 'px';
            elem.end.style.top = y2 + 'px';

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            elem.label.style.display = this.showMeasurements ? 'block' : 'none';
            elem.label.style.left = midX + 'px';
            elem.label.style.top = (midY - 30) + 'px';
        });
    }

    setMeasurementDisplay(elem, display) {
        if (elem.line) elem.line.style.display = display;
        if (elem.start) elem.start.style.display = display;
        if (elem.end) elem.end.style.display = display;
        if (elem.label) elem.label.style.display = display;
    }

    setupEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.controls.addEventListener('change', () => {
            this.updateHotspotsPosition();
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene3D, this.camera);
        
        this.updateHotspotsPosition();
        this.updateMeasurementPositions();
    }
}