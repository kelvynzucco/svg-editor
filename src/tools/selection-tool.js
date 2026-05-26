import paper from 'paper';

export class SelectionTool {
    constructor(editor) {
        this.editor = editor;
        this.tool = new paper.Tool();
        
        this.selectionRect = null;
        this.startPoint = null;
        this.isDragging = false;
        this.isRotating = false;
        this.isScaling = false;
        this.hasDuplicatedOnDrag = false;
        this.transformRef = null;
        this.handleType = null;
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
            this.hasDuplicatedOnDrag = false;
            window.dispatchEvent(new CustomEvent('appMouseDown'));

            // 1. Check UI Handles
            const uiHit = this.editor.uiLayer.hitTest(point, { tolerance: 10, fill: true, stroke: true });
            if (uiHit && uiHit.item && uiHit.item.data) {
                this.handleType = uiHit.item.data.type;
                if (this.handleType === 'rotate') {
                    this.isRotating = true;
                    const center = this.editor.getSelectionBounds().center;
                    this.transformRef = { center: center, startAngle: point.subtract(center).angle, totalApplied: 0 };
                    return;
                } else if (this.handleType.startsWith('scale-')) {
                    this.isScaling = true;
                    const bounds = this.editor.getSelectionBounds();
                    const cornerPivot = bounds[this.editor.getOppositeCorner(this.handleType)];
                    this.transformRef = { 
                        bounds: bounds.clone(), 
                        startPoint: point, 
                        pivot: cornerPivot,
                        center: bounds.center.clone(),
                        totalScaleX: 1, 
                        totalScaleY: 1,
                        lastPivot: cornerPivot
                    };
                    return;
                }
            }

            // 2. Check Items
            const hitResult = this.editor.drawLayer.hitTest(point, { segments: true, stroke: true, fill: true, tolerance: 10, curves: true });
            if (hitResult && hitResult.item) {
                let item = hitResult.item;
                while (item.parent && item.parent !== this.editor.drawLayer) item = item.parent;
                
                if (event.modifiers.shift) {
                    item.selected ? this.editor.removeFromSelection(item) : this.editor.addToSelection(item);
                } else {
                    if (!item.selected) this.editor.setSelected(item);
                    this.isDragging = true;
                    this.dragAppliedTranslation = new paper.Point(0, 0);
                    this.editor.uiLayer.visible = false;
                }
                return;
            }

            // 3. Check current selection bounds for direct drag
            const hitSelectedBounds = this.editor.selectedItems.some(item => item.strokeBounds.contains(point));
            if (hitSelectedBounds && !event.modifiers.shift) {
                this.isDragging = true;
                this.dragAppliedTranslation = new paper.Point(0, 0);
                this.editor.canvas.style.cursor = 'move';
                this.editor.uiLayer.visible = false;
                return;
            }

            // 4. Start Area Selection
            if (!event.modifiers.shift) this.editor.setSelected(null);
            this.startPoint = point;
        };

        this.tool.onMouseDrag = (event) => {
            if (this.isRotating) {
                const center = this.transformRef.center;
                const currentAngle = event.point.subtract(center).angle;
                let rawDelta = currentAngle - this.transformRef.startAngle;
                let desiredTotal = rawDelta;
                if (event.modifiers.shift) {
                    const snapAngle = 15;
                    desiredTotal = Math.round(rawDelta / snapAngle) * snapAngle;
                }
                const incrementalDelta = desiredTotal - this.transformRef.totalApplied;
                if (incrementalDelta !== 0) {
                    this.editor.selectedItems.forEach(item => item.rotate(incrementalDelta, center));
                    this.transformRef.totalApplied = desiredTotal;
                    this.editor.updateTransformUI();
                }
            } else if (this.isScaling) {
                const currentPivot = event.modifiers.alt ? this.transformRef.center : this.transformRef.pivot;
                const startVec = this.transformRef.startPoint.subtract(currentPivot);
                const currentVec = event.point.subtract(currentPivot);
                
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

                if (desiredScaleX !== this.transformRef.totalScaleX || desiredScaleY !== this.transformRef.totalScaleY || !currentPivot.equals(this.transformRef.lastPivot)) {
                    this.editor.selectedItems.forEach(item => {
                        item.scale(1 / this.transformRef.totalScaleX, 1 / this.transformRef.totalScaleY, this.transformRef.lastPivot);
                        item.scale(desiredScaleX, desiredScaleY, currentPivot);
                    });
                    this.transformRef.totalScaleX = desiredScaleX;
                    this.transformRef.totalScaleY = desiredScaleY;
                    this.transformRef.lastPivot = currentPivot;
                    this.editor.updateTransformUI();
                }
            } else if (this.isDragging) {
                if (event.modifiers.alt && !this.hasDuplicatedOnDrag && this.editor.selectedItems.length > 0) {
                    const clones = this.editor.selectedItems.map(item => {
                        const clone = item.clone();
                        clone.data.uid = this.editor._generateUID();
                        return clone;
                    });
                    this.editor.setSelected(clones);
                    this.hasDuplicatedOnDrag = true;
                }

                let desiredTranslation = event.point.subtract(event.downPoint);
                if (event.modifiers.shift) {
                    if (Math.abs(desiredTranslation.x) > Math.abs(desiredTranslation.y)) desiredTranslation.y = 0;
                    else desiredTranslation.x = 0;
                }
                
                let deltaToApply = desiredTranslation.subtract(this.dragAppliedTranslation);
                this.editor.selectedItems.forEach(item => item.position = item.position.add(deltaToApply));
                this.dragAppliedTranslation = desiredTranslation;
            } else if (this.startPoint) {
                if (this.selectionRect) this.selectionRect.remove();
                this.selectionRect = new paper.Path.Rectangle(this.startPoint, event.point);
                this.selectionRect.strokeColor = '#3b82f6';
                this.selectionRect.fillColor = new paper.Color(59, 130, 246, 0.1);
                this.selectionRect.dashArray = [4, 4];
            }
        };

        this.tool.onMouseUp = (event) => {
            if (this.isDragging || this.isRotating || this.isScaling) this.editor.saveHistory();
            if (this.selectionRect) {
                const items = this.editor.drawLayer.children;
                const newSelection = [];
                for (const item of items) {
                    if (item === this.selectionRect) continue;
                    if (this.selectionRect.intersects(item) || this.selectionRect.contains(item.bounds.center)) newSelection.push(item);
                }
                event.modifiers.shift ? newSelection.forEach(item => this.editor.addToSelection(item)) : this.editor.setSelected(newSelection);
                this.selectionRect.remove();
                this.selectionRect = null;
            }
            this.isDragging = this.isRotating = this.isScaling = this.hasDuplicatedOnDrag = false;
            this.startPoint = null;
            this.editor.uiLayer.visible = true;
            this.editor.updateTransformUI();
            this.editor.canvas.style.cursor = 'default';
        };
    }

    activate() {
        this.tool.activate();
    }
}
