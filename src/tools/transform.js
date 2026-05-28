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

export function distributeSpacing(items, axis, gap = null) {
    if (!items || items.length < 2) return;

    const itemsArray = Array.isArray(items) ? [...items] : [items];
    const tolerance = 20; // Tolerance for grouping items into rows/columns

    if (axis === 'horizontal') {
        // Group items into "slots" (columns) based on their left position
        const slots = [];
        
        // Sort items by left bound to process in order
        const sortedItems = itemsArray.sort((a, b) => a.bounds.left - b.bounds.left);
        
        sortedItems.forEach(item => {
            let foundSlot = slots.find(s => Math.abs(s.left - item.bounds.left) < tolerance);
            if (!foundSlot) {
                foundSlot = { left: item.bounds.left, items: [], maxWidth: 0 };
                slots.push(foundSlot);
            }
            foundSlot.items.push(item);
            foundSlot.maxWidth = Math.max(foundSlot.maxWidth, item.bounds.width);
        });

        if (slots.length < 2) return;

        if (gap === null) {
            const firstSlot = slots[0];
            const lastSlot = slots[slots.length - 1];
            const totalWidth = Math.max(...lastSlot.items.map(i => i.bounds.right)) - firstSlot.left;
            let sumWidths = 0;
            slots.forEach(s => sumWidths += s.maxWidth);
            gap = (totalWidth - sumWidths) / (slots.length - 1);
        }

        let currentX = slots[0].left;
        slots.forEach(slot => {
            const deltaX = currentX - slot.left;
            slot.items.forEach(item => {
                item.position.x += deltaX;
            });
            currentX += slot.maxWidth + gap;
        });
    } else if (axis === 'vertical') {
        // Group items into "slots" (rows) based on their top position
        const slots = [];
        
        // Sort items by top bound to process in order
        const sortedItems = itemsArray.sort((a, b) => a.bounds.top - b.bounds.top);
        
        sortedItems.forEach(item => {
            let foundSlot = slots.find(s => Math.abs(s.top - item.bounds.top) < tolerance);
            if (!foundSlot) {
                foundSlot = { top: item.bounds.top, items: [], maxHeight: 0 };
                slots.push(foundSlot);
            }
            foundSlot.items.push(item);
            foundSlot.maxHeight = Math.max(foundSlot.maxHeight, item.bounds.height);
        });

        if (slots.length < 2) return;

        if (gap === null) {
            const firstSlot = slots[0];
            const lastSlot = slots[slots.length - 1];
            const totalHeight = Math.max(...lastSlot.items.map(i => i.bounds.bottom)) - firstSlot.top;
            let sumHeights = 0;
            slots.forEach(s => sumHeights += s.maxHeight);
            gap = (totalHeight - sumHeights) / (slots.length - 1);
        }

        let currentY = slots[0].top;
        slots.forEach(slot => {
            const deltaY = currentY - slot.top;
            slot.items.forEach(item => {
                item.position.y += deltaY;
            });
            currentY += slot.maxHeight + gap;
        });
    }
}
