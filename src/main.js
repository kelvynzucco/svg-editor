import './style.css';
import { SvgEditor } from './editor';
import { align, flip, distributeSpacing, tidyUpGrid, cycleGrid } from './tools/transform';
import paper from 'paper';
import Picker from 'vanilla-picker';
import { initIcons } from './ui/icons';

// Initialize Icons
initIcons();

// Initialize Editor
const editor = new SvgEditor('editor-canvas');

// UI Elements - Header
const importBtn = document.getElementById('import-btn');
const importMenu = document.getElementById('import-menu');
const importFileBtn = document.getElementById('import-file-btn');
const importFileInput = document.getElementById('import-file');
const importCodeBtn = document.getElementById('import-code-btn');

const saveProjectBtn = document.getElementById('save-project-btn');
const openProjectBtn = document.getElementById('open-project-btn');
const openProjectInput = document.getElementById('open-project-input');

importBtn.addEventListener('click', (e) => {
    importMenu.classList.toggle('hidden');
});

importFileBtn.addEventListener('click', () => {
    importFileInput.click();
    importMenu.classList.add('hidden');
});

importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => editor.importSVG(ev.target.result).catch(err => alert('Error: ' + err));
    reader.readAsText(file);
    e.target.value = ''; // Reset to allow re-importing same file
});

openProjectBtn.addEventListener('click', () => {
    openProjectInput.click();
    importMenu.classList.add('hidden');
});

openProjectInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    editor.loadProjectFile(file)
        .then(() => {
            updateSidebarUI();
            initIcons();
        })
        .catch(err => alert('Error loading project: ' + err));
    e.target.value = ''; // Reset
});

importCodeBtn.addEventListener('click', () => {
    codeModal.classList.remove('hidden');
    importMenu.classList.add('hidden');
});

// Modal Elements for Filename
const filenameModalTitle = document.getElementById('filename-modal-title');
const filenameExtension = document.getElementById('filename-extension');
let currentSaveType = 'svg'; // 'svg' or 'project'

saveProjectBtn.addEventListener('click', (e) => {
    currentSaveType = 'project';
    filenameModalTitle.innerText = 'Save Project';
    filenameExtension.innerText = '.json';
    filenameModal.classList.remove('hidden');
    filenameInput.focus();
    filenameInput.select();
    exportMenu.classList.add('hidden');
});

// Lock Shortcuts Toggle
const toggleLockBtn = document.getElementById('toggle-lock');
const lockIconUnlocked = document.getElementById('lock-icon-unlocked');
const lockIconLocked = document.getElementById('lock-icon-locked');

let isLocked = true;

function setLockState(locked) {
    isLocked = locked;
    if (isLocked) {
        lockIconUnlocked.classList.add('hidden');
        lockIconLocked.classList.remove('hidden');
        toggleLockBtn.classList.replace('bg-gray-100', 'bg-orange-50');
    } else {
        lockIconUnlocked.classList.remove('hidden');
        lockIconLocked.classList.add('hidden');
        toggleLockBtn.classList.replace('bg-orange-50', 'bg-gray-100');
    }
}

// Initialize state
setLockState(isLocked);

toggleLockBtn.addEventListener('click', () => setLockState(!isLocked));

// Global Browser Override
window.addEventListener('contextmenu', (e) => {
    if (isLocked) e.preventDefault();
}, true); // Capture phase to beat other listeners

window.addEventListener('keydown', (e) => {
    if (!isLocked) return;
    
    const key = e.key.toLowerCase();
    const cmd = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    
    // Block common browser overrides when locked
    if (cmd) {
        // Refresh: Ctrl+R, Ctrl+Shift+R
        if (key === 'r') e.preventDefault();
        // Print, Save, Open, Search, Bookmark, History, Downloads, View Source, Select All
        if (['s', 'p', 'o', 'f', 'g', 'd', 'h', 'j', 'u', 'n', 't', 'a'].includes(key)) e.preventDefault();
        // DevTools: Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (shift && ['i', 'j', 'c'].includes(key)) e.preventDefault();
    }

    // Block F1-F12 (Refresh, DevTools, Fullscreen, etc.)
    if (/^f\d+$/.test(key)) {
        e.preventDefault();
    }
}, true);

// UI Elements - Left Toolbar
const selectionToolBtn = document.getElementById('tool-selection');
const directSelectionToolBtn = document.getElementById('tool-direct-selection');
const shapeToolBtn = document.getElementById('tool-shape');
const eyedropperToolBtn = document.getElementById('tool-eyedropper');

