import paper from 'paper';

export function align(items, position, contextBounds) {
    if (!items || items.length === 0) return;

    const itemsArray = Array.isArray(items) ? items : [items];
    
    if (itemsArray.length === 1) {
        // --- Single item: Align relative to the Artboard/Context Bounds ---
        const item = itemsArray[0];
        const bounds = item.bounds;

        switch (position) {
            case 'left':
                item.position.x = contextBounds.left + bounds.width / 2;
                break;
            case 'h-center':
                item.position.x = contextBounds.center.x;
                break;
            case 'right':
                item.position.x = contextBounds.right - bounds.width / 2;
                break;
            case 'top':
                item.position.y = contextBounds.top + bounds.height / 2;
                break;
            case 'v-center':
                item.position.y = contextBounds.center.y;
                break;
            case 'bottom':
                item.position.y = contextBounds.bottom - bounds.height / 2;
                break;
        }
    } else {
        // --- Multiple items: Align relative to the FIRST selected item ---
        const referenceItem = itemsArray[0];
        const refBounds = referenceItem.bounds;
        
        // Items to be moved (everyone except the reference item)
        const others = itemsArray.slice(1);

        others.forEach(item => {
            const bounds = item.bounds;
            
            switch (position) {
                case 'left':
                    item.position.x = refBounds.left + bounds.width / 2;
                    break;
                case 'h-center':
                    item.position.x = refBounds.center.x;
                    break;
                case 'right':
                    item.position.x = refBounds.right - bounds.width / 2;
                    break;
                case 'top':
                    item.position.y = refBounds.top + bounds.height / 2;
                    break;
                case 'v-center':
                    item.position.y = refBounds.center.y;
                    break;
                case 'bottom':
                    item.position.y = refBounds.bottom - bounds.height / 2;
                    break;
            }
        });
    }
}

export function flip(items, axis) {
    if (!items || items.length === 0) return;

    const itemsArray = Array.isArray(items) ? items : [items];

    itemsArray.forEach(item => {
        if (axis === 'h') {
            item.scale(-1, 1);
        } else if (axis === 'v') {
            item.scale(1, -1);
        }
    });
}
