const state = {
    nodes: [],
    edges: [],
    nextId: 1,
    selectedNodeId: null
};

const getNode = (id) => state.nodes.find((node) => node.id === id);
const getEdge = (from, to) => state.edges.find((edge) => edge.from === from && edge.to === to);

const subscribers = [];

const sub = (type, fn) => subscribers.push({ type, fn });
const pub = (type, details) => {
    console.log(type, details);
    subscribers.filter((s) => s.type === type).forEach((s) => s.fn(details));
};

function captureClick() {
    const clickHandler = (e) => e.stopPropagation();

    window.addEventListener('click', clickHandler, { capture: true });
    window.addEventListener('mouseup', e => {
        requestAnimationFrame(() => {
            window.removeEventListener('click', clickHandler, { capture: true });
        });
    }, { once: true });
}

function createNode({ id }) {
    const node = getNode(id);

    const template = document.getElementById('node-template');
    const el = template.content.firstElementChild.cloneNode(true);
    el.id = `node-${id}`;
    el.style.top = `${node.y}px`;
    el.style.left = `${node.x}px`;

    el.addEventListener('mousedown', (event) => {
        if (event.button !== 0 || event.ctrlKey) return;

        state.selectedNodeId = id;

        pub('selectNode', { id });

        document.addEventListener('mousemove', handleDragNode);
        document.addEventListener('mouseup', handleDropNode);
    });
    el.addEventListener('click', (event) => event.stopPropagation());

    const removeButton = el.querySelector('.remove-button');
    removeButton.addEventListener('mousedown', (event) => event.stopPropagation());
    removeButton.addEventListener('click', (event) => {
        event.stopPropagation();

        let index = state.nodes.findIndex((node) => node.id === id);
        state.nodes.splice(index, 1);
        pub('removeNode', { id });

        do {
            index = state.edges.findIndex((edge) => edge.from === id || edge.to === id);

            if (index >= 0) {
                const edge = state.edges[index];

                state.edges.splice(index, 1);

                pub('removeEdge', { from: edge.from, to: edge.to });
            }
        } while(index >= 0);

        state.selectedNodeId = null;

        pub('selectNode', { id: null });
    });

    const addButton = el.querySelector('.add-button');
    addButton.addEventListener('mousedown', (event) => {
        event.stopPropagation();
        captureClick();

        if (event.button !== 0 || event.ctrlKey) return;

        createNewEdge({ id, x: event.clientX, y: event.clientY });

        document.addEventListener('mousemove', handleDragNew);
        document.addEventListener('mouseup', handleDropNew);
    });
    addButton.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
    });

    const value = el.querySelector('.value');
    value.innerText = node.value;
    value.addEventListener('input', () => {
        const value = el.innerText;
        const node = getNode(id);

        node.value = value;

        pub('nodeChange', { id });
    });

    const nodes = document.getElementById('nodes');

    nodes.append(el);
}

function handleDragNode(event) {
    const el = document.getElementById(`node-${state.selectedNodeId}`);
    const app = document.getElementById('app');

    const { right, bottom } = app.getBoundingClientRect();
    const { height, width } = el.getBoundingClientRect();

    const x = Math.min(right - width / 2, Math.max(width / 2, event.clientX));
    const y = Math.min(bottom - height / 2, Math.max(height / 2, event.clientY));

    const node = getNode(state.selectedNodeId);

    node.x = x;
    node.y = y;

    pub('moveNode', { id: state.selectedNodeId });
}

function handleDropNode(event) {
    document.removeEventListener('mousemove', handleDragNode);
    document.removeEventListener('mouseup', handleDropNode);
}

function handleDragNew(event) {
    updateNewEdge({ x: event.clientX, y: event.clientY });
}

function handleDropNew(event) {
    removeNewEdge();

    const id = state.nextId++;
    state.nodes.push({ id, value: '', x: event.clientX, y: event.clientY });
    state.edges.push({ from: state.selectedNodeId, to: id, value: '' });

    pub('createNode', { id });
    pub('createEdge', { from: state.selectedNodeId, to: id });

    state.selectedNodeId = id;
    pub('selectNode', { id });

    document.removeEventListener('mousemove', handleDragNew);
    document.removeEventListener('mouseup', handleDropNew);
}

function selectNode({ id }) {
    let el = document.querySelector('.selected');

    if (el) {
        el.classList.remove('selected');
    }

    if (id) {
        el = document.getElementById(`node-${id}`);

        el.classList.add('selected');
        el.querySelector('.value').focus();
    }
}

function moveNode({ id }) {
    const node = getNode(id);
    const el = document.getElementById(`node-${id}`);

    el.style.top = `${node.y}px`;
    el.style.left = `${node.x}px`;
}

