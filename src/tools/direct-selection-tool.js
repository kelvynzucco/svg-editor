import paper from 'paper';

export class DirectSelectionTool {
    constructor(editor) {
        this.editor = editor;
        this.tool = new paper.Tool();
        this.dragTargets = [];
        this.selectionRect = null;
        this.startPoint = null;
        this.isDragging = false;
        this.dragAppliedTranslation = new paper.Point(0, 0);
        this.init();
    }

    init() {
        this.tool.onMouseDown = (event) => {
            if (event.event.button !== 0) return;
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                document.activeElement.blur();
            }

            const point = event.point;
            this.isDragging = false;
            this.activeComponent = null; 
            this.dragAppliedTranslation = new paper.Point(0, 0);
            window.dispatchEvent(new CustomEvent('appMouseDown'));

            // 1. Check for UI Widgets (Live Corners) - HIGH PRIORITY
            if (this.editor.showCornerWidgets) {
                const zoomScale = 1 / this.editor.view.zoom;
                const uiHit = this.editor.uiLayer.hitTest(point, { tolerance: 15 * zoomScale, fill: true, stroke: true });
                if (uiHit && uiHit.item && uiHit.item.data && uiHit.item.data.type === 'corner-widget') {
                    const seg = uiHit.item.data.segment;
                    
                    // Store initial reference for the drag session
                    this.activeComponent = { 
                        type: 'corner-widget', 
                        activeSegment: seg,
                        pivotPoint: seg.data.originalPoint ? new paper.Point(seg.data.originalPoint) : seg.point.clone(),
                        originalPathData: this.editor.project.selectedItems.map(item => ({
                            item: item,
                            json: item.exportJSON()
                        }))
                    };
                    return;
                }
            }

            // 2. Regular Hit Test
            const hitResult = this.editor.project.hitTest(point, {
                segments: true, handles: true, stroke: true, fill: true, curves: true, tolerance: 8
            });

            if (hitResult) {
                if (this.editor.showCornerWidgets) this.editor.deactivateCornerRounding();
                const item = hitResult.item;
                const type = hitResult.type;
                
                if (type === 'segment' || type === 'handle-in' || type === 'handle-out') {
                    const target = type === 'segment' ? hitResult.segment : 
                                   (type === 'handle-in' ? hitResult.segment.handleIn : hitResult.segment.handleOut);
                    this.activeComponent = { type, target, segment: hitResult.segment };

                    if (event.modifiers.shift) {
                        hitResult.segment.selected = !hitResult.segment.selected;
                        item.selected = true;
                    } else if (!target.selected) {
                        this.editor.project.deselectAll();
                        item.selected = true;
                        target.selected = true;
                    }
                } else {
                    if (event.modifiers.shift) item.selected = !item.selected;
                    else if (!item.selected) { this.editor.project.deselectAll(); item.selected = true; }
                }
                this._refreshDragTargets();
            } else {
                if (this.editor.showCornerWidgets) this.editor.deactivateCornerRounding();
                if (!event.modifiers.shift) this.editor.project.deselectAll();
                this.startPoint = point;
            }

            this.editor.selectedItems = this.editor.project.selectedItems.filter(i => !(i.data && i.data.isTool));
            this.editor.updateUI();
            this.editor.updateTransformUI();
        };

        this.tool.onMouseDrag = (event) => {
            if (this.activeComponent && this.activeComponent.type === 'corner-widget') {
                this.isDragging = true;
                const { activeSegment, pivotPoint, originalPathData } = this.activeComponent;
                
                // Calculate shared radius
                const dist = event.point.subtract(pivotPoint).length;
                const radius = Math.max(0, dist - 15); // Offset to feel better

                // Restore items to their pre-drag state and apply rounding
                originalPathData.forEach(data => {
                    const oldItem = data.item;
                    const newItem = paper.Base.importJSON(data.json);
                    oldItem.replaceWith(newItem);
                    data.item = newItem; // Update reference for next frame

                    // NEW: Ensure any previously rounded parts in the selection are sharpened before re-rounding
                    this.editor.sharpenSelectedSegments(newItem);

                    // Get indices of selected segments from the restored (sharp) state
                    const indices = newItem.segments.map((s, i) => s.selected ? i : -1).filter(i => i !== -1);
                    indices.sort((a,b) => b - a).forEach(idx => {
                        this.editor._applyRoundingToSegment(newItem, idx, radius);
                    });
                });
                
                this.editor.view.update();
                this.editor.updateTransformUI();
                return;
            }

            if (this.startPoint) {
                this.isDragging = true;
                if (this.selectionRect) this.selectionRect.remove();
                this.editor.uiLayer.activate();
                this.selectionRect = new paper.Path.Rectangle(this.startPoint, event.point);
                this.selectionRect.strokeColor = '#3b82f6';
                this.selectionRect.fillColor = new paper.Color(59, 130, 246, 0.1);
                this.selectionRect.dashArray = [4, 2];
                this.editor.drawLayer.activate();
                return;
            }

            if (this.dragTargets.length > 0) {
                this.isDragging = true;
                
                let desiredTranslation = event.point.subtract(event.downPoint);
                if (event.modifiers.shift) {
                    if (Math.abs(desiredTranslation.x) > Math.abs(desiredTranslation.y)) desiredTranslation.y = 0;
                    else desiredTranslation.x = 0;
                }
                
                const deltaToApply = desiredTranslation.subtract(this.dragAppliedTranslation);
                this.dragTargets.forEach(t => { 
                    t.x += deltaToApply.x; 
                    t.y += deltaToApply.y; 
                });
                this.dragAppliedTranslation = desiredTranslation;
                this.editor.view.update();
            }
        };

        this.tool.onMouseUp = (event) => {
            if (this.selectionRect) {
                const rect = this.selectionRect.bounds;
                this.editor.drawLayer.children.forEach(item => {
                    if (item.segments && !(item.data && item.data.isTool)) {
                        item.segments.forEach(seg => { if (rect.contains(seg.point)) seg.selected = true; });
                    }
                });
                this.selectionRect.remove();
                this.selectionRect = null;
            }

            if (this.isDragging) {
                this.editor.saveHistory();
            }

            this.startPoint = null;
            this.dragTargets = [];
            this.activeComponent = null;
            this.isDragging = false;
            this.editor.view.update();
            this.editor.updateTransformUI();
            this.editor.updateUI();
        };
    }

    _refreshDragTargets() {
        this.dragTargets = [];
        if (this.activeComponent && (this.activeComponent.type === 'handle-in' || this.activeComponent.type === 'handle-out')) {
            this.dragTargets.push(this.activeComponent.target);
            return;
        }
        let hasComp = false;
        this.editor.project.selectedItems.forEach(item => {
            if (item.segments) {
                item.segments.forEach(s => { if (s.selected) { this.dragTargets.push(s.point); hasComp = true; } });
            }
        });
        if (!hasComp) {
            this.editor.project.selectedItems.forEach(item => {
                if (item.segments && !(item.data && item.data.isTool)) {
                    item.segments.forEach(s => this.dragTargets.push(s.point));
                }
            });
        }
    }

    activate() {
        this.tool.activate();
        this.editor.canvas.style.cursor = 'default';
        this.editor.updateTransformUI();
        this.editor.project.selectedItems.forEach(item => { if (item.segments) item.selected = true; });
        this.editor.view.update();
    }
}