const tools = {
    selection: selectionToolBtn,
    directSelection: directSelectionToolBtn,
    shape: shapeToolBtn,
    eyedropper: eyedropperToolBtn
};

function setActiveTool(toolName) {
    Object.entries(tools).forEach(([name, btn]) => {
        if (name === toolName) {
            btn.classList.add('bg-blue-50', 'text-blue-600', 'shadow-sm');
            btn.classList.remove('text-gray-400', 'hover:bg-gray-100');
        } else {
            btn.classList.remove('bg-blue-50', 'text-blue-600', 'shadow-sm');
            btn.classList.add('text-gray-400', 'hover:bg-gray-100');
        }
    });

    if (toolName !== 'shape') {
        shapeSubmenu.classList.add('hidden');
    }

    editor.setTool(toolName);
}

selectionToolBtn.addEventListener('click', () => setActiveTool('selection'));
directSelectionToolBtn.addEventListener('click', () => setActiveTool('directSelection'));
eyedropperToolBtn.addEventListener('click', () => setActiveTool('eyedropper'));

// Shape Tool Submenu Logic
const shapeSubmenu = document.getElementById('shape-submenu');
const shapeIcon = document.getElementById('shape-tool-icon');
const shapeOptions = {
    rect: { el: document.getElementById('shape-rect'), icon: 'square', type: 'rectangle' },
    ellipse: { el: document.getElementById('shape-ellipse'), icon: 'circle', type: 'ellipse' },
    poly: { el: document.getElementById('shape-poly'), icon: 'hexagon', type: 'polygon' }
};

shapeToolBtn.addEventListener('click', (e) => {
    if (editor.currentToolName === 'shape') {
        if (shapeSubmenu.classList.contains('hidden')) {
            const rect = shapeToolBtn.getBoundingClientRect();
            shapeSubmenu.style.left = `${rect.right + 8}px`;
            shapeSubmenu.style.top = `${rect.top}px`;
            shapeSubmenu.classList.remove('hidden');
        } else {
            shapeSubmenu.classList.add('hidden');
        }
    } else {
        setActiveTool('shape');
    }
});

Object.entries(shapeOptions).forEach(([key, opt]) => {
    opt.el.addEventListener('click', (e) => {
        Object.values(shapeOptions).forEach(o => {
            o.el.classList.remove('bg-blue-50', 'text-blue-600', 'shadow-sm');
            o.el.classList.add('text-gray-400', 'hover:bg-gray-100');
        });
        opt.el.classList.add('bg-blue-50', 'text-blue-600', 'shadow-sm');
        opt.el.classList.remove('text-gray-400', 'hover:bg-gray-100');
        
        shapeIcon.setAttribute('data-icon', opt.icon);
        initIcons();
        
        editor.setShapeType(opt.type);
        shapeSubmenu.classList.add('hidden');
    });
});

window.addEventListener('shapeCreated', () => {
    setActiveTool('selection');
});

// UI Elements - Sidebar Export
const exportBtn = document.getElementById('export-btn');
const exportMenu = document.getElementById('export-menu');
const exportFileBtn = document.getElementById('export-file');
const copyCodeBtn = document.getElementById('copy-code');
const clearCanvasBtn = document.getElementById('clear-canvas');

// Modals
const codeModal = document.getElementById('code-modal');
const closeModalBtn = document.getElementById('close-modal');
const confirmCodeBtn = document.getElementById('confirm-code');
const svgCodeInput = document.getElementById('svg-code-input');

const filenameModal = document.getElementById('filename-modal');
const filenameInput = document.getElementById('filename-input');
const closeFilenameModalBtn = document.getElementById('close-filename-modal');
const confirmFilenameBtn = document.getElementById('confirm-filename');

const confirmModal = document.getElementById('confirm-modal');
const cancelClearBtn = document.getElementById('cancel-clear');
const confirmClearBtn = document.getElementById('confirm-clear');

const artboardModal = document.getElementById('artboard-modal');
const artboardWidthInput = document.getElementById('artboard-width');
const artboardHeightInput = document.getElementById('artboard-height');
const closeArtboardModalBtn = document.getElementById('close-artboard-modal');
const confirmArtboardSizeBtn = document.getElementById('confirm-artboard-size');

// Navigation Elements
const resetViewBtn = document.getElementById('reset-view');

// Context Menu Elements
const contextMenu = document.getElementById('context-menu');
const canvasContextMenu = document.getElementById('canvas-context-menu');
const ctxClearCanvasBtn = document.getElementById('ctx-clear-canvas');
const ctxSetArtboardBtn = document.getElementById('ctx-set-artboard');

