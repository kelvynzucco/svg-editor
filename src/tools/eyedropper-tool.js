import paper from 'paper';

export class EyedropperTool {
    constructor(editor) {
        this.editor = editor;
        this.tool = new paper.Tool();
        this.init();
    }

    init() {
        this.tool.onMouseDown = (event) => {
            if (event.event.button !== 0) return;
            
            const hitResult = this.editor.drawLayer.hitTest(event.point, {
                fill: true,
                stroke: true,
                tolerance: 5
            });

            if (hitResult && hitResult.item) {
                const target = hitResult.item;
                
                if (this.editor.selectedItems.length > 0) {
                    this.editor.selectedItems.forEach(item => {
                        item.fillColor = target.fillColor;
                        item.strokeColor = target.strokeColor;
                        item.strokeWidth = target.strokeWidth;
                        
                        if (target.dashArray) {
                            item.dashArray = [...target.dashArray];
                        } else {
                            item.dashArray = [];
                        }
                    });
                    
                    this.editor.saveHistory();
                    this.editor.updateTransformUI();
                    this.editor.updateUI();
                }
            }
        };
    }

    activate() {
        this.tool.activate();
        this.editor.canvas.style.cursor = 'crosshair';
        this.editor.updateTransformUI();
    }
}
