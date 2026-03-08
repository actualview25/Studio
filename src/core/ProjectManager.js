// =======================================
// ACTUAL VIEW STUDIO - PROJECT MANAGER
// =======================================
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
export class ProjectManager {
    constructor() {
        this.projects = [];
        this.currentProject = null;
        this.loadProjects();
    }

    loadProjects() {
        const saved = localStorage.getItem('virtual-tour-projects');
        if (saved) {
            try {
                this.projects = JSON.parse(saved);
                console.log(`✅ تم تحميل ${this.projects.length} مشروع`);
            } catch (e) {
                console.warn('⚠️ فشل تحميل المشاريع المحفوظة');
                this.projects = [];
            }
        }
    }

    saveProjects() {
        localStorage.setItem('virtual-tour-projects', JSON.stringify(this.projects));
        console.log('✅ تم حفظ المشاريع');
    }

    newProject(name) {
        const project = {
            id: Date.now(),
            name: name || `مشروع-${new Date().toLocaleDateString()}`,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            paths: [],
            imageData: null
        };

        this.projects.push(project);
        this.currentProject = project;
        this.saveProjects();
        
        console.log(`📁 تم إنشاء مشروع جديد: ${project.name}`);
        return project;
    }

    saveCurrentProject(paths, imageData) {
        if (this.currentProject) {
            this.currentProject.paths = paths.map(path => ({
                type: path.userData.type,
                color: '#' + pathColors[path.userData.type].toString(16).padStart(6, '0'),
                points: path.userData.points.map(p => ({ x: p.x, y: p.y, z: p.z }))
            }));
            this.currentProject.imageData = imageData;
            this.currentProject.modified = new Date().toISOString();
            this.saveProjects();
            
            console.log(`💾 تم حفظ المشروع: ${this.currentProject.name}`);
        }
    }

    openProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) {
            console.error('❌ المشروع غير موجود');
            return null;
        }

        this.currentProject = project;
        console.log(`📂 تم فتح المشروع: ${project.name}`);
        
        // تحديث المشاهد في SceneManager إذا لزم الأمر
        if (window.sceneManager && project.imageData) {
            // سيتم تطبيق هذا لاحقاً حسب الحاجة
        }

        return project;
    }

    deleteProject(projectId) {
        const index = this.projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            const project = this.projects[index];
            this.projects.splice(index, 1);
            
            if (this.currentProject?.id === projectId) {
                this.currentProject = this.projects[0] || null;
            }
            
            this.saveProjects();
            console.log(`🗑️ تم حذف المشروع: ${project.name}`);
            return true;
        }
        return false;
    }

    getProjectsList() {
        return this.projects.map(p => ({
            id: p.id,
            name: p.name,
            created: p.created,
            modified: p.modified,
            pathsCount: p.paths?.length || 0
        }));
    }

    getRecentProjects(limit = 5) {
        return [...this.projects]
            .sort((a, b) => new Date(b.modified || b.created) - new Date(a.modified || a.created))
            .slice(0, limit)
            .map(p => ({
                id: p.id,
                name: p.name,
                modified: p.modified || p.created
            }));
    }

    renameProject(newName) {
        if (!this.currentProject) return false;
        
        this.currentProject.name = newName;
        this.currentProject.modified = new Date().toISOString();
        this.saveProjects();
        
        console.log(`✏️ تم تغيير اسم المشروع إلى: ${newName}`);
        return true;
    }

    exportProject() {
        if (!this.currentProject) {
            alert('❌ لا يوجد مشروع مفتوح');
            return;
        }

        // تجهيز بيانات المشروع للتصدير
        const exportData = {
            project: {
                id: this.currentProject.id,
                name: this.currentProject.name,
                created: this.currentProject.created,
                modified: new Date().toISOString()
            },
            paths: this.currentProject.paths || [],
            imageData: this.currentProject.imageData
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentProject.name}.avproj`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log(`📦 تم تصدير المشروع: ${this.currentProject.name}`);
    }

    importProject(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (!data.project || !data.project.name) {
                        throw new Error('ملف مشروع غير صالح');
                    }

                    const project = {
                        id: Date.now(),
                        name: data.project.name,
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        paths: data.paths || [],
                        imageData: data.imageData,
                        importedFrom: data.project.id
                    };

                    this.projects.push(project);
                    this.currentProject = project;
                    this.saveProjects();
                    
                    console.log(`📥 تم استيراد المشروع: ${project.name}`);
                    resolve(project);
                    
                } catch (error) {
                    console.error('❌ فشل استيراد المشروع:', error);
                    reject(error);
                }
            };

            reader.readAsText(file);
        });
    }
}
