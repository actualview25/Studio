// =======================================
// ACTUAL VIEW STUDIO - MEASUREMENT TOOLS
// =======================================


export class MeasurementTools {
    constructor(app) {
        this.app = app;
        this.scene = app.scene;
        
        // ثوابت الكرة والإزاحة
        this.SPHERE_RADIUS = 500;
        this.MEASURE_OFFSET = 5;
        this.MEASURE_RADIUS = this.SPHERE_RADIUS + this.MEASURE_OFFSET; // 505
        
        this.measureMode = false;
        this.measureStartPoint = null;
        this.measureTempLine = null;
        this.measureGroups = [];
    }

    // ===== تصحيح موقع النقطة إلى خارج الكرة =====
    correctPosition(position) {
        const direction = position.clone().normalize();
        return direction.multiplyScalar(this.MEASURE_RADIUS);
    }

    // ===== تفعيل/إلغاء وضع القياس =====
    setMode(active) {
        this.measureMode = active;
        document.body.style.cursor = active ? 'crosshair' : 'default';
        
        const statusEl = document.getElementById('status');
        if (statusEl) {
            if (active) {
                statusEl.innerHTML = '📏 وضع القياس: اختر النقطة الأولى';
            } else {
                statusEl.innerHTML = 'النوع الحالي: <span style="color:#ffcc00;">EL</span>';
            }
        }
        
        if (!active) {
            this.measureStartPoint = null;
            if (this.measureTempLine) {
                this.scene.remove(this.measureTempLine);
                this.measureTempLine = null;
            }
        }
        
        console.log(active ? '📏 تفعيل القياس' : '📏 إيقاف القياس');
    }

    // ===== معالجة النقر للقياس =====
    handleClick(point) {
        if (!this.measureMode) return false;

        const correctedPoint = this.correctPosition(point);

        if (!this.measureStartPoint) {
            // النقطة الأولى
            this.measureStartPoint = correctedPoint.clone();
            
            const markerGeo = new THREE.SphereGeometry(5, 16, 16);
            const markerMat = new THREE.MeshStandardMaterial({ 
                color: 0xffaa44, 
                emissive: 0x442200,
                emissiveIntensity: 0.8
            });
            const marker = new THREE.Mesh(markerGeo, markerMat);
            marker.position.copy(this.measureStartPoint);
            this.scene.add(marker);
            this.measureTempLine = marker;
            
            document.getElementById('status').innerHTML = '📏 اختر النقطة الثانية';
            return true;
        }

        // النقطة الثانية
        const endPoint = correctedPoint.clone();
        
        if (this.measureTempLine) {
            this.scene.remove(this.measureTempLine);
            this.measureTempLine = null;
        }
        
        const distance = this.measureStartPoint.distanceTo(endPoint);
        
        const realLength = prompt('📏 أدخل الطول (بالمتر):', distance.toFixed(2));
        if (realLength === null) {
            this.measureStartPoint = null;
            return true;
        }
        
        const realHeight = prompt('📏 أدخل الارتفاع (بالمتر):', '0');
        if (realHeight === null) {
            this.measureStartPoint = null;
            return true;
        }
        
        // إنشاء مجموعة القياس
        const lineGroup = this.createMeasureLine(this.measureStartPoint, endPoint);
        this.scene.add(lineGroup);
        this.measureGroups.push(lineGroup);
        
        const midPoint = new THREE.Vector3().addVectors(this.measureStartPoint, endPoint).multiplyScalar(0.5);
        const labelGroup = this.createMeasureLabel(realLength, midPoint);
        this.scene.add(labelGroup);
        this.measureGroups.push(labelGroup);
        
        // حفظ القياس
        const measurement = {
            start: { 
                x: this.measureStartPoint.x, 
                y: this.measureStartPoint.y, 
                z: this.measureStartPoint.z 
            },
            end: { 
                x: endPoint.x, 
                y: endPoint.y, 
                z: endPoint.z 
            },
            length: parseFloat(realLength),
            height: parseFloat(realHeight)
        };
        
        if (window.sceneManager?.currentScene) {
            window.sceneManager.addMeasurement(window.sceneManager.currentScene.id, measurement);
            console.log('📏 تم حفظ القياس:', measurement);
        }
        
        alert(`✅ تم القياس: ${realLength} m`);
        
        this.measureStartPoint = null;
        document.getElementById('status').innerHTML = 'النوع الحالي: <span style="color:#ffcc00;">EL</span>';
        
        return true;
    }