const ctxDeleteBtn = document.getElementById('ctx-delete');
const ctxCopyBtn = document.getElementById('ctx-copy');
const ctxDownloadBtn = document.getElementById('ctx-download');
const ctxDuplicateBtn = document.getElementById('ctx-duplicate');
const ctxFlipHBtn = document.getElementById('ctx-flip-h');
const ctxFlipVBtn = document.getElementById('ctx-flip-v');
const ctxFrontBtn = document.getElementById('ctx-front');
const ctxBackBtn = document.getElementById('ctx-back');
const ctxGroupBtn = document.getElementById('ctx-group');
const ctxUngroupBtn = document.getElementById('ctx-ungroup');

// Alignment Buttons mapping
const alignBtns = {
    left: document.getElementById('align-left'),
    'h-center': document.getElementById('align-h-center'),
    right: document.getElementById('align-right'),
    top: document.getElementById('align-top'),
    'v-center': document.getElementById('align-v-center'),
    bottom: document.getElementById('align-bottom')
};

Object.entries(alignBtns).forEach(([pos, btn]) => {
    if (btn) btn.addEventListener('click', () => { align(editor.selectedItems, pos, editor.artboardBounds); editor.updateTransformUI(); editor.saveHistory(); });
});

// Spacing Elements
const distributeHBtn = document.getElementById('distribute-h');
const distributeVBtn = document.getElementById('distribute-v');
const spacingGapHInput = document.getElementById('spacing-gap-h');
const spacingGapVInput = document.getElementById('spacing-gap-v');
const tidyUpBtn = document.getElementById('tidy-up');
const organizeHBtn = document.getElementById('organize-h');
const organizeVBtn = document.getElementById('organize-v');
const cycleGridBtn = document.getElementById('cycle-grid');

distributeHBtn.addEventListener('click', () => {
    const hGap = parseFloat(spacingGapHInput.value) || 20;
    const vGap = parseFloat(spacingGapVInput.value) || 20;
    distributeSpacing(editor.selectedItems, 'horizontal');
    editor.updateTransformUI();
    editor.saveHistory();
    updateSidebarUI();
});

distributeVBtn.addEventListener('click', () => {
    distributeSpacing(editor.selectedItems, 'vertical');
    editor.updateTransformUI();
    editor.saveHistory();
    updateSidebarUI();
});

spacingGapHInput.addEventListener('input', (e) => {
    const gap = parseFloat(e.target.value) || 0;
    distributeSpacing(editor.selectedItems, 'horizontal', gap);
    editor.updateTransformUI();
    updateSidebarUI();
});

spacingGapHInput.addEventListener('change', () => {
    editor.saveHistory();
});

spacingGapVInput.addEventListener('input', (e) => {
    const gap = parseFloat(e.target.value) || 0;
    distributeSpacing(editor.selectedItems, 'vertical', gap);
    editor.updateTransformUI();
    updateSidebarUI();
});

spacingGapVInput.addEventListener('change', () => {
    editor.saveHistory();
});

tidyUpBtn.addEventListener('click', () => {
    const hGap = parseFloat(spacingGapHInput.value) || 20;
    const vGap = parseFloat(spacingGapVInput.value) || 20;
    tidyUpGrid(editor.selectedItems, 'grid', null, hGap, vGap);
    editor.updateTransformUI();
    editor.saveHistory();
    updateSidebarUI();
});

organizeHBtn.addEventListener('click', () => {
    const hGap = parseFloat(spacingGapHInput.value) || 20;
    const vGap = parseFloat(spacingGapVInput.value) || 20;
    tidyUpGrid(editor.selectedItems, 'horizontal', null, hGap, vGap);
    editor.updateTransformUI();
    editor.saveHistory();
    updateSidebarUI();
});

organizeVBtn.addEventListener('click', () => {
    const hGap = parseFloat(spacingGapHInput.value) || 20;
    const vGap = parseFloat(spacingGapVInput.value) || 20;
    tidyUpGrid(editor.selectedItems, 'vertical', null, hGap, vGap);
    editor.updateTransformUI();
    editor.saveHistory();
    updateSidebarUI();
});

cycleGridBtn.addEventListener('click', () => {
    const hGap = parseFloat(spacingGapHInput.value) || 20;
    const vGap = parseFloat(spacingGapVInput.value) || 20;
    cycleGrid(editor.selectedItems, hGap, vGap);
    editor.updateTransformUI();
    editor.saveHistory();
    updateSidebarUI();
});

// Style Elements
const fSwatch = document.getElementById('fill-picker-swatch');
const fHex = document.getElementById('fill-hex-input');
const fOp = document.getElementById('fill-opacity');
const fOpVal = document.getElementById('fill-opacity-val');

