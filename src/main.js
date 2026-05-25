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

    if (e.key === 'Delete' || e.key === 'Backspace') {
        editor.deleteSelectedItem();
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
        // Export the project but restricted to the selected item's bounds
        // This ensures we get a full <svg> tag with a proper viewBox
        const svgCode = editor.project.exportSVG({ 
            asString: true,
            bounds: editor.selectedItem.strokeBounds 
        });
        
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

// Export Handlers
exportFileBtn.addEventListener('click', () => {
    editor.exportSVG();
});

copyCodeBtn.addEventListener('click', () => {
    const svgCode = editor.getSVGString();
    navigator.clipboard.writeText(svgCode).then(() => {
        const originalText = copyCodeBtn.innerText;
        copyCodeBtn.innerText = 'Copied!';
        copyCodeBtn.classList.replace('bg-indigo-600', 'bg-green-600');
        
        setTimeout(() => {
            copyCodeBtn.innerText = originalText;
            copyCodeBtn.classList.replace('bg-green-600', 'bg-indigo-600');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Could not copy to clipboard.');
    });
});