    // ===== إنشاء خط القياس (نسخة واحدة فقط) =====
    createMeasureLine(point1, point2) {
        const group = new THREE.Group();
        
        const start = this.correctPosition(point1);
        const end = this.correctPosition(point2);
        
        const direction = new THREE.Vector3().subVectors(end, start);
        const distance = direction.length();
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        
        // جسم المسطرة
        const lineGeo = new THREE.CylinderGeometry(3, 3, distance, 12);
        const lineMat = new THREE.MeshStandardMaterial({
            color: 0xffaa44,
            emissive: 0x442200,
            emissiveIntensity: 0.5
        });
        const line = new THREE.Mesh(lineGeo, lineMat);
        
        // ✅ رفع القياسات فوق كل شيء
        line.renderOrder = 998;
        line.material.depthTest = false;
        line.material.depthWrite = false;
        
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        line.applyQuaternion(quaternion);
        line.position.copy(midPoint);
        group.add(line);
        
        // أطراف المسطرة (كرات)
        const sphereGeo = new THREE.SphereGeometry(6, 24, 24);
        const sphereMat = new THREE.MeshStandardMaterial({
            color: 0xffaa44,
            emissive: 0x442200,
            emissiveIntensity: 0.8
        });
        
        const sphere1 = new THREE.Mesh(sphereGeo, sphereMat);
        sphere1.position.copy(start);
        group.add(sphere1);
        
        const sphere2 = new THREE.Mesh(sphereGeo, sphereMat);
        sphere2.position.copy(end);
        group.add(sphere2);
        
        // علامات المسطرة
        const numMarks = Math.floor(distance / 2.5);
        for (let i = 1; i < numMarks; i++) {
            const t = i / numMarks;
            const pos = new THREE.Vector3().lerpVectors(start, end, t);
            
            const isBigMark = i % 4 === 0;
            const markHeight = isBigMark ? 6 : 3;
            const markWidth = isBigMark ? 1.5 : 0.8;
            
            const markGeo = new THREE.BoxGeometry(markWidth, markHeight, markWidth);
            const markMat = new THREE.MeshStandardMaterial({ 
                color: isBigMark ? 0xffffff : 0xffaa44,
                emissive: isBigMark ? 0x333333 : 0x221100
            });
            const mark = new THREE.Mesh(markGeo, markMat);
            mark.position.copy(pos);
            mark.quaternion.copy(quaternion);
            group.add(mark);
        }
        
        return group;
    }

    // ===== إنشاء ملصق القياس =====
    createMeasureLabel(text, position) {
        const group = new THREE.Group();
        
        const basePos = this.correctPosition(position);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 4096;
        canvas.height = 2048;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#ffaa44';
        ctx.lineWidth = 80;
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 20;
        ctx.strokeRect(120, 120, canvas.width - 240, canvas.height - 240);
        
        ctx.font = 'bold 800px "Arial", "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text + ' m', canvas.width / 2, canvas.height / 2);
        
        ctx.shadowColor = '#ffaa44';
        ctx.shadowBlur = 100;
        ctx.fillText(text + ' m', canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(120, 60, 1);
        
        const labelPos = basePos.clone().add(new THREE.Vector3(0, 80, 0));
        sprite.position.copy(labelPos);
        group.add(sprite);
        
        const lineGeo = new THREE.BufferGeometry().setFromPoints([basePos, labelPos]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffaa44 });
        const line = new THREE.Line(lineGeo, lineMat);
        group.add(line);
        
        return group;
    }

    // ===== إظهار القياسات المحفوظة =====
    showMeasurements(sceneId) {
        this.measureGroups.forEach(g => this.scene.remove(g));
        this.measureGroups = [];
        
        const measurements = window.sceneManager?.measurements[sceneId] || [];
        
        measurements.forEach(m => {
            const start = new THREE.Vector3(m.start.x, m.start.y, m.start.z);
            const end = new THREE.Vector3(m.end.x, m.end.y, m.end.z);
            
            const lineGroup = this.createMeasureLine(start, end);
            this.scene.add(lineGroup);
            this.measureGroups.push(lineGroup);
            
            const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            const labelGroup = this.createMeasureLabel(m.length, midPoint);
            this.scene.add(labelGroup);
            this.measureGroups.push(labelGroup);
        });
        
        console.log(`📏 تم إظهار ${measurements.length} قياس`);
    }

    hideAll() {
        this.measureGroups.forEach(g => this.scene.remove(g));
        this.measureGroups = [];
    }

    dispose() {
        this.hideAll();
        if (this.measureTempLine) {
            this.scene.remove(this.measureTempLine);
            this.measureTempLine = null;
        }
    }
}
