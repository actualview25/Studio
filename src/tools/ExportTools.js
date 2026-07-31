// =======================================
// ACTUAL VIEW STUDIO - CALIBRATION TOOLS
// Room Model Generator + Measurement Engine
// =======================================

export class CalibrationTools {
    constructor(app) {
        this.app = app;
        this.scene = app.scene;
        this.camera = app.camera;
        this.renderer = app.renderer;
        
        // حالة المعايرة
        this.isCalibrating = false;
        this.currentStep = 0;
        this.calibrationData = {
            corners: [],        // 4 زوايا أرضية
            ceilingPoint: null, // نقطة سقف واحدة
            knownLength: 0,     // القياس المرجعي
            knownPoints: [],    // نقطتي القياس المرجعي
            cameraPosition: null // موقع الكاميرا على المخطط
        };
        
        // النموذج المخفي
        this.roomModel = null;
        this.isCalibrated = false;
        
        // مؤشرات بصرية
        this.markers = [];
        this.tempLine = null;
    }

    // ===== بدء المعايرة =====
    startCalibration() {
        this.isCalibrating = true;
        this.currentStep = 1;
        this.calibrationData = {
            corners: [],
            ceilingPoint: null,
            knownLength: 0,
            knownPoints: [],
            cameraPosition: null
        };
        this.clearMarkers();
        this.showStepUI(1);
        document.body.style.cursor = 'crosshair';
        console.log('🎯 بدء معايرة الغرفة - الخطوة 1: حدد 4 زوايا الأرضية');
    }

    // ===== إلغاء المعايرة =====
    cancelCalibration() {
        this.isCalibrating = false;
        this.currentStep = 0;
        this.clearMarkers();
        this.hideStepUI();
        document.body.style.cursor = 'default';
    }

    // ===== معالجة النقر أثناء المعايرة =====
    handleCalibrationClick(point) {
        if (!this.isCalibrating) return false;

        switch (this.currentStep) {
            case 1: return this.step1_AddCorner(point);
            case 2: return this.step2_AddCeiling(point);
            case 3: return this.step3_AddReference(point);
            case 4: return this.step4_SetCamera(point);
        }
        return false;
    }

    // ===== الخطوة 1: تحديد 4 زوايا الأرضية =====
    step1_AddCorner(point) {
        this.calibrationData.corners.push(point.clone());
        this.addMarker(point, 0x00ff00); // أخضر للزوايا
        
        const count = this.calibrationData.corners.length;
        console.log(`📍 زاوية ${count}/4`);
        
        if (count === 4) {
            this.currentStep = 2;
            this.showStepUI(2);
            console.log('✅ اكتملت الزوايا - الخطوة 2: حدد نقطة التقاء الجدار بالسقف');
        }
        return true;
    }

    // ===== الخطوة 2: تحديد نقطة السقف =====
    step2_AddCeiling(point) {
        this.calibrationData.ceilingPoint = point.clone();
        this.addMarker(point, 0x4488ff); // أزرق للسقف
        console.log('🏗️ تم تحديد السقف');
        
        // استنتاج ارتفاع الغرفة
        const floorCenter = this.getFloorCenter();
        const floorY = floorCenter.y;
        const ceilingY = point.y;
        this.roomHeight = Math.abs(ceilingY - floorY);
        
        this.currentStep = 3;
        this.showStepUI(3);
        console.log('✅ الخطوة 3: انقر على نقطتين لقياس مرجعي');
        return true;
    }

    // ===== الخطوة 3: إضافة القياس المرجعي =====
    step3_AddReference(point) {
        this.calibrationData.knownPoints.push(point.clone());
        this.addMarker(point, 0xffaa00); // برتقالي للقياس
        
        if (this.calibrationData.knownPoints.length === 1) {
            console.log('📍 نقطة البداية - انقر على نقطة النهاية');
            return true;
        }
        
        if (this.calibrationData.knownPoints.length === 2) {
            const p1 = this.calibrationData.knownPoints[0];
            const p2 = this.calibrationData.knownPoints[1];
            const dist = p1.distanceTo(p2);
            
            const realLength = prompt(`📏 الطول على الكرة = ${dist.toFixed(2)} وحدة\nأدخل الطول الحقيقي (بالمتر):`);
            if (!realLength || isNaN(parseFloat(realLength))) {
                this.calibrationData.knownPoints = [];
                this.clearMarkers();
                console.log('❌ تم الإلغاء - أعد المحاولة');
                return true;
            }
            
            this.calibrationData.knownLength = parseFloat(realLength);
            this.scaleFactor = this.calibrationData.knownLength / dist;
            
            this.currentStep = 4;
            this.showStepUI(4);
            console.log(`✅ معامل القياس = ${this.scaleFactor.toFixed(6)}`);
            console.log('📍 الخطوة 4: حدد موقع الكاميرا على المخطط');
        }
        return true;
    }

    // ===== الخطوة 4: تحديد موقع الكاميرا =====
    step4_SetCamera(point) {
        this.calibrationData.cameraPosition = point.clone();
        this.addMarker(point, 0xff0000); // أحمر للكاميرا
        console.log('📷 تم تحديد موقع الكاميرا');
        
        // بناء النموذج
        this.buildRoomModel();
        this.finishCalibration();
        return true;
    }