const sSwatch = document.getElementById('stroke-picker-swatch');
const sHex = document.getElementById('stroke-hex-input');
const sOp = document.getElementById('stroke-opacity');
const sOpVal = document.getElementById('stroke-opacity-val');

const sWidth = document.getElementById('stroke-width');

const removeFillBtn = document.getElementById('remove-fill');
const removeStrokeBtn = document.getElementById('remove-stroke');

const pContainer = document.getElementById('picker-container');

// PREEMPTIVE COMMIT LOGIC
const forceCommitPendingStyle = () => {
    if (!pContainer.classList.contains('hidden') && activePickerType) {
        const type = activePickerType === 'fill' ? 'fillColor' : 'strokeColor';
        const finalHex = sharedPicker.color.hex.substring(0, 7);
        editor.applyStyle(type, finalHex, true);
        pContainer.classList.add('hidden');
        activePickerType = null;
    }
};

window.addEventListener('appMouseDown', forceCommitPendingStyle);

// Shared Picker Logic
let activePickerType = null;

const sharedPicker = new Picker({
    parent: pContainer,
    popup: false,
    alpha: false,
    editor: true,
    editorFormat: 'hex',
    onDone: (color) => {
        forceCommitPendingStyle();
    }
});

sharedPicker.onChange = (color) => {
    if (!activePickerType) return;
    const hex = color.hex.substring(0, 7).toUpperCase();
    if (activePickerType === 'fill') {
        fSwatch.style.backgroundColor = hex;
        fSwatch.style.backgroundImage = 'none';
        fHex.value = hex;
        editor.applyStyle('fillColor', hex, false);
    } else {
        sSwatch.style.backgroundColor = hex;
        sSwatch.style.backgroundImage = 'none';
        sHex.value = hex;
        editor.applyStyle('strokeColor', hex, false);
    }
    updateSidebarUI();
};

const openPicker = (e, type) => {
    if (activePickerType && activePickerType !== type) forceCommitPendingStyle();
    activePickerType = type;
    const rect = e.target.getBoundingClientRect();
    pContainer.style.top = `${rect.top}px`;
    pContainer.style.left = `${rect.left - 260}px`;
    const style = editor.getSelectionStyle();
    const currentCol = type === 'fill' ? style?.fillColor : style?.strokeColor;
    sharedPicker.setColor(currentCol || '#000000', true);
    pContainer.classList.remove('hidden');
};

fSwatch.addEventListener('click', (e) => openPicker(e, 'fill'));
sSwatch.addEventListener('click', (e) => openPicker(e, 'stroke'));

window.addEventListener('mousedown', (e) => {
    if (pContainer && !pContainer.contains(e.target) && !fSwatch.contains(e.target) && !sSwatch.contains(e.target)) {
        forceCommitPendingStyle();
    }
});

