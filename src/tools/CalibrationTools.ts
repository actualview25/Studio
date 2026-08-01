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
