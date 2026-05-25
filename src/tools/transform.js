import paper from 'paper';

export function align(item, position, view) {
    if (!item) return;

    const bounds = item.bounds;
    const viewBounds = view.bounds;

    switch (position) {
        case 'tl':
            item.position = new paper.Point(
                viewBounds.left + bounds.width / 2,
                viewBounds.top + bounds.height / 2
            );
            break;
        case 'tr':
            item.position = new paper.Point(
                viewBounds.right - bounds.width / 2,
                viewBounds.top + bounds.height / 2
            );
            break;
        case 'bl':
            item.position = new paper.Point(
                viewBounds.left + bounds.width / 2,
                viewBounds.bottom - bounds.height / 2
            );
            break;
        case 'br':
            item.position = new paper.Point(
                viewBounds.right - bounds.width / 2,
                viewBounds.bottom - bounds.height / 2
            );
            break;
        case 'center':
            item.position = view.center;
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
