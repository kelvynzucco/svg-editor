# Minimal SVG Editor 🎨

A lightweight, modular, and powerful vector (SVG) editor built with **Paper.js**, **Tailwind CSS**, and **Vite**. Designed to be simple to use yet highly extensible.

## 🚀 Current Features

- **Selection Tool (V):** Select, move, rotate, and resize objects with interactive bounding boxes.
- **Direct Selection Tool (A):** Manipulate individual points (segments) of any path.
- **Eyedropper (I):** Capture fill and stroke colors directly from the canvas.
- **Quick Transformations:**
  - Horizontal Flip (Shift + H) and Vertical Flip (Shift + V).
  - Alignment (Left, Center, Right, Top, Middle, Bottom) relative to the Artboard.
  - Ordering (Bring to Front `]` / Send to Back `[`).
- **Style Management:** Precise control over colors (Hex), opacity, and stroke width.
- **Import/Export:**
  - Import `.svg` files or raw SVG code.
  - Optimized export to `.svg` or quick copy of code to clipboard.
- **Smooth Navigation:** Pan (Space + Drag) and Zoom (Ctrl + Scroll).
- **History System:** Full Undo (Ctrl+Z) and Redo (Ctrl+Y/Shift+Z).

## 🛠️ Architecture & Modularity

The project was recently refactored to ensure scalability:

- **Icon Library (`src/ui/icons.js`):** All system icons are centralized in a JavaScript module, facilitating global style changes and keeping the HTML clean.
- **Modular Tools (`src/tools/`):** Each tool (Selection, Transformation, etc.) has its own isolated logic, making it easy to implement new features (like Pen or Shapes) without affecting the core editor.
- **Editor Core (`src/editor.js`):** Manages the Paper.js state, layers, global selection, and the undo/redo system.

## 📦 Installation and Development

Make sure you have [Node.js](https://nodejs.org/) installed.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## ⌨️ Quick Shortcuts

| Key | Action |
| :--- | :--- |
| `V` | Selection Tool |
| `A` | Direct Selection Tool |
| `I` | Eyedropper Tool |
| `Space + Drag` | Pan Canvas |
| `Ctrl + Scroll` | Zoom In / Out |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Del / Backspace` | Delete selection |
| `]` / `[` | Bring to front / Send to back |
| `Shift + H/V` | Flip Horizontal/Vertical |

## 📄 License

This project is licensed under the [MIT](LICENSE) License.
