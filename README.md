# Minimal SVG Editor 🎨

Um editor de vetores (SVG) leve, modular e poderoso construído com **Paper.js**, **Tailwind CSS** e **Vite**. Projetado para ser simples de usar, mas altamente extensível.

## 🚀 Funcionalidades Atuais

- **Ferramenta de Seleção (V):** Selecione, mova, rotacione e redimensione objetos com bounding boxes interativas.
- **Seleção Direta (A):** Manipule pontos (segmentos) individuais de qualquer caminho.
- **Conta-gotas (I):** Capture cores de preenchimento e contorno diretamente do canvas.
- **Transformações Rápidas:**
  - Espelhamento Horizontal (Shift + H) e Vertical (Shift + V).
  - Alinhamento (Esquerda, Centro, Direita, Topo, Meio, Base) em relação ao Artboard.
  - Ordenação (Trazer para Frente `]` / Enviar para Trás `[`).
- **Gestão de Estilo:** Controle preciso de cores (Hex), opacidade e espessura do contorno.
- **Importação/Exportação:**
  - Importação de arquivos `.svg` ou código bruto.
  - Exportação otimizada para `.svg` ou cópia rápida do código para o clipboard.
- **Navegação Fluida:** Pan (Espaço + Drag) e Zoom (Ctrl + Scroll).
- **Sistema de Histórico:** Desfazer (Ctrl+Z) e Refazer (Ctrl+Y/Shift+Z) completo.

## 🛠️ Arquitetura & Modularidade

O projeto foi refatorado recentemente para garantir escalabilidade:

- **Biblioteca de Ícones (`src/ui/icons.js`):** Todos os ícones do sistema estão centralizados em um módulo JavaScript, facilitando a troca global de estilo e mantendo o HTML limpo.
- **Ferramentas Modulares (`src/tools/`):** Cada ferramenta (Seleção, Transformação, etc) possui sua própria lógica isolada, facilitando a implementação de novos recursos (como Caneta ou Formas) sem afetar o núcleo do editor.
- **Núcleo do Editor (`src/editor.js`):** Gerencia o estado do Paper.js, camadas, seleção global e o sistema de desfazer/refazer.

## 📦 Instalação e Desenvolvimento

Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Para gerar a versão de produção:
   ```bash
   npm run build
   ```

## ⌨️ Atalhos Rápidos

| Tecla | Ação |
| :--- | :--- |
| `V` | Ferramenta de Seleção |
| `A` | Ferramenta de Seleção Direta |
| `I` | Conta-gotas |
| `Space + Drag` | Pan no Canvas |
| `Ctrl + Scroll` | Zoom In / Out |
| `Ctrl + Z` | Desfazer |
| `Ctrl + Y` | Refazer |
| `Del / Backspace` | Excluir seleção |
| `]` / `[` | Trazer para frente / Enviar para trás |
| `Shift + H/V` | Espelhar Horizontal/Vertical |

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).