function calculateMidpoint({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const midX = x1 + (x2 - x1) * 0.5;
    const midY = y1 + (y2 - y1) * 0.5;

    return { midX, midY };
}

function calculatePath({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    let d = '';

    const { midX, midY } = calculateMidpoint({ x: x1, y: y1 }, { x: x2, y: y2 });

    if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) {
        d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
    } else {
        d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
    }

    return d;
}

function createNewEdge({ id, x, y }) {
    const svg = document.querySelector('svg.canvas');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const fromNode = getNode(id);
    const d = calculatePath(fromNode, { x, y });

    path.id = `new-edge-path`;
    path.setAttribute('stroke-dasharray', 5);
    path.setAttribute('d', d);
    svg.append(path);
}

function updateNewEdge({ x, y }) {
    const path = document.getElementById('new-edge-path');
    const fromNode = getNode(state.selectedNodeId);
    const d = calculatePath(fromNode, { x, y });

    path.setAttribute('d', d);
}

function removeNewEdge() {
    const svg = document.querySelector('svg.canvas');
    const path = document.getElementById('new-edge-path');

    svg.removeChild(path);
}

function createEdge({ from, to }) {
    const edge = getEdge(from, to);

    const svg = document.querySelector('svg.canvas');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    path.id = `edge-path-${from}-${to}`;

    const fromNode = getNode(from);
    const toNode = getNode(to);

    const d = calculatePath(fromNode, toNode);
    const { midX, midY } = calculateMidpoint(fromNode, toNode);

    path.setAttribute('d', d);

    svg.append(path);

    const template = document.getElementById('edge-template');
    const el = template.content.firstElementChild.cloneNode(true);

    el.id = `edge-${from}-${to}`;
    el.classList.add('edge');
    el.innerText = edge.value;
    el.style.top = `${midY}px`;
    el.style.left = `${midX}px`;

    el.addEventListener('input', () => {
        const value = el.innerText;
        const edge = getEdge(from, to);

        edge.value = value;

        pub('edgeChange', { from, to });
    });

    const edges = document.getElementById('edges');

    edges.append(el);
}

function updateEdges({ id }) {
    state.edges.forEach(({ from, to }) => {
        if (from === id || to === id) {
            const fromNode = getNode(from);
            const toNode = getNode(to);

            const d = calculatePath(fromNode, toNode);
            const path = document.getElementById(`edge-path-${from}-${to}`);

            path.setAttribute('d', d);

            const label = document.getElementById(`edge-${from}-${to}`);
            const { midX, midY } = calculateMidpoint(fromNode, toNode);

            label.style.left = `${midX}px`;
            label.style.top = `${midY}px`;
        }
    });
}

function removeNode({ id }) {
    const el = document.getElementById(`node-${id}`);
    const nodes = document.getElementById('nodes');

    nodes.removeChild(el);
}

function removeEdge({ from, to }) {
    const path = document.getElementById(`edge-path-${from}-${to}`);
    const svg = document.querySelector('svg.canvas');

    svg.removeChild(path);

    const label = document.getElementById(`edge-${from}-${to}`);
    const edges = document.getElementById('edges');

    edges.removeChild(label);
}

async function fetchRelatedConcepts(node) {
    pub('fetchStarted');

    const response = await (await fetch('/api/ai', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            concept: node.value
        })
    })).json();

    const nodeEl = document.getElementById(`node-${node.id}`);
    const { left, top, width, height } = nodeEl.getBoundingClientRect();

    const x = left + width / 2 + 250;
    const y = top - height / 2 - 75;

    response.connections.forEach((connection, i) => {
        let targetNode = state.nodes.find((n) => n.value === connection.concept);

        if (!targetNode) {
            const id = state.nextId++;
            targetNode = { id, value: connection.concept, x, y: y + i * 50 };
            state.nodes.push(targetNode);
            pub('createNode', { id });
        }

        const edge = state.edges.find((e) => e.from === node.id && e.to === targetNode.id);

        if (!edge) {
            state.edges.push({ from: node.id, to: targetNode.id, value: connection.relationship });
            pub('createEdge', { from: node.id, to: targetNode.id });
        }
    });

    pub('fetchFinished');
}

sub('createNode', createNode);
sub('selectNode', selectNode);
sub('moveNode', moveNode);
sub('createEdge', createEdge);
sub('moveNode', updateEdges);
sub('removeNode', removeNode);
sub('removeEdge', removeEdge);

const app = document.getElementById('app');
const { height, width } = app.getBoundingClientRect();
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

svg.classList.add('canvas');
svg.setAttribute("height", height + "px");
svg.setAttribute("width", width + "px");

app.append(svg);
app.addEventListener('click', () => {
    console.log('click');
    state.selectedNodeId = null;
    pub('selectNode', { id: null });
});

if (state.nodes.length === 0) {
    const id = state.nextId++;
    state.nodes.push({ id, value: '', x: width / 2, y: height / 2 });
    state.selectedNodeId = id;

    pub('createNode', { id });
    pub('selectNode', { id });
}
