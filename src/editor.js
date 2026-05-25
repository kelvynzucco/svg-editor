import paper from 'paper';

export class SvgEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        
        // Use standard selection handles
        paper.settings.handleSize = 6;
        paper.settings.hitTolerance = 10;
        
        paper.setup(this.canvas);
        this.project = paper.project;
        this.view = paper.view;
        this.selectedItems = [];
        
        // History for Undo
        this.history = [];
        this.maxHistory = 10;
        this.isRestoring = false;

        // Initialize Tool for Selection and Dragging
        this.initTools();

        // Auto-resize handling
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Initial state
        this.loadFromLocalStorage();
        this.saveHistory();
        
        console.log('Editor initialized');
    }

    saveToLocalStorage() {
        if (this.isRestoring) return;
        const jsonState = this.project.exportJSON();
        localStorage.setItem('svg-editor-work', jsonState);
    }

    loadFromLocalStorage() {
        const savedWork = localStorage.getItem('svg-editor-work');
        if (savedWork) {
            try {
                this.isRestoring = true;
                this.project.clear();
                this.project.importJSON(savedWork);
                this.isRestoring = false;
            } catch (err) {
                console.error('Failed to load saved work:', err);
                this.isRestoring = false;
            }
        }
    }

    clearCanvas() {
        this.project.clear();
        localStorage.removeItem('svg-editor-work');
        this.history = [];
        this.setSelected(null);
        this.saveHistory();
    }

    saveHistory() {
        if (this.isRestoring) return;
        
        const jsonState = this.project.exportJSON();
        
        // Only push if different from last state (simple check)
        if (this.history.length > 0 && this.history[this.history.length - 1] === jsonState) {
            return;
        }

        this.history.push(jsonState);
        this.saveToLocalStorage(); // Save to storage on every history change
        
        if (this.history.length > this.maxHistory) {
            this.history.shift(); // Keep only last 10
        }
    }

    undo() {
        if (this.history.length <= 1) return; 

        this.isRestoring = true;
        
        // Kill any active drag state immediately
        this.tool.isDragging = false; 
        this.canvas.style.cursor = 'default';

        // Clear current selection BEFORE restoring
        this.setSelected(null);
        
        this.history.pop();
        const prevState = this.history[this.history.length - 1];
        
        this.project.clear();
        this.project.importJSON(prevState);
        
        // Explicitly ensure nothing is selected after undo to avoid stale reference bugs
        this.project.deselectAll();
        this.selectedItems = [];
        this.updateUI();
        
        this.isRestoring = false;
    }

    // Getter for legacy support or single item logic
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

        this.tool.onMouseDown = (event) => {
            // Only respond to left mouse button (button 0)
            if (event.event.button !== 0) return;

            const point = event.point;
            
            // Check if we are clicking inside the bounds of any selected item to start a drag
            const hitSelected = this.selectedItems.some(item => item.bounds.contains(point));
            
            if (hitSelected && !event.modifiers.shift) {
                isDragging = true;
                this.canvas.style.cursor = 'move';
                return;
            }

            const hitResult = this.project.hitTest(point, {
                segments: true,
                stroke: true,
                fill: true,
                tolerance: 10,
                curves: true
            });

            if (hitResult && hitResult.item) {
                let item = hitResult.item;
                while (item.parent && item.parent !== this.project.activeLayer) {
                    item = item.parent;
                }

                if (event.modifiers.shift) {
                    // Toggle selection
                    if (item.selected) {
                        this.removeFromSelection(item);
                    } else {
                        this.addToSelection(item);
                    }
                } else {
                    // Single selection
                    this.setSelected(item);
                    isDragging = true;
                    this.canvas.style.cursor = 'move';
                }
            } else {
                if (!event.modifiers.shift) {
                    this.setSelected(null);
                }
                startPoint = point;
                this.canvas.style.cursor = 'crosshair';
            }
        };

        this.tool.onMouseMove = (event) => {
            const point = event.point;
            const hitResult = this.project.hitTest(point, {
                tolerance: 8,
                stroke: true,
                fill: true
            });

            if (isDragging) {
                this.canvas.style.cursor = 'move';
            } else if (hitResult || this.selectedItems.some(item => item.bounds.contains(point))) {
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'default';
            }
        };

        this.tool.onMouseDrag = (event) => {
            if (isDragging) {
                for (const item of this.selectedItems) {
                    item.position = item.position.add(event.delta);
                }
            } else if (startPoint) {
                if (selectionRect) selectionRect.remove();
                selectionRect = new paper.Path.Rectangle(startPoint, event.point);
                selectionRect.strokeColor = '#3b82f6';
                selectionRect.fillColor = new paper.Color(59, 130, 246, 0.1);
                selectionRect.dashArray = [4, 4];
            }
        };

        this.tool.onMouseUp = (event) => {
            if (isDragging) {
                this.saveHistory();
            }
            
            if (selectionRect) {
                const items = this.project.activeLayer.children;
                const newSelection = [];
                for (const item of items) {
                    if (item === selectionRect) continue;
                    if (selectionRect.intersects(item) || selectionRect.contains(item.bounds.center)) {
                        newSelection.push(item);
                    }
                }
                
                if (event.modifiers.shift) {
                    newSelection.forEach(item => this.addToSelection(item));
                } else {
                    this.setSelected(newSelection);
                }
                
                selectionRect.remove();
                selectionRect = null;
            }
            
            // CRITICAL: Reset ALL state variables
            isDragging = false;
            startPoint = null;
            this.canvas.style.cursor = 'default';
        };
    }

    importSVG(data) {
        return new Promise((resolve, reject) => {
            if (!data) return reject(new Error('No data provided'));

            let svgString = data;

            try {
                // If it's a string, let's normalize it safely using DOMParser
                if (typeof data === 'string') {
                    const trimmedData = data.trim();
                    
                    // If it doesn't start with <svg, wrap it to make it a valid SVG document
                    if (!trimmedData.toLowerCase().startsWith('<svg') && !trimmedData.toLowerCase().startsWith('<?xml')) {
                        svgString = `<svg xmlns="http://www.w3.org/2000/svg">${trimmedData}</svg>`;
                    } else {
                        svgString = trimmedData;
                    }

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(svgString, 'image/svg+xml');
                    
                    // Check for parsing errors
                    const errorNode = doc.querySelector('parsererror');
                    if (errorNode) {
                        console.error('SVG Parsing Error:', errorNode.textContent);
                        // We still try to import the raw string if parsing fails, 
                        // as Paper.js might be more lenient than DOMParser
                    } else {
                        // Normalize rx/ry for all rectangles
                        const rects = doc.querySelectorAll('rect');
                        rects.forEach(rect => {
                            const rx = rect.getAttribute('rx');
                            const ry = rect.getAttribute('ry');
                            if (rx && !ry) rect.setAttribute('ry', rx);
                            else if (ry && !rx) rect.setAttribute('rx', ry);
                        });
                        svgString = new XMLSerializer().serializeToString(doc);
                    }
                }
            } catch (e) {
                console.warn('Normalization failed, trying raw import:', e);
                svgString = data;
            }

            try {
                this.project.importSVG(svgString, {
                    expandShapes: true, 
                    insert: true,
                    onLoad: (item) => {
                        if (!item) {
                            reject(new Error('Import resulted in no items. Check if the SVG code is valid.'));
                            return;
                        }
                        
                        item.position = this.view.center;
                        this.setSelected(item);
                        this.saveHistory();
                        this.view.update();
                        resolve(item);
                    },
                    onError: (error) => {
                        console.error('Paper.js import error:', error);
                        reject(error);
                    }
                });
            } catch (err) {
                console.error('Paper.js sync error:', err);
                reject(err);
            }
        });
    }

    setSelected(items) {
        this.project.deselectAll();
        this.selectedItems = [];

        if (items) {
            const itemsArray = Array.isArray(items) ? items : [items];
            for (const item of itemsArray) {
                item.selected = true;
                item.fullySelected = true;
                this.selectedItems.push(item);
            }
        }

        this.updateUI();
    }

    addToSelection(item) {
        if (!item.selected) {
            item.selected = true;
            item.fullySelected = true;
            this.selectedItems.push(item);
            this.updateUI();
        }
    }

    removeFromSelection(item) {
        item.selected = false;
        item.fullySelected = false;
        this.selectedItems = this.selectedItems.filter(i => i !== item);
        this.updateUI();
    }

    updateUI() {
        this.view.update();
        const event = new CustomEvent('selectionChanged', { 
            detail: { 
                item: this.selectedItem,
                items: this.selectedItems 
            } 
        });
        window.dispatchEvent(event);
    }

    deleteSelectedItem() {
        if (this.selectedItems.length > 0) {
            for (const item of this.selectedItems) {
                item.remove();
            }
            this.setSelected(null);
            this.saveHistory();
            this.view.update();
        }
    }

    groupSelectedItems() {
        if (this.selectedItems.length < 2) return;

        const group = new paper.Group(this.selectedItems);
        this.setSelected(group);
        this.saveHistory();
    }

    ungroupSelectedItems() {
        const groups = this.selectedItems.filter(item => item instanceof paper.Group);
        if (groups.length === 0) return;

        const newSelection = [];
        for (const group of groups) {
            const children = Array.from(group.children);
            for (const child of children) {
                if (child.clipMask) {
                    // Destroy the clipping mask when breaking the group apart
                    // This prevents the original SVG's viewBox from clipping the entire canvas
                    child.remove();
                } else {
                    // Explicitly move to activeLayer to break out of original SVG structure
                    this.project.activeLayer.addChild(child);
                    newSelection.push(child);
                }
            }
            // Remove the now-empty group container
            group.remove();
        }

        this.setSelected(newSelection);
        this.saveHistory();
    }

    exportSVG(fileName = 'canvas-export.svg') {
        const svg = this.getSVGString();
        this._downloadSVG(svg, fileName);
    }

    downloadSelectedSVG(fileName = 'selection-export.svg') {
        if (this.selectedItems.length === 0) return;
        const svg = this.getSelectedSVGString();
        this._downloadSVG(svg, fileName);
    }

    _downloadSVG(svgContent, fileName) {
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    _createCleanRoot(width, height) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const w = Math.round(width);
        const h = Math.round(height);
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
        return svg;
    }

    _sanitizeElement(el) {
        if (!el || el.nodeType !== 1) return el;

        // 1. Remove clipping and Paper.js attributes
        el.removeAttribute('clip-path');
        if (el.id && (el.id.startsWith('clip-') || el.id.startsWith('paper-'))) {
            el.removeAttribute('id');
        }

        // 2. Strip verbose default attributes
        const defaults = {
            'fill-rule': 'nonzero',
            'stroke-linecap': 'butt',
            'stroke-linejoin': 'miter',
            'stroke-miterlimit': '10',
            'stroke-dasharray': '',
            'stroke-dashoffset': '0',
            'font-family': 'none',
            'font-weight': 'none',
            'font-size': 'none',
            'text-anchor': 'none',
            'mix-blend-mode': 'normal',
            'fill': 'none',
            'stroke': 'none'
        };

        for (const [attr, defaultValue] of Object.entries(defaults)) {
            const val = el.getAttribute(attr);
            if (val === defaultValue || (attr === 'stroke-dasharray' && val === '')) {
                el.removeAttribute(attr);
            }
        }

        if (el.getAttribute('style') === 'mix-blend-mode: normal') {
            el.removeAttribute('style');
        }

        // 3. Process children recursively
        const children = Array.from(el.childNodes);
        for (const child of children) {
            if (child.nodeType === 1) {
                const tag = child.tagName.toLowerCase();
                if (tag === 'defs' || tag === 'clippath') {
                    el.removeChild(child);
                } else {
                    this._sanitizeElement(child);
                }
            }
        }

        return el;
    }

    _flattenRedundantContainers(parent) {
        if (!parent || parent.nodeType !== 1) return;

        const children = Array.from(parent.childNodes);
        for (const child of children) {
            if (child.nodeType !== 1) continue;

            // First, recurse to handle deeper levels
            this._flattenRedundantContainers(child);

            const tag = child.tagName.toLowerCase();
            if (tag === 'g' || tag === 'svg') {
                const significantAttrs = ['fill', 'stroke', 'stroke-width', 'opacity', 'transform', 'filter', 'mask'];
                const hasSignificantAttr = Array.from(child.attributes).some(attr => 
                    significantAttrs.includes(attr.name.toLowerCase())
                );

                // If it's just a generic container, move its children up and remove it
                if (!hasSignificantAttr) {
                    while (child.firstChild) {
                        parent.insertBefore(child.firstChild, child);
                    }
                    parent.removeChild(child);
                }
            }
        }
    }

    getSVGString() {
        const viewSize = this.view.viewSize;
        const rootSvg = this._createCleanRoot(viewSize.width, viewSize.height);

        this.project.activeLayer.children.forEach(item => {
            if (item.data && item.data.isTool) return;
            const el = item.exportSVG();
            rootSvg.appendChild(this._sanitizeElement(el));
        });

        // Run flattening on the whole structure
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

        // Export the group to preserve the translation matrix applied above
        const exportedGroup = tempGroup.exportSVG();
        rootSvg.appendChild(this._sanitizeElement(exportedGroup));
        
        // Run flattening on the whole structure
        this._flattenRedundantContainers(rootSvg);

        const result = rootSvg.outerHTML;
        tempGroup.remove();
        
        return result;
    }
}