    // ===== بناء نموذج الغرفة المخفي =====
    buildRoomModel() {
        if (this.roomModel) {
            this.scene.remove(this.roomModel);
        }
        
        const corners = this.calibrationData.corners;
        if (corners.length < 4) return;
        
        // إنشاء Group للنموذج
        this.roomModel = new THREE.Group();
        this.roomModel.name = 'RoomModel';
        this.roomModel.visible = false; // مخفي
        
        // حساب مركز الأرضية
        const floorCenter = this.getFloorCenter();
        
        // بناء الجدران من الزوايا
        for (let i = 0; i < 4; i++) {
            const j = (i + 1) % 4;
            const p1 = corners[i];
            const p2 = corners[j];
            
            // نقطة السقف المقابلة
            const ceilingOffset = this.calibrationData.ceilingPoint.y - floorCenter.y;
            
            const wall = this.createWall(p1, p2, ceilingOffset);
            this.roomModel.add(wall);
        }
        
        // أرضية
        const floor = this.createFloor(corners, floorCenter.y);
        this.roomModel.add(floor);
        
        // سقف
        const ceiling = this.createCeiling(corners, this.calibrationData.ceilingPoint.y);
        this.roomModel.add(ceiling);
        
        this.scene.add(this.roomModel);
        this.isCalibrated = true;
        
        console.log('🏗️ تم بناء نموذج الغرفة المخفي');
    }

    // ===== إنشاء جدار =====
    createWall(p1, p2, height) {
        const group = new THREE.Group();
        
        const direction = new THREE.Vector3().subVectors(p2, p1);
        const width = direction.length();
        const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        
        // الجدار
        const wallGeo = new THREE.PlaneGeometry(width, Math.abs(height));
        const wallMat = new THREE.MeshBasicMaterial({ 
            color: 0xcccccc, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.copy(midPoint);
        wall.position.y += height / 2;
        wall.lookAt(new THREE.Vector3(p2.x, midPoint.y, p2.z));
        
        group.add(wall);
        return group;
    }

    // ===== إنشاء أرضية =====
    createFloor(corners, floorY) {
        const shape = new THREE.Shape();
        shape.moveTo(corners[0].x - corners[0].x, corners[0].z - corners[0].z);
        for (let i = 1; i < corners.length; i++) {
            shape.lineTo(corners[i].x - corners[0].x, corners[i].z - corners[0].z);
        }
        shape.closePath();
        
        const geo = new THREE.ShapeGeometry(shape);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0x999999, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2
        });
        const floor = new THREE.Mesh(geo, mat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(corners[0].x, floorY, corners[0].z);
        
        return floor;
    }

    // ===== إنشاء سقف =====
    createCeiling(corners, ceilingY) {
        const shape = new THREE.Shape();
        shape.moveTo(corners[0].x - corners[0].x, corners[0].z - corners[0].z);
        for (let i = 1; i < corners.length; i++) {
            shape.lineTo(corners[i].x - corners[0].x, corners[i].z - corners[0].z);
        }
        shape.closePath();
        
        const geo = new THREE.ShapeGeometry(shape);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0xaaaaaa, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2
        });
        const ceiling = new THREE.Mesh(geo, mat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(corners[0].x, ceilingY, corners[0].z);
        
        return ceiling;
    }

    // ===== حساب مركز الأرضية =====
    getFloorCenter() {
        const corners = this.calibrationData.corners;
        const center = new THREE.Vector3();
        corners.forEach(c => center.add(c));
        center.divideScalar(corners.length);
        return center;
    }

    // ===== القياس على النموذج =====
    getMeasurement(point1, point2) {
        if (!this.isCalibrated || !this.roomModel) return null;
        
        // استخدام Raycaster على النموذج المخفي
        const raycaster = new THREE.Raycaster();
        
        // النقطة الأولى
        raycaster.set(point1, new THREE.Vector3().subVectors(
            this.calibrationData.cameraPosition || new THREE.Vector3(0, 0, 0), 
            point1
        ).normalize());
        const hits1 = raycaster.intersectObject(this.roomModel, true);
        
        // النقطة الثانية
        raycaster.set(point2, new THREE.Vector3().subVectors(
            this.calibrationData.cameraPosition || new THREE.Vector3(0, 0, 0), 
            point2
        ).normalize());
        const hits2 = raycaster.intersectObject(this.roomModel, true);
        
        if (hits1.length && hits2.length) {
            const p1 = hits1[0].point;
            const p2 = hits2[0].point;
            const dist = p1.distanceTo(p2);
            return {
                rawDistance: dist,
                realDistance: dist * (this.scaleFactor || 1.0),
                point1: p1,
                point2: p2,
                scaleFactor: this.scaleFactor
            };
        }
        
        return null;
    }

