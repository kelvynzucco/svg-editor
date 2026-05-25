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

const contextMenu = document.getElementById('context-menu');
const ctxDeleteBtn = document.getElementById('ctx-delete');
const ctxCopyBtn = document.getElementById('ctx-copy');
const ctxDownloadBtn = document.getElementById('ctx-download');

const alignBtns = {
    tl: document.getElementById('align-tl'),
    tr: document.getElementById('align-tr'),
    bl: document.getElementById('align-bl'),
    br: document.getElementById('align-br'),
    center: document.getElementById('align-center')
};

const flipBtns = {
    h: document.getElementById('flip-h'),
    v: document.getElementById('flip-v')
};

// Handle Selection UI Updates
window.addEventListener('selectionChanged', (e) => {
    const hasSelection = !!e.detail.item;
    
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
        tolerance: 10
    });

    if (hitResult && hitResult.item) {
        let item = hitResult.item;
        while (item.parent && item.parent !== editor.project.activeLayer) {
            item = item.parent;
        }
        editor.setSelected(item);
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
        align(editor.selectedItem, pos, editor.project.view);
    });
});

Object.entries(flipBtns).forEach(([axis, btn]) => {
    btn.addEventListener('click', () => {
        flip(editor.selectedItem, axis);
    });
});

// Export Handlers (Canvas Scope)
exportFileBtn.addEventListener('click', () => {
    // editor.exportSVG() already exports the whole project by default
    editor.exportSVG();
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
