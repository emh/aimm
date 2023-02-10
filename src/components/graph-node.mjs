import { LitElement, css, html } from "lit";
import { styleMap } from 'lit/directives/style-map.js';

export class GraphNode extends LitElement {
    static properties = {
        value: {},
        x: { type: Number },
        y: { type: Number }
    };

    #mouseMoveListener = null;
    #mouseUpLIstener = null;

    static styles = css`
        :host {
            background-color: var(--node-background-color);
            border: solid 1px var(--node-outline-color);
            color: var(--node-text-color);
            position: absolute;
            transform: translate(-50%, -50%);
            border-radius: 5px;
            padding: 5px;
            cursor: pointer;
        }
    `;

    constructor(value, x, y) {
        super();

        this.value = value;
        this.x = y;
        this.y = y;
        this.addEventListener('mousedown', (e) => this.handleDragStart(e));
    }

    handleDragStart(event) {
        if (event.button !== 0 || event.ctrlKey) return;

        this.#mouseMoveListener = (e) => this.handleDrag(e);
        this.#mouseUpLIstener = (e) => this.handleDrop(e);

        document.addEventListener('mousemove', this.#mouseMoveListener);
        document.addEventListener('mouseup', this.#mouseUpLIstener);
    }

    handleDrag(event) {
        const { right, bottom } = this.parentElement.getBoundingClientRect();
        const { height, width } = this.getBoundingClientRect();

        this.x = Math.min(right - width / 2,  Math.max(width / 2, event.clientX));
        this.y = Math.min(bottom - height / 2, Math.max(height / 2, event.clientY));
    }

    handleDrop(event) {
        console.log('drop', event);
        document.removeEventListener('mousemove', this.#mouseMoveListener);
        document.removeEventListener('mouseup', this.#mouseUpLIstener);

        this.#mouseMoveListener = null;
        this.#mouseUpLIstener = null;
    }

    render() {
        return html`
            <style>:host { top: ${this.y}px; left: ${this.x}px }</style>
            ${this.value}
        `;
    }
}

customElements.define('graph-node', GraphNode);
