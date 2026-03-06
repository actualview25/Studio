// =======================================
// ACTUAL VIEW STUDIO - EXPORT TOOLS
// =======================================

export class ExportTools {
    constructor(app) {
        this.app = app;
        this.zip = new JSZip();
    }

    async exportTour(projectName, scenes) {
        console.log(`📦 بدء تصدير الجولة: ${projectName}`);
        
        const folder = this.zip.folder(projectName);
        
        // إضافة صور المشاهد
        await this.addSceneImages(scenes, folder);
        
        // إضافة مجلد الأيقونات
        await this.addIcons(folder);
        
        // إضافة بيانات المشاهد
        const scenesData = this.prepareScenesData(scenes);
        folder.file('tour-data.json', JSON.stringify(scenesData, null, 2));
        
        // إضافة ملفات المشغل
        folder.file('index.html', this.generatePlayerHTML(projectName));
        folder.file('style.css', this.generatePlayerCSS());
        folder.file('README.md', this.generateReadme(projectName));
        
        // إنشاء ملف ZIP
        const content = await this.zip.generateAsync({ type: 'blob' });
        saveAs(content, `${projectName}.zip`);
        
        console.log(`✅ تم تصدير الجولة بنجاح: ${projectName}.zip`);
    }

    async addSceneImages(scenes, folder) {
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            try {
                const imageSrc = scene.originalImage || scene.image;
                
                if (typeof imageSrc === 'string' && imageSrc.includes(',') && imageSrc.split(',').length > 1) {
                    const imageData = imageSrc.split(',')[1];
                    if (imageData) {
                        folder.file(`scene-${i}.jpg`, imageData, { base64: true });
                        console.log(`🖼️ تم إضافة صورة المشهد ${i}`);
                    }
                }
            } catch (e) {
                console.warn(`⚠️ فشل إضافة صورة المشهد ${i}:`, e.message);
            }
        }
    }

    async addIcons(folder) {
        const iconFolder = folder.folder('icon');
        
        try {
            // محاولة تحميل الأيقونات من المجلد المحلي
            const hotspotResponse = await fetch('assets/icons/hotspot.png');
            const hotspotBlob = await hotspotResponse.blob();
            iconFolder.file('hotspot.png', hotspotBlob);
            
            const infoResponse = await fetch('assets/icons/info.png');
            const infoBlob = await infoResponse.blob();
            iconFolder.file('info.png', infoBlob);
            
            console.log('✅ تم إضافة الأيقونات من المجلد المحلي');
        } catch (error) {
            console.warn('⚠️ لم يتم العثور على الأيقونات المحلية، استخدام base64');
            this.addDefaultIcons(iconFolder);
        }
    }

    addDefaultIcons(iconFolder) {
        // أيقونات افتراضية (base64)
        const hotspotBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAIzSURBVFiF7ZbNaxNBGMZ/djdpk0hS9KIoigp68RRyUw8iKHgRLyIoePCi4F8g3nrwU0Tx4lEQvSh4EcF78NqLIAp68SNoFZE2TdMk3R2f2SSbdNPd2Z0NIvpAXjLMvM/8ZucjMwsHqIEa+J+hlJpOkrS0Z0mS1NM0nSu7l+M4h5VSy1rrn1rrb6W4LmBZ1hWl1LKUsl3L+t+01rdLcUMApdRVpdTC3r6iKOqMx+O+UsoPw/CFlHK1lFoJMAzjiVJqRQgR+b5/37Ks4+Fw+DaKovvtdvux4ziLUkq/LEcIYVvW3SRJ+lLKL5qmZ9I0HUopDc/zTmZZtpZlWZJl2YYoG4MQYgSAYRgIIW5IKZ1iPGmaXgPA8zySJOlKKdM0TdM0rZfRB8iyrC2lTNI0nSmKIl3X69M0PTRN0+WyHMa11pckSRohhC2l/JYkyXBRPrdt25RSr5Zl3zFN88F4PP4mpdwJguBpFEX3m83mGRhzLwjDMHzJmP0wDMMXWZZ93G63H5fN78sopdA5N0opP0mSl/P5vN5sNh/zAymE+LqcT2uN1jqRUn6Joqg9nU4fFNM2DMMo2l95GGP/SylvR1H0oEifMzsIgoNSyjaMpZRfl8vlvTAMP0dRdG/btvu+7z9jzG4X6Wc3j8OYe7Lf75+M47hXdXyUUh8BgDF7yhj7yZhbzOfz22maHjPGTjPGxJ+WnzE2Wq/Xh5RSl1ar1Yk8zzvL5fJ4GIa9JEk6URT1lFL9NE17cRwfybLsp9Z6tVqtDsI4fAtjX6rGgRrY4/wCJ8zvggPQ/IEAAAAASUVORK5CYII=';
        const infoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAI5SURBVFiF7ZbPaxNBFMfnt5vdJBIp1l6kFQU9eCk9tQcVBC+iIAgK4kXw7l/w4EEQ70178aAHQfBPRBCvXrwIgqBQ6FURtPUDLVIrSdP9MW+TTbrZzWazWwX7hQWZZeZ95v2Y994bGAVK0P8ZY2yP1rohpXzDOS9JKfcaY56Ypvk4DMMyY+xrFEWJ53nblFKPm812qVR6qJRa55w/aF3GGJ9zHiqlZqIoOgIAtm2f6nQ6FxhjZZZlH6IoOtsfhzF2l2VZXSlV55y/CYLgJgCkaToex/G0lHIGAAqFgimESBhjUwCglNqqlPoqhIgBQEq5GEXRac55RUr5xXGcQQBQSq2GYfgGAJRS61LKz4yxm2EYjhbzL5VKawBgrgM3DONBEARHlFKbAIBS6nOl1B6l1DwA6Hq9frRQKNSiKNohl6vVal+hUNjfbDaPAkCxWHzKGNtXKBSqk8nksWEYZ5Ikqbquu1Yul2d938+63e5UoVA4I6W8CgC2bT9JkuQeAGRZ5gOAaZqjUkpTSrmZZdl9pVQtSZJ7xWKxBAA6jmOO42wIIa4BQLlcDjjn3w3DqAkhVgGAc34tjuM5pdS8EOJXmUwmE0KIvQDAOT8KACzLspc8z3vLGJuJomg6TVPP87zJLMu8TqfzI89zLwiCvZxzkWVZP5/P5wFgLMs2pJTVKIp6nPOs2Wx+Y4z9FkKcBICRUmkpy7K6lPJGHMfHS6XSEs65ZVnWbD6f38rzfMxxnM+B759I0/Qp5/w4Y6wQJMl2IcRcGIaHhRDbgyB4JKU8yRirCiE+D7z/H6AE9Y1+As0ZxH2vO/WTAAAAAElFTkSuQmCC';
        
        iconFolder.file('hotspot.png', hotspotBase64, { base64: true });
        iconFolder.file('info.png', infoBase64, { base64: true });
        
        console.log('✅ تم إضافة الأيقونات الافتراضية');
    }

    prepareScenesData(scenes) {
        return scenes.map((scene, index) => ({
            id: scene.id,
            name: scene.name,
            image: `scene-${index}.jpg`,
            paths: (scene.paths || []).map(p => ({
                type: p.type || 'unknown',
                color: p.color || '#ffaa44',
                points: (p.points || []).map(pt => ({
                    x: pt.x || 0,
                    y: pt.y || 0,
                    z: pt.z || 0
                }))
            })),
            hotspots: (scene.hotspots || []).map(h => ({
                id: h.id,
                type: h.type,
                position: h.position,
                data: h.data || {}
            })),
            measurements: (scene.measurements || []).map(m => ({
                length: m.length,
                height: m.height,
                start: m.start,
                end: m.end
            }))
        }));
    }

    generatePlayerHTML(projectName) {
        return `<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <title>${projectName} - جولة افتراضية</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; overflow: hidden; font-family: 'Segoe UI', sans-serif; direction: rtl; }
        #container { width: 100vw; height: 100vh; background: #000; }
        
        .toolbar {
            position: fixed; top: 0; left: 0; right: 0; height: 60px;
            background: rgba(20,30,40,0.4); backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(74,108,143,0.3);
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 20px; z-index: 1000; color: white;
        }
        
        .logo { font-size: 20px; font-weight: bold; color: #fff; }
        .tour-name { font-size: 14px; background: rgba(255,255,255,0.1); padding: 6px 16px; border-radius: 30px; }
        
        #autoRotateBtn {
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            padding: 12px 24px; background: rgba(20,30,40,0.4); backdrop-filter: blur(12px);
            color: white; border: 1px solid rgba(74,108,143,0.3); border-radius: 30px;
            cursor: pointer; z-index: 900; font-size: 14px;
        }
        
        #toggleMeasurements {
            position: fixed; bottom: 80px; right: 20px; padding: 10px 20px;
            background: rgba(20,30,40,0.4); backdrop-filter: blur(12px);
            color: white; border: 1px solid rgba(74,108,143,0.3); border-radius: 30px;
            cursor: pointer; z-index: 900; font-size: 14px;
        }
        
        .paths-control-panel {
            position: fixed; top: 80px; right: 20px;
            background: rgba(20,30,40,0.25); backdrop-filter: blur(12px);
            border: 1px solid rgba(74,108,143,0.3); border-radius: 12px;
            color: white; z-index: 900; padding: 15px; min-width: 200px;
        }
        
        .scene-list-panel {
            position: fixed; top: 50%; left: 20px; transform: translateY(-50%);
            width: 260px; max-height: 70vh; background: rgba(20,30,40,0.25);
            backdrop-filter: blur(12px); border: 1px solid rgba(74,108,143,0.3);
            border-radius: 12px; color: white; z-index: 900;
            display: flex; flex-direction: column; overflow: hidden;
        }
        
        .panel-header { padding: 12px; border-bottom: 1px solid rgba(74,108,143,0.2); }
        .scene-list-container { max-height: calc(70vh - 60px); overflow-y: auto; padding: 8px; }
        .scene-item { padding: 10px 12px; margin: 4px 0; background: rgba(255,255,255,0.03); border-radius: 6px; cursor: pointer; }
        .scene-item.active { background: rgba(74,108,143,0.3); border-right: 3px solid #88aaff; }
        
        .hotspot-marker {
            position: absolute; transform: translate(-50%, -50%);
            cursor: pointer; z-index: 1000; pointer-events: auto;
        }
        
        .measurement-label {
            position: absolute; background: rgba(0,0,0,0.8); color: white;
            padding: 8px 16px; border-radius: 30px; font-size: 20px;
            border: 2px solid #ffaa44; transform: translate(-50%, -50%);
            white-space: nowrap; z-index: 503;
        }
        
        @media (max-width: 768px) {
            .scene-list-panel { width: 200px; }
            .paths-control-panel { display: none; }
            .paths-control-panel.show { display: block; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <div class="logo">🏗️ Actual View Studio</div>
        <div class="tour-name">${projectName}</div>
    </div>
    
    <div id="container"></div>
    
    <button id="autoRotateBtn">⏸️ إيقاف الدوران</button>
    <button id="toggleMeasurements">📏 إظهار القياسات</button>
    
    <div class="paths-control-panel" id="pathsPanel">
        <h3>🔘 التحكم بالمسارات</h3>
        <div id="pathsToggleList"></div>
    </div>
    
    <div class="scene-list-panel" id="sceneListPanel">
        <div class="panel-header">
            <h3>📋 قائمة المشاهد</h3>
        </div>
        <div class="scene-list-container" id="sceneListContainer"></div>
    </div>

    <script>
        const ICONS = { hotspot: 'icon/hotspot.png', info: 'icon/info.png' };
        let autoRotate = true;
        let currentSceneIndex = 0;
        let scenes = [];
        let scene3D, camera, renderer, controls, sphereMesh;
        let allPaths = [];
        let hotspotMarkers = {};
        let measurementElements = [];
        let showMeasurements = false;
        
        const pathColors = { EL: '#ffcc00', AC: '#00ccff', WP: '#0066cc', WA: '#ff3300', GS: '#33cc33' };
        
        // ===== دوال القياس =====
        function createMeasurementElement(m) {
            const line = document.createElement('div'); line.className = 'measurement-line'; line.style.display = 'none';
            const start = document.createElement('div'); start.className = 'measurement-point'; start.style.display = 'none';
            const end = document.createElement('div'); end.className = 'measurement-point'; end.style.display = 'none';
            const label = document.createElement('div'); label.className = 'measurement-label'; 
            label.textContent = m.length + ' m'; label.style.display = 'none';
            
            line._start = new THREE.Vector3(m.start.x, m.start.y, m.start.z);
            line._end = new THREE.Vector3(m.end.x, m.end.y, m.end.z);
            start._worldPos = new THREE.Vector3(m.start.x, m.start.y, m.start.z);
            end._worldPos = new THREE.Vector3(m.end.x, m.end.y, m.end.z);
            label._worldPos = new THREE.Vector3().addVectors(start._worldPos, end._worldPos).multiplyScalar(0.5);
            
            document.body.appendChild(line); document.body.appendChild(start); 
            document.body.appendChild(end); document.body.appendChild(label);
            return { line, start, end, label };
        }

        function updateMeasurementPositions() {
            if (!camera) return;
            const w = window.innerWidth, h = window.innerHeight;
            measurementElements.forEach(e => {
                if (!e.line?._start) return;
                const s = e.line._start.clone().project(camera);
                const e2 = e.line._end.clone().project(camera);
                if (s.z > 1 || e2.z > 1) { e.line.style.display = 'none'; return; }
                const x1 = (s.x * 0.5 + 0.5) * w, y1 = (-s.y * 0.5 + 0.5) * h;
                const x2 = (e2.x * 0.5 + 0.5) * w, y2 = (-e2.y * 0.5 + 0.5) * h;
                const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx*dx + dy*dy);
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                
                e.line.style.display = showMeasurements ? 'block' : 'none';
                e.line.style.left = x1 + 'px'; e.line.style.top = y1 + 'px';
                e.line.style.width = len + 'px'; e.line.style.transform = 'rotate(' + angle + 'deg)';
                
                e.start.style.display = showMeasurements ? 'block' : 'none';
                e.start.style.left = x1 + 'px'; e.start.style.top = y1 + 'px';
                e.end.style.display = showMeasurements ? 'block' : 'none';
                e.end.style.left = x2 + 'px'; e.end.style.top = y2 + 'px';
                
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                e.label.style.display = showMeasurements ? 'block' : 'none';
                e.label.style.left = mx + 'px'; e.label.style.top = (my - 30) + 'px';
            });
        }

        function loadMeasurements(sceneData) {
            measurementElements.forEach(e => { if(e.line) e.line.remove(); });
            measurementElements = [];
            if (sceneData.measurements) {
                sceneData.measurements.forEach(m => measurementElements.push(createMeasurementElement(m)));
            }
        }
        
        // ===== دوال المشاهد =====
        function updateSceneList() {
            const c = document.getElementById('sceneListContainer');
            if (!c) return;
            c.innerHTML = '';
            scenes.forEach((s, i) => {
                const item = document.createElement('div');
                item.className = 'scene-item' + (i === currentSceneIndex ? ' active' : '');
                item.innerHTML = '<span class="scene-icon">' + (i === 0 ? '🏠' : '🏢') + '</span>' +
                    '<span class="scene-name">' + s.name + '</span>' +
                    '<span class="scene-hotspot-count">' + (s.hotspots?.length || 0) + '</span>';
                item.onclick = () => loadScene(i);
                c.appendChild(item);
            });
        }
        
        // ===== دوال Hotspots =====
        function createHotspotElement(x, y, type, data) {
            const div = document.createElement('div');
            div.className = 'hotspot-marker';
            div.style.left = x + 'px'; div.style.top = y + 'px';
            div.style.cursor = 'pointer'; div.style.zIndex = '1000';
            
            const url = type === 'SCENE' ? ICONS.hotspot : ICONS.info;
            const color = type === 'SCENE' ? '#44aaff' : '#ffaa44';
            const text = type === 'SCENE' ? (data.targetSceneName || 'انتقال') : (data.title || 'معلومات');
            
            div.innerHTML = '<img src="' + url + '" style="border:2px solid ' + color + '; width:40px; height:40px; border-radius:50%; pointer-events:none;">' +
                '<div style="position:absolute; top:-40px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:4px 8px; border-radius:12px; border:2px solid ' + color + ';">' + text + '</div>';
            
            div.onclick = () => {
                if (type === 'INFO') alert(data.title + '\\n' + (data.content || ''));
                else if (data.targetSceneId) {
                    const idx = scenes.findIndex(s => s.id === data.targetSceneId);
                    if (idx !== -1) loadScene(idx);
                }
            };
            return div;
        }

        function rebuildHotspots() {
            document.querySelectorAll('.hotspot-marker').forEach(el => el.remove());
            hotspotMarkers = {};
            const cs = scenes[currentSceneIndex];
            if (!cs?.hotspots) return;
            
            const w = window.innerWidth, h = window.innerHeight;
            cs.hotspots.forEach(h => {
                const pos = new THREE.Vector3(h.position.x, h.position.y, h.position.z);
                const proj = pos.clone().project(camera);
                if (proj.z > 1) return;
                
                const x = (proj.x * 0.5 + 0.5) * w;
                const y = (-proj.y * 0.5 + 0.5) * h;
                if (x < -100 || x > w+100 || y < -100 || y > h+100) return;
                
                const el = createHotspotElement(x, y, h.type, h.data);
                el._worldPosition = pos.clone();
                document.body.appendChild(el);
                hotspotMarkers[h.id] = el;
            });
        }

        function updateHotspotsPosition() {
            const w = window.innerWidth, h = window.innerHeight;
            Object.values(hotspotMarkers).forEach(el => {
                if (!el._worldPosition) return;
                const proj = el._worldPosition.clone().project(camera);
                if (proj.z > 1) { el.style.display = 'none'; return; }
                const x = (proj.x * 0.5 + 0.5) * w;
                const y = (-proj.y * 0.5 + 0.5) * h;
                if (x < -100 || x > w+100 || y < -100 || y > h+100) { el.style.display = 'none'; return; }
                el.style.display = 'block';
                el.style.left = x + 'px'; el.style.top = y + 'px';
            });
        }
        
   // ===== دوال المسارات =====
        function togglePathsByType(type, visible) {
            allPaths.forEach(p => { if (p.userData?.type === type) p.visible = visible; });
        }
        
        function createPathsTogglePanel() {
            const list = document.getElementById('pathsToggleList');
            if (!list) return;
            list.innerHTML = '';
            ['EL','AC','WP','WA','GS'].forEach(t => {
                const div = document.createElement('div');
                div.innerHTML = '<input type="checkbox" id="toggle-'+t+'" data-type="'+t+'"> ' +
                    '<span style="display:inline-block; width:12px; height:12px; background:'+pathColors[t]+'; border-radius:2px;"></span> '+t;
                div.querySelector('input').onchange = e => togglePathsByType(t, e.target.checked);
                list.appendChild(div);
            });
        }
        
        function loadScene(index) {
            const sd = scenes[index];
            if (!sd) return;
            currentSceneIndex = index;
            
            if (sphereMesh) scene3D.remove(sphereMesh);
            document.querySelectorAll('.hotspot-marker').forEach(el => el.remove());
            allPaths.forEach(p => scene3D.remove(p));
            allPaths = [];
            
            new THREE.TextureLoader().load(sd.image, tex => {
                tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1;
                sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(500,128,128),
                    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide }));
                scene3D.add(sphereMesh);
                
                if (sd.paths) {
                    sd.paths.forEach(pd => {
                        if (!pd.points) return;
                        const pts = pd.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
                        for (let i=0; i<pts.length-1; i++) {
                            const s = pts[i], e = pts[i+1];
                            const dir = new THREE.Vector3().subVectors(e, s);
                            const dist = dir.length();
                            if (dist < 0.5) continue;
                            
                            const cyl = new THREE.Mesh(new THREE.CylinderGeometry(3.5,3.5,dist,12),
                                new THREE.MeshStandardMaterial({ color: pd.color || '#ffaa44', emissive: '#442200' }));
                            const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
                            cyl.position.copy(mid);
                            cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
                            cyl.userData = { type: pd.type };
                            cyl.visible = false;
                            scene3D.add(cyl);
                            allPaths.push(cyl);
                        }
                    });
                }
                
                setTimeout(rebuildHotspots, 200);
                loadMeasurements(sd);
                updateSceneList();
            });
        }
        
        // ===== التهيئة =====
        fetch('tour-data.json').then(r=>r.json()).then(data => {
            scenes = data;
            scene3D = new THREE.Scene(); scene3D.background = new THREE.Color(0x000000);
            camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
            camera.position.set(0,0,0.1);
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(innerWidth, innerHeight);
            document.getElementById('container').appendChild(renderer.domElement);
            scene3D.add(new THREE.AmbientLight(0xffffff, 1.5));
            
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableZoom = true; controls.enablePan = false; controls.enableDamping = true;
            controls.autoRotate = autoRotate; controls.autoRotateSpeed = 0.5;
            
            document.getElementById('autoRotateBtn').onclick = () => {
                autoRotate = !autoRotate;
                controls.autoRotate = autoRotate;
                document.getElementById('autoRotateBtn').textContent = autoRotate ? '⏸️ إيقاف الدوران' : '▶️ تشغيل الدوران';
            };
            
            document.getElementById('toggleMeasurements').onclick = () => {
                showMeasurements = !showMeasurements;
                this.textContent = showMeasurements ? '📏 إخفاء القياسات' : '📏 إظهار القياسات';
                measurementElements.forEach(e => {
                    if(e.line) e.line.style.display = showMeasurements ? 'block' : 'none';
                });
            };
            
            createPathsTogglePanel();
            loadScene(0);
            
            window.addEventListener('resize', () => {
                camera.aspect = innerWidth / innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(innerWidth, innerHeight);
                rebuildHotspots();
            });
            
            function animate() {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene3D, camera);
                updateHotspotsPosition();
                updateMeasurementPositions();
            }
            animate();
        }).catch(e => console.error('خطأ:', e));
    </script>
</body>
</html>`;
    }

    generatePlayerCSS() {
        return `body { margin:0; overflow:hidden; font-family:Arial,sans-serif; }
#container { width:100vw; height:100vh; background:#000; }
.info { position:absolute; top:20px; left:20px; background:rgba(0,0,0,0.7); color:white; padding:10px 20px; border-radius:30px; }`;
    }

    generateReadme(projectName) {
        return `# ${projectName}

## جولة افتراضية ثلاثية الأبعاد

### كيفية الاستخدام:
1. افتح ملف \`index.html\` في المتصفح
2. استخدم الفأرة للتحرك داخل الجولة
3. اضغط على hotspots للتنقل

### الأنظمة:
- 🟡 EL: كهرباء
- 🔵 AC: تكييف
- 🔵 WP: مياه
- 🔴 WA: صرف صحي
- 🟢 GS: غاز

### القياسات:
تحتوي الجولة على قياسات معتمدة

---
تم إنشاؤها باستخدام Actual View Studio © 2026`;
    }
}
