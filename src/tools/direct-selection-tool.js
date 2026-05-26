import paper from 'paper';

export class DirectSelectionTool {
    constructor(editor) {
        this.editor = editor;
        this.tool = new paper.Tool();
        this.dragTargets = [];
        this.init();
    }

    init() {
        this.tool.onMouseDown = (event) => {
            if (event.event.button !== 0) return;
            
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                document.activeElement.blur();
            }

            const point = event.point;
            window.dispatchEvent(new CustomEvent('appMouseDown'));

            const hitResult = this.editor.project.hitTest(point, {
                segments: true,
                handles: true,
                stroke: true,
                fill: true,
                tolerance: 10
            });

            if (hitResult) {
                const item = hitResult.item;
                const type = hitResult.type;
                const isSegment = type === 'segment';
                const isHandle = type === 'handle-in' || type === 'handle-out';

                if (event.modifiers.shift) {
                    if (isSegment) {
                        hitResult.segment.selected = !hitResult.segment.selected;
                        if (hitResult.segment.selected) {
                            item.selected = true;
                            if (!this.editor.selectedItems.includes(item)) this.editor.selectedItems.push(item);
                        }
                    } else if (isHandle) {
                        const h = type === 'handle-in' ? hitResult.segment.handleIn : hitResult.segment.handleOut;
                        h.selected = !h.selected;
                        item.selected = true;
                        if (!this.editor.selectedItems.includes(item)) this.editor.selectedItems.push(item);
                    } else {
                        // Toggle item
                        if (item.selected) {
                            item.selected = false;
                            this.editor.selectedItems = this.editor.selectedItems.filter(i => i !== item);
                            this._clearItemPoints(item);
                        } else {
                            item.selected = true;
                            this.editor.selectedItems.push(item);
                        }
                    }
                } else {
                    // NO SHIFT
                    if (isSegment || isHandle) {
                        const target = isSegment ? hitResult.segment : (type === 'handle-in' ? hitResult.segment.handleIn : hitResult.segment.handleOut);
                        
                        if (!target.selected) {
                            // Fresh point selection: clear everything else
                            this.editor.project.deselectAll();
                            this.editor.selectedItems = [item];
                            item.selected = true;
                            target.selected = true;
                        }
                    } else {
                        // Hit item body
                        if (!item.selected) {
                            this.editor.project.deselectAll();
                            this.editor.selectedItems = [item];
                            item.selected = true;
                        } else {
                            // Already selected: clear points to allow selecting a different point on same item
                            this._clearItemPoints(item);
                            item.selected = true;
                        }
                    }
                }
            } else {
                if (!event.modifiers.shift) {
                    this.editor.setSelected(null);
                }
            }

            // Important: update local selection array to match project state
            this.editor.selectedItems = this.editor.project.selectedItems.filter(i => !(i.data && i.data.isTool));

            // Refresh drag list
            this.dragTargets = [];
            this.editor.project.selectedItems.forEach(i => {
                if (i.segments) {
                    i.segments.forEach(seg => {
                        if (seg.selected) this.dragTargets.push(seg.point);
                        if (seg.handleIn.selected) this.dragTargets.push(seg.handleIn);
                        if (seg.handleOut.selected) this.dragTargets.push(seg.handleOut);
                    });
                }
            });

            this.editor.updateUI();
        };

        this.tool.onMouseDrag = (event) => {
            if (this.dragTargets.length > 0) {
                this.dragTargets.forEach(t => {
                    t.x += event.delta.x;
                    t.y += event.delta.y;
                });
                this.editor.view.update();
            }
        };

        this.tool.onMouseUp = (event) => {
            if (this.dragTargets.length > 0) this.editor.saveHistory();
        };
    }

    _clearItemPoints(item) {
        if (item.segments) {
            item.segments.forEach(s => {
                s.selected = false;
                s.handleIn.selected = false;
                s.handleOut.selected = false;
            });
        }
    }

    activate() {
        this.tool.activate();
    }
}
