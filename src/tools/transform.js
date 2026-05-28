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

export function tidyUpGrid(items, layout = 'grid', forcedCols = null, hGap = 20, vGap = 20) {
    if (!items || items.length < 2) return;

    const itemsArray = [...items];
    const count = itemsArray.length;

    // 1. Calculate selection center to keep layout stable
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    itemsArray.forEach(item => {
        const b = item.bounds;
        if (b.left < minX) minX = b.left;
        if (b.right > maxX) maxX = b.right;
        if (b.top < minY) minY = b.top;
        if (b.bottom > maxY) maxY = b.bottom;
    });
    const selectionCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

    // 2. Determine columns
    let cols;
    if (forcedCols !== null) {
        cols = forcedCols;
    } else if (layout === 'horizontal') {
        cols = count;
    } else if (layout === 'vertical') {
        cols = 1;
    } else {
        const totalWidth = maxX - minX;
        const totalHeight = maxY - minY;
        cols = Math.round(Math.sqrt(count * (totalWidth / (totalHeight || 1))));
        cols = Math.max(1, Math.min(count, cols));
    }
    const rows = Math.ceil(count / cols);
    
    // 3. Sort items for predictable order (Y then X)
    // Using a larger tolerance for Y sorting to handle slightly misaligned items
    const avgHeight = (maxY - minY) / rows || 50;
    itemsArray.sort((a, b) => {
        if (Math.abs(a.bounds.top - b.bounds.top) < avgHeight / 2) {
            return a.bounds.left - b.bounds.left;
        }
        return a.bounds.top - b.bounds.top;
    });

    // 4. Calculate max dimensions for each row and column
    const colWidths = new Array(cols).fill(0);
    const rowHeights = new Array(rows).fill(0);
    itemsArray.forEach((item, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        colWidths[col] = Math.max(colWidths[col], item.bounds.width);
        rowHeights[row] = Math.max(rowHeights[row], item.bounds.height);
    });

    // 5. Calculate total grid size
    const totalGridWidth = colWidths.reduce((a, b) => a + b, 0) + (cols - 1) * hGap;
    const totalGridHeight = rowHeights.reduce((a, b) => a + b, 0) + (rows - 1) * vGap;

    // 6. Calculate starting point to keep it centered
    let currentY = selectionCenter.y - totalGridHeight / 2;
    const startX = selectionCenter.x - totalGridWidth / 2;

    // 7. Position items centered within their respective cells
    for (let r = 0; r < rows; r++) {
        let currentX = startX;
        const rowH = rowHeights[r];
        
        for (let c = 0; c < cols; c++) {
            const index = r * cols + c;
            if (index >= count) break;

            const item = itemsArray[index];
            const colW = colWidths[c];

            // Center item in cell (colW x rowH)
            item.bounds.left = currentX + (colW - item.bounds.width) / 2;
            item.bounds.top = currentY + (rowH - item.bounds.height) / 2;

            currentX += colW + hGap;
        }
        currentY += rowH + vGap;
    }
}

export function cycleGrid(items, hGap = 20, vGap = 20) {
    if (!items || items.length < 2) return;
    const count = items.length;

    // Detect current columns based on center positions
    const tolerance = 30;
    const xPositions = [];
    [...items].sort((a, b) => a.position.x - b.position.x).forEach(item => {
        let found = xPositions.find(pos => Math.abs(pos - item.position.x) < tolerance);
        if (!found) xPositions.push(item.position.x);
    });

    let currentCols = xPositions.length;
    let nextCols = currentCols + 1;
    if (nextCols > count) nextCols = 1;

    tidyUpGrid(items, 'grid', nextCols, hGap, vGap);
}

export function reverseOrder(items, axis) {
    if (!items || items.length < 2) return;
    const itemsArray = [...items];
    
    // Sort to identify current visual order
    if (axis === 'horizontal') {
        itemsArray.sort((a, b) => a.bounds.left - b.bounds.left);
    } else {
        itemsArray.sort((a, b) => a.bounds.top - b.bounds.top);
    }

    // Capture original centers
    const originalCenters = itemsArray.map(item => item.position.clone());
    
    // Reverse the centers array
    const reversedCenters = [...originalCenters].reverse();

    // Assign reversed centers back to sorted items
    itemsArray.forEach((item, index) => {
        item.position = reversedCenters[index];
    });
}
