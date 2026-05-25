import paper from 'paper';

export function initSelectionTool(editor) {
    const tool = new paper.Tool();
    let dragItem = null;

    tool.onMouseDown = (event) => {
        // Perform hit test on the whole project
        const hitResult = editor.project.hitTest(event.point, {
            segments: true,
            stroke: true,
            fill: true,
            tolerance: 10, // Increased tolerance for easier clicking
            match: (result) => {
                // Ignore items that are part of selection UI (if any)
                return result.item.layer === editor.project.activeLayer;
            }
        });

        if (hitResult && hitResult.item) {
            // Find the top-most group or item that is a direct child of the active layer
            let item = hitResult.item;
            while (item.parent && item.parent !== editor.project.activeLayer) {
                item = item.parent;
            }

            console.log('Hit detected on item:', item.name || item.className);
            editor.setSelected(item);
            dragItem = item;
        } else {
            console.log('No hit detected. Deselecting.');
            editor.setSelected(null);
            dragItem = null;
        }
    };

    tool.onMouseDrag = (event) => {
        if (dragItem) {
            dragItem.position = dragItem.position.add(event.delta);
        }
    };

    tool.onMouseUp = (event) => {
        dragItem = null;
    };

    // Explicitly activate the tool
    tool.activate();

    return tool;
}
