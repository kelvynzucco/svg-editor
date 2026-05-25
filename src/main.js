import './style.css';
import { SvgEditor } from './editor';
import { align, flip } from './tools/transform';
import paper from 'paper';

// Initialize Editor
const editor = new SvgEditor('editor-canvas');

// UI Elements
const importFileInput = document.getElementById('import-file');
const importCodeBtn = document.getElementById('import-code');
const codeModal = document.getElementById('code-modal');
const closeModalBtn = document.getElementById('close-modal');
const confirmCodeBtn = document.getElementById('confirm-code');
const svgCodeInput = document.getElementById('svg-code-input');

const exportFileBtn = document.getElementById('export-file');
const copyCodeBtn = document.getElementById('copy-code');
const clearCanvasBtn = document.getElementById('clear-canvas');

const contextMenu = document.getElementById('context-menu');
const ctxDeleteBtn = document.getElementById('ctx-delete');
const ctxCopyBtn = document.getElementById('ctx-copy');
const ctxDownloadBtn = document.getElementById('ctx-download');
const ctxDuplicateBtn = document.getElementById('ctx-duplicate');
const ctxGroupBtn = document.getElementById('ctx-group');
const ctxUngroupBtn = document.getElementById('ctx-ungroup');

const alignBtns = {
    left: document.getElementById('align-left'),
    'h-center': document.getElementById('align-h-center'),
    right: document.getElementById('align-right'),
    top: document.getElementById('align-top'),
    'v-center': document.getElementById('align-v-center'),
    bottom: document.getElementById('align-bottom')
};

const flipBtns = {
    h: document.getElementById('flip-h'),
    v: document.getElementById('flip-v')
};

// Handle Selection UI Updates
window.addEventListener('selectionChanged', (e) => {
    const hasSelection = e.detail.items && e.detail.items.length > 0;
    
    Object.values(alignBtns).forEach(btn => btn.disabled = !hasSelection);
    Object.values(flipBtns).forEach(btn => btn.disabled = !hasSelection);
});

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    // Check if user is typing in an input or textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Delete Shortcut
    if (e.key === 'Delete' || e.key === 'Backspace') {
        editor.deleteSelectedItem();
    }

    // Ctrl+Z (Undo)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        editor.undo();
    }

    // Ctrl+C (Copy)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        copySelectedToClipboard();
    }

    // Ctrl+X (Cut)
    if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        copySelectedToClipboard().then(() => {
            editor.deleteSelectedItem();
        });
    }
});

// Helper to copy selected item
async function copySelectedToClipboard() {
    if (editor.selectedItem) {
        const svgCode = editor.getSelectedSVGString();
        
        try {
            await navigator.clipboard.writeText(svgCode);
            // Optional: Provide some visual feedback? 
            // Since there's no UI for this, we'll just log or trust the clipboard
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    }
}

// Paste Handler
window.addEventListener('paste', async (e) => {
    // Check if user is typing in an input or textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const isSvgCode = (str) => {
        const s = str.trim();
        return s.startsWith('<svg') || (s.startsWith('<?xml') && s.includes('<svg'));
    };

    // 1. Try image/svg+xml first (most specific)
    const items = clipboardData.items;
    for (const item of items) {
        if (item.type === 'image/svg+xml') {
            const file = item.getAsFile();
            const text = await file.text();
            if (text) {
                editor.importSVG(text).catch(err => console.error('Error pasting image/svg+xml:', err));
                return;
            }
        }
    }

    // 2. Check for text/plain (standard SVG code)
    const text = clipboardData.getData('text/plain');
    if (text && isSvgCode(text)) {
        editor.importSVG(text).catch(err => console.error('Error pasting text/plain SVG:', err));
        return;
    }

    // 3. Check for text/html (Figma/Illustrator often wrap SVG in HTML)
    const html = clipboardData.getData('text/html');
    if (html && html.includes('<svg')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const svgElement = doc.querySelector('svg');
        if (svgElement) {
            editor.importSVG(svgElement.outerHTML).catch(err => console.error('Error pasting text/html SVG:', err));
        }
    }
});

// Context Menu Logic
editor.canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    // Check if we clicked on an item to select it first
    const rect = editor.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert DOM coordinates to project coordinates
    const point = editor.view.viewToProject(new paper.Point(x, y));
    const hitResult = editor.project.hitTest(point, {
        segments: true,
        stroke: true,
        fill: true,
        tolerance: 10,
        curves: true
    });

    if (hitResult && hitResult.item) {
        let item = hitResult.item;
        while (item.parent && item.parent !== editor.project.activeLayer) {
            item = item.parent;
        }
        
        // If the item is not already selected, select only it
        // Otherwise, keep the current multi-selection
        if (!item.selected) {
            editor.setSelected(item);
        }
    }

    if (editor.selectedItem) {
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
        // Export only the selected item wrapped in an <svg> tag
        const svgCode = editor.getSelectedSVGString();
        
        navigator.clipboard.writeText(svgCode).then(() => {
            const originalText = ctxCopyBtn.innerText;
            ctxCopyBtn.innerText = 'Copied!';
            setTimeout(() => {
                ctxCopyBtn.innerText = originalText;
            }, 1500);
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

ctxGroupBtn.addEventListener('click', () => {
    editor.groupSelectedItems();
    contextMenu.classList.add('hidden');
});

ctxUngroupBtn.addEventListener('click', () => {
    editor.ungroupSelectedItems();
    contextMenu.classList.add('hidden');
});

// Import Handlers
importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        editor.importSVG(event.target.result)
            .catch(err => alert('Error importing SVG: ' + err));
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
        editor.importSVG(code)
            .then(() => {
                codeModal.classList.add('hidden');
                svgCodeInput.value = '';
            })
            .catch(err => alert('Invalid SVG code: ' + err));
    }
});

// Transform Handlers
Object.entries(alignBtns).forEach(([pos, btn]) => {
    btn.addEventListener('click', () => {
        align(editor.selectedItems, pos, editor.project.view);
        editor.saveHistory();
    });
});

Object.entries(flipBtns).forEach(([axis, btn]) => {
    btn.addEventListener('click', () => {
        flip(editor.selectedItems, axis);
        editor.saveHistory();
    });
});

// Export Handlers (Canvas Scope)
const filenameModal = document.getElementById('filename-modal');
const filenameInput = document.getElementById('filename-input');
const closeFilenameModalBtn = document.getElementById('close-filename-modal');
const confirmFilenameBtn = document.getElementById('confirm-filename');

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
    // Get the full project SVG string
    const svgCode = editor.getSVGString();
    navigator.clipboard.writeText(svgCode).then(() => {
        const originalText = copyCodeBtn.innerText;
        copyCodeBtn.innerText = 'Canvas Copied!';
        copyCodeBtn.classList.replace('bg-indigo-600', 'bg-green-600');
        
        setTimeout(() => {
            copyCodeBtn.innerText = originalText;
            copyCodeBtn.classList.replace('bg-green-600', 'bg-indigo-600');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Could not copy canvas to clipboard.');
    });
});

// Clear Canvas Logic
const confirmModal = document.getElementById('confirm-modal');
const cancelClearBtn = document.getElementById('cancel-clear');
const confirmClearBtn = document.getElementById('confirm-clear');

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
