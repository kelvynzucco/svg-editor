import './style.css';
import { SvgEditor } from './editor';
import { align, flip } from './tools/transform';

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
