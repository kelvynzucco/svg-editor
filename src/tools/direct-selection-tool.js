import paper from 'paper';

export class DirectSelectionTool {
    constructor(editor) {
        this.editor = editor;
        this.tool = new paper.Tool();
        
        this.dragTargets = [];
        this.selectionRect = null;
        this.startPoint = null;
        this.isDragging = false;
        
        this.selectedSegments = new Set();
        this.selectedHandles = new Set();
        
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

            // 1. Hit Test for UI Widgets (Live Corners) - Check UI Layer first
            const uiHit = this.editor.uiLayer.hitTest(point, { tolerance: 15, fill: true, stroke: true });
            if (uiHit && uiHit.item && uiHit.item.data && uiHit.item.data.type === 'corner-widget') {
                const seg = uiHit.item.data.segment;
                
                if (!seg.path.data.originalSegments) {
                    seg.path.data.originalSegments = seg.path.segments.map(s => ({
                        point: s.point.clone(),
                        handleIn: s.handleIn.clone(),
                        handleOut: s.handleOut.clone(),
                        selected: s.selected,
                        data: { ...s.data }
                    }));
                }

                const selectedIndices = seg.path.segments
                    .map((s, i) => s.selected ? i : -1)
                    .filter(i => i !== -1);

                this.activeComponent = { 
                    type: 'corner-widget', 
                    path: seg.path,
                    selectedIndices: selectedIndices,
                    pivotPoint: seg.data.originalPoint ? new paper.Point(seg.data.originalPoint) : seg.point.clone()
                };
                return;
            }

            // 2. Regular Hit Test for segments, handles, paths
            const hitResult = this.editor.project.hitTest(point, {
                segments: true,
                handles: true,
                stroke: true,
                fill: true,
                curves: true,
                tolerance: 8
            });

            if (hitResult) {
                const item = hitResult.item;
                const type = hitResult.type;
                const isComponent = type === 'segment' || type === 'handle-in' || type === 'handle-out';
                
                if (isComponent) {
                    const target = type === 'segment' ? hitResult.segment : 
                                   (type === 'handle-in' ? hitResult.segment.handleIn : hitResult.segment.handleOut);
                    
                    if (type === 'segment' && event.modifiers.alt && target.handleIn.isZero() && target.handleOut.isZero()) {
                        this.activeComponent = { type: 'node-pull', target, segment: target };
                    } else {
                        this.activeComponent = { type, target, segment: hitResult.segment };
                    }

                    if (event.modifiers.shift) {
                        if (type === 'segment') this._toggleSegment(hitResult.segment);
                        else this._toggleHandle(target, hitResult.segment);
                    } else {
                        if (!target.selected) {
                            this.editor.project.deselectAll();
                            this.selectedSegments.clear();
                            this.selectedHandles.clear();
                            item.selected = true;
                            target.selected = true;
                            
                            if (type === 'segment') this.selectedSegments.add(target);
                            else this.selectedHandles.add(target);
                        }
                    }
                } else if (type === 'curve') {
                    this.activeComponent = { type: 'curve', target: hitResult.location.curve };
                    if (!event.modifiers.shift) {
                        this.editor.project.deselectAll();
                        this.selectedSegments.clear();
                        this.selectedHandles.clear();
                        item.selected = true;
                        hitResult.location.curve.segment1.selected = true;
                        hitResult.location.curve.segment2.selected = true;
                    }
                } else {
                    if (event.modifiers.shift) {
                        item.selected = !item.selected;
                    } else if (!item.selected) {
                        this.editor.project.deselectAll();
                        this.selectedSegments.clear();
                        this.selectedHandles.clear();
                        item.selected = true;
                    }
                }
                
                this._refreshDragTargets();
            } else {
                // 3. Hit Nothing: Prepare for Marquee Selection
                if (!event.modifiers.shift) {
                    this.editor.project.deselectAll();
                    this.selectedSegments.clear();
                    this.selectedHandles.clear();
                }
                this.startPoint = point;
            }

            this.editor.selectedItems = this.editor.project.selectedItems.filter(i => !(i.data && i.data.isTool));
            this.editor.updateUI();
            this.editor.updateTransformUI();
        };

