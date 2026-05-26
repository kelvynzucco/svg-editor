import paper from 'paper';

export class ShapeTool {
    constructor(editor) {
        this.editor = editor;
        this.tool = new paper.Tool();
        this.currentShapeType = 'rectangle';
        this.tempPath = null;
        this.startPoint = null;

        this.init();
    }

    init() {
        this.tool.onMouseDown = (event) => {
            this.startPoint = event.point;
            this.tempPath = null;
        };

        this.tool.onMouseDrag = (event) => {
            if (this.tempPath) {
                this.tempPath.remove();
            }

            let rect;
            const delta = event.point.subtract(this.startPoint);
            
            if (event.modifiers.shift) {
                const maxSide = Math.max(Math.abs(delta.x), Math.abs(delta.y));
                const signX = delta.x >= 0 ? 1 : -1;
                const signY = delta.y >= 0 ? 1 : -1;
                const squareDelta = new paper.Point(maxSide * signX, maxSide * signY);
                
                if (event.modifiers.option || event.modifiers.alt) {
                    rect = new paper.Rectangle(
                        this.startPoint.subtract(squareDelta),
                        this.startPoint.add(squareDelta)
                    );
                } else {
                    rect = new paper.Rectangle(this.startPoint, this.startPoint.add(squareDelta));
                }
            } else {
                if (event.modifiers.option || event.modifiers.alt) {
                    rect = new paper.Rectangle(
                        this.startPoint.subtract(delta),
                        this.startPoint.add(delta)
                    );
                } else {
                    rect = new paper.Rectangle(this.startPoint, event.point);
                }
            }
            
            // Basic validation to avoid zero-size paths
            if (rect.width === 0 || rect.height === 0) return;

            const style = this.editor.getGlobalStyle();

            switch (this.currentShapeType) {
                case 'rectangle':
                    this.tempPath = new paper.Path.Rectangle(rect);
                    break;
                case 'ellipse':
                    this.tempPath = new paper.Path.Ellipse(rect);
                    break;
                case 'polygon':
                    // Drawing a regular polygon inside the bounding box
                    const center = rect.center;
                    const radius = Math.min(rect.width, rect.height) / 2;
                    this.tempPath = new paper.Path.RegularPolygon(center, 6, radius);
                    break;
            }

            if (this.tempPath) {
                this.tempPath.fillColor = style.fillColor === 'none' ? null : style.fillColor;
                this.tempPath.strokeColor = style.strokeColor === 'none' ? null : style.strokeColor;
                this.tempPath.strokeWidth = style.strokeWidth;
                this.tempPath.opacity = style.fillOpacity;
                
                // Add to drawing layer
                this.editor.drawLayer.addChild(this.tempPath);
            }
        };

        this.tool.onMouseUp = (event) => {
            if (this.tempPath) {
                this.editor.saveHistory();
                this.editor.setSelected(this.tempPath);
                this.tempPath = null;
                
                // Signal that a shape was created to auto-switch tool
                window.dispatchEvent(new CustomEvent('shapeCreated'));
            }
            this.startPoint = null;
        };
    }

    setType(type) {
        this.currentShapeType = type;
        console.log(`Shape tool type set to: ${type}`);
    }

    activate() {
        this.tool.activate();
    }
}