function updateSidebarUI() {
    const selectedItems = editor.selectedItems;
    const hasSelection = selectedItems && selectedItems.length > 0;
    const hasMultipleSelection = selectedItems && selectedItems.length >= 2;

    Object.values(alignBtns).forEach(btn => { if (btn) btn.disabled = !hasSelection; });
    
    // Update Spacing Tool state
    distributeHBtn.disabled = !hasMultipleSelection;
    distributeVBtn.disabled = !hasMultipleSelection;
    spacingGapHInput.disabled = !hasMultipleSelection;
    spacingGapVInput.disabled = !hasMultipleSelection;
    tidyUpBtn.disabled = !hasMultipleSelection;
    organizeHBtn.disabled = !hasMultipleSelection;
    organizeVBtn.disabled = !hasMultipleSelection;
    cycleGridBtn.disabled = !hasMultipleSelection;

    if (hasMultipleSelection) {
        const tolerance = 20;

        // Calculate H-Gap
        const hSlots = [];
        [...selectedItems].sort((a, b) => a.bounds.left - b.bounds.left).forEach(item => {
            let found = hSlots.find(s => Math.abs(s.left - item.bounds.left) < tolerance);
            if (!found) { found = { left: item.bounds.left, items: [], maxWidth: 0 }; hSlots.push(found); }
            found.items.push(item);
            found.maxWidth = Math.max(found.maxWidth, item.bounds.width);
        });

        if (hSlots.length >= 2) {
            let totalGap = 0;
            for (let i = 0; i < hSlots.length - 1; i++) {
                totalGap += hSlots[i+1].left - (hSlots[i].left + hSlots[i].maxWidth);
            }
            const avgGap = Math.round((totalGap / (hSlots.length - 1)) * 100) / 100;
            if (document.activeElement !== spacingGapHInput) spacingGapHInput.value = Math.max(0, avgGap);
        } else {
            spacingGapHInput.value = 0;
        }

        // Calculate V-Gap
        const vSlots = [];
        [...selectedItems].sort((a, b) => a.bounds.top - b.bounds.top).forEach(item => {
            let found = vSlots.find(s => Math.abs(s.top - item.bounds.top) < tolerance);
            if (!found) { found = { top: item.bounds.top, items: [], maxHeight: 0 }; vSlots.push(found); }
            found.items.push(item);
            found.maxHeight = Math.max(found.maxHeight, item.bounds.height);
        });

        if (vSlots.length >= 2) {
            let totalGap = 0;
            for (let i = 0; i < vSlots.length - 1; i++) {
                totalGap += vSlots[i+1].top - (vSlots[i].top + vSlots[i].maxHeight);
            }
            const avgGap = Math.round((totalGap / (vSlots.length - 1)) * 100) / 100;
            if (document.activeElement !== spacingGapVInput) spacingGapVInput.value = Math.max(0, avgGap);
        } else {
            spacingGapVInput.value = 0;
        }
    } else {
        spacingGapHInput.value = 0;
        spacingGapVInput.value = 0;
    }

    if (hasSelection) {
        const style = editor.getSelectionStyle();
        if (style) {
            const isFillNone = !style.fillColor || style.fillColor === 'none';
            const hexF = isFillNone ? '#FFFFFF' : style.fillColor.toUpperCase();
            fSwatch.style.backgroundColor = isFillNone ? 'transparent' : hexF;
            fSwatch.style.backgroundImage = isFillNone ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : 'none';
            fSwatch.style.backgroundSize = isFillNone ? '8px 8px' : 'auto';
            fSwatch.style.backgroundPosition = isFillNone ? '0 0, 4px 4px' : '0 0';
            fHex.value = isFillNone ? 'NONE' : hexF;
            
            const isStrokeNone = !style.strokeColor || style.strokeColor === 'none';
            const hexS = isStrokeNone ? '#FFFFFF' : style.strokeColor.toUpperCase();
            sSwatch.style.backgroundColor = isStrokeNone ? 'transparent' : hexS;
            sSwatch.style.backgroundImage = isStrokeNone ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : 'none';
            sSwatch.style.backgroundSize = isStrokeNone ? '8px 8px' : 'auto';
            sSwatch.style.backgroundPosition = isStrokeNone ? '0 0, 4px 4px' : '0 0';
            sHex.value = isStrokeNone ? 'NONE' : hexS;

            fOp.value = style.fillOpacity;
            fOpVal.innerText = `${Math.round(style.fillOpacity)}%`;
            sOp.value = style.strokeOpacity;
            sOpVal.innerText = `${Math.round(style.strokeOpacity)}%`;
            if (document.activeElement !== sWidth) sWidth.value = style.strokeWidth;
        }
    }
}

window.addEventListener('selectionChanged', updateSidebarUI);

