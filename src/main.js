import './style.css';
import { SvgEditor } from './editor';
import { align, flip } from './tools/transform';
import paper from 'paper';

// Initialize Editor
const editor = new SvgEditor('editor-canvas');

// UI Elements - Header
const importFileBtn = document.getElementById('import-file-btn');
const importFileInput = document.getElementById('import-file');
const importCodeBtn = document.getElementById('import-code-btn');

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

// Handle Selection UI Updates
window.addEventListener('selectionChanged', (e) => {
    const hasSelection = e.detail.items && e.detail.items.length > 0;
    
    // Toggle alignment buttons disabled state
    Object.values(alignBtns).forEach(btn => {
        if (btn) btn.disabled = !hasSelection;
    });
    
    // Update Style UI
    if (hasSelection) {
        const style = editor.getSelectionStyle();
        if (style) {
            const fillCol = document.getElementById('fill-color');
            const fillOp = document.getElementById('fill-opacity');
            const fillOpVal = document.getElementById('fill-opacity-val');
            
            const strokeCol = document.getElementById('stroke-color');
            const strokeOp = document.getElementById('stroke-opacity');
            const strokeOpVal = document.getElementById('stroke-opacity-val');
            const strokeWidth = document.getElementById('stroke-width');

            if (fillCol) fillCol.value = style.fillColor;
            if (fillOp) fillOp.value = style.fillOpacity;
            if (fillOpVal) fillOpVal.innerText = `${Math.round(style.fillOpacity)}%`;
            
            if (strokeCol) strokeCol.value = style.strokeColor;
            if (strokeOp) strokeOp.value = style.strokeOpacity;
            if (strokeOpVal) strokeOpVal.innerText = `${Math.round(style.strokeOpacity)}%`;
            
            if (strokeWidth) strokeWidth.value = style.strokeWidth;
        }
    }
});

// Style Handlers
document.getElementById('fill-color').addEventListener('input', (e) => {
    editor.applyStyle('fillColor', e.target.value, false);
});
document.getElementById('fill-color').addEventListener('change', (e) => {
    editor.applyStyle('fillColor', e.target.value, true);
});

document.getElementById('fill-opacity').addEventListener('input', (e) => {
    const val = e.target.value / 100;
    document.getElementById('fill-opacity-val').innerText = `${e.target.value}%`;
    editor.applyStyle('fillOpacity', val, false);
});
document.getElementById('fill-opacity').addEventListener('change', (e) => {
    const val = e.target.value / 100;
    editor.applyStyle('fillOpacity', val, true);
});

document.getElementById('stroke-color').addEventListener('input', (e) => {
    editor.applyStyle('strokeColor', e.target.value, false);
});
document.getElementById('stroke-color').addEventListener('change', (e) => {
    editor.applyStyle('strokeColor', e.target.value, true);
});

document.getElementById('stroke-opacity').addEventListener('input', (e) => {
    const val = e.target.value / 100;
    document.getElementById('stroke-opacity-val').innerText = `${e.target.value}%`;
    editor.applyStyle('strokeOpacity', val, false);
});
document.getElementById('stroke-opacity').addEventListener('change', (e) => {
    const val = e.target.value / 100;
    editor.applyStyle('strokeOpacity', val, true);
});

document.getElementById('stroke-width').addEventListener('input', (e) => {
    editor.applyStyle('strokeWidth', e.target.value, false);
});
document.getElementById('stroke-width').addEventListener('change', (e) => {
    editor.applyStyle('strokeWidth', e.target.value, true);
});

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        editor.deleteSelectedItem();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        editor.undo();
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        editor.groupSelectedItems();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Backspace') {
        e.preventDefault();
        editor.ungroupSelectedItems();
    }

    if (e.key === '[') {
        editor.sendToBackSelected();
    }

    if (e.key === ']') {
        editor.bringToFrontSelected();
    }

    if (e.shiftKey && e.key.toUpperCase() === 'H') {
        flip(editor.selectedItems, 'h');
        editor.saveHistory();
    }

    if (e.shiftKey && e.key.toUpperCase() === 'V') {
        flip(editor.selectedItems, 'v');
        editor.saveHistory();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        copySelectedToClipboard();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        copySelectedToClipboard().then(() => {
            editor.deleteSelectedItem();
        });
    }
});

