/**
 * Icon Library
 * Centralizes all SVG icons and their metadata.
 */

const iconRegistry = {
    'file-up': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-up text-green-600"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 12v6"/><path d="m15 15-3-3-3 3"/></svg>`,
        location: 'Header: Import File button'
    },
    'code-2': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-code-2 text-indigo-600"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>`,
        location: 'Header: Import Code button'
    },
    'unlock': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-unlock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>`,
        location: 'Header: Toggle Lock button (Unlocked state)'
    },
    'lock': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>`,
        location: 'Header: Toggle Lock button (Locked state)'
    },
    'mouse-pointer-2': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mouse-pointer-2"><path d="M4.037 4.437 19.92 10.12a.59.59 0 0 1 .09 1.034l-4.833 3.488a.756.756 0 0 0-.258.391l-3.231 7.907a.59.59 0 0 1-1.095.034L4.044 5.473a.589.589 0 0 1 .71-.755Z"/><path d="m13 13 4 4"/></svg>`,
        location: 'Left Toolbar: Selection Tool'
    },
    'mouse-pointer': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mouse-pointer"><path d="m3 3 7.07 16.97 2.51-7.39 8.15-3.07Z"/></svg>`,
        location: 'Left Toolbar: Direct Selection Tool'
    },
    'pipette': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pipette"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>`,
        location: 'Left Toolbar: Eyedropper Tool'
    },
    'maximize': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`,
        location: 'Canvas Area: Reset View button'
    },
    'align-left': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="12" height="6" x="8" y="6" rx="1"/><rect width="7" height="6" x="8" y="14" rx="1"/><path d="M4 2v20"/></svg>`,
        location: 'Right Sidebar: Align Left'
    },
    'align-h-center': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="12" height="6" x="6" y="4" rx="1"/><rect width="7" height="6" x="8.5" y="14" rx="1"/><path d="M12 2v2"/><path d="M12 10v4"/><path d="M12 20v2"/></svg>`,
        location: 'Right Sidebar: Horizontal Center'
    },
    'align-right': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="12" height="6" x="4" y="6" rx="1"/><rect width="7" height="6" x="9" y="14" rx="1"/><path d="M20 2v20"/></svg>`,
        location: 'Right Sidebar: Align Right'
    },
    'align-top': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="6" height="12" x="6" y="8" rx="1"/><rect width="6" height="7" x="14" y="8" rx="1"/><path d="M2 4h20"/></svg>`,
        location: 'Right Sidebar: Align Top'
    },
    'align-v-center': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="6" height="12" x="4" y="6" rx="1"/><rect width="6" height="7" x="14" y="8.5" rx="1"/><path d="M2 12h2"/><path d="M10 12h4"/><path d="M20 12h2"/></svg>`,
        location: 'Right Sidebar: Vertical Center'
    },
    'align-bottom': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="6" height="12" x="6" y="4" rx="1"/><rect width="6" height="7" x="14" y="9" rx="1"/><path d="M2 20h20"/></svg>`,
        location: 'Right Sidebar: Align Bottom'
    },
    'distribute-h': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="2" height="14" x="4" y="5" rx="0.5"/><rect width="2" height="14" x="18" y="5" rx="0.5"/><rect width="2" height="10" x="11" y="7" rx="0.5"/></svg>`,
        location: 'Right Sidebar: Distribute Horizontal Spacing'
    },
    'distribute-v': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="2" x="5" y="4" rx="0.5"/><rect width="14" height="2" x="5" y="18" rx="0.5"/><rect width="10" height="2" x="7" y="11" rx="0.5"/></svg>`,
        location: 'Right Sidebar: Distribute Vertical Spacing'
    },
    'layout-grid': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
        location: 'Right Sidebar: Tidy Up Grid'
    },
    'columns': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`,
        location: 'Right Sidebar: Stack Horizontal'
    },
    'rows': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>`,
        location: 'Right Sidebar: Stack Vertical'
    },
    'grid-2x2': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><path d="M3 10.5h18"/><path d="M10.5 3v18"/></svg>`,
        location: 'Right Sidebar: Cycle Grid'
    },
    'minus': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /></svg>`,
        location: 'Right Sidebar: Remove Fill/Stroke'
    },
    'file-down': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>`,
        location: 'Export Menu: Save as .svg'
    },
    'code': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>`,
        location: 'Export Menu: Copy as Code'
    },
    'chevron-up': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg>`,
        location: 'Export Menu: Export Artboard button'
    },
    'chevron-down': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>`,
        location: 'Header: Import button'
    },
    'folder-open': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-open text-amber-500"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>`,
        location: 'Header: Open Project button'
    },
    'save': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save text-amber-500"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
        location: 'Export Menu: Save Project button'
    },
    'trash-2': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2 text-red-600"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
        location: 'Sidebar & Context Menu: Clear Canvas'
    },
    'square': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>`,
        location: 'Left Toolbar: Shape Tool (Rectangle)'
    },
    'circle': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle"><circle cx="12" cy="12" r="10"/></svg>`,
        location: 'Left Toolbar: Shape Tool (Ellipse)'
    },
    'hexagon': {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hexagon"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
        location: 'Left Toolbar: Shape Tool (Polygon)'
    }
};

/**
 * Initializes icons by finding all elements with data-icon attribute
 * and injecting the corresponding SVG.
 */
export function initIcons() {
    const iconElements = document.querySelectorAll('[data-icon]');
    
    iconElements.forEach(el => {
        const iconName = el.getAttribute('data-icon');
        const iconData = iconRegistry[iconName];
        
        if (iconData) {
            el.innerHTML = iconData.svg;
        } else {
            console.warn(`Icon "${iconName}" not found in registry.`);
        }
    });
}
