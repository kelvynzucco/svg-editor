import './style.css';
import { SvgEditor } from './editor';
import { align, flip } from './tools/transform';
import paper from 'paper';
import Picker from 'vanilla-picker';

// Initialize Editor
const editor = new SvgEditor('editor-canvas');

// UI Elements - Header
const importFileBtn = document.getElementById('import-file-btn');
const importFileInput = document.getElementById('import-file');
const importCodeBtn = document.getElementById('import-code-btn');

// UI Elements - Left Toolbar
const selectionToolBtn = document.getElementById('tool-selection');
const eyedropperToolBtn = document.getElementById('tool-eyedropper');

const tools = {
    selection: selectionToolBtn,
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
    editor.setTool(toolName);
}

selectionToolBtn.addEventListener('click', () => setActiveTool('selection'));
eyedropperToolBtn.addEventListener('click', () => setActiveTool('eyedropper'));

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const key = e.key.toLowerCase();
    if (key === 'v') {
        setActiveTool('selection');
    } else if (key === 'i') {
        setActiveTool('eyedropper');
    }
});

// UI Elements - Sidebar Export
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

// Context Menu Elements
const contextMenu = document.getElementById('context-menu');
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

const pContainer = document.getElementById('picker-container');

// PREEMPTIVE COMMIT LOGIC
// Force-commit current picker color before starting other actions
const forceCommitPendingStyle = () => {
    if (!pContainer.classList.contains('hidden') && activePickerType) {
        const type = activePickerType === 'fill' ? 'fillColor' : 'strokeColor';
        const finalHex = sharedPicker.color.hex.substring(0, 7);
        editor.applyStyle(type, finalHex, true); // Atomic history snapshot
        pContainer.classList.add('hidden');
        activePickerType = null;
    }
};

// Listen for tool start in main
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
        fHex.value = hex;
        editor.applyStyle('fillColor', hex, false);
    } else {
        sSwatch.style.backgroundColor = hex;
        sHex.value = hex;
        editor.applyStyle('strokeColor', hex, false);
    }
};

const openPicker = (e, type) => {
    // Commit any other open picker first
    if (activePickerType && activePickerType !== type) forceCommitPendingStyle();
    
    e.stopPropagation();
    activePickerType = type;
    const rect = e.target.getBoundingClientRect();
    pContainer.style.top = `${rect.top}px`;
    pContainer.style.left = `${rect.left - 260}px`; // Moved to left of the sidebar
    const style = editor.getSelectionStyle();
    const currentCol = type === 'fill' ? style?.fillColor : style?.strokeColor;
    sharedPicker.setColor(currentCol || '#000000', true);
    pContainer.classList.remove('hidden');
};

fSwatch.addEventListener('click', (e) => openPicker(e, 'fill'));
sSwatch.addEventListener('click', (e) => openPicker(e, 'stroke'));

// Global click outside to commit and close
window.addEventListener('mousedown', (e) => {
    if (pContainer && !pContainer.contains(e.target) && !fSwatch.contains(e.target) && !sSwatch.contains(e.target)) {
        forceCommitPendingStyle();
    }
});

// Handle Selection UI Updates
window.addEventListener('selectionChanged', (e) => {
    const hasSelection = e.detail.items && e.detail.items.length > 0;
    Object.values(alignBtns).forEach(btn => { if (btn) btn.disabled = !hasSelection; });
    if (hasSelection) {
        const style = editor.getSelectionStyle();
        if (style) {
            // Update Fill UI
            const isFillNone = !style.fillColor || style.fillColor === 'none';
            const hexF = isFillNone ? '#FFFFFF' : style.fillColor.toUpperCase();
            fSwatch.style.backgroundColor = isFillNone ? 'transparent' : hexF;
            fSwatch.style.backgroundImage = isFillNone ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : 'none';
            fSwatch.style.backgroundSize = isFillNone ? '8px 8px' : 'auto';
            fSwatch.style.backgroundPosition = isFillNone ? '0 0, 4px 4px' : '0 0';
            fHex.value = isFillNone ? 'NONE' : hexF;
            
            // Update Stroke UI
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
            
            // Update stroke width ONLY if it's not currently being edited to avoid jumping
            if (document.activeElement !== sWidth) {
                sWidth.value = style.strokeWidth;
            }
            
            if (!pContainer.classList.contains('hidden') && activePickerType) {
                const currentCol = activePickerType === 'fill' ? (isFillNone ? '#FFFFFF' : hexF) : (isStrokeNone ? '#FFFFFF' : hexS);
                sharedPicker.setColor(currentCol, true);
            }
        }
    }
});

