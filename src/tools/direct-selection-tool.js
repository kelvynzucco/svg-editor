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
            
            // Force focus out of any inputs
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                document.activeElement.blur();
            }

            const point = event.point;
            this.isDragging = false;
            window.dispatchEvent(new CustomEvent('appMouseDown'));

            // 1. Precise hit test for vector components
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
                
                if (event.modifiers.shift) {
                    // --- MULTI-SELECT (SHIFT) ---
                    if (type === 'segment') {
                        this._toggleSegment(hitResult.segment);
                    } else if (type === 'handle-in') {
                        this._toggleHandle(hitResult.segment.handleIn);
                    } else if (type === 'handle-out') {
                        this._toggleHandle(hitResult.segment.handleOut);
                    } else {
                        // Toggle item selection
                        item.selected = !item.selected;
                    }
                } else {
                    // --- SINGLE SELECT (NO SHIFT) ---
                    const isComponent = type === 'segment' || type === 'handle-in' || type === 'handle-out';
                    
                    if (isComponent) {
                        const target = type === 'segment' ? hitResult.segment : 
                                       (type === 'handle-in' ? hitResult.segment.handleIn : hitResult.segment.handleOut);
                        
                        // If we click an UNSELECTED component, clear everything and select ONLY this
                        if (!target.selected) {
                            this.editor.project.deselectAll();
                            this.selectedSegments.clear();
                            this.selectedHandles.clear();
                            
                            item.selected = true;
                            target.selected = true;
                            
                            if (type === 'segment') this.selectedSegments.add(target);
                            else this.selectedHandles.add(target);
                        }
                        // If it was ALREADY selected, we do nothing (preparing for drag)
                    } else {
                        // Hit item body/stroke: select item, clear component selections
                        if (!item.selected) {
                            this.editor.project.deselectAll();
                            this.selectedSegments.clear();
                            this.selectedHandles.clear();
                            item.selected = true;
                        } else {
                            // If item was already selected, clicking it again (body) clears points
                            this._clearAllComponentsInItem(item);
                        }
                    }
                }
                
                // Set up drag targets
                this._refreshDragTargets();
            } else {
                // --- HIT NOTHING ---
                if (!event.modifiers.shift) {
                    this.editor.project.deselectAll();
                    this.selectedSegments.clear();
                    this.selectedHandles.clear();
                    this.startPoint = point;
                }
            }

            // Keep the editor's manual selection array in sync
            this.editor.selectedItems = this.editor.project.selectedItems.filter(i => !(i.data && i.data.isTool));
            this.editor.updateUI();
        };

        this.tool.onMouseDrag = (event) => {
            if (this.dragTargets.length > 0) {
                this.isDragging = true;
                // Dragging components (Segments or Handles)
                this.dragTargets.forEach(t => {
                    // In Paper.js, segments use .point while handles use .x/.y relative to segment
                    t.x += event.delta.x;
                    t.y += event.delta.y;
                });
                this.editor.view.update();
            } else if (this.startPoint) {
                // Dragging Marquee
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
                // Area selection for segments
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
                
                // Final sync
                this.editor.selectedItems = this.editor.project.selectedItems.filter(i => !(i.data && i.data.isTool));
                this.editor.updateUI();
            }
            
            this.startPoint = null;
            this.dragTargets = [];
            
            // ESSENTIAL: Manually update view to ensure selections RENDER and PERSIST
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

    _toggleHandle(handle) {
        handle.selected = !handle.selected;
        if (handle.selected) {
            this.selectedHandles.add(handle);
            handle.owner.path.selected = true;
        } else {
            this.selectedHandles.delete(handle);
        }
    }

    _refreshDragTargets() {
        this.dragTargets = [];
        // Important: Collect EVERYTHING that is currently marked as selected in the project
        this.editor.project.selectedItems.forEach(item => {
            if (item.segments) {
                item.segments.forEach(seg => {
                    if (seg.selected) this.dragTargets.push(seg.point);
                    if (seg.handleIn.selected) this.dragTargets.push(seg.handleIn);
                    if (seg.handleOut.selected) this.dragTargets.push(seg.handleOut);
                });
            }
        });
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