const expandHex = (hex) => {
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (/^#[0-9A-F]{3}$/i.test(hex)) return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    return hex;
};

fHex.addEventListener('input', (e) => {
    let val = expandHex(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(val)) { editor.applyStyle('fillColor', val, false); updateSidebarUI(); }
});
fHex.addEventListener('change', (e) => {
    let val = expandHex(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(val)) { e.target.value = val.toUpperCase(); editor.applyStyle('fillColor', val, true); updateSidebarUI(); }
});

sHex.addEventListener('input', (e) => {
    let val = expandHex(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(val)) { editor.applyStyle('strokeColor', val, false); updateSidebarUI(); }
});
sHex.addEventListener('change', (e) => {
    let val = expandHex(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(val)) { e.target.value = val.toUpperCase(); editor.applyStyle('strokeColor', val, true); updateSidebarUI(); }
});

fOp.addEventListener('input', (e) => { fOpVal.innerText = `${e.target.value}%`; editor.applyStyle('fillOpacity', e.target.value / 100, false); });
fOp.addEventListener('change', (e) => { editor.applyStyle('fillOpacity', e.target.value / 100, true); updateSidebarUI(); });
sOp.addEventListener('input', (e) => { sOpVal.innerText = `${e.target.value}%`; editor.applyStyle('strokeOpacity', e.target.value / 100, false); });
sOp.addEventListener('change', (e) => { editor.applyStyle('strokeOpacity', e.target.value / 100, true); updateSidebarUI(); });
sWidth.addEventListener('input', (e) => { editor.applyStyle('strokeWidth', e.target.value, true); updateSidebarUI(); });
sWidth.addEventListener('change', (e) => { editor.applyStyle('strokeWidth', e.target.value, true); updateSidebarUI(); });

removeFillBtn.addEventListener('click', () => { editor.applyStyle('fillColor', 'none', true); updateSidebarUI(); });
removeStrokeBtn.addEventListener('click', () => { editor.applyStyle('strokeColor', 'none', false); editor.applyStyle('strokeWidth', 0, true); updateSidebarUI(); });

// Floating Menus Auto-close
window.addEventListener('click', (e) => {
    const dsMenu = document.getElementById('ds-context-menu');
    if (dsMenu && !dsMenu.contains(e.target)) dsMenu.classList.add('hidden');
    if (!exportBtn.contains(e.target)) exportMenu.classList.add('hidden');
    if (!importBtn.contains(e.target)) importMenu.classList.add('hidden');
    if (!shapeToolBtn.contains(e.target) && !shapeSubmenu.contains(e.target)) shapeSubmenu.classList.add('hidden');
    if (!contextMenu.contains(e.target) && !canvasContextMenu.contains(e.target)) {
        contextMenu.classList.add('hidden');
        canvasContextMenu.classList.add('hidden');
    }
});

exportBtn.addEventListener('click', (e) => {
    exportMenu.classList.toggle('hidden');
});

// Keyboard Shortcuts & Navigation
let isSpaceDown = false;
window.addEventListener('keydown', (e) => {
    const isTextInput = (e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'number')) || e.target.tagName === 'TEXTAREA';
    if (e.code === 'Space' && !isTextInput) {
        if (!isSpaceDown) { isSpaceDown = true; editor.canvas.style.cursor = 'grab'; }
        e.preventDefault(); return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
        if (isTextInput) e.target.blur(); e.preventDefault(); forceCommitPendingStyle(); 
        if (e.key === 'z') editor.undo(); else editor.redo(); return;
    }
    if (isTextInput) {
        const isAppShortcut = (e.ctrlKey || e.metaKey) && ['g', 'backspace'].includes(e.key.toLowerCase());
        if (!isAppShortcut) return;
    }
    const key = e.key.toLowerCase();
    const noModifiers = !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;

    if (noModifiers) {
        if (key === 'v') setActiveTool('selection');
        if (key === 'a') setActiveTool('directSelection');
        if (key === 'r') {
            if (editor.currentToolName === 'shape') {
                // Cycle through shapes
                const types = ['rectangle', 'ellipse', 'polygon'];
                const icons = ['square', 'circle', 'hexagon'];
                const currentIndex = types.indexOf(editor.tools.shape.currentShapeType);
                const nextIndex = (currentIndex + 1) % types.length;
                
                const nextType = types[nextIndex];
                const nextIcon = icons[nextIndex];

                editor.setShapeType(nextType);
                shapeIcon.setAttribute('data-icon', nextIcon);
                initIcons();

                // Update active state in submenu UI
                const optionKeys = ['rect', 'ellipse', 'poly'];
                Object.values(shapeOptions).forEach(o => {
                    o.el.classList.remove('bg-blue-50', 'text-blue-600', 'shadow-sm');
                    o.el.classList.add('text-gray-400', 'hover:bg-gray-100');
                });
                const activeOpt = shapeOptions[optionKeys[nextIndex]];
                activeOpt.el.classList.add('bg-blue-50', 'text-blue-600', 'shadow-sm');
                activeOpt.el.classList.remove('text-gray-400', 'hover:bg-gray-100');
            } else {
                setActiveTool('shape');
            }
        }
        if (key === 'i') setActiveTool('eyedropper');
        if (key === 'delete' || key === 'backspace') editor.deleteSelectedComponents();
        if (key === '[') editor.sendToBackSelected();
        if (key === ']') editor.bringToFrontSelected();
    }

    if ((e.ctrlKey || e.metaKey) && key === 'a') { e.preventDefault(); editor.selectAll(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') { e.preventDefault(); editor.groupSelectedItems(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Backspace') { e.preventDefault(); editor.ungroupSelectedItems(); }
    if (e.shiftKey && e.key.toUpperCase() === 'H') { flip(editor.selectedItems, 'h'); editor.saveHistory(); }
    if (e.shiftKey && e.key.toUpperCase() === 'V') { flip(editor.selectedItems, 'v'); editor.saveHistory(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') copySelectedToClipboard();
    if ((e.ctrlKey || e.metaKey) && e.key === 'x') copySelectedToClipboard().then(() => editor.deleteSelectedItem());
});

window.addEventListener('keyup', (e) => { if (e.code === 'Space') { isSpaceDown = false; editor.canvas.style.cursor = 'default'; } });

editor.canvas.addEventListener('mousedown', (e) => {
    if (isSpaceDown && e.button === 0) {
        editor.isPanning = true;
        editor.lastPoint = new paper.Point(e.clientX, e.clientY);
        editor.canvas.style.cursor = 'grabbing';
        e.stopImmediatePropagation();
    }
}, true);

window.addEventListener('mousemove', (e) => {
    if (editor.isPanning) {
        const currentPoint = new paper.Point(e.clientX, e.clientY);
        const delta = currentPoint.subtract(editor.lastPoint).divide(editor.view.zoom);
        editor.pan(delta);
        editor.lastPoint = currentPoint;
    }
});

window.addEventListener('mouseup', () => {
    if (editor.isPanning) {
        editor.isPanning = false;
        editor.canvas.style.cursor = isSpaceDown ? 'grab' : 'default';
    }
});

editor.canvas.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = editor.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const mousePoint = editor.view.viewToProject(new paper.Point(x, y));
        editor.zoom(e.deltaY, mousePoint);
    }
}, { passive: false });

