import paper from 'paper';

export class SvgEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        
        paper.settings.handleSize = 6;
        paper.settings.hitTolerance = 10;
        
        paper.setup(this.canvas);
        this.project = paper.project;
        this.view = paper.view;
        this.selectedItems = [];
        
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 15;
        this.isRestoring = false;

        this.uiLayer = new paper.Layer({ name: 'ui-layer' });
        this.uiLayer.data.isTool = true;

        this.artboardLayer = new paper.Layer({ name: 'artboard-layer' });
        this.artboardLayer.sendToBack();

        this.drawLayer = new paper.Layer({ name: 'draw-layer' });
        this.drawLayer.activate();

        this.tools = {};
        this.initSelectionTool();
        this.initEyedropperTool();
        
        this.currentToolName = 'selection';
        this.tools.selection.activate();

        this.artboardBounds = new paper.Rectangle(0, 0, 800, 800);

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.loadFromLocalStorage();
        this.saveHistory();
        
        // Initial artboard positioning
        this.artboardBounds.center = this.view.center;
        this.renderArtboard();

        // Navigation state
        this.isPanning = false;
        this.lastPoint = null;
    }

    renderArtboard() {
        this.artboardLayer.clear();
        this.artboardLayer.activate();
        const rect = new paper.Path.Rectangle(this.artboardBounds);
        rect.fillColor = 'white';
        rect.shadowColor = new paper.Color(0, 0, 0, 0.1);
        rect.shadowBlur = 15;
        rect.shadowOffset = new paper.Point(0, 4);
        rect.data.isArtboard = true;
        rect.guide = true; // Prevents being hit by regular project hit tests
        this.drawLayer.activate();
    }

    setArtboardSize(width, height) {
        // Clamp to 4K
        const w = Math.min(Math.max(width, 10), 4096);
        const h = Math.min(Math.max(height, 10), 4096);
        
        const center = this.artboardBounds.center;
        this.artboardBounds = new paper.Rectangle(0, 0, w, h);
        this.artboardBounds.center = center;
        this.renderArtboard();
        this.saveHistory();
    }

    resetView() {
        this.view.zoom = 1;
        this.view.center = this.artboardBounds.center;
        this.updateTransformUI();
    }

    zoom(delta, center) {
        const factor = 1.1;
        const newZoom = delta > 0 ? this.view.zoom / factor : this.view.zoom * factor;
        
        // Clamp zoom between 0.05 and 50
        if (newZoom < 0.05 || newZoom > 50) return;

        const beta = this.view.zoom / newZoom;
        const pc = center.subtract(this.view.center);
        const offset = center.subtract(pc.multiply(beta)).subtract(this.view.center);

        this.view.zoom = newZoom;
        this.view.center = this.view.center.add(offset);
        this.updateTransformUI();
    }

    pan(delta) {
        this.view.center = this.view.center.subtract(delta);
        this.updateTransformUI();
    }

    // Generates a simple unique ID for tracking items across JSON import/export
    _generateUID() {
        return Math.random().toString(36).substring(2, 9);
    }

    // Recursively ensures all items in a project have a persistent UID
    _ensureUIDs(parent = this.drawLayer) {
        if (!parent || !parent.children) return;
        parent.children.forEach(item => {
            if (!item.data.uid) {
                item.data.uid = this._generateUID();
            }
            if (item.children) this._ensureUIDs(item);
        });
    }

    _getSnapshot() {
        // Tag everything before snapshot
        this._ensureUIDs();

        const ui = this.uiLayer;
        if (ui) ui.remove();
        
        const selected = [...this.selectedItems];
        this.project.deselectAll();
        
        // Temporarily store artboard state in data to persist size/position in JSON
        this.artboardLayer.data.bounds = { 
            x: this.artboardBounds.x, 
            y: this.artboardBounds.y, 
            width: this.artboardBounds.width, 
            height: this.artboardBounds.height 
        };

        const json = this.project.exportJSON();
        
        selected.forEach(item => item.selected = true);
        if (ui) this.project.addLayer(ui);
        this.drawLayer.activate();
        
        return json;
    }

    saveToLocalStorage() {
        if (this.isRestoring) return;
        localStorage.setItem('svg-editor-work', this._getSnapshot());
    }

    loadFromLocalStorage() {
        const savedWork = localStorage.getItem('svg-editor-work');
        if (savedWork) {
            try {
                this.isRestoring = true;
                this.project.clear();
                this.project.importJSON(savedWork);
                this._restoreLayers();
                
                // Restore artboard bounds from metadata if exists
                if (this.artboardLayer.data && this.artboardLayer.data.bounds) {
                    const b = this.artboardLayer.data.bounds;
                    this.artboardBounds = new paper.Rectangle(b.x, b.y, b.width, b.height);
                }
                this.renderArtboard();
                
                this.isRestoring = false;
            } catch (err) {
                console.error('Failed to load:', err);
                this.isRestoring = false;
            }
        }
    }

    _restoreLayers() {
        this.project.layers.filter(l => l.name === 'ui-layer' || (l.data && l.data.isTool)).forEach(l => l.remove());
        
        this.drawLayer = this.project.layers.find(l => l.name === 'draw-layer');
        if (!this.drawLayer) {
            this.drawLayer = new paper.Layer({ name: 'draw-layer' });
            this.project.layers.forEach(l => {
                if (l !== this.drawLayer && l.name !== 'artboard-layer') {
                    this.drawLayer.addChildren(Array.from(l.children));
                    l.remove();
                }
            });
        }

        this.artboardLayer = this.project.layers.find(l => l.name === 'artboard-layer');
        if (!this.artboardLayer) {
            this.artboardLayer = new paper.Layer({ name: 'artboard-layer' });
            this.artboardLayer.sendToBack();
        }
        
        this.uiLayer = new paper.Layer({ name: 'ui-layer' });
        this.uiLayer.data.isTool = true;
        this.drawLayer.activate();
    }

    saveHistory() {
        if (this.isRestoring) return;
        
        const state = this._getSnapshot();
        localStorage.setItem('svg-editor-work', state);

        if (this.historyIndex >= 0 && this.history[this.historyIndex] === state) return;

        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        this.history.push(state);
        this.historyIndex++;

        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex <= 0) return;
        this.isRestoring = true;
        this.historyIndex--;
        this._applyState(this.history[this.historyIndex]);
        this.isRestoring = false;
    }

    redo() {
        if (this.historyIndex >= this.history.length - 1) return;
        this.isRestoring = true;
        this.historyIndex++;
        this._applyState(this.history[this.historyIndex]);
        this.isRestoring = false;
    }

    _applyState(json) {
        if (this.tools[this.currentToolName]) this.tools[this.currentToolName].isDragging = false;
        
        // Remember selection by persistent UIDs
        const selectedUIDs = this.selectedItems.map(i => i.data.uid).filter(Boolean);
        
        this.project.clear();
        this.project.importJSON(json);
        this._restoreLayers();
        
        // Re-sync selection using UIDs
        this.selectedItems = [];
        if (selectedUIDs.length > 0) {
            const findAndSelect = (parent) => {
                parent.children.forEach(item => {
                    if (selectedUIDs.includes(item.data.uid)) {
                        item.selected = true;
                        this.selectedItems.push(item);
                    }
                    if (item.children) findAndSelect(item);
                });
            };
            findAndSelect(this.drawLayer);
        }

        this.updateTransformUI();
        this.updateUI();
        localStorage.setItem('svg-editor-work', json);
    }

    clearCanvas() {
        this.drawLayer.clear();
        this.history = [];
        this.historyIndex = -1;
        this.setSelected(null);
        this.saveHistory();
    }

    get selectedItem() {
        return this.selectedItems.length > 0 ? this.selectedItems[this.selectedItems.length - 1] : null;
    }

    resize() {
        const container = this.canvas.parentElement;
        if (container) {
            const style = window.getComputedStyle(container);
            const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
            const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
            const width = container.clientWidth - paddingX;
            const height = container.clientHeight - paddingY;
            this.canvas.width = width;
            this.canvas.height = height;
            this.view.viewSize = new paper.Size(width, height);
            this.view.update();
        }
    }

    initSelectionTool() {
        this.tools.selection = new paper.Tool();
        const tool = this.tools.selection;
        let selectionRect = null;
        let startPoint = null;
        let isDragging = false;
        let isRotating = false;
        let isScaling = false;
        let hasDuplicatedOnDrag = false;
        let transformRef = null;
        let handleType = null;
        let dragAppliedTranslation = new paper.Point(0, 0);

        tool.onMouseDown = (event) => {
            if (event.event.button !== 0) return;
            
            // Blur any active text inputs when clicking the canvas
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                document.activeElement.blur();
            }

            const point = event.point;
            hasDuplicatedOnDrag = false;

            // Signal to main script to finish any pending style changes
            window.dispatchEvent(new CustomEvent('appMouseDown'));

            const uiHit = this.uiLayer.hitTest(point, { tolerance: 10, fill: true, stroke: true });
            if (uiHit && uiHit.item && uiHit.item.data) {
                handleType = uiHit.item.data.type;
                if (handleType === 'rotate') {
                    isRotating = true;
                    const center = this.getSelectionBounds().center;
                    transformRef = { center: center, startAngle: point.subtract(center).angle, totalApplied: 0 };
                    return;
                } else if (handleType.startsWith('scale-')) {
                    isScaling = true;
                    const bounds = this.getSelectionBounds();
                    transformRef = { bounds: bounds.clone(), startPoint: point, pivot: bounds[this.getOppositeCorner(handleType)], totalScaleX: 1, totalScaleY: 1 };
                    return;
                }
            }

            const hitResult = this.drawLayer.hitTest(point, { segments: true, stroke: true, fill: true, tolerance: 10, curves: true });
            if (hitResult && hitResult.item) {
                let item = hitResult.item;
                while (item.parent && item.parent !== this.drawLayer) item = item.parent;
                if (event.modifiers.shift) {
                    item.selected ? this.removeFromSelection(item) : this.addToSelection(item);
                } else {
                    if (!item.selected) this.setSelected(item);
                    isDragging = true;
                    dragAppliedTranslation = new paper.Point(0, 0);
                    this.uiLayer.visible = false;
                }
                return;
            }

            const hitSelectedBounds = this.selectedItems.some(item => item.strokeBounds.contains(point));
            if (hitSelectedBounds && !event.modifiers.shift) {
                isDragging = true;
                dragAppliedTranslation = new paper.Point(0, 0);
                this.canvas.style.cursor = 'move';
                this.uiLayer.visible = false;
                return;
            }

            if (!event.modifiers.shift) this.setSelected(null);
            startPoint = point;
        };

        tool.onMouseDrag = (event) => {
            if (isRotating) {
                const center = transformRef.center;
                const currentAngle = event.point.subtract(center).angle;
                let rawDelta = currentAngle - transformRef.startAngle;
                let desiredTotal = rawDelta;
                if (event.modifiers.shift) {
                    const snapAngle = 15;
                    desiredTotal = Math.round(rawDelta / snapAngle) * snapAngle;
                }
                const incrementalDelta = desiredTotal - transformRef.totalApplied;
                if (incrementalDelta !== 0) {
                    this.selectedItems.forEach(item => item.rotate(incrementalDelta, center));
                    transformRef.totalApplied = desiredTotal;
                    this.updateTransformUI();
                }
            } else if (isScaling) {
                const pivot = transformRef.pivot;
                const startVec = transformRef.startPoint.subtract(pivot);
                const currentVec = event.point.subtract(pivot);
                if (Math.abs(startVec.x) < 0.001 || Math.abs(startVec.y) < 0.001) return;
                let desiredScaleX = currentVec.x / startVec.x;
                let desiredScaleY = currentVec.y / startVec.y;
                if (event.modifiers.shift) {
                    const uniformScale = Math.max(Math.abs(desiredScaleX), Math.abs(desiredScaleY));
                    desiredScaleX = (desiredScaleX < 0 ? -1 : 1) * uniformScale;
                    desiredScaleY = (desiredScaleY < 0 ? -1 : 1) * uniformScale;
                }
                if (Math.abs(desiredScaleX) < 0.01) desiredScaleX = desiredScaleX < 0 ? -0.01 : 0.01;
                if (Math.abs(desiredScaleY) < 0.01) desiredScaleY = desiredScaleY < 0 ? -0.01 : 0.01;
                const incrementalScaleX = desiredScaleX / transformRef.totalScaleX;
                const incrementalScaleY = desiredScaleY / transformRef.totalScaleY;
                if (incrementalScaleX !== 1 || incrementalScaleY !== 1) {
                    this.selectedItems.forEach(item => item.scale(incrementalScaleX, incrementalScaleY, pivot));
                    transformRef.totalScaleX = desiredScaleX;
                    transformRef.totalScaleY = desiredScaleY;
                    this.updateTransformUI();
                }
            } else if (isDragging) {
                if (event.modifiers.alt && !hasDuplicatedOnDrag && this.selectedItems.length > 0) {
                    const clones = this.selectedItems.map(item => {
                        const clone = item.clone();
                        clone.data.uid = this._generateUID(); // Ensure clone gets its own UID
                        return clone;
                    });
                    this.setSelected(clones);
                    hasDuplicatedOnDrag = true;
                }

                let desiredTranslation = event.point.subtract(event.downPoint);
                
                // Axis constraint when Shift is held
                if (event.modifiers.shift) {
                    if (Math.abs(desiredTranslation.x) > Math.abs(desiredTranslation.y)) {
                        desiredTranslation.y = 0;
                    } else {
                        desiredTranslation.x = 0;
                    }
                }
                
                let deltaToApply = desiredTranslation.subtract(dragAppliedTranslation);
                this.selectedItems.forEach(item => item.position = item.position.add(deltaToApply));
                dragAppliedTranslation = desiredTranslation;
            } else if (startPoint) {
                if (selectionRect) selectionRect.remove();
                selectionRect = new paper.Path.Rectangle(startPoint, event.point);
                selectionRect.strokeColor = '#3b82f6';
                selectionRect.fillColor = new paper.Color(59, 130, 246, 0.1);
                selectionRect.dashArray = [4, 4];
            }
        };

        tool.onMouseUp = (event) => {
            if (isDragging || isRotating || isScaling) this.saveHistory();
            if (selectionRect) {
                const items = this.drawLayer.children;
                const newSelection = [];
                for (const item of items) {
                    if (item === selectionRect) continue;
                    if (selectionRect.intersects(item) || selectionRect.contains(item.bounds.center)) newSelection.push(item);
                }
                event.modifiers.shift ? newSelection.forEach(item => this.addToSelection(item)) : this.setSelected(newSelection);
                selectionRect.remove();
                selectionRect = null;
            }
            isDragging = isRotating = isScaling = hasDuplicatedOnDrag = false;
            startPoint = null;
            this.uiLayer.visible = true;
            this.updateTransformUI();
            this.canvas.style.cursor = 'default';
        };
    }

    initEyedropperTool() {
        this.tools.eyedropper = new paper.Tool();
        const tool = this.tools.eyedropper;

        tool.onMouseDown = (event) => {
            if (event.event.button !== 0) return;
            
            const hitResult = this.drawLayer.hitTest(event.point, {
                fill: true,
                stroke: true,
                tolerance: 5
            });

            if (hitResult && hitResult.item) {
                const target = hitResult.item;
                
                // Apply styles to selected items directly to bypass "helpful" logic in applyStyle
                if (this.selectedItems.length > 0) {
                    this.selectedItems.forEach(item => {
                        // Copy main style properties with fidelity
                        item.fillColor = target.fillColor;
                        item.strokeColor = target.strokeColor;
                        item.strokeWidth = target.strokeWidth;
                        
                        // Copy dash array if present
                        if (target.dashArray) {
                            item.dashArray = [...target.dashArray];
                        } else {
                            item.dashArray = [];
                        }
                    });
                    
                    this.saveHistory();
                    this.updateTransformUI();
                    this.updateUI();
                }
            }
        };
    }

    setTool(name) {
        if (this.tools[name]) {
            this.currentToolName = name;
            this.tools[name].activate();
            
            // UI Feedback
            if (name === 'eyedropper') {
                this.canvas.style.cursor = 'crosshair';
            } else {
                this.canvas.style.cursor = 'default';
            }
        }
    }

    getOppositeCorner(type) {
        const map = { 'scale-topLeft': 'bottomRight', 'scale-topRight': 'bottomLeft', 'scale-bottomLeft': 'topRight', 'scale-bottomRight': 'topLeft' };
        return map[type];
    }

    setSelected(items) {
        this.project.deselectAll();
        this.selectedItems = [];
        if (items) {
            const itemsArray = Array.isArray(items) ? items : [items];
            itemsArray.forEach(item => {
                item.selected = true;
                this.selectedItems.push(item);
            });
        }
        this.updateTransformUI();
        this.updateUI();
    }

    addToSelection(item) {
        if (!item.selected) {
            item.selected = true;
            this.selectedItems.push(item);
            this.updateTransformUI();
            this.updateUI();
        }
    }

    removeFromSelection(item) {
        item.selected = false;
        this.selectedItems = this.selectedItems.filter(i => i !== item);
        this.updateTransformUI();
        this.updateUI();
    }

    getSelectionBounds() {
        if (this.selectedItems.length === 0) return null;
        let bounds = this.selectedItems[0].strokeBounds;
        for (let i = 1; i < this.selectedItems.length; i++) {
            bounds = bounds.unite(this.selectedItems[i].strokeBounds);
        }
        return bounds;
    }

    updateTransformUI() {
        if (!this.uiLayer) return;
        this.uiLayer.clear();
        const bounds = this.getSelectionBounds();
        if (!bounds || this.selectedItems.length === 0) {
            this.drawLayer.activate();
            return;
        }
        this.uiLayer.activate();
        const rect = new paper.Path.Rectangle(bounds);
        rect.strokeColor = '#3b82f6';
        rect.strokeWidth = 1;
        rect.dashArray = [4, 2];
        rect.data.isTool = true;

        const corners = { topLeft: bounds.topLeft, topRight: bounds.topRight, bottomLeft: bounds.bottomLeft, bottomRight: bounds.bottomRight };
        for (const [key, pos] of Object.entries(corners)) {
            const handle = new paper.Path.Circle(pos, 5);
            handle.fillColor = 'white';
            handle.strokeColor = '#3b82f6';
            handle.data = { type: 'scale-' + key, isTool: true };
        }

        const rotateHandlePos = bounds.topCenter.subtract(new paper.Point(0, 30));
        const line = new paper.Path.Line(bounds.topCenter, rotateHandlePos);
        line.strokeColor = '#3b82f6';
        line.data.isTool = true;
        const rotateHandle = new paper.Path.Circle(rotateHandlePos, 6);
        rotateHandle.fillColor = '#3b82f6';
        rotateHandle.data = { type: 'rotate', isTool: true };
        this.drawLayer.activate();
    }

    updateUI() {
        this.view.update();
        window.dispatchEvent(new CustomEvent('selectionChanged', { detail: { items: this.selectedItems } }));
    }

    deleteSelectedItem() {
        if (this.selectedItems.length > 0) {
            this.selectedItems.forEach(item => item.remove());
            this.setSelected(null);
            this.saveHistory();
        }
    }

    duplicateSelectedItems() {
        if (this.selectedItems.length === 0) return;
        const clones = this.selectedItems.map(item => {
            const clone = item.clone();
            clone.data.uid = this._generateUID();
            clone.position = clone.position.add(new paper.Point(20, 20));
            return clone;
        });
        this.setSelected(clones);
        this.saveHistory();
    }

    groupSelectedItems() {
        if (this.selectedItems.length < 2) return;
        const group = new paper.Group(this.selectedItems);
        group.data.uid = this._generateUID();
        this.setSelected(group);
        this.saveHistory();
    }

    bringToFrontSelected() {
        if (this.selectedItems.length === 0) return;
        const sorted = [...this.selectedItems].sort((a, b) => b.index - a.index);
        sorted.forEach(item => {
            const next = item.nextSibling;
            if (next) item.insertAbove(next);
        });
        this.updateTransformUI();
        this.saveHistory();
    }

    sendToBackSelected() {
        if (this.selectedItems.length === 0) return;
        const sorted = [...this.selectedItems].sort((a, b) => a.index - b.index);
        sorted.forEach(item => {
            const prev = item.previousSibling;
            if (prev) item.insertBelow(prev);
        });
        this.updateTransformUI();
        this.saveHistory();
    }

    ungroupSelectedItems() {
        const groups = this.selectedItems.filter(item => item instanceof paper.Group);
        if (groups.length === 0) return;
        const newSelection = [];
        for (const group of groups) {
            Array.from(group.children).forEach(child => {
                if (child.clipMask) child.remove();
                else {
                    this.drawLayer.addChild(child);
                    newSelection.push(child);
                }
            });
            group.remove();
        }
        this.setSelected(newSelection);
        this.saveHistory();
    }

    applyStyle(property, value, shouldSaveHistory = true) {
        if (this.selectedItems.length === 0) return;

        const setRecursive = (item, prop, val) => {
            if (item.children && item.className === 'Group') {
                item.children.forEach(child => setRecursive(child, prop, val));
            } else {
                if (prop === 'fillColor') {
                    item.fillColor = (val === 'none') ? null : val;
                } else if (prop === 'strokeColor') {
                    item.strokeColor = (val === 'none') ? null : val;
                    if (val && val !== 'none' && (item.strokeWidth === 0 || !item.strokeWidth)) {
                        item.strokeWidth = 1;
                    }
                } else if (prop === 'strokeWidth') {
                    const width = parseFloat(val);
                    item.strokeWidth = width;
                    // Only add black if the item already had some sort of stroke property OR if it's a basic path
                    if (width > 0 && !item.strokeColor) {
                        // Check if parent is a group, if so, be more careful
                        if (item.parent && item.parent.className !== 'Group') {
                            item.strokeColor = '#000000';
                        }
                    }
                } else if (prop === 'fillOpacity') {
                    if (item.fillColor) item.fillColor.alpha = parseFloat(val);
                } else if (prop === 'strokeOpacity') {
                    if (item.strokeColor) item.strokeColor.alpha = parseFloat(val);
                }
            }
        };

        this.selectedItems.forEach(item => setRecursive(item, property, value));
        
        if (shouldSaveHistory) {
            this.saveHistory();
        } else {
            localStorage.setItem('svg-editor-work', this._getSnapshot());
        }
        
        this.view.update();
        this.updateTransformUI(); 
    }

    getSelectionStyle() {
        if (this.selectedItems.length === 0) return null;
        
        // Greedily find the best representative item
        const getRepresentative = (items) => {
            for (const item of items) {
                if (item.className === 'Group' && item.children) {
                    const found = getRepresentative(item.children);
                    if (found) return found;
                } else {
                    // Return the first path-like item that has either fill or stroke
                    if (item.fillColor || (item.strokeColor && item.strokeWidth > 0)) {
                        return item;
                    }
                }
            }
            // Fallback to the very first item if nothing "rich" is found
            return items[0];
        };

        const rep = getRepresentative(this.selectedItems);
        if (!rep) return null;

        const colorToHex = (col) => {
            if (!col) return 'none';
            try {
                return col.toCSS ? col.toCSS(true) : 'none';
            } catch (e) { return 'none'; }
        };

        return {
            fillColor: colorToHex(rep.fillColor),
            fillOpacity: (rep.fillColor && rep.fillColor.alpha !== undefined) ? rep.fillColor.alpha * 100 : 100,
            strokeColor: colorToHex(rep.strokeColor),
            strokeOpacity: (rep.strokeColor && rep.strokeColor.alpha !== undefined) ? rep.strokeColor.alpha * 100 : 100,
            strokeWidth: rep.strokeColor ? (rep.strokeWidth || 0) : 0
        };
    }

    exportSVG(fileName = 'canvas-export.svg') {
        this._downloadSVG(this.getSVGString(), fileName);
    }

    downloadSelectedSVG(fileName = 'selection-export.svg') {
        if (this.selectedItems.length === 0) return;
        this._downloadSVG(this.getSelectedSVGString(), fileName);
    }

    _downloadSVG(svgContent, fileName) {
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    _createCleanRoot(width, height) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const w = Math.round(width), h = Math.round(height);
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.setAttribute('width', w); svg.setAttribute('height', h);
        return svg;
    }

    _sanitizeElement(el) {
        if (!el || el.nodeType !== 1) return el;
        el.removeAttribute('clip-path');
        el.removeAttribute('data-paper-data');
        if (el.id && (el.id.startsWith('clip-') || el.id.startsWith('paper-'))) el.removeAttribute('id');
        const defaults = { 
            'fill-rule': 'nonzero', 
            'stroke-linecap': 'butt', 
            'stroke-linejoin': 'miter', 
            'stroke-miterlimit': '10', 
            'font-family': 'none', 
            'font-weight': 'none', 
            'font-size': 'none', 
            'text-anchor': 'none', 
            'mix-blend-mode': 'normal', 
            'fill': 'none', 
            'stroke': 'none',
            'stroke-width': '1',
            'stroke-dasharray': '',
            'stroke-dashoffset': '0'
        };
        for (const [attr, defaultValue] of Object.entries(defaults)) {
            if (el.getAttribute(attr) === defaultValue) el.removeAttribute(attr);
        }

        // If no stroke is present, remove all stroke-related attributes
        if (!el.getAttribute('stroke')) {
            el.removeAttribute('stroke-width');
            el.removeAttribute('stroke-linecap');
            el.removeAttribute('stroke-linejoin');
            el.removeAttribute('stroke-miterlimit');
            el.removeAttribute('stroke-dasharray');
            el.removeAttribute('stroke-dashoffset');
        }

        if (el.getAttribute('style') === 'mix-blend-mode: normal') el.removeAttribute('style');
        Array.from(el.childNodes).forEach(child => {
            if (child.nodeType === 1) {
                const tag = child.tagName.toLowerCase();
                if (tag === 'defs' || tag === 'clippath') el.removeChild(child);
                else this._sanitizeElement(child);
            }
        });
        return el;
    }

    _flattenRedundantContainers(parent) {
        if (!parent || parent.nodeType !== 1) return;
        Array.from(parent.childNodes).forEach(child => {
            if (child.nodeType !== 1) return;
            this._flattenRedundantContainers(child);
            const tag = child.tagName.toLowerCase();
            if (tag === 'g' || tag === 'svg') {
                const significantAttrs = ['fill', 'stroke', 'stroke-width', 'opacity', 'transform', 'filter', 'mask'];
                const hasSignificant = Array.from(child.attributes).some(attr => {
                    const name = attr.name.toLowerCase();
                    if (!significantAttrs.includes(name)) return false;
                    const val = attr.value;
                    if (name === 'stroke-width' && (val === '1' || val === '0')) return false;
                    if (name === 'stroke-dasharray' && val === '') return false;
                    if (name === 'stroke-dashoffset' && val === '0') return false;
                    if (name === 'opacity' && val === '1') return false;
                    return true;
                });
                
                if (!hasSignificant) {
                    while (child.firstChild) parent.insertBefore(child.firstChild, child);
                    parent.removeChild(child);
                }
            }
        });
    }

    getSVGString() {
        const bounds = this.artboardBounds;
        const rootSvg = this._createCleanRoot(bounds.width, bounds.height);
        
        // Filter out tool/UI items and clone valid items for temporary translation
        const clones = this.drawLayer.children
            .filter(item => !(item.data && item.data.isTool))
            .map(item => item.clone({ insert: false }));
            
        if (clones.length === 0) return rootSvg.outerHTML;

        // Group clones to translate them to artboard local space (0,0)
        const tempGroup = new paper.Group(clones);
        tempGroup.translate(bounds.topLeft.multiply(-1));
        
        tempGroup.children.forEach(item => {
            rootSvg.appendChild(this._sanitizeElement(item.exportSVG()));
        });
        
        tempGroup.remove();
        this._flattenRedundantContainers(rootSvg);
        return rootSvg.outerHTML;
    }

    getSelectedSVGString() {
        if (this.selectedItems.length === 0) return '';
        const sortedItems = [...this.selectedItems].sort((a, b) => a.index - b.index);
        const clones = sortedItems.map(item => item.clone({ insert: false }));
        const tempGroup = new paper.Group(clones);
        const bounds = tempGroup.strokeBounds;
        tempGroup.translate(new paper.Point(-bounds.x, -bounds.y));
        const rootSvg = this._createCleanRoot(bounds.width, bounds.height);
        const exportedGroup = tempGroup.exportSVG();
        rootSvg.appendChild(this._sanitizeElement(exportedGroup));
        this._flattenRedundantContainers(rootSvg);
        const result = rootSvg.outerHTML;
        tempGroup.remove();
        return result;
    }

    importSVG(data) {
        return new Promise((resolve, reject) => {
            if (!data) return reject(new Error('No data provided'));
            let svgString = data;
            try {
                if (typeof data === 'string') {
                    const trimmedData = data.trim();
                    svgString = (!trimmedData.toLowerCase().startsWith('<svg') && !trimmedData.toLowerCase().startsWith('<?xml')) ? `<svg xmlns="http://www.w3.org/2000/svg">${trimmedData}</svg>` : trimmedData;
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(svgString, 'image/svg+xml');
                    if (!doc.querySelector('parsererror')) {
                        doc.querySelectorAll('rect').forEach(rect => {
                            const rx = rect.getAttribute('rx'), ry = rect.getAttribute('ry');
                            if (rx && !ry) rect.setAttribute('ry', rx); else if (ry && !rx) rect.setAttribute('rx', ry);
                        });
                        svgString = new XMLSerializer().serializeToString(doc);
                    }
                }
            } catch (e) { svgString = data; }
            this.project.importSVG(svgString, {
                expandShapes: true, insert: false,
                onLoad: (item) => {
                    if (!item) return reject(new Error('Import failed'));
                    
                    // Recursive function to remove all clip masks
                    const stripClips = (el) => {
                        if (el.clipMask) {
                            el.remove();
                            return;
                        }
                        if (el.children) {
                            // Copy children array to avoid modification issues while iterating
                            [...el.children].forEach(stripClips);
                        }
                    };
                    stripClips(item);

                    const flattenOpacity = (el) => {
                        if (el.opacity !== 1) {
                            const op = el.opacity;
                            if (el.fillColor) el.fillColor.alpha *= op;
                            if (el.strokeColor) el.strokeColor.alpha *= op;
                            el.opacity = 1;
                        }
                        if (el.children) el.children.forEach(flattenOpacity);
                    };
                    flattenOpacity(item);

                    // Paper.js wraps the imported SVG in a Group. We want to unwrap it if it's just a wrapper.
                    let itemsToAdd = [item];
                    if (item instanceof paper.Group) {
                        itemsToAdd = [...item.children];
                    }

                    if (itemsToAdd.length === 0) {
                        resolve(null);
                        return;
                    }

                    const addedItems = [];
                    itemsToAdd.forEach(child => {
                        this.drawLayer.addChild(child);
                        addedItems.push(child);
                    });
                    
                    // Center the imported items on the CURRENT artboard
                    const tempGroup = new paper.Group(addedItems);
                    tempGroup.position = this.artboardBounds.center;
                    
                    // Unwrap temp group
                    const finalItems = [...tempGroup.children];
                    this.drawLayer.addChildren(finalItems);
                    tempGroup.remove();

                    this.setSelected(finalItems);
                    this.saveHistory();
                    resolve(finalItems.length === 1 ? finalItems[0] : finalItems);
                },
                onError: (error) => reject(error)
            });
        });
    }
}
