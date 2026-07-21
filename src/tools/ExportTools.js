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
        
        // إنشاء manifest.json (فهرس خفيف)
        await this.createManifest(projectName, scenes, folder);
        
        // إنشاء ملفات منفصلة لكل مشهد
        await this.createSceneFiles(scenes, folder);
        
        // إضافة ملفات المشغل
        folder.file('index.html', this.generatePlayerHTML(projectName));
        folder.file('style.css', this.generatePlayerCSS());
        folder.file('README.md', this.generateReadme(projectName));
        
        // إنشاء ملف ZIP
        const content = await this.zip.generateAsync({ type: 'blob' });
        saveAs(content, `${projectName}.zip`);
        
        console.log(`✅ تم تصدير الجولة بنجاح: ${projectName}.zip`);
        console.log(`📊 المشاهد: ${scenes.length} | تم تقسيم البيانات إلى ملفات منفصلة`);
    }

    async addSceneImages(scenes, folder) {
        const imagesFolder = folder.folder('images');
        
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            try {
                const imageSrc = scene.originalImage || scene.image;
                
                if (typeof imageSrc === 'string' && imageSrc.includes(',') && imageSrc.split(',').length > 1) {
                    const imageData = imageSrc.split(',')[1];
                    if (imageData) {
                        imagesFolder.file(`scene-${i}.jpg`, imageData, { base64: true });
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
            const hotspotResponse = await fetch('assets/icon/hotspot.png');
            const hotspotBlob = await hotspotResponse.blob();
            iconFolder.file('hotspot.png', hotspotBlob);
            
            const infoResponse = await fetch('assets/icon/info.png');
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

    async createManifest(projectName, scenes, folder) {
    const manifest = {
        project: {
            name: projectName,
            date: new Date().toISOString(),
            version: "2.0",
            scenesCount: scenes.length
        },
        scenes: scenes.map((scene, index) => ({
            id: scene.id,
            index: index,
            name: scene.name,
            image: `images/scene-${index}.jpg`,
            data: `scenes/scene-${index}.json`,
            hotspotsCount: scene.hotspots?.length || 0,
            pathsCount: scene.paths?.length || 0,
            measurementsCount: scene.measurements?.length || 0,
            hasPaths: (scene.paths?.length > 0),
            hasHotspots: (scene.hotspots?.length > 0),
            hasMeasurements: (scene.measurements?.length > 0)
        })),
        layers: {
            paths: ['EL', 'AC', 'WP', 'WA', 'GS'],
            measurements: ['length', 'height'],
            hotspots: ['SCENE', 'INFO']
        }
    };
    
    folder.file('manifest.json', JSON.stringify(manifest, null, 2));
    console.log(`📋 تم إنشاء manifest.json مع ${scenes.length} مشهد`);
}

async createSceneFiles(scenes, folder) {
    const scenesFolder = folder.folder('scenes');
    
    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        
        // تجهيز بيانات المشهد
        const sceneData = {
            id: scene.id,
            index: i,
            name: scene.name,
            image: `images/scene-${i}.jpg`,
            paths: (scene.paths || []).map(p => {
                if (!p || typeof p !== 'object') return null;
                return {
                    type: p.type || 'unknown',
                    color: p.color || '#ffaa44',
                    points: (p.points || []).map(pt => ({
                        x: pt.x || 0,
                        y: pt.y || 0,
                        z: pt.z || 0
                    }))
                };
            }).filter(p => p !== null),
            
            hotspots: (scene.hotspots || []).map(h => {
                if (!h || typeof h !== 'object') return null;
                return {
                    id: h.id || `hotspot-${Date.now()}`,
                    type: h.type || 'INFO',
                    position: {
                        x: h.position?.x || 0,
                        y: h.position?.y || 0,
                        z: h.position?.z || 0
                    },
                    data: h.data || {}
                };
            }).filter(h => h !== null),
            
            measurements: (scene.measurements || []).map(m => {
                if (!m || typeof m !== 'object') return null;
                return {
                    length: m.length || 0,
                    height: m.height || 0,
                    start: {
                        x: m.start?.x || 0,
                        y: m.start?.y || 0,
                        z: m.start?.z || 0
                    },
                    end: {
                        x: m.end?.x || 0,
                        y: m.end?.y || 0,
                        z: m.end?.z || 0
                    }
                };
            }).filter(m => m !== null)
        };
        
        // حفظ ملف المشهد
        scenesFolder.file(`scene-${i}.json`, JSON.stringify(sceneData, null, 2));
        console.log(`📁 تم إنشاء ملف المشهد ${i}: ${scene.name}`);
    }
}
    generatePlayerHTML(projectName) {
        return '<!DOCTYPE html>\n' +
'<html lang="ar">\n' +
'<head>\n' +
'    <meta charset="UTF-8">\n' +
'    <title>tour-BIM-As-built</title>\n' +
'    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏗️</text></svg>">\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">\n' +
'    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\\/script>\n' +
'    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\\/script>\n' +
'    <style>\n' +
'        * { margin: 0; padding: 0; box-sizing: border-box; }\n' +
'        body { margin: 0; overflow: hidden; font-family: \'Segoe UI\', sans-serif; direction: rtl; }\n' +
'        #container { width: 100vw; height: 100vh; background: #000; }\n' +
'        .toolbar { position: fixed; top: 0; left: 0; right: 0; height: 60px; background: rgba(20,30,40,0.4); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(74,108,143,0.3); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 1000; color: white; }\n' +
'        .logo { font-size: 20px; font-weight: bold; }\n' +
'        .tour-name { font-size: 14px; background: rgba(255,255,255,0.1); padding: 6px 16px; border-radius: 30px; }\n' +
'        #autoRotateBtn { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 12px 24px; background: rgba(20,30,40,0.4); backdrop-filter: blur(12px); color: white; border: 1px solid rgba(74,108,143,0.3); border-radius: 30px; cursor: pointer; z-index: 900; font-size: 14px; }\n' +
'        #toggleMeasurements { position: fixed; bottom: 80px; right: 20px; padding: 10px 20px; background: rgba(20,30,40,0.4); backdrop-filter: blur(12px); color: white; border: 1px solid rgba(74,108,143,0.3); border-radius: 30px; cursor: pointer; z-index: 900; font-size: 14px; }\n' +
'        .paths-control-panel { position: fixed; top: 80px; right: 20px; background: rgba(20,30,40,0.25); backdrop-filter: blur(12px); border: 1px solid rgba(74,108,143,0.3); border-radius: 12px; color: white; z-index: 900; padding: 15px; min-width: 200px; }\n' +
'        .scene-list-panel { position: fixed; top: 50%; left: 20px; transform: translateY(-50%); width: 260px; max-height: min(70vh, 500px); background: rgba(20,30,40,0.25); backdrop-filter: blur(12px); border: 1px solid rgba(74,108,143,0.3); border-radius: 12px; color: white; z-index: 900; display: flex; flex-direction: column; overflow: hidden; transition: transform 0.3s ease, opacity 0.3s ease; }\n' +
'        .panel-header { padding: 12px; border-bottom: 1px solid rgba(74,108,143,0.2); }\n' +
'        .scene-list { flex: 1; overflow-y: auto; padding: 8px; max-height: calc(min(70vh, 500px) - 60px); }\n' +
'        .scene-item { padding: 10px 12px; margin: 4px 0; background: rgba(255,255,255,0.03); border-radius: 6px; cursor: pointer; transition: background 0.2s; }\n' +
'        .scene-item:hover { background: rgba(74,108,143,0.2); }\n' +
'        .scene-item.active { background: rgba(74,108,143,0.3); border-right: 3px solid #88aaff; }\n' +
'        .scene-icon { margin-left: 8px; font-size: 18px; }\n' +
'        .scene-name { flex: 1; }\n' +
'        .scene-hotspot-count { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 12px; font-size: 12px; margin-right: 8px; }\n' +
'        .hotspot-marker { position: absolute; transform: translate(-50%, -50%); cursor: pointer; z-index: 1000; pointer-events: auto; transition: transform 0.2s ease; }\n' +
'        .hotspot-marker:hover { transform: translate(-50%, -50%) scale(1.15); filter: drop-shadow(0 0 15px rgba(255,255,255,0.7)); z-index: 1001; }\n' +
'        .hotspot-marker img { border: 2px solid; width: 40px; height: 40px; border-radius: 50%; pointer-events: none; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }\n' +
'        .hotspot-marker:hover img { box-shadow: 0 0 20px currentColor; }\n' +
'        .hotspot-label { position: absolute; top: -45px; left: 50%; transform: translateX(-50%); background: rgba(20,30,40,0.95); backdrop-filter: blur(8px); color: white; padding: 6px 16px; border-radius: 30px; font-size: 14px; font-weight: 500; white-space: nowrap; border: 2px solid; box-shadow: 0 4px 15px rgba(0,0,0,0.4); pointer-events: none; opacity: 0; transition: opacity 0.25s ease; z-index: 1002; line-height: 1.4; }\n' +
'        .hotspot-marker:hover .hotspot-label { opacity: 1; }\n' +
'        .measurement-line { position: absolute; pointer-events: none; z-index: 1500; border-top: 4px solid #ffaa44; box-shadow: 0 0 20px #ffaa44; border-radius: 4px; transform-origin: 0 0; height: 4px; }\n' +
'        .measurement-point { position: absolute; width: 12px; height: 12px; background: #ffaa44; border-radius: 50%; box-shadow: 0 0 20px #ffaa44; transform: translate(-50%, -50%); z-index: 1501; }\n' +
'        .measurement-label { position: absolute; background: rgba(20,30,40,0.95); backdrop-filter: blur(8px); color: white; padding: 8px 16px; border-radius: 30px; font-size: 18px; font-weight: bold; border: 2px solid #ffaa44; box-shadow: 0 0 30px rgba(255,170,68,0.5); transform: translate(-50%, -50%); white-space: nowrap; z-index: 1502; text-shadow: 2px 2px 4px black; line-height: 1.4; }\n' +
'        #infoPanel { position: absolute; background: rgba(30, 40, 50, 0.95); backdrop-filter: blur(12px); color: white; padding: 14px 20px; border-radius: 16px; font-size: 15px; max-width: 280px; min-width: 200px; display: none; z-index: 2000; box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05); border: 1px solid rgba(74,108,143,0.5); pointer-events: none; transition: opacity 0.2s; line-height: 1.6; word-wrap: break-word; white-space: pre-wrap; }\n' +
'        #infoPanel::before { content: \'\'; position: absolute; top: -6px; left: 20px; width: 12px; height: 12px; background: rgba(30, 40, 50, 0.95); backdrop-filter: blur(12px); border-left: 1px solid rgba(74,108,143,0.5); border-top: 1px solid rgba(74,108,143,0.5); transform: rotate(45deg); border-radius: 3px; }\n' +
'        #infoPanel strong { color: #ffaa44; font-size: 16px; display: block; margin-bottom: 5px; }\n' +
'        #infoPanel .info-content { font-size: 14px; opacity: 0.9; }\n' +
'        #mobileControls { position: fixed; bottom: 150px; left: 10px; z-index: 950; display: none; flex-direction: column; gap: 8px; }\n' +
'        #toggleSceneListBtn, #togglePathsPanelBtn { background: rgba(20,30,40,0.8); backdrop-filter: blur(12px); color: white; border: 1px solid rgba(74,108,143,0.5); border-radius: 30px; width: 44px; height: 44px; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }\n' +
'        #toggleSceneListBtn:hover, #togglePathsPanelBtn:hover { background: rgba(40,60,80,0.9); transform: scale(1.05); }\n' +
'        #toggleSceneListBtn:active, #togglePathsPanelBtn:active { transform: scale(0.95); }\n' +
'        @media (max-width: 768px) { .scene-list-panel { width: 220px; max-height: 60vh; top: 50%; transform: translateY(-50%); left: 70px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); } .scene-list-panel.hidden { transform: translateX(-120%); opacity: 0; } #toggleMeasurements { bottom: 80px; right: 10px; padding: 8px 16px; font-size: 13px; } #autoRotateBtn { bottom: 20px; left: 50%; transform: translateX(-50%); padding: 10px 20px; font-size: 13px; white-space: nowrap; } .hotspot-marker img { width: 32px; height: 32px; } .hotspot-label { font-size: 12px; padding: 4px 12px; top: -40px; } .measurement-label { font-size: 14px; padding: 4px 10px; } .measurement-line { border-top-width: 3px; } .measurement-point { width: 8px; height: 8px; } }\n' +
'        @media (max-width: 480px) { .scene-list-panel { width: 180px; } .paths-control-panel { width: 180px; } .toolbar { height: 50px; padding: 0 10px; } .logo { font-size: 16px; } .tour-name { font-size: 12px; padding: 4px 10px; } }\n' +
'    </style>\n' +
'</head>\n' +
'<body>\n' +
'    <div class="toolbar"><div class="logo">🏗️ Actual View Studio</div><div class="tour-name">Paths Systems</div></div>\n' +
'    <div id="container"></div>\n' +
'    <button id="autoRotateBtn">⏸️ Camera Rotation</button>\n' +
'    <button id="toggleMeasurements">📏 Show Measurements</button>\n' +
'    <div class="paths-control-panel" id="pathsPanel"><h3>🔘 PATHS CONTROL</h3><div id="pathsToggleList"></div></div>\n' +
'    <div class="scene-list-panel" id="sceneListPanel"><div class="panel-header"><h3>📋 SCENE LIST</h3></div><div class="scene-list" id="sceneList"></div></div>\n' +
'    <script>\n' +
'        function createPathSegment(start, end, color, type) {\n' +
'            const direction = new THREE.Vector3().subVectors(end, start);\n' +
'            const distance = direction.length();\n' +
'            if (distance < 0.5) return null;\n' +
'            const startDir = start.clone().normalize();\n' +
'            const endDir = end.clone().normalize();\n' +
'            const offsetStart = startDir.multiplyScalar(505);\n' +
'            const offsetEnd = endDir.multiplyScalar(505);\n' +
'            const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, distance, 12), new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.4, depthTest: false, depthWrite: false }));\n' +
'            cylinder.renderOrder = 999;\n' +
'            const midPoint = new THREE.Vector3().addVectors(offsetStart, offsetEnd).multiplyScalar(0.5);\n' +
'            cylinder.position.copy(midPoint);\n' +
'            cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());\n' +
'            cylinder.userData = { type: type };\n' +
'            return cylinder;\n' +
'        }\n' +
'        function createMeasurementElement(m) {\n' +
'            const line = document.createElement(\'div\'); line.className = \'measurement-line\'; line.style.display = \'none\';\n' +
'            const start = document.createElement(\'div\'); start.className = \'measurement-point\'; start.style.display = \'none\';\n' +
'            const end = document.createElement(\'div\'); end.className = \'measurement-point\'; end.style.display = \'none\';\n' +
'            const label = document.createElement(\'div\'); label.className = \'measurement-label\'; label.textContent = m.length + \' م\'; label.style.display = \'none\';\n' +
'            line._start = new THREE.Vector3(m.start.x, m.start.y, m.start.z);\n' +
'            line._end = new THREE.Vector3(m.end.x, m.end.y, m.end.z);\n' +
'            start._worldPos = new THREE.Vector3(m.start.x, m.start.y, m.start.z);\n' +
'            end._worldPos = new THREE.Vector3(m.end.x, m.end.y, m.end.z);\n' +
'            label._worldPos = new THREE.Vector3().addVectors(start._worldPos, end._worldPos).multiplyScalar(0.5);\n' +
'            document.body.appendChild(line); document.body.appendChild(start); document.body.appendChild(end); document.body.appendChild(label);\n' +
'            return { line, start, end, label };\n' +
'        }\n' +
'        class SceneLoader {\n' +
'            constructor() { this.manifest = null; this.scenes = []; this.loadedScenes = new Map(); this.currentSceneIndex = 0; this.isLoading = false; }\n' +
'            async loadManifest() { try { const response = await fetch(\'manifest.json\'); this.manifest = await response.json(); this.scenes = this.manifest.scenes; console.log(`📋 تم تحميل manifest مع ${this.scenes.length} مشهد`); return this.scenes; } catch (error) { console.error(\'❌ فشل تحميل manifest:\', error); return []; } }\n' +
'            async loadScene(index) { if (this.isLoading) return null; if (this.loadedScenes.has(index)) { console.log(`✅ مشهد ${index} من الذاكرة المخبأة`); return this.loadedScenes.get(index); } this.isLoading = true; try { const sceneInfo = this.scenes[index]; if (!sceneInfo) throw new Error(`المشهد ${index} غير موجود`); console.log(`📥 تحميل المشهد ${index}: ${sceneInfo.name}`); const response = await fetch(sceneInfo.data); const sceneData = await response.json(); this.loadedScenes.set(index, sceneData); this.cleanupCache(index); this.isLoading = false; return sceneData; } catch (error) { console.error(`❌ فشل تحميل المشهد ${index}:`, error); this.isLoading = false; return null; } }\n' +
'            cleanupCache(currentIndex) { const indicesToKeep = [currentIndex - 1, currentIndex, currentIndex + 1].filter(i => i >= 0 && i < this.scenes.length); for (let [index] of this.loadedScenes) { if (!indicesToKeep.includes(index)) { console.log(`🧹 تفريغ المشهد ${index} من الذاكرة`); this.loadedScenes.delete(index); } } }\n' +
'            preloadNextScene(currentIndex) { if (currentIndex + 1 < this.scenes.length) { setTimeout(() => { if (!this.loadedScenes.has(currentIndex + 1)) { this.loadScene(currentIndex + 1); } }, 1000); } }\n' +
'        }\n' +
'        const ICONS = { hotspot: \'icon/hotspot.png\', info: \'icon/info.png\' };\n' +
'        let autoRotate = true;\n' +
'        let currentSceneIndex = 0;\n' +
'        let scene3D, camera, renderer, controls, sphereMesh;\n' +
'        let allPaths = [];\n' +
'        let hotspotMarkers = {};\n' +
'        let measurementElements = [];\n' +
'        let showMeasurements = false;\n' +
'        const pathColors = { EL: \'#ffcc00\', AC: \'#00ccff\', WP: \'#0066cc\', WA: \'#ff3300\', GS: \'#33cc33\' };\n' +
'        function updateMeasurementPositions() { if (!camera) return; const w = window.innerWidth, h = window.innerHeight; measurementElements.forEach(e => { if (!e.line?._start) return; const s = e.line._start.clone().project(camera); const e2 = e.line._end.clone().project(camera); if (s.z > 1 || e2.z > 1 || s.z < -1 || e2.z < -1) { e.line.style.display = \'none\'; e.start.style.display = \'none\'; e.end.style.display = \'none\'; e.label.style.display = \'none\'; return; } const x1 = (s.x * 0.5 + 0.5) * w, y1 = (-s.y * 0.5 + 0.5) * h; const x2 = (e2.x * 0.5 + 0.5) * w, y2 = (-e2.y * 0.5 + 0.5) * h; const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx*dx + dy*dy); const angle = Math.atan2(dy, dx) * 180 / Math.PI; const shouldShow = showMeasurements; e.line.style.display = shouldShow ? \'block\' : \'none\'; e.line.style.left = x1 + \'px\'; e.line.style.top = y1 + \'px\'; e.line.style.width = len + \'px\'; e.line.style.transform = \'rotate(\' + angle + \'deg)\'; e.start.style.display = shouldShow ? \'block\' : \'none\'; e.start.style.left = x1 + \'px\'; e.start.style.top = y1 + \'px\'; e.end.style.display = shouldShow ? \'block\' : \'none\'; e.end.style.left = x2 + \'px\'; e.end.style.top = y2 + \'px\'; const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; e.label.style.display = shouldShow ? \'block\' : \'none\'; e.label.style.left = mx + \'px\'; e.label.style.top = (my - 30) + \'px\'; }); }\n' +
'        function loadMeasurements(sceneData) { measurementElements.forEach(e => { if(e.line) e.line.remove(); if(e.start) e.start.remove(); if(e.end) e.end.remove(); if(e.label) e.label.remove(); }); measurementElements = []; if (sceneData.measurements) { sceneData.measurements.forEach(m => measurementElements.push(createMeasurementElement(m))); } }\n' +
'    <\\/script>\n' +
'</body>\n' +
'</html>';
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
تم إنشاؤها باستخدام Actual View Studio © 2026

## هيكل الملفات:
- \`manifest.json\` - فهرس المشاهد
- \`scenes/\` - بيانات كل مشهد على حدة
- \`images/\` - صور المشاهد
- \`icon/\` - أيقونات النقاط
`;
    }
}