resetViewBtn.addEventListener('click', () => editor.resetView());

async function copySelectedToClipboard() {
    if (editor.selectedItem) {
        const svgCode = editor.getSelectedSVGString();
        try { await navigator.clipboard.writeText(svgCode); } catch (err) { console.error('Failed to copy to clipboard:', err); }
    }
}

window.addEventListener('paste', async (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;
    const isSvgCode = (str) => { const s = str.trim(); return s.startsWith('<svg') || (s.startsWith('<?xml') && s.includes('<svg')); };
    const text = clipboardData.getData('text/plain');
    if (text && isSvgCode(text)) { editor.importSVG(text).catch(err => console.error('Error pasting SVG:', err)); return; }
    const html = clipboardData.getData('text/html');
    if (html && html.includes('<svg')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const svgElement = doc.querySelector('svg');
        if (svgElement) editor.importSVG(svgElement.outerHTML).catch(err => console.error('Error pasting SVG:', err));
    }
});

function positionMenu(menu, e) {
    menu.classList.remove('hidden');
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let left = e.clientX, top = e.clientY;
    if (left + menuWidth > windowWidth) left = windowWidth - menuWidth - 10;
    if (top + menuHeight > windowHeight) top = windowHeight - menuHeight - 10;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
}

editor.canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    contextMenu.classList.add('hidden');
    canvasContextMenu.classList.add('hidden');
    
    let dsContextMenu = document.getElementById('ds-context-menu');
    if (!dsContextMenu) {
        dsContextMenu = document.createElement('div');
        dsContextMenu.id = 'ds-context-menu';
        dsContextMenu.className = 'hidden fixed bg-white shadow-xl rounded-lg border border-gray-200 py-2 w-48 z-50 text-sm';
        dsContextMenu.innerHTML = `
            <button id="ds-round-btn" class="w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 flex items-center gap-3">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"></path><path d="M12 4v16m-8-8h16" stroke-width="2"></path></svg>
                <span>Arredondar Cantos</span>
            </button>
            <button id="ds-delete-btn" class="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-3 border-t border-gray-100 mt-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                <span>Excluir Pontos</span>
            </button>
        `;
        document.body.appendChild(dsContextMenu);
        document.getElementById('ds-round-btn').addEventListener('click', () => {
            editor.activateCornerRounding();
            dsContextMenu.classList.add('hidden');
        });
        document.getElementById('ds-delete-btn').addEventListener('click', () => {
            editor.deleteSelectedComponents();
            dsContextMenu.classList.add('hidden');
        });
    }
    dsContextMenu.classList.add('hidden');

    const rect = editor.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const point = editor.view.viewToProject(new paper.Point(x, y));
    
    if (editor.currentToolName === 'directSelection') {
        const hitResult = editor.project.hitTest(point, { segments: true, tolerance: 10 });
        if (hitResult && hitResult.type === 'segment' && hitResult.segment.selected) {
            positionMenu(dsContextMenu, e);
            return;
        }
    }

    const hitResult = editor.drawLayer.hitTest(point, { segments: true, stroke: true, fill: true, tolerance: 10, curves: true });
    if (hitResult && hitResult.item) {
        let item = hitResult.item;
        while (item.parent && item.parent !== editor.drawLayer) item = item.parent;
        if (!item.selected) editor.setSelected(item);
        if (editor.currentToolName === 'selection') {
            const hasGroup = editor.selectedItems.some(i => i instanceof paper.Group);
            hasGroup ? ctxUngroupBtn.classList.remove('hidden') : ctxUngroupBtn.classList.add('hidden');
            positionMenu(contextMenu, e);
        }
    } else {
        positionMenu(canvasContextMenu, e);
    }
});

