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
        this.selectedItem = null;

        // Initialize Tool for Selection and Dragging
        this.initTools();

        // Auto-resize handling
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        console.log('Editor initialized');
    }

    resize() {
        const container = this.canvas.parentElement;
        if (container) {
            // Get the size of the parent container minus padding
            const style = window.getComputedStyle(container);
            const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
            const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
            
            const width = container.clientWidth - paddingX;
            const height = container.clientHeight - paddingY;
            
            // Set canvas size
            this.canvas.width = width;
            this.canvas.height = height;
            
            // Sync Paper.js view
            this.view.viewSize = new paper.Size(width, height);
            this.view.update();
        }
    }

    initTools() {
        this.tool = new paper.Tool();
        let dragItem = null;
        let selectionRect = null;
        let startPoint = null;

        this.tool.onMouseDown = (event) => {
            // Using Paper.js native event.point which should be correct now
            const point = event.point;
            
            // Check if we are clicking inside the bounds of the already selected item
            if (this.selectedItem && this.selectedItem.bounds.contains(point)) {
                dragItem = this.selectedItem;
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
                this.setSelected(item);
                dragItem = item;
                this.canvas.style.cursor = 'move';
            } else {
                this.setSelected(null);
                dragItem = null;
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

            if (dragItem) {
                this.canvas.style.cursor = 'move';
            } else if (hitResult || (this.selectedItem && this.selectedItem.bounds.contains(point))) {
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'default';
            }
        };

        this.tool.onMouseDrag = (event) => {
            const point = event.point;
            
            if (dragItem) {
                dragItem.position = dragItem.position.add(event.delta);
            } else if (startPoint) {
                if (selectionRect) selectionRect.remove();
                selectionRect = new paper.Path.Rectangle(startPoint, point);
                selectionRect.strokeColor = '#3b82f6';
                selectionRect.fillColor = new paper.Color(59, 130, 246, 0.1);
                selectionRect.dashArray = [4, 4];
            }
        };

        this.tool.onMouseUp = () => {
            if (selectionRect) {
                const items = this.project.activeLayer.children;
                for (const item of items) {
                    if (selectionRect.intersects(item) || selectionRect.contains(item.bounds.center)) {
                        this.setSelected(item);
                        break;
                    }
                }
                selectionRect.remove();
                selectionRect = null;
            }
            dragItem = null;
            startPoint = null;
            this.canvas.style.cursor = 'default';
        };
    }

    importSVG(data) {
        return new Promise((resolve, reject) => {
            this.project.importSVG(data, {
                expandShapes: true,
                insert: true,
                onLoad: (item) => {
                    this.project.activeLayer.addChild(item);
                    item.position = this.view.center;
                    
                    // Force initial selection for feedback
                    this.setSelected(item);
                    
                    this.view.update();
                    resolve(item);
                },
                onError: (error) => reject(error)
            });
        });
    }

    setSelected(item) {
        // Clear previous selection
        this.project.deselectAll();

        this.selectedItem = item;

        if (this.selectedItem) {
            this.selectedItem.selected = true;
            // Use fullySelected for better visual dots on paths
            this.selectedItem.fullySelected = true;
        }

        this.view.update();

        // Dispatch event for UI
        const event = new CustomEvent('selectionChanged', { detail: { item: this.selectedItem } });
        window.dispatchEvent(event);
    }

    deleteSelectedItem() {
        if (this.selectedItem) {
            this.selectedItem.remove();
            this.setSelected(null);
            this.view.update();
        }
    }

    exportSVG() {
        const svg = this.project.exportSVG({ asString: true });
        this._downloadSVG(svg, 'canvas-export.svg');
    }

    downloadSelectedSVG() {
        if (!this.selectedItem) return;
        const svg = this.getSelectedSVGString();
        this._downloadSVG(svg, 'selection-export.svg');
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

    getSVGString() {
        return this.project.exportSVG({ asString: true });
    }

    getSelectedSVGString() {
        if (!this.selectedItem) return '';
        
        // 1. Clone the item to avoid modifying the original in the project
        const clone = this.selectedItem.clone({ insert: false });
        
        // 2. Use strokeBounds to ensure we capture the entire visual area including strokes
        const bounds = this.selectedItem.strokeBounds;
        
        // 3. Translate the clone to the origin (0,0)
        // We subtract the top-left coordinates of the stroke bounds
        clone.translate(new paper.Point(-bounds.x, -bounds.y));
        
        // 4. Export the normalized item to a DOM element
        const exportedElement = clone.exportSVG();
        
        // 5. Create a clean root <svg> element
        const rootSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        rootSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        rootSvg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
        rootSvg.setAttribute('width', bounds.width);
        rootSvg.setAttribute('height', bounds.height);

        // 6. Handle potential nested <svg> tags from Paper.js export
        if (exportedElement.tagName.toLowerCase() === 'svg') {
            // Extract children from the inner <svg> to flatten the structure
            while (exportedElement.firstChild) {
                rootSvg.appendChild(exportedElement.firstChild);
            }
        } else {
            rootSvg.appendChild(exportedElement);
        }
        
        const result = rootSvg.outerHTML;
        
        // 7. Cleanup the temporary clone
        clone.remove();
        
        return result;
    }
}
