import paper from 'paper';

export class DirectSelectionTool {
    constructor(editor) {
        this.editor = editor;
        this.tool = new paper.Tool();
        this.dragTargets = [];
        this.selectionRect = null;
        this.startPoint = null;
        this.isDragging = false;
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
            this.startPoint = null;
            this.appliedDelta = new paper.Point(0, 0);
            window.dispatchEvent(new CustomEvent('appMouseDown'));

            // 1. Hit Test for UI Widgets (Live Corners)
            if (this.editor.showCornerWidgets) {
                const uiHit = this.editor.uiLayer.hitTest(point, { tolerance: 15, fill: true, stroke: true });
                if (uiHit && uiHit.item && uiHit.item.data && uiHit.item.data.type === 'corner-widget') {
                    const activeSeg = uiHit.item.data.segment;
                    
                    // PREPARE ALL SELECTED PATHS for non-destructive drag
                    this.editor.project.selectedItems.forEach(path => {
                        if (path.segments) {
                            path.data.originalSegments = path.segments.map(s => ({
                                point: s.point.clone(),
                                handleIn: s.handleIn.clone(),
                                handleOut: s.handleOut.clone(),
                                selected: s.selected,
                                data: JSON.parse(JSON.stringify(s.data || {})) // Deep copy metadata
                            }));
                        }
                    });

                    this.activeComponent = { 
                        type: 'corner-widget', 
                        activePath: activeSeg.path,
                        pivotPoint: activeSeg.data.originalPoint ? new paper.Point(activeSeg.data.originalPoint) : activeSeg.point.clone()
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
                const isComponent = type === 'segment' || type === 'handle-in' || type === 'handle-out';
                
                if (isComponent) {
                    const target = type === 'segment' ? hitResult.segment : 
                                   (type === 'handle-in' ? hitResult.segment.handleIn : hitResult.segment.handleOut);
                    this.activeComponent = { type, target, segment: hitResult.segment };

                    if (event.modifiers.shift) {
                        hitResult.segment.selected = !hitResult.segment.selected;
                        hitResult.item.selected = true;
                    } else {
                        if (!target.selected) {
                            this.editor.project.deselectAll();
                            item.selected = true;
                            target.selected = true;
                        }
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
                const { activePath, pivotPoint } = this.activeComponent;
                
                // Radius calculation based on the dragged widget
                const orig = activePath.data.originalSegments;
                const firstSelIdx = activePath.segments.findIndex(s => s.selected);
                if (firstSelIdx === -1) return;

                const pPrev = (orig[firstSelIdx - 1] || (activePath.closed ? orig[orig.length-1] : null))?.point;
                const pNext = (orig[firstSelIdx + 1] || (activePath.closed ? orig[0] : null))?.point;
                
                if (pPrev && pNext) {
                    const v1 = pPrev.subtract(pivotPoint).normalize();
                    const v2 = pNext.subtract(pivotPoint).normalize();
                    const bisector = v1.add(v2).normalize();
                    const dist = event.point.subtract(pivotPoint).dot(bisector);
                    
                    const maxRadius = Math.min(pPrev.subtract(pivotPoint).length, pNext.subtract(pivotPoint).length) * 0.45;
                    const radius = Math.min(Math.max(0, dist - 10), maxRadius);

                    // APPLY TO ALL SELECTED PATHS
                    this.editor.project.selectedItems.forEach(path => {
                        if (path.segments && path.data.originalSegments) {
                            const pOrigs = path.data.originalSegments;
                            // Restore state (with data!)
                            path.segments = pOrigs.map(s => {
                                const seg = new paper.Segment(s.point, s.handleIn, s.handleOut);
                                seg.data = JSON.parse(JSON.stringify(s.data));
                                if (s.selected) seg.selected = true;
                                return seg;
                            });

                            // Re-apply rounding to all selected indices
                            const indices = path.segments.map((s, i) => s.selected ? i : -1).filter(i => i !== -1);
                            indices.sort((a,b) => b - a).forEach(idx => {
                                this._splitAndRound(path, idx, radius);
                            });
                        }
                    });
                }
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
                this.dragTargets.forEach(t => { t.x += event.delta.x; t.y += event.delta.y; });
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
                this.editor.updateUI();
                this.editor.updateTransformUI();
            }

            if (this.isDragging) {
                this.editor.project.selectedItems.forEach(item => { if (item.data) delete item.data.originalSegments; });
                this.editor.saveHistory();
            }

            this.startPoint = null;
            this.dragTargets = [];
            this.activeComponent = null;
            this.isDragging = false;
            this.editor.view.update();
            this.editor.updateTransformUI();
        };
    }

    _splitAndRound(path, idx, radius) {
        if (radius <= 0) return;
        const seg = path.segments[idx];
        const pOrig = seg.point.clone();
        const origSegs = path.data.originalSegments;
        const p1 = (origSegs[idx - 1] || (path.closed ? origSegs[origSegs.length - 1] : null))?.point;
        const p3 = (origSegs[idx + 1] || (path.closed ? origSegs[0] : null))?.point;
        if (!p1 || !p3) return;
        const v1 = p1.subtract(pOrig).normalize();
        const v2 = p3.subtract(pOrig).normalize();
        const dot = v1.dot(v2);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot))); 
        const theta = Math.PI - angle;
        const handleLength = radius * (4/3) * Math.tan(theta / 4);
        const pA = pOrig.add(v1.multiply(radius));
        const pB = pOrig.add(v2.multiply(radius));
        path.removeSegment(idx);
        const segA = path.insert(idx, pA);
        const segB = path.insert(idx + 1, pB);
        segA.handleOut = v1.multiply(-handleLength);
        segB.handleIn = v2.multiply(-handleLength);
        segA.data.originalPoint = { x: pOrig.x, y: pOrig.y };
        segA.data.currentRadius = radius;
        segA.data.isCornerPart = true;
        segA.selected = true;
        segB.selected = true;
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
