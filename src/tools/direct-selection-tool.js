import paper from 'paper';

export class DirectSelectionTool {
    constructor(editor) {
        this.editor = editor;
        this.tool = new paper.Tool();
        
        this.dragTargets = [];
        this.selectionRect = null;
        this.startPoint = null;
        this.isDragging = false;
        
        // This is the "secret sauce": we track selection manually to prevent Paper.js from wiping it
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
            this.appliedDelta = new paper.Point(0, 0); // Track cumulative delta for snapping
            window.dispatchEvent(new CustomEvent('appMouseDown'));

            // Precise hit test
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
                    this.activeComponent = { type, target, segment: hitResult.segment };

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
                } else {
                    // Body/Stroke hit
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
                if (!event.modifiers.shift) {
                    this.editor.project.deselectAll();
                    this.selectedSegments.clear();
                    this.selectedHandles.clear();
                    this.startPoint = point;
                }
            }

            this.editor.selectedItems = this.editor.project.selectedItems.filter(i => !(i.data && i.data.isTool));
            this.editor.updateUI();
        };

        this.tool.onMouseDrag = (event) => {
            if (this.dragTargets.length > 0) {
                this.isDragging = true;

                if (event.modifiers.shift) {
                    // --- SHIFT SNAPPING LOGIC ---
                    if (this.activeComponent && (this.activeComponent.type === 'handle-in' || this.activeComponent.type === 'handle-out')) {
                        // Handle Snapping: Force handle to X or Y axis relative to anchor
                        this.dragTargets.forEach(t => {
                            t.x += event.delta.x;
                            t.y += event.delta.y;
                            // Snap resulting relative position
                            if (Math.abs(t.x) > Math.abs(t.y)) t.y = 0;
                            else t.x = 0;
                        });
                    } else {
                        // Node/Item Snapping: Constrain movement to global X or Y axis
                        let currentDelta = event.point.subtract(event.downPoint);
                        if (Math.abs(currentDelta.x) > Math.abs(currentDelta.y)) currentDelta.y = 0;
                        else currentDelta.x = 0;

                        let incrementalDelta = currentDelta.subtract(this.appliedDelta);
                        this.dragTargets.forEach(t => {
                            t.x += incrementalDelta.x;
                            t.y += incrementalDelta.y;
                        });
                        this.appliedDelta = currentDelta;
                    }
                } else {
                    // --- NORMAL DRAGGING ---
                    this.dragTargets.forEach(t => {
                        t.x += event.delta.x;
                        t.y += event.delta.y;
                    });
                    // Keep appliedDelta in sync to avoid jumps if Shift is pressed mid-drag
                    this.appliedDelta = event.point.subtract(event.downPoint);
                }
                this.editor.view.update();
            } else if (this.startPoint) {
                if (this.selectionRect) this.selectionRect.remove();
                this.selectionRect = new paper.Path.Rectangle(this.startPoint, event.point);
                this.selectionRect.strokeColor = '#3b82f6';
                this.selectionRect.fillColor = new paper.Color(59, 130, 246, 0.05);
                this.selectionRect.dashArray = [2, 2];
            }
        };

        this.tool.onMouseUp = (event) => {
            if (this.isDragging) {
                this.editor.saveHistory();
            }

            if (this.selectionRect) {
                this.editor.drawLayer.children.forEach(item => {
                    if (item.segments) {
                        item.segments.forEach(seg => {
                            if (this.selectionRect.contains(seg.point)) {
                                seg.selected = true;
                                item.selected = true;
                                this.selectedSegments.add(seg);
                            }
                        });
                    }
                });
                this.selectionRect.remove();
                this.selectionRect = null;
                
                this.editor.selectedItems = this.editor.project.selectedItems.filter(i => !(i.data && i.data.isTool));
                this.editor.updateUI();
            }
            
            this.startPoint = null;
            this.dragTargets = [];
            this.activeComponent = null;
            this.isDragging = false;
            this.editor.view.update();
        };
    }

    _toggleSegment(seg) {
        seg.selected = !seg.selected;
        if (seg.selected) {
            this.selectedSegments.add(seg);
            seg.path.selected = true;
        } else {
            this.selectedSegments.delete(seg);
        }
    }

    _toggleHandle(handle, seg) {
        handle.selected = !handle.selected;
        if (handle.selected) {
            this.selectedHandles.add(handle);
            seg.path.selected = true;
        } else {
            this.selectedHandles.delete(handle);
        }
    }

    _refreshDragTargets() {
        this.dragTargets = [];
        
        // Priority 1: If we specifically clicked a handle, ONLY drag that handle.
        // This is crucial for adjusting curvature independently of the anchor.
        if (this.activeComponent && (this.activeComponent.type === 'handle-in' || this.activeComponent.type === 'handle-out')) {
            this.dragTargets.push(this.activeComponent.target);
            return;
        }

        // Priority 2: If we specifically clicked a segment, or have segments selected.
        let hasComponentSelection = false;
        this.editor.project.selectedItems.forEach(item => {
            if (item.segments) {
                item.segments.forEach(seg => {
                    if (seg.selected) {
                        this.dragTargets.push(seg.point);
                        hasComponentSelection = true;
                    }
                    // Only drag other selected handles if their anchor is NOT moving.
                    if (seg.handleIn.selected && !seg.selected) {
                        this.dragTargets.push(seg.handleIn);
                        hasComponentSelection = true;
                    }
                    if (seg.handleOut.selected && !seg.selected) {
                        this.dragTargets.push(seg.handleOut);
                        hasComponentSelection = true;
                    }
                });
            }
        });

        // Priority 3: If an item is selected but NO specific points/handles are selected, drag the whole item.
        if (!hasComponentSelection) {
            this.editor.project.selectedItems.forEach(item => {
                if (item.segments && !(item.data && item.data.isTool)) {
                    item.segments.forEach(seg => this.dragTargets.push(seg.point));
                }
            });
        }
    }

    _clearAllComponentsInItem(item) {
        if (item.segments) {
            item.segments.forEach(s => {
                s.selected = false;
                s.handleIn.selected = false;
                s.handleOut.selected = false;
            });
        }
        this.selectedSegments.clear();
        this.selectedHandles.clear();
    }

    activate() {
        this.tool.activate();
        this.editor.canvas.style.cursor = 'default';
        this.editor.updateTransformUI();
        
        // When switching TO direct selection, ensure all selected paths show their points
        this.editor.project.selectedItems.forEach(item => {
            if (item.segments) item.selected = true;
        });
        this.editor.view.update();
    }
}