    // ===== إضافة علامة بصرية =====
    addMarker(position, color) {
        const geo = new THREE.SphereGeometry(8, 16, 16);
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5
        });
        const marker = new THREE.Mesh(geo, mat);
        marker.position.copy(position);
        marker.renderOrder = 1000;
        marker.material.depthTest = false;
        this.scene.add(marker);
        this.markers.push(marker);
    }

    // ===== مسح العلامات =====
    clearMarkers() {
        this.markers.forEach(m => this.scene.remove(m));
        this.markers = [];
    }

    // ===== إنهاء المعايرة =====
    finishCalibration() {
        this.isCalibrating = false;
        this.currentStep = 0;
        document.body.style.cursor = 'default';
        this.hideStepUI();
        
        // حفظ بيانات المعايرة مع المشهد الحالي
        if (window.sceneManager?.currentScene) {
            const sceneId = window.sceneManager.currentScene.id;
            window.sceneManager.currentScene.calibration = {
                corners: this.calibrationData.corners.map(c => ({ x: c.x, y: c.y, z: c.z })),
                ceilingPoint: {
                    x: this.calibrationData.ceilingPoint.x,
                    y: this.calibrationData.ceilingPoint.y,
                    z: this.calibrationData.ceilingPoint.z
                },
                knownLength: this.calibrationData.knownLength,
                scaleFactor: this.scaleFactor,
                roomHeight: this.roomHeight,
                cameraPosition: this.calibrationData.cameraPosition ? {
                    x: this.calibrationData.cameraPosition.x,
                    y: this.calibrationData.cameraPosition.y,
                    z: this.calibrationData.cameraPosition.z
                } : null
            };
            window.sceneManager.saveScenes();
        }
        
        alert(`✅ تمت المعايرة بنجاح!\nمعامل القياس: ${this.scaleFactor.toFixed(6)}`);
        console.log('🎉 اكتملت المعايرة!');
    }

    // ===== واجهة الخطوات =====
    showStepUI(step) {
        const statusEl = document.getElementById('status');
        if (!statusEl) return;
        
        switch (step) {
            case 1: statusEl.innerHTML = '🎯 الخطوة 1/4: حدد 4 زوايا الأرضية'; break;
            case 2: statusEl.innerHTML = '🏗️ الخطوة 2/4: حدد نقطة التقاء الجدار بالسقف'; break;
            case 3: statusEl.innerHTML = '📏 الخطوة 3/4: انقر على نقطتين للقياس المرجعي'; break;
            case 4: statusEl.innerHTML = '📷 الخطوة 4/4: حدد موقع الكاميرا على المخطط'; break;
        }
    }

    hideStepUI() {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerHTML = 'النوع الحالي: <span style="color:#ffcc00;">EL</span>';
        }
    }

    // ===== إظهار/إخفاء النموذج (للتطوير) =====
    toggleModelVisibility() {
        if (this.roomModel) {
            this.roomModel.visible = !this.roomModel.visible;
            console.log(`🏗️ النموذج ${this.roomModel.visible ? 'مرئي' : 'مخفي'}`);
        }
    }

    // ===== تحميل بيانات معايرة محفوظة =====
    loadCalibration(data) {
        if (!data) return;
        
        this.calibrationData.corners = data.corners.map(c => new THREE.Vector3(c.x, c.y, c.z));
        this.calibrationData.ceilingPoint = new THREE.Vector3(data.ceilingPoint.x, data.ceilingPoint.y, data.ceilingPoint.z);
        this.calibrationData.knownLength = data.knownLength;
        this.scaleFactor = data.scaleFactor;
        this.roomHeight = data.roomHeight;
        if (data.cameraPosition) {
            this.calibrationData.cameraPosition = new THREE.Vector3(data.cameraPosition.x, data.cameraPosition.y, data.cameraPosition.z);
        }
        
        this.buildRoomModel();
        this.isCalibrated = true;
        console.log('✅ تم تحميل المعايرة المحفوظة');
    }

    // ===== تفريغ الموارد =====
    dispose() {
        this.clearMarkers();
        if (this.roomModel) {
            this.scene.remove(this.roomModel);
            this.roomModel = null;
        }
        this.isCalibrated = false;
    }
}
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
        
        await this.addSceneImages(scenes, folder);
        await this.addIcons(folder);
        await this.createManifest(projectName, scenes, folder);
        await this.createSceneFiles(scenes, folder);
        await this.createTourData(scenes, folder);
        
        folder.file('index.html', this.generatePlayerHTML(projectName, scenes.length));
        folder.file('style.css', this.generatePlayerCSS());
        folder.file('README.md', this.generateReadme(projectName));
        
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
        const hotspotBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAIzSURBVFiF7ZbNaxNBGMZ/djdpk0hS9KIoigp68RRyUw8iKHgRLyIoePCi4F8g3nrwU0Tx4lEQvSh4EcF78NqLIAp68SNoFZE2TdMk3R2f2SSbdNPd2Z0NIvpAXjLMvM/8ZucjMwsHqIEa+J+hlJpOkrS0Z0mS1NM0nSu7l+M4h5VSy1rrn1rrb6W4LmBZ1hWl1LKUsl3L+t+01rdLcUMApdRVpdTC3r6iKOqMx+O+UsoPw/CFlHK1lFoJMAzjiVJqRQgR+b5/37Ks4+Fw+DaKovvtdvux4ziLUkq/LEcIYVvW3SRJ+lLKL5qmZ9I0HUopDc/zTmZZtpZlWZJl2YYoG4MQYgSAYRgIIW5IKZ1iPGmaXgPA8zySJOlKKdM0TdM0rZfRB8iyrC2lTNI0nSmKIl3X69M0PTRN0+WyHMa11pckSRohhC2l/JYkyXBRPrdt25RSr5Zl3zFN88F4PP4mpdwJguBpFEX3m83mGRhzLwjDMHzJmP0wDMMXWZZ93G63H5fN78sopdA5N0opP0mSl/P5vN5sNh/zAymE+LqcT2uN1jqRUn6Joqg9nU4fFNM2DMMo2l95GGP/SylvR1H0oEifMzsIgoNSyjaMpZRfl8vlvTAMP0dRdG/btvu+7z9jzG4X6Wc3j8OYe7Lf75+M47hXdXyUUh8BgDF7yhj7yZhbzOfz22maHjPGTjPGxJ+WnzE2Wq/Xh5RSl1ar1Yk8zzvL5fJ4GIa9JEk6URT1lFL9NE17cRwfybLsp9Z6tVqtDsI4fAtjX6rGgRrY4/wCJ8zvggPQ/IEAAAAASUVORK5CYII=';
        const infoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAI5SURBVFiF7ZbPaxNBFMfnt5vdJBIp1l6kFQU9eCk9tQcVBC+iIAgK4kXw7l/w4EEQ70178aAHQfBPRBCvXrwIgqBQ6FURtPUDLVIrSdP9MW+TTbrZzWazWwX7hQWZZeZ95v2Y994bGAVK0P8ZY2yP1rohpXzDOS9JKfcaY56Ypvk4DMMyY+xrFEWJ53nblFKPm812qVR6qJRa55w/aF3GGJ9zHiqlZqIoOgIAtm2f6nQ6FxhjZZZlH6IoOtsfhzF2l2VZXSlV55y/CYLgJgCkaToex/G0lHIGAAqFgimESBhjUwCglNqqlPoqhIgBQEq5GEXRac55RUr5xXGcQQBQSq2GYfgGAJRS61LKz4yxm2EYjhbzL5VKawBgrgM3DONBEARHlFKbAIBS6nOl1B6l1DwA6Hq9frRQKNSiKNohl6vVal+hUNjfbDaPAkCxWHzKGNtXKBSqk8nksWEYZ5Ikqbquu1Yul2d938+63e5UoVA4I6W8CgC2bT9JkuQeAGRZ5gOAaZqjUkpTSrmZZdl9pVQtSZJ7xWKxBAA6jmOO42wIIa4BQLlcDjjn3w3DqAkhVgGAc34tjuM5pdS8EOJXmUwmE0KIvQDAOT8KACzLspc8z3vLGJuJomg6TVPP87zJLMu8TqfzI89zLwiCvZxzkWVZP5/P5wFgLMs2pJTVKIp6nPOs2Wx+Y4z9FkKcBICRUmkpy7K6lPJGHMfHS6XSEs65ZVnWbD6f38rzfMxxnM+B759I0/Qp5/w4Y6wQJMl2IcRcGIaHhRDbgyB4JKU8yRirCiE+D7z/H6AE9Y1+As0ZxH2vO/WTAAAAAElFTkSuQmCC';
        iconFolder.file('hotspot.png', hotspotBase64, { base64: true });
        iconFolder.file('info.png', infoBase64, { base64: true });
        console.log('✅ تم إضافة الأيقونات الافتراضية');
    }

    async createManifest(projectName, scenes, folder) {
        const manifest = {
            project: { name: projectName, date: new Date().toISOString(), version: "2.0", scenesCount: scenes.length },
            scenes: scenes.map((scene, index) => ({
                id: scene.id, index: index, name: scene.name,
                image: `images/scene-${index}.jpg`, data: `scenes/scene-${index}.json`,
                hotspotsCount: scene.hotspots?.length || 0,
                pathsCount: scene.paths?.length || 0,
                measurementsCount: scene.measurements?.length || 0,
                hasPaths: (scene.paths?.length > 0),
                hasHotspots: (scene.hotspots?.length > 0),
                hasMeasurements: (scene.measurements?.length > 0)
            })),
            layers: { paths: ['EL','AC','WP','WA','GS'], measurements: ['length','height'], hotspots: ['SCENE','INFO'] }
        };
        folder.file('manifest.json', JSON.stringify(manifest, null, 2));
        console.log(`📋 تم إنشاء manifest.json مع ${scenes.length} مشهد`);
    }

    async createSceneFiles(scenes, folder) {
        const scenesFolder = folder.folder('scenes');
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const sceneData = {
                id: scene.id, index: i, name: scene.name, image: `images/scene-${i}.jpg`,
                paths: (scene.paths || []).map(p => {
                    if (!p || typeof p !== 'object') return null;
                    return { type: p.type || 'unknown', color: p.color || '#ffaa44',
                        points: (p.points || []).map(pt => ({ x: pt.x || 0, y: pt.y || 0, z: pt.z || 0 })) };
                }).filter(p => p !== null),
                hotspots: (scene.hotspots || []).map(h => {
                    if (!h || typeof h !== 'object') return null;
                    return { id: h.id || `hotspot-${Date.now()}`, type: h.type || 'INFO',
                        position: { x: h.position?.x || 0, y: h.position?.y || 0, z: h.position?.z || 0 }, data: h.data || {} };
                }).filter(h => h !== null),
                measurements: (scene.measurements || []).map(m => {
                    if (!m || typeof m !== 'object') return null;
                    return { length: m.length || 0, height: m.height || 0,
                        start: { x: m.start?.x || 0, y: m.start?.y || 0, z: m.start?.z || 0 },
                        end: { x: m.end?.x || 0, y: m.end?.y || 0, z: m.end?.z || 0 } };
                }).filter(m => m !== null)
            };
            scenesFolder.file(`scene-${i}.json`, JSON.stringify(sceneData, null, 2));
            console.log(`📁 تم إنشاء ملف المشهد ${i}: ${scene.name}`);
        }
    }

    async createTourData(scenes, folder) {
        const tourData = scenes.map((scene, index) => ({
            id: scene.id, name: scene.name, image: `scene-${index}.jpg`,
            paths: scene.paths || [],
            hotspots: scene.hotspots || [],
            measurements: scene.measurements || []
        }));
        folder.file('tour-data.json', JSON.stringify(tourData, null, 2));
        console.log('✅ تم إنشاء tour-data.json');
    }

    generatePlayerHTML(projectName, scenesCount) {
        const cols = Math.ceil(Math.sqrt(scenesCount));
        const mapPositions = [];
        for (let i = 0; i < scenesCount; i++) {
            mapPositions.push({
                x: Math.round(5 + ((i % cols) / Math.max(cols - 1, 1)) * 90),
                y: Math.round(5 + (Math.floor(i / cols) / Math.max(Math.ceil(scenesCount / cols) - 1, 1)) * 90)
            });
        }
        const positionsStr = JSON.stringify(mapPositions);

        return '<!DOCTYPE html>\n' +
'<html lang="ar">\n' +
'<head>\n' +
'    <meta charset="UTF-8">\n' +
'    <title>' + projectName + '</title>\n' +
'    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏗️</text></svg>">\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">\n' +
'    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>\n' +
'    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>\n' +
'    <style>\n' +
'        * { margin: 0; padding: 0; box-sizing: border-box; }\n' +
'        body { margin: 0; overflow: hidden; font-family: \'Segoe UI\', sans-serif; direction: rtl; }\n' +
'        #container { width: 100vw; height: 100vh; background: #000; }\n' +
'        .toolbar { position: fixed; top: 0; left: 0; right: 0; height: 60px; background: rgba(20,30,40,0.4); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(74,108,143,0.3); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 1000; color: white; }\n' +
'        .logo { font-size: 20px; font-weight: bold; }\n' +
'        .tour-name { font-size: 14px; background: rgba(255,255,255,0.1); padding: 6px 16px; border-radius: 30px; }\n' +
'        #toggleMapBtn { position: fixed; top: 400px; right: 20px; padding: 10px 20px; background: rgba(20,30,40,0.4); backdrop-filter: blur(12px); color: white; border: 1px solid rgba(74,108,143,0.3); border-radius: 30px; cursor: pointer; z-index: 900; font-size: 14px; display: block; }\n' +
'        #autoRotateBtn { position: fixed; top: 460px; right: 20px; padding: 10px 20px; background: rgba(20,30,40,0.4); backdrop-filter: blur(12px); color: white; border: 1px solid rgba(74,108,143,0.3); border-radius: 30px; cursor: pointer; z-index: 900; font-size: 14px; display: block; }\n' +
'        #toggleMeasurements { position: fixed; top: 520px; right: 20px; padding: 10px 20px; background: rgba(20,30,40,0.4); backdrop-filter: blur(12px); color: white; border: 1px solid rgba(74,108,143,0.3); border-radius: 30px; cursor: pointer; z-index: 900; font-size: 14px; display: block; }\n' +
'        .scene-list-panel { position: fixed; top: 50%; left: 20px; transform: translateY(-50%); width: 260px; max-height: 70vh; background: rgba(20,30,40,0.25); backdrop-filter: blur(12px); border: 1px solid rgba(74,108,143,0.3); border-radius: 12px; color: white; z-index: 900; display: flex; flex-direction: column; overflow: hidden; transition: transform 0.3s ease, opacity 0.3s ease; }\n' +
'        .panel-header { padding: 12px; border-bottom: 1px solid rgba(74,108,143,0.2); }\n' +
'        .scene-list { flex: 1; overflow-y: auto; padding: 8px; }\n' +
'        .scene-item { padding: 10px 12px; margin: 4px 0; background: rgba(255,255,255,0.03); border-radius: 6px; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; }\n' +
'        .scene-item:hover { background: rgba(74,108,143,0.2); }\n' +
'        .scene-item.active { background: rgba(74,108,143,0.3); border-right: 3px solid #88aaff; }\n' +
'        .hotspot-marker { position: absolute; transform: translate(-50%, -50%); cursor: pointer; z-index: 1000; transition: transform 0.2s ease; }\n' +
'        .hotspot-marker:hover { transform: translate(-50%, -50%) scale(1.15); filter: drop-shadow(0 0 15px rgba(255,255,255,0.7)); }\n' +
'        .hotspot-marker img { border: 2px solid; width: 40px; height: 40px; border-radius: 50%; pointer-events: none; }\n' +
'        .hotspot-label { position: absolute; top: -45px; left: 50%; transform: translateX(-50%); background: rgba(20,30,40,0.95); color: white; padding: 6px 16px; border-radius: 30px; font-size: 14px; white-space: nowrap; border: 2px solid; pointer-events: none; opacity: 0; transition: opacity 0.25s; }\n' +
'        .hotspot-marker:hover .hotspot-label { opacity: 1; }\n' +
'        .measurement-line { position: absolute; pointer-events: none; z-index: 1500; height: 6px; background: repeating-linear-gradient(90deg, #e63946 0px, #e63946 30px, #ffffff 30px, #ffffff 60px); border-radius: 3px; box-shadow: 0 0 20px rgba(230,57,70,0.7); transform-origin: left center; }\n' +
'        .measurement-point { position: absolute; width: 16px; height: 16px; background: #e63946; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 20px rgba(230,57,70,0.9); transform: translate(-50%, -50%); z-index: 1501; }\n' +
'        .measurement-label { position: absolute; background: rgba(20,30,40,0.95); color: white; padding: 8px 16px; border-radius: 30px; font-size: 18px; font-weight: bold; border: 2px solid #e63946; box-shadow: 0 0 30px rgba(230,57,70,0.6); transform: translate(-50%, -50%); white-space: nowrap; z-index: 1502; }\n' +
'        #miniMap { position: fixed; top: 70px; right: 20px; width: 220px; height: 320px; background: rgba(0,0,0,0.9); border: 2px solid rgba(255,255,255,0.6); border-radius: 12px; z-index: 1000; overflow: hidden; display: block; }\n' +
'        #miniMap img { width: 100%; height: 100%; object-fit: contain; position: absolute; top: 0; left: 0; }\n' +
'        #mapMarker { position: absolute; width: 14px; height: 14px; background: #ff3333; border: 2px solid white; border-radius: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 12px red; transition: all 0.3s ease; z-index: 1001; }\n' +
'        #toggleSceneListBtn { background: rgba(20,30,40,0.8); backdrop-filter: blur(12px); color: white; border: 1px solid rgba(74,108,143,0.5); border-radius: 30px; width: 44px; height: 44px; font-size: 24px; cursor: pointer; display: none; align-items: center; justify-content: center; position: fixed; bottom: 150px; left: 10px; z-index: 950; }\n' +
'        @media (max-width: 768px) { #toggleSceneListBtn { display: flex; } .scene-list-panel { width: 220px; max-height: 60vh; left: 70px; } .scene-list-panel.hidden { transform: translateX(-150%); opacity: 0; pointer-events: none; } #miniMap { top: 60px; right: 10px; width: 130px; height: 190px; } #toggleMapBtn { top: 260px; right: 10px; padding: 8px 16px; font-size: 13px; } #autoRotateBtn { top: 305px; right: 10px; padding: 8px 16px; font-size: 13px; left: auto; transform: none; } #toggleMeasurements { top: 350px; right: 10px; padding: 8px 16px; font-size: 13px; bottom: auto; } }\n' +
'    </style>\n' +
'</head>\n' +
'<body>\n' +
'    <div class="toolbar"><div class="logo">🏗️ Actual View Studio</div><div class="tour-name" id="sceneTitle">' + projectName + '</div></div>\n' +
'    <div id="container"></div>\n' +
'    <button id="toggleMapBtn">🗺️ Hide Map</button>\n' +
'    <button id="autoRotateBtn">⏸️ Stop Rotation</button>\n' +
'    <button id="toggleMeasurements">📏 Show Measurements</button>\n' +
'    <div class="scene-list-panel" id="sceneListPanel"><div class="panel-header"><h3>📋 Scene List</h3></div><div class="scene-list" id="sceneList"></div></div>\n' +
'    <button id="toggleSceneListBtn">📋</button>\n' +
'    <div id="miniMap"><img src="floor-plan.png" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display=\'none\';document.getElementById(\'mapMarker\').style.display=\'none\';document.getElementById(\'toggleMapBtn\').style.display=\'none\';"><div id="mapMarker"></div></div>\n' +
'\n' +
'    <script>\n' +
'        const THREE = window.THREE;\n' +
'        const OrbitControls = THREE.OrbitControls;\n' +
'        const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);\n' +
'        const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2000); camera.position.set(0,0,0.1);\n' +
'        const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(window.devicePixelRatio);\n' +
'        document.getElementById(\'container\').appendChild(renderer.domElement);\n' +
'        const controls = new OrbitControls(camera, renderer.domElement);\n' +
'        controls.enableZoom=true; controls.enablePan=false; controls.enableDamping=true; controls.dampingFactor=0.05; controls.autoRotate=true; controls.autoRotateSpeed=0.5; controls.rotateSpeed=0.5;\n' +
'        const textureLoader = new THREE.TextureLoader();\n' +
'        let sphereMesh, currentSceneIndex=0, scenesList=[], hotspotMarkers=[], measurementElements=[], showMeasurements=false, sceneDataCache={};\n' +
'        const ICONS = { hotspot: \'icon/hotspot.png\', info: \'icon/info.png\' };\n' +
'        const sceneMapPositions = ' + positionsStr + ';\n' +
'        function updateMapMarker() {\n' +
'            const pos = sceneMapPositions[currentSceneIndex];\n' +
'            if (!pos) return;\n' +
'            const marker = document.getElementById(\'mapMarker\');\n' +
'            marker.style.left = pos.x + \'%\';\n' +
'            marker.style.top = pos.y + \'%\';\n' +
'        }\n' +
'\n' +
'        function createHotspotMarker(hotspot) {\n' +
'            const m = document.createElement(\'div\'); m.className = \'hotspot-marker\';\n' +
'            const img = document.createElement(\'img\'); const isS = hotspot.type === \'SCENE\';\n' +
'            img.src = isS ? ICONS.hotspot : ICONS.info; img.style.borderColor = isS ? \'#ffaa44\' : \'#44aaff\'; m.appendChild(img);\n' +
'            const l = document.createElement(\'div\'); l.className = \'hotspot-label\'; l.style.borderColor = isS ? \'#ffaa44\' : \'#44aaff\';\n' +
'            l.textContent = isS ? (hotspot.data?.targetSceneName || \'انتقال\') : (hotspot.data?.title || \'معلومات\'); m.appendChild(l);\n' +
'            m._worldPos = new THREE.Vector3(hotspot.position.x, hotspot.position.y, hotspot.position.z);\n' +
'            m.addEventListener(\'click\', (e) => { e.stopPropagation();\n' +
'                if (isS) { const ti = scenesList.findIndex(s => s.id === hotspot.data.targetSceneId); if (ti >= 0) switchToScene(ti); }\n' +
'                else alert(\'📌 \' + (hotspot.data?.title || \'\') + \'\\n\\n\' + (hotspot.data?.content || \'\'));\n' +
'            }); document.body.appendChild(m); return m;\n' +
'        }\n' +
'\n' +
'        function createMeasurementElement(m) {\n' +
'            const line = document.createElement(\'div\'); line.className = \'measurement-line\'; line.style.display = \'none\';\n' +
'            const start = document.createElement(\'div\'); start.className = \'measurement-point\'; start.style.display = \'none\';\n' +
'            const end = document.createElement(\'div\'); end.className = \'measurement-point\'; end.style.display = \'none\';\n' +
'            const label = document.createElement(\'div\'); label.className = \'measurement-label\'; label.textContent = m.length.toFixed(2) + \' m\'; label.style.display = \'none\';\n' +
'            line._start = new THREE.Vector3(m.start.x, m.start.y, m.start.z); line._end = new THREE.Vector3(m.end.x, m.end.y, m.end.z);\n' +
'            start._worldPos = line._start.clone(); end._worldPos = line._end.clone(); label._worldPos = new THREE.Vector3().addVectors(line._start, line._end).multiplyScalar(0.5);\n' +
'            document.body.appendChild(line); document.body.appendChild(start); document.body.appendChild(end); document.body.appendChild(label);\n' +
'            return { line, start, end, label };\n' +
'        }\n' +
'\n' +
'        function clearHotspots() { hotspotMarkers.forEach(m => m.remove()); hotspotMarkers = []; }\n' +
'        function clearMeasurements() { measurementElements.forEach(e => { if(e.line) e.line.remove(); if(e.start) e.start.remove(); if(e.end) e.end.remove(); if(e.label) e.label.remove(); }); measurementElements = []; }\n' +
'\n' +
'        async function switchToScene(index) {\n' +
'            if (index < 0 || index >= scenesList.length) return;\n' +
'            currentSceneIndex = index;\n' +
'            const info = scenesList[index];\n' +
'            document.getElementById(\'sceneTitle\').textContent = info.name + \' ⏳\';\n' +
'            let sceneData = sceneDataCache[index];\n' +
'            if (!sceneData) {\n' +
'                try { const resp = await fetch(\'scenes/scene-\' + index + \'.json\'); sceneData = await resp.json(); sceneDataCache[index] = sceneData; Object.keys(sceneDataCache).forEach(k => { if (Math.abs(parseInt(k) - index) > 2) delete sceneDataCache[k]; }); }\n' +
'                catch (e) { console.error(\'❌ فشل:\', e); return; }\n' +
'            }\n' +
'            const fullPath = sceneData.image.includes(\'/\') ? sceneData.image : \'images/\' + sceneData.image;\n' +
'            textureLoader.load(fullPath, (texture) => {\n' +
'                texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; texture.repeat.x = -1;\n' +
'                if (sphereMesh) {\n' +
'                    const oldTexture = sphereMesh.material.map;\n' +
'                    sphereMesh.material.map = texture;\n' +
'                    sphereMesh.material.needsUpdate = true;\n' +
'                    if (oldTexture) oldTexture.dispose();\n' +
'                } else {\n' +
'                    sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(500, 64, 64), new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }));\n' +
'                    scene.add(sphereMesh);\n' +
'                }\n' +
'                clearHotspots(); clearMeasurements();\n' +
'                document.getElementById(\'sceneTitle\').textContent = info.name;\n' +
'                if (sceneData.hotspots) sceneData.hotspots.forEach(h => hotspotMarkers.push(createHotspotMarker(h)));\n' +
'                if (sceneData.measurements) sceneData.measurements.forEach(m => measurementElements.push(createMeasurementElement(m)));\n' +
'                document.querySelectorAll(\'.scene-item\').forEach((el, i) => el.classList.toggle(\'active\', i === index));\n' +
'                if (window.innerWidth <= 768) document.getElementById(\'sceneListPanel\').classList.add(\'hidden\'); updateMapMarker();\n' +
'            }, undefined, () => { document.getElementById(\'sceneTitle\').textContent = info.name; });\n' +
'        }\n' +
'\n' +
'        function updateHotspotPositions() {\n' +
'            const w = window.innerWidth, h = window.innerHeight;\n' +
'            hotspotMarkers.forEach(m => { if (!m._worldPos) return; const pos = m._worldPos.clone().project(camera);\n' +
'                if (pos.z>1||pos.z<-1) { m.style.display=\'none\'; return; } m.style.display=\'block\';\n' +
'                m.style.left=((pos.x*0.5+0.5)*w)+\'px\'; m.style.top=((-pos.y*0.5+0.5)*h)+\'px\'; });\n' +
'        }\n' +
'\n' +
'        function updateMeasurementPositions() {\n' +
'            if (!camera || !showMeasurements) return;\n' +
'            const w = window.innerWidth, h = window.innerHeight;\n' +
'            measurementElements.forEach(e => {\n' +
'                if (!e.line?._start) return;\n' +
'                const s = e.line._start.clone().project(camera), e2 = e.line._end.clone().project(camera);\n' +
'                if (s.z>1||e2.z>1||s.z<-1||e2.z<-1) { e.line.style.display=\'none\'; e.start.style.display=\'none\'; e.end.style.display=\'none\'; e.label.style.display=\'none\'; return; }\n' +
'                const x1=(s.x*0.5+0.5)*w, y1=(-s.y*0.5+0.5)*h, x2=(e2.x*0.5+0.5)*w, y2=(-e2.y*0.5+0.5)*h;\n' +
'                if (x1<0&&x2<0||x1>w&&x2>w||y1<0&&y2<0||y1>h&&y2>h) { e.line.style.display=\'none\'; e.start.style.display=\'none\'; e.end.style.display=\'none\'; e.label.style.display=\'none\'; return; }\n' +
'                const dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy), angle=Math.atan2(dy,dx)*180/Math.PI;\n' +
'                e.line.style.display=\'block\'; e.line.style.left=x1+\'px\'; e.line.style.top=y1+\'px\'; e.line.style.width=len+\'px\'; e.line.style.transform=\'rotate(\'+angle+\'deg)\';\n' +
'                e.start.style.display=\'block\'; e.start.style.left=x1+\'px\'; e.start.style.top=y1+\'px\';\n' +
'                e.end.style.display=\'block\'; e.end.style.left=x2+\'px\'; e.end.style.top=y2+\'px\';\n' +
'                e.label.style.display=\'block\'; e.label.style.left=((x1+x2)/2)+\'px\'; e.label.style.top=(((y1+y2)/2)-30)+\'px\';\n' +
'            });\n' +
'        }\n' +
'\n' +
'        async function loadData() {\n' +
'            try { const r = await fetch(\'tour-data.json\'); const allData = await r.json();\n' +
'                scenesList = allData.map((s, i) => ({ id: s.id, index: i, name: s.name }));\n' +
'                buildSceneList(); if (scenesList.length > 0) switchToScene(0);\n' +
'            } catch (e) { console.error(\'❌ فشل تحميل البيانات\'); }\n' +
'        }\n' +
'\n' +
'        function buildSceneList() {\n' +
'            const listEl = document.getElementById(\'sceneList\'); listEl.innerHTML = \'\';\n' +
'            scenesList.forEach((s, i) => {\n' +
'                const div = document.createElement(\'div\'); div.className = \'scene-item\' + (i===0?\' active\':\'\');\n' +
'                div.innerHTML = \'<span class="scene-icon">🏗️</span><span class="scene-name">\'+s.name+\'</span>\';\n' +
'                div.addEventListener(\'click\', () => switchToScene(i)); listEl.appendChild(div);\n' +
'            });\n' +
'        }\n' +
'\n' +
'        function animate() { requestAnimationFrame(animate); controls.update(); updateHotspotPositions(); updateMeasurementPositions(); renderer.render(scene, camera); }\n' +
'\n' +
'        document.getElementById(\'toggleMapBtn\').addEventListener(\'click\', () => { const m = document.getElementById(\'miniMap\'); const btn = document.getElementById(\'toggleMapBtn\'); if (m.style.display === \'none\') { m.style.display = \'block\'; btn.textContent = \'🗺️ Hide Map\'; } else { m.style.display = \'none\'; btn.textContent = \'🗺️ Show Map\'; } });\n' +
'        document.getElementById(\'autoRotateBtn\').addEventListener(\'click\', function() { controls.autoRotate = !controls.autoRotate; this.textContent = controls.autoRotate ? \'⏸️ Stop Rotation\' : \'▶️ Start Rotation\'; });\n' +
'        document.getElementById(\'toggleMeasurements\').addEventListener(\'click\', function() { showMeasurements = !showMeasurements; this.textContent = showMeasurements ? \'📏 Hide Measurements\' : \'📏 Show Measurements\'; if(!showMeasurements) measurementElements.forEach(e=>{if(e.line)e.line.style.display=\'none\'; if(e.start)e.start.style.display=\'none\'; if(e.end)e.end.style.display=\'none\'; if(e.label)e.label.style.display=\'none\';}); });\n' +
'        document.getElementById(\'toggleSceneListBtn\').addEventListener(\'click\', (e) => { e.stopPropagation(); document.getElementById(\'sceneListPanel\').classList.toggle(\'hidden\'); });\n' +
'        document.addEventListener(\'click\', (e) => { const p = document.getElementById(\'sceneListPanel\'); const b = document.getElementById(\'toggleSceneListBtn\'); if (window.innerWidth <= 768 && !p.classList.contains(\'hidden\') && !p.contains(e.target) && e.target !== b) p.classList.add(\'hidden\'); });\n' +
'        window.addEventListener(\'resize\', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });\n' +
'\n' +
'        loadData(); animate();\n' +
'    <\/script>\n' +
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
\`;
    }
}