        this.tool.onMouseDrag = (event) => {
            if (this.activeComponent && this.activeComponent.type === 'corner-widget') {
                this.isDragging = true;
                const { path, selectedIndices, pivotPoint } = this.activeComponent;
                
                const pPrevOrig = (path.data.originalSegments[selectedIndices[0] - 1] || (path.closed ? path.data.originalSegments[path.data.originalSegments.length-1] : null))?.point;
                const pNextOrig = (path.data.originalSegments[selectedIndices[0] + 1] || (path.closed ? path.data.originalSegments[0] : null))?.point;
                
                if (pPrevOrig && pNextOrig) {
                    const v1 = pPrevOrig.subtract(pivotPoint).normalize();
                    const v2 = pNextOrig.subtract(pivotPoint).normalize();
                    const bisector = v1.add(v2).normalize();
                    const dragVector = event.point.subtract(pivotPoint);
                    const dist = dragVector.dot(bisector);
                    
                    const maxRadius = Math.min(pPrevOrig.subtract(pivotPoint).length, pNextOrig.subtract(pivotPoint).length) * 0.45;
                    const radius = Math.min(Math.max(0, dist - 10), maxRadius);

                    // Restore to original state
                    path.segments = path.data.originalSegments.map(s => new paper.Segment(s.point, s.handleIn, s.handleOut));
                    path.segments.forEach((s, i) => {
                        if (path.data.originalSegments[i].selected) s.selected = true;
                    });

                    // Re-apply rounding from the ORIGINAL reference point
                    [...selectedIndices].sort((a,b) => b-a).forEach(idx => {
                        this._splitAndRound(path, idx, radius);
                    });
                }
                
                this.editor.view.update();
                this.editor.updateTransformUI();
                return;
            }

            if (this.startPoint) {
                // Marquee Selection Logic
                this.isDragging = true;
                if (this.selectionRect) this.selectionRect.remove();
                
                // Create selection rect on UI Layer so it's not part of the drawing
                this.editor.uiLayer.activate();
                this.selectionRect = new paper.Path.Rectangle(this.startPoint, event.point);
                this.selectionRect.strokeColor = '#3b82f6';
                this.selectionRect.fillColor = new paper.Color(59, 130, 246, 0.1);
                this.selectionRect.dashArray = [4, 2];
                this.selectionRect.data.isTool = true;
                this.editor.drawLayer.activate();
                return;
            }

            if (this.dragTargets.length > 0) {
                this.isDragging = true;
                this.dragTargets.forEach(t => {
                    t.x += event.delta.x;
                    t.y += event.delta.y;
                });
                this.editor.view.update();
            }
        };

        this.tool.onMouseUp = (event) => {
            if (this.selectionRect) {
                // Process Marquee Selection
                const rect = this.selectionRect.bounds;
                this.editor.drawLayer.children.forEach(item => {
                    if (item.segments && !(item.data && item.data.isTool)) {
                        item.segments.forEach(seg => {
                            if (rect.contains(seg.point)) {
                                seg.selected = true;
                                item.selected = true;
                                this.selectedSegments.add(seg);
                            }
                        });
                    }
                });
                this.selectionRect.remove();
                this.selectionRect = null;
                this.editor.updateUI();
                this.editor.updateTransformUI();
            }

            if (this.isDragging) {
                // Clear originalSegments cache
                this.editor.project.activeLayer.children.forEach(item => {
                    if (item.data) delete item.data.originalSegments;
                });
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
        
        // Use path.data.originalSegments to always have correct neighbors
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

        // Crucial: Only segA carries the "corner widget" info to avoid duplicates
        segA.data.originalPoint = { x: pOrig.x, y: pOrig.y };
        segA.data.currentRadius = radius;
        segA.data.isCornerPart = true;
        
        // Keep points selected to maintain visual handles
        segA.selected = true;
        segB.selected = true;
    }

    _toggleSegment(seg) {
        seg.selected = !seg.selected;
        if (seg.selected) { this.selectedSegments.add(seg); seg.path.selected = true; }
        else { this.selectedSegments.delete(seg); }
    }

    _toggleHandle(handle, seg) {
        handle.selected = !handle.selected;
        if (handle.selected) { this.selectedHandles.add(handle); seg.path.selected = true; }
        else { this.selectedHandles.delete(handle); }
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
                item.segments.forEach(s => {
                    if (s.selected) { this.dragTargets.push(s.point); hasComp = true; }
                });
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
