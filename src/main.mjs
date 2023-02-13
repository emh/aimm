const state = {
    nodes: [],
    edges: [],
    nextId: 1,
    selectedNodeId: null,
    selectedEdge: null,
    canvas: { height: 0, width: 0 }
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
        state.selectedEdge = null;

        pub('selectNode', { id });
        pub('selectEdge', { from: null, to: null })

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
        } while (index >= 0);

        state.selectedNodeId = null;

        pub('selectNode', { id: null });
    });

    const addButton = el.querySelector('.add-button');
    addButton.addEventListener('mousedown', (event) => {
        event.stopPropagation();
        captureClick();

        if (event.button !== 0 || event.ctrlKey) return;

        const x = event.clientX + viewport.scrollLeft;
        const y = event.clientY + viewport.scrollTop;

        createNewEdge({ id, x, y });

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
    const viewport = document.getElementById('viewport');

    const x = event.clientX + viewport.scrollLeft;
    const y = event.clientY + viewport.scrollTop;

    const node = getNode(state.selectedNodeId);
    const canvas = state.canvas;

    if (x > canvas.width * 0.8 || y > canvas.height * 0.8) {
        if (x > canvas.width * 0.8) canvas.width = canvas.width * 1.2;
        if (y > canvas.height * 0.8) canvas.height = canvas.height * 1.2;

        pub('resizeCanvas');
    }

    node.x = x;
    node.y = y;

    pub('moveNode', { id: state.selectedNodeId });
}

function handleDropNode(event) {
    document.removeEventListener('mousemove', handleDragNode);
    document.removeEventListener('mouseup', handleDropNode);
}

function handleDragNew(event) {
    const x = event.clientX + viewport.scrollLeft;
    const y = event.clientY + viewport.scrollTop;

    updateNewEdge({ x, y });
}

function getTargetEl(el) {
    return el.closest('.node');
}

function handleDropNew(event) {
    const targetEl = getTargetEl(event.target);

    let id;

    removeNewEdge();

    if (targetEl) {
        id = Number(targetEl.id.split('-').pop());
    } else {
        const x = event.clientX + viewport.scrollLeft;
        const y = event.clientY + viewport.scrollTop;

        id = state.nextId++;
        state.nodes.push({ id, value: '', x, y });
        pub('createNode', { id });
    }

    const edge1 = getEdge(state.selectedNodeId, id);
    const edge2 = getEdge(id, state.selectedNodeId);

    if (!edge1 && !edge2) {
        state.edges.push({ from: state.selectedNodeId, to: id, value: '' });
        pub('createEdge', { from: state.selectedNodeId, to: id });
    }

    state.selectedNodeId = id;
    pub('selectNode', { id });

    document.removeEventListener('mousemove', handleDragNew);
    document.removeEventListener('mouseup', handleDropNew);
}

function selectNode({ id }) {
    let el = document.querySelector('.node.selected');

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
    const svg = document.getElementById('paths');
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
    const path = document.getElementById('new-edge-path');

    path.remove();
}

function createEdge({ from, to }) {
    const edge = getEdge(from, to);

    const svg = document.getElementById('paths');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathBg = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    path.id = `edge-path-${from}-${to}`;
    pathBg.id = `edge-path-bg-${from}-${to}`;
    pathBg.classList.add('bg');

    const fromNode = getNode(from);
    const toNode = getNode(to);

    const d = calculatePath(fromNode, toNode);
    const { midX, midY } = calculateMidpoint(fromNode, toNode);

    path.setAttribute('d', d);
    pathBg.setAttribute('d', d);

    svg.append(pathBg, path);

    const template = document.getElementById('edge-template');
    const el = template.content.firstElementChild.cloneNode(true);
    const value = el.querySelector('.value');

    el.id = `edge-${from}-${to}`;
    el.classList.add('edge');
    el.classList.toggle('empty', edge.value === '');
    value.innerText = edge.value;
    el.style.top = `${midY}px`;
    el.style.left = `${midX}px`;

    const clickHandler = (event) => {
        event.stopPropagation();

        if (event.button !== 0 || event.ctrlKey) return;

        state.selectedEdge = { from, to };
        state.selectedNodeId = null;

        pub('selectNode', { id: null });
        pub('selectEdge', { from, to });
    };

    path.addEventListener('click', clickHandler);
    pathBg.addEventListener('click', clickHandler);
    value.addEventListener('click', clickHandler);
    value.addEventListener('input', () => {
        const value = el.innerText;
        const edge = getEdge(from, to);

        edge.value = value;

        pub('edgeChange', { from, to });
    });

    const removeButton = el.querySelector('.remove-button');
    removeButton.addEventListener('mousedown', (event) => event.stopPropagation());
    removeButton.addEventListener('click', (event) => {
        event.stopPropagation();

        let index = state.edges.findIndex((edge) => edge.from === from && edge.to === to);
        state.edges.splice(index, 1);
        pub('removeEdge', { from, to });

        state.selectedEdge = null;

        pub('selectEdge', { from: null, to: null });
    });

    const edges = document.getElementById('edges');

    edges.append(el);
}

function updateEdge({ from, to }) {
    const edge = getEdge(from, to);
    const label = document.getElementById(`edge-${from}-${to}`);

    label.classList.toggle('empty', edge.value === '');
}

function selectEdge(edge) {
    let el = document.querySelector('.edge.selected');

    if (el) {
        el.classList.remove('selected');
    }

    if (edge.from && edge.to) {
        el = document.getElementById(`edge-${edge.from}-${edge.to}`);

        el.classList.add('selected');
        el.querySelector('.value').focus();
    }
}

function updateEdges({ id }) {
    state.edges.forEach(({ from, to }) => {
        if (from === id || to === id) {
            const fromNode = getNode(from);
            const toNode = getNode(to);

            const d = calculatePath(fromNode, toNode);
            const path = document.getElementById(`edge-path-${from}-${to}`);
            const pathBg = document.getElementById(`edge-path-bg-${from}-${to}`);

            path.setAttribute('d', d);
            pathBg.setAttribute('d', d);

            const label = document.getElementById(`edge-${from}-${to}`);
            const { midX, midY } = calculateMidpoint(fromNode, toNode);

            label.style.left = `${midX}px`;
            label.style.top = `${midY}px`;
        }
    });
}

function removeNode({ id }) {
    const el = document.getElementById(`node-${id}`);

    el.remove();
}

function removeEdge({ from, to }) {
    const path = document.getElementById(`edge-path-${from}-${to}`);
    const pathBg = document.getElementById(`edge-path-bg-${from}-${to}`);

    path.remove();
    pathBg.remove();

    const label = document.getElementById(`edge-${from}-${to}`);

    label.remove();
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

    console.log(response);

    const viewport = document.getElementById('viewport');
    const { scrollLeft, scrollTop } = viewport;

    const nodeEl = document.getElementById(`node-${node.id}`);
    const { left, top, width, height } = nodeEl.getBoundingClientRect();

    const x = scrollLeft + left + width / 2 + 250;
    const y = scrollTop + top - height / 2 - 75;

    if (response.status === 'error') {
        showError('Error contacting GPT. Please try again.');
    } else {
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
    }


    pub('fetchFinished');
}

function resizeCanvas() {
    const { height, width } = state.canvas;

    const svg = document.getElementById('paths');
    svg.setAttribute("height", height + "px");
    svg.setAttribute("width", width + "px");

    const div = document.getElementById('canvas');
    div.style.height = `${height}px`;
    div.style.width = `${width}px`;
}

function disableAiButton() {
    const button = document.querySelector('#toolbar .ai-button');

    button.classList.add('processing');
}

function enableAiButton() {
    const button = document.querySelector('#toolbar .ai-button');

    button.classList.remove('processing');
}

function showError(message) {
    const template = document.getElementById('dialog-template');
    const el = template.content.firstElementChild.cloneNode(true);

    el.querySelector('h1').innerText = 'Error';
    el.querySelector('.body').innerText = message;
    el.querySelector('button').addEventListener('click', () => el.remove());

    app.append(el);
    el.showModal();
}

sub('createNode', createNode);
sub('selectNode', selectNode);
sub('moveNode', moveNode);
sub('createEdge', createEdge);
sub('moveNode', updateEdges);
sub('removeNode', removeNode);
sub('removeEdge', removeEdge);
sub('selectEdge', selectEdge);
sub('edgeChange', updateEdge);
sub('resizeCanvas', resizeCanvas);
sub('fetchStarted', disableAiButton);
sub('fetchFinished', enableAiButton)

const app = document.getElementById('app');
const { height, width } = app.getBoundingClientRect();

state.canvas = { width, height };
pub('resizeCanvas');

app.addEventListener('click', () => {
    state.selectedNodeId = null;
    state.selectedEdge = null;
    pub('selectNode', { id: null });
    pub('selectEdge', { from: null, to: null });
});

const toolbarAddButton = document.querySelector('#toolbar .add-button');

toolbarAddButton.addEventListener('click', (event) => {
    const viewport = document.getElementById('viewport');
    const { scrollLeft, scrollTop } = viewport;
    const { width, height } = viewport.getBoundingClientRect();

    event.stopPropagation();
    const id = state.nextId++;
    state.nodes.push({ id, value: '', x: scrollLeft + width / 2, y: scrollTop + height / 2 });
    state.selectedNodeId = id;
    state.selectedEdge = null;

    pub('createNode', { id });
    pub('selectNode', { id });
});

const toolbarAiButton = document.querySelector('#toolbar .ai-button');

toolbarAiButton.addEventListener('click', (event) => {
    event.stopPropagation();

    if (event.target.closest('.processing')) return;

    if (state.selectedNodeId) {
        const node = getNode(state.selectedNodeId);

        if (node.value) {
            fetchRelatedConcepts(node);
        } else {
            showError('The selected concept node is blank. Fill in a concept.');
        }
    } else {
        showError('Select a concept node.');
    }
});

const toolbarRemoveButton = document.querySelector('#toolbar .remove-button');

toolbarRemoveButton.addEventListener('click', (event) => {
    event.stopPropagation();

    state.nodes.forEach(({ id }) => pub('removeNode', { id }));
    state.edges.forEach(({ from, to }) => pub('removeEdge', { from, to }));

    state.nodes = [];
    state.edges = [];
    state.selectedNodeId = null;
    state.selectedEdge = null;
    state.nextId = 1;
});

if (state.nodes.length === 0) {
    const id = state.nextId++;
    state.nodes.push({ id, value: '', x: width / 2, y: height / 2 });
    state.selectedNodeId = id;
    state.selectedEdge = null;

    pub('createNode', { id });
    pub('selectNode', { id });
}