async function copySelectedToClipboard() {
    if (editor.selectedItem) {
        const svgCode = editor.getSelectedSVGString();
        try {
            await navigator.clipboard.writeText(svgCode);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
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
    const hitResult = editor.project.hitTest(point, {
        segments: true, stroke: true, fill: true, tolerance: 10, curves: true
    });

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

window.addEventListener('click', () => {
    contextMenu.classList.add('hidden');
});

ctxDeleteBtn.addEventListener('click', () => {
    editor.deleteSelectedItem();
    contextMenu.classList.add('hidden');
});

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

ctxDownloadBtn.addEventListener('click', () => {
    editor.downloadSelectedSVG();
    contextMenu.classList.add('hidden');
});

ctxDuplicateBtn.addEventListener('click', () => {
    editor.duplicateSelectedItems();
    contextMenu.classList.add('hidden');
});

ctxFlipHBtn.addEventListener('click', () => {
    flip(editor.selectedItems, 'h');
    editor.saveHistory();
    contextMenu.classList.add('hidden');
});

ctxFlipVBtn.addEventListener('click', () => {
    flip(editor.selectedItems, 'v');
    editor.saveHistory();
    contextMenu.classList.add('hidden');
});

ctxFrontBtn.addEventListener('click', () => {
    editor.bringToFrontSelected();
    contextMenu.classList.add('hidden');
});

ctxBackBtn.addEventListener('click', () => {
    editor.sendToBackSelected();
    contextMenu.classList.add('hidden');
});

ctxGroupBtn.addEventListener('click', () => {
    editor.groupSelectedItems();
    contextMenu.classList.add('hidden');
});

ctxUngroupBtn.addEventListener('click', () => {
    editor.ungroupSelectedItems();
    contextMenu.classList.add('hidden');
});

// Import Handlers
importFileBtn.addEventListener('click', () => {
    importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        editor.importSVG(ev.target.result).catch(err => alert('Error: ' + err));
    };
    reader.readAsText(file);
});

importCodeBtn.addEventListener('click', () => {
    codeModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    codeModal.classList.add('hidden');
});

confirmCodeBtn.addEventListener('click', () => {
    const code = svgCodeInput.value.trim();
    if (code) {
        editor.importSVG(code).then(() => {
            codeModal.classList.add('hidden');
            svgCodeInput.value = '';
        }).catch(err => alert('Invalid SVG code: ' + err));
    }
});

// Alignment Handlers
Object.entries(alignBtns).forEach(([pos, btn]) => {
    if (btn) {
        btn.addEventListener('click', () => {
            align(editor.selectedItems, pos, editor.project.view);
            editor.saveHistory();
        });
    }
});

// Export Handlers
exportFileBtn.addEventListener('click', () => {
    filenameModal.classList.remove('hidden');
    filenameInput.focus();
    filenameInput.select();
});

closeFilenameModalBtn.addEventListener('click', () => {
    filenameModal.classList.add('hidden');
});

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
        setTimeout(() => {
            copyCodeBtn.innerText = originalText;
            copyCodeBtn.classList.replace('bg-green-600', 'bg-indigo-600');
        }, 2000);
    }).catch(err => alert('Failed to copy: ' + err));
});

// Clear Canvas Handlers
clearCanvasBtn.addEventListener('click', () => {
    confirmModal.classList.remove('hidden');
});

cancelClearBtn.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
});

confirmClearBtn.addEventListener('click', () => {
    editor.clearCanvas();
    confirmModal.classList.add('hidden');
});
