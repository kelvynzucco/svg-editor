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
        this.maxHistory = 10;
        this.isRestoring = false;

        // UI Layer for Transform Handles
        this.uiLayer = new paper.Layer();
        this.uiLayer.name = 'ui-layer';
        this.uiLayer.data.isTool = true; // Mark layer as tool

        // Create/Ensure a drawing layer
        if (this.project.layers.length < 2) {
            const drawLayer = new paper.Layer();
            drawLayer.name = 'draw-layer';
            drawLayer.activate();
        } else {
            this.project.layers[0].activate();
        }

        this.initTools();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.loadFromLocalStorage();
        this.saveHistory();
    }

    get drawLayer() {
        return this.project.layers.find(l => l.name === 'draw-layer') || this.project.layers[0];
    }

    _getCleanJSON() {
        let json;
        if (this.uiLayer) {
            this.uiLayer.remove();
            json = this.project.exportJSON();
            this.project.addLayer(this.uiLayer);
            this.drawLayer.activate();
        } else {
            json = this.project.exportJSON();
        }
        return json;
    }

    saveToLocalStorage() {
        if (this.isRestoring) return;
        localStorage.setItem('svg-editor-work', this._getCleanJSON());
    }

    _sanitizeLayers() {
        // 1. Destroy any ghost UI layers from old saves
        const ghostLayers = this.project.layers.filter(l => l.name === 'ui-layer' || (l.data && l.data.isTool));
        ghostLayers.forEach(l => l.remove());

        // 2. Identify or create draw layer
        let drawLayer = this.project.layers.find(l => l.name === 'draw-layer');
        if (!drawLayer) {
            drawLayer = new paper.Layer({ name: 'draw-layer' });
            // Move everything from other old layers to drawLayer
            this.project.layers.forEach(layer => {
                if (layer !== drawLayer) {
                    drawLayer.addChildren(Array.from(layer.children));
                    layer.remove();
                }
            });
        }

        // 3. Create fresh UI layer
        this.uiLayer = new paper.Layer({ name: 'ui-layer' });
        this.uiLayer.data.isTool = true;
        
        drawLayer.activate();
    }

    loadFromLocalStorage() {
        const savedWork = localStorage.getItem('svg-editor-work');
        if (savedWork) {
            try {
                this.isRestoring = true;
                this.project.clear();
                this.project.importJSON(savedWork);
                this._sanitizeLayers();
                this.isRestoring = false;
            } catch (err) {
                console.error('Failed to load saved work:', err);
                this.isRestoring = false;
            }
        }
    }

    clearCanvas() {
        this.drawLayer.clear();
        localStorage.removeItem('svg-editor-work');
        this.history = [];
        this.setSelected(null);
        this.saveHistory();
    }

    saveHistory() {
        if (this.isRestoring) return;
        
        const jsonState = this._getCleanJSON();
        if (this.history.length > 0 && this.history[this.history.length - 1] === jsonState) return;
        
        this.history.push(jsonState);
        this.saveToLocalStorage();
        if (this.history.length > this.maxHistory) this.history.shift();
    }

    undo() {
        if (this.history.length <= 1) return; 
        this.isRestoring = true;
        
        if (this.tool) this.tool.isDragging = false;
        this.canvas.style.cursor = 'default';
        
        this.history.pop();
        const prevState = this.history[this.history.length - 1];
        
        this.project.clear();
        this.project.importJSON(prevState);
        this._sanitizeLayers();

        this.setSelected(null); // Clear selection after undo to be safe
        this.updateUI();
        this.isRestoring = false;
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

    initTools() {
        this.tool = new paper.Tool();
        let selectionRect = null;
        let startPoint = null;
        let isDragging = false;
        let isRotating = false;
        let isScaling = false;
        let hasDuplicatedOnDrag = false;
        let transformRef = null;
        let handleType = null;

        this.tool.onMouseDown = (event) => {
            if (event.event.button !== 0) return;
            const point = event.point;
            hasDuplicatedOnDrag = false;

            // 1. Hit test UI Layer handles first (Rotation/Scale)
            const uiHit = this.uiLayer.hitTest(point, { tolerance: 10, fill: true, stroke: true });
            if (uiHit && uiHit.item && uiHit.item.data) {
                handleType = uiHit.item.data.type;
                if (handleType === 'rotate') {
                    isRotating = true;
                    const center = this.getSelectionBounds().center;
                    transformRef = { 
                        center: center, 
                        startAngle: point.subtract(center).angle,
                        totalApplied: 0
                    };
                    return;
                } else if (handleType.startsWith('scale-')) {
                    isScaling = true;
                    const bounds = this.getSelectionBounds();
                    transformRef = { 
                        bounds: bounds.clone(), 
                        startPoint: point, 
                        pivot: bounds[this.getOppositeCorner(handleType)],
                        totalScaleX: 1,
                        totalScaleY: 1
                    };
                    return;
                }
            }

            // 2. Hit test drawing layer (find if we clicked ON something)
            const hitResult = this.drawLayer.hitTest(point, { 
                segments: true, stroke: true, fill: true, tolerance: 10, curves: true 
            });

            if (hitResult && hitResult.item) {
                let item = hitResult.item;
                // Traverse up to find the top-most parent in the draw layer (for groups)
                while (item.parent && item.parent !== this.drawLayer) item = item.parent;
                
                if (event.modifiers.shift) {
                    item.selected ? this.removeFromSelection(item) : this.addToSelection(item);
                } else {
                    // If clicking an item that's already in a multi-selection, just drag
                    if (!item.selected) {
                        this.setSelected(item);
                    }
                    isDragging = true;
                    this.canvas.style.cursor = 'move';
                    this.uiLayer.visible = false;
                }
                return;
            }

            // 3. Fallback: Check if clicking inside the BOUNDS of existing selection (for dragging empty areas of a group)
            const hitSelectedBounds = this.selectedItems.some(item => item.strokeBounds.contains(point));
            if (hitSelectedBounds && !event.modifiers.shift) {
                isDragging = true;
                this.canvas.style.cursor = 'move';
                this.uiLayer.visible = false;
                return;
            }

            // 4. Empty space click
            if (!event.modifiers.shift) this.setSelected(null);
            startPoint = point;
        };

        this.tool.onMouseDrag = (event) => {
            if (isRotating) {
                const center = transformRef.center;
                const currentAngle = event.point.subtract(center).angle;
                let rawDelta = currentAngle - transformRef.startAngle;
                
                let desiredTotal = rawDelta;
                
                // --- Snapping Logic (Shift Key) ---
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
                
                // Safety: Prevent division by zero
                if (Math.abs(startVec.x) < 0.001 || Math.abs(startVec.y) < 0.001) return;

                let desiredScaleX = currentVec.x / startVec.x;
                let desiredScaleY = currentVec.y / startVec.y;
                
                // --- Proportional Scaling Logic (Shift Key) ---
                if (event.modifiers.shift) {
                    // Use the axis with the largest change to define the uniform scale
                    const absX = Math.abs(desiredScaleX);
                    const absY = Math.abs(desiredScaleY);
                    const uniformScale = Math.max(absX, absY);
                    
                    // Maintain the sign (flipping support)
                    desiredScaleX = (desiredScaleX < 0 ? -1 : 1) * uniformScale;
                    desiredScaleY = (desiredScaleY < 0 ? -1 : 1) * uniformScale;
                }

                // Safety: Prevent scaling to 0 which breaks the matrix
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
                    const clones = this.selectedItems.map(item => item.clone());
                    this.setSelected(clones);
                    hasDuplicatedOnDrag = true;
                }
                this.selectedItems.forEach(item => item.position = item.position.add(event.delta));
            } else if (startPoint) {
                if (selectionRect) selectionRect.remove();
                selectionRect = new paper.Path.Rectangle(startPoint, event.point);
                selectionRect.strokeColor = '#3b82f6';
                selectionRect.fillColor = new paper.Color(59, 130, 246, 0.1);
                selectionRect.dashArray = [4, 4];
            }
        };

        this.tool.onMouseUp = (event) => {
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
            this.uiLayer.visible = true; // Show handles again
            this.updateTransformUI();
            this.canvas.style.cursor = 'default';
        };
    }

    getOppositeCorner(type) {
        const map = { 
            'scale-topLeft': 'bottomRight', 
            'scale-topRight': 'bottomLeft', 
            'scale-bottomLeft': 'topRight', 
            'scale-bottomRight': 'topLeft' 
        };
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
        // Use strokeBounds to perfectly wrap the visual area (including strokes)
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
        
        // Bounding Box
        const rect = new paper.Path.Rectangle(bounds);
        rect.strokeColor = '#3b82f6';
        rect.strokeWidth = 1;
        rect.dashArray = [4, 2];
        rect.data.isTool = true;

        // Scaling Handles
        const corners = { 
            topLeft: bounds.topLeft, 
            topRight: bounds.topRight, 
            bottomLeft: bounds.bottomLeft, 
            bottomRight: bounds.bottomRight 
        };
        for (const [key, pos] of Object.entries(corners)) {
            const handle = new paper.Path.Circle(pos, 5);
            handle.fillColor = 'white';
            handle.strokeColor = '#3b82f6';
            handle.data = { type: 'scale-' + key, isTool: true };
        }

        // Rotation Handle
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
            clone.position = clone.position.add(new paper.Point(20, 20));
            return clone;
        });
        this.setSelected(clones);
        this.saveHistory();
    }

    groupSelectedItems() {
        if (this.selectedItems.length < 2) return;
        const group = new paper.Group(this.selectedItems);
        this.setSelected(group);
        this.saveHistory();
    }

    bringToFrontSelected() {
        if (this.selectedItems.length === 0) return;
        // Sort by index descending to preserve relative order when moving up
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
        // Sort by index ascending to preserve relative order when moving down
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
        if (el.id && (el.id.startsWith('clip-') || el.id.startsWith('paper-'))) el.removeAttribute('id');
        const defaults = { 'fill-rule': 'nonzero', 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter', 'stroke-miterlimit': '10', 'font-family': 'none', 'font-weight': 'none', 'font-size': 'none', 'text-anchor': 'none', 'mix-blend-mode': 'normal', 'fill': 'none', 'stroke': 'none' };
        for (const [attr, defaultValue] of Object.entries(defaults)) {
            if (el.getAttribute(attr) === defaultValue) el.removeAttribute(attr);
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
                if (!Array.from(child.attributes).some(attr => significantAttrs.includes(attr.name.toLowerCase()))) {
                    while (child.firstChild) parent.insertBefore(child.firstChild, child);
                    parent.removeChild(child);
                }
            }
        });
    }

    getSVGString() {
        const viewSize = this.view.viewSize;
        const rootSvg = this._createCleanRoot(viewSize.width, viewSize.height);
        this.drawLayer.children.forEach(item => {
            if (item.data && item.data.isTool) return;
            rootSvg.appendChild(this._sanitizeElement(item.exportSVG()));
        });
        this._flattenRedundantContainers(rootSvg);
        return rootSvg.outerHTML;
    }

    getSelectedSVGString() {
        if (this.selectedItems.length === 0) return '';
        const clones = this.selectedItems.map(item => item.clone({ insert: false }));
        const tempGroup = new paper.Group(clones);
        const bounds = tempGroup.strokeBounds;
        tempGroup.translate(new paper.Point(-bounds.x, -bounds.y));
        const rootSvg = this._createCleanRoot(bounds.width, bounds.height);
        rootSvg.appendChild(this._sanitizeElement(tempGroup.exportSVG()));
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
                    if (doc.querySelector('parsererror')) console.error('SVG Parsing Error');
                    else {
                        doc.querySelectorAll('rect').forEach(rect => {
                            const rx = rect.getAttribute('rx'), ry = rect.getAttribute('ry');
                            if (rx && !ry) rect.setAttribute('ry', rx); else if (ry && !rx) rect.setAttribute('rx', ry);
                        });
                        svgString = new XMLSerializer().serializeToString(doc);
                    }
                }
            } catch (e) { svgString = data; }
            this.project.importSVG(svgString, {
                expandShapes: true, insert: true,
                onLoad: (item) => {
                    if (!item) return reject(new Error('Import failed'));
                    this.drawLayer.addChild(item);
                    item.position = this.view.center;
                    this.setSelected(item);
                    this.saveHistory();
                    resolve(item);
                },
                onError: (error) => reject(error)
            });
        });
    }
}
