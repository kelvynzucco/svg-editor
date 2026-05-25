import paper from 'paper';

export function align(item, position, view) {
    if (!item) return;

    const bounds = item.bounds;
    const viewBounds = view.bounds;

    switch (position) {
        case 'left':
            item.position.x = viewBounds.left + bounds.width / 2;
            break;
        case 'h-center':
            item.position.x = view.center.x;
            break;
        case 'right':
            item.position.x = viewBounds.right - bounds.width / 2;
            break;
        case 'top':
            item.position.y = viewBounds.top + bounds.height / 2;
            break;
        case 'v-center':
            item.position.y = view.center.y;
            break;
        case 'bottom':
            item.position.y = viewBounds.bottom - bounds.height / 2;
            break;
    }
}

export function flip(item, axis) {
    if (!item) return;

    if (axis === 'h') {
        item.scale(-1, 1);
    } else if (axis === 'v') {
        item.scale(1, -1);
    }
}