ctxClearCanvasBtn.addEventListener('click', () => { confirmModal.classList.remove('hidden'); canvasContextMenu.classList.add('hidden'); });
ctxSetArtboardBtn.addEventListener('click', () => {
    const bounds = editor.artboardBounds;
    artboardWidthInput.value = Math.round(bounds.width);
    artboardHeightInput.value = Math.round(bounds.height);
    artboardModal.classList.remove('hidden');
    canvasContextMenu.classList.add('hidden');
});

closeArtboardModalBtn.addEventListener('click', () => artboardModal.classList.add('hidden'));
confirmArtboardSizeBtn.addEventListener('click', () => {
    const w = parseInt(artboardWidthInput.value), h = parseInt(artboardHeightInput.value);
    if (!isNaN(w) && !isNaN(h)) { editor.setArtboardSize(w, h); artboardModal.classList.add('hidden'); }
});

ctxDeleteBtn.addEventListener('click', () => { editor.deleteSelectedItem(); contextMenu.classList.add('hidden'); });
ctxCopyBtn.addEventListener('click', () => {
    if (editor.selectedItem) {
        const svgCode = editor.getSelectedSVGString();
        navigator.clipboard.writeText(svgCode).then(() => {
            const originalText = ctxCopyBtn.querySelector('span').innerText;
            ctxCopyBtn.querySelector('span').innerText = 'Copied!';
            setTimeout(() => { ctxCopyBtn.querySelector('span').innerText = originalText; }, 1500);
        });
    }
    contextMenu.classList.add('hidden');
});

ctxDownloadBtn.addEventListener('click', () => { editor.downloadSelectedSVG(); contextMenu.classList.add('hidden'); });
ctxDuplicateBtn.addEventListener('click', () => { editor.duplicateSelectedItems(); contextMenu.classList.add('hidden'); });
ctxFlipHBtn.addEventListener('click', () => { flip(editor.selectedItems, 'h'); editor.saveHistory(); contextMenu.classList.add('hidden'); });
ctxFlipVBtn.addEventListener('click', () => { flip(editor.selectedItems, 'v'); editor.saveHistory(); contextMenu.classList.add('hidden'); });
ctxFrontBtn.addEventListener('click', () => { editor.bringToFrontSelected(); contextMenu.classList.add('hidden'); });
ctxBackBtn.addEventListener('click', () => { editor.sendToBackSelected(); contextMenu.classList.add('hidden'); });
ctxGroupBtn.addEventListener('click', () => { editor.groupSelectedItems(); contextMenu.classList.add('hidden'); });
ctxUngroupBtn.addEventListener('click', () => { editor.ungroupSelectedItems(); contextMenu.classList.add('hidden'); });

exportFileBtn.addEventListener('click', () => {
    currentSaveType = 'svg';
    filenameModalTitle.innerText = 'Save SVG';
    filenameExtension.innerText = '.svg';
    filenameModal.classList.remove('hidden');
    filenameInput.focus();
    filenameInput.select();
});

closeFilenameModalBtn.addEventListener('click', () => filenameModal.classList.add('hidden'));

confirmFilenameBtn.addEventListener('click', () => {
    let fileName = filenameInput.value.trim();
    if (!fileName) fileName = 'my-design';
    
    if (currentSaveType === 'svg') {
        if (!fileName.endsWith('.svg')) fileName += '.svg';
        editor.exportSVG(fileName);
    } else {
        if (!fileName.endsWith('.json')) fileName += '.json';
        editor.saveProjectFile(fileName);
    }
    
    filenameModal.classList.add('hidden');
});

copyCodeBtn.addEventListener('click', () => {
    const svgCode = editor.getSVGString();
    navigator.clipboard.writeText(svgCode).then(() => {
        const originalText = copyCodeBtn.innerText;
        copyCodeBtn.innerText = 'Canvas Copied!';
        copyCodeBtn.classList.replace('bg-indigo-600', 'bg-green-600');
        setTimeout(() => { copyCodeBtn.innerText = originalText; copyCodeBtn.classList.replace('bg-green-600', 'bg-indigo-600'); }, 2000);
    }).catch(err => alert('Failed to copy: ' + err));
});

clearCanvasBtn.addEventListener('click', () => confirmModal.classList.remove('hidden'));
cancelClearBtn.addEventListener('click', () => confirmModal.classList.add('hidden'));
confirmClearBtn.addEventListener('click', () => { editor.clearCanvas(); confirmModal.classList.add('hidden'); });