// Manual HEX Handlers
const expandHex = (hex) => {
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (/^#[0-9A-F]{3}$/i.test(hex)) {
        return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return hex;
};

fHex.addEventListener('input', (e) => {
    let val = expandHex(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
        fSwatch.style.backgroundColor = val;
        editor.applyStyle('fillColor', val, false);
    }
});
fHex.addEventListener('change', (e) => {
    let val = expandHex(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
        e.target.value = val.toUpperCase();
        editor.applyStyle('fillColor', val, true);
    }
});

sHex.addEventListener('input', (e) => {
    let val = expandHex(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
        sSwatch.style.backgroundColor = val;
        editor.applyStyle('strokeColor', val, false);
    }
});
sHex.addEventListener('change', (e) => {
    let val = expandHex(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
        e.target.value = val.toUpperCase();
        editor.applyStyle('strokeColor', val, true);
    }
});

// Opacity & Width Handlers
fOp.addEventListener('input', (e) => {
    const val = e.target.value / 100;
    fOpVal.innerText = `${e.target.value}%`;
    editor.applyStyle('fillOpacity', val, false);
});
fOp.addEventListener('change', (e) => editor.applyStyle('fillOpacity', e.target.value / 100, true));

sOp.addEventListener('input', (e) => {
    const val = e.target.value / 100;
    sOpVal.innerText = `${e.target.value}%`;
    editor.applyStyle('strokeOpacity', val, false);
});
sOp.addEventListener('change', (e) => editor.applyStyle('strokeOpacity', e.target.value / 100, true));

sWidth.addEventListener('input', (e) => editor.applyStyle('strokeWidth', e.target.value, true));
sWidth.addEventListener('change', (e) => editor.applyStyle('strokeWidth', e.target.value, true));

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    const isTextInput = (e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'number')) || e.target.tagName === 'TEXTAREA';
    
    // Check for undo/redo first to force commit/blur
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
        if (isTextInput) e.target.blur(); 
        e.preventDefault(); 
        forceCommitPendingStyle(); 
        if (e.key === 'z') editor.undo();
        else editor.redo();
        return;
    }

    if (isTextInput) {
        const isAppShortcut = (e.ctrlKey || e.metaKey) && ['g', 'backspace'].includes(e.key.toLowerCase());
        if (!isAppShortcut) return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        editor.deleteSelectedItem();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') { e.preventDefault(); editor.groupSelectedItems(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Backspace') { e.preventDefault(); editor.ungroupSelectedItems(); }
    if (e.key === '[') editor.sendToBackSelected();
    if (e.key === ']') editor.bringToFrontSelected();
    if (e.shiftKey && e.key.toUpperCase() === 'H') { flip(editor.selectedItems, 'h'); editor.saveHistory(); }
    if (e.shiftKey && e.key.toUpperCase() === 'V') { flip(editor.selectedItems, 'v'); editor.saveHistory(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') copySelectedToClipboard();
    if ((e.ctrlKey || e.metaKey) && e.key === 'x') copySelectedToClipboard().then(() => editor.deleteSelectedItem());
});

async function copySelectedToClipboard() {
    if (editor.selectedItem) {
        const svgCode = editor.getSelectedSVGString();
        try { await navigator.clipboard.writeText(svgCode); } catch (err) { console.error('Failed to copy to clipboard:', err); }
    }
}

// Paste Handler
window.addEventListener('paste', async (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;
    const isSvgCode = (str) => {
        const s = str.trim();
        return s.startsWith('<svg') || (s.startsWith('<?xml') && s.includes('<svg'));
    };
    const items = clipboardData.items;
    for (const item of items) {
        if (item.type === 'image/svg+xml') {
            const file = item.getAsFile();
            const text = await file.text();
            if (text) {
                editor.importSVG(text).catch(err => console.error('Error pasting SVG:', err));
                return;
            }
        }
    }
    const text = clipboardData.getData('text/plain');
    if (text && isSvgCode(text)) {
        editor.importSVG(text).catch(err => console.error('Error pasting SVG:', err));
        return;
    }
    const html = clipboardData.getData('text/html');
    if (html && html.includes('<svg')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const svgElement = doc.querySelector('svg');
        if (svgElement) {
            editor.importSVG(svgElement.outerHTML).catch(err => console.error('Error pasting SVG:', err));
        }
    }
});

// Context Menu Logic
editor.canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = editor.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point = editor.view.viewToProject(new paper.Point(x, y));
    const hitResult = editor.project.hitTest(point, { segments: true, stroke: true, fill: true, tolerance: 10, curves: true });
    if (hitResult && hitResult.item) {
        let item = hitResult.item;
        while (item.parent && item.parent !== editor.drawLayer) item = item.parent;
        if (!item.selected) editor.setSelected(item);
    }
    if (editor.selectedItem) {
        const hasGroup = editor.selectedItems.some(item => item instanceof paper.Group);
        hasGroup ? ctxUngroupBtn.classList.remove('hidden') : ctxUngroupBtn.classList.add('hidden');
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.classList.remove('hidden');
    }
});

window.addEventListener('click', () => { contextMenu.classList.add('hidden'); });

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

// Header Handlers
importFileBtn.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => editor.importSVG(ev.target.result).catch(err => alert('Error: ' + err));
    reader.readAsText(file);
});
importCodeBtn.addEventListener('click', () => codeModal.classList.remove('hidden'));
closeModalBtn.addEventListener('click', () => codeModal.classList.add('hidden'));
confirmCodeBtn.addEventListener('click', () => {
    const code = svgCodeInput.value.trim();
    if (code) editor.importSVG(code).then(() => { codeModal.classList.add('hidden'); svgCodeInput.value = ''; }).catch(err => alert('Invalid SVG code: ' + err));
});

// Alignment Handlers
Object.entries(alignBtns).forEach(([pos, btn]) => {
    if (btn) btn.addEventListener('click', () => { align(editor.selectedItems, pos, editor.project.view); editor.updateTransformUI(); editor.saveHistory(); });
});

// Export Handlers
exportFileBtn.addEventListener('click', () => { filenameModal.classList.remove('hidden'); filenameInput.focus(); filenameInput.select(); });
closeFilenameModalBtn.addEventListener('click', () => filenameModal.classList.add('hidden'));
confirmFilenameBtn.addEventListener('click', () => {
    let fileName = filenameInput.value.trim();
    if (!fileName) fileName = 'my-design';
    if (!fileName.endsWith('.svg')) fileName += '.svg';
    editor.exportSVG(fileName);
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

// Clear Canvas Handlers
clearCanvasBtn.addEventListener('click', () => confirmModal.classList.remove('hidden'));
cancelClearBtn.addEventListener('click', () => confirmModal.classList.add('hidden'));
confirmClearBtn.addEventListener('click', () => { editor.clearCanvas(); confirmModal.classList.add('hidden'); });
