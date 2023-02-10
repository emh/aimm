import { LitElement, css, html, svg } from "lit";
import './graph-node.mjs';

export class GraphCanvas extends LitElement {
    static properties = {
        nodes: {},
        edges: {}
    };

    static styles = css`
        :host {
        }

        .nodes {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
        }
    `;

    constructor() {
        super();

        this.nodes = [
            { id: 1, value: 'hello', x: 100, y: 100 },
            { id: 2, value: 'world', x: 500, y: 500 },
        ];

        this.edges = [
            { from: 1, to: 2 }
        ];
    }

    generatePath(edge) {
        const from = this.nodes.find((n) => n.id === edge.from);
        const to = this.nodes.find((n) => n.id === edge.to);
        
        console.log(from, to);

        const midX = from.x + (to.x - from.x) * 0.5;
        const path = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;

        return path;
    }

    renderEdges() {
        console.log('renderEdges');
        const svg = this.querySelector('svg');

        svg.innerHTML = '';

        const paths = this.edges.map((edge) => svg`
            <path d=${this.generatePath(edge)}></path>
        `);

        svg.append(paths);
    }

    render() {
        console.log('render');
        const { height, width } = this.parentElement.getBoundingClientRect();

        return html`
            <svg height=${height} width=${width}>
            </svg>
            <div class="nodes">
                ${this.nodes.map((node) => html`
                    <graph-node value=${node.value} x=${node.x} y=${node.y}></graph-node>
                `)}                
            </div>
        `;
    }

    connectedCallback() {
        console.log('connectedCallback');
        super.connectedCallback()

        this.renderEdges();
    }
}

customElements.define('graph-canvas', GraphCanvas);
