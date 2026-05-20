// calculator-app.js – Calculator window

function loadCalculator(container, win) {
    container.innerHTML = `
        <div style="background:rgba(0,0,0,0.3);padding:16px;border-radius:12px;text-align:right;font-size:28px;color:#f1f5f9;min-height:50px;" id="calc-display-${win.id}">0</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;" id="calc-buttons-${win.id}"></div>
    `;
    const display = container.querySelector(`#calc-display-${win.id}`);
    const btnsGrid = container.querySelector(`#calc-buttons-${win.id}`);
    const buttons = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', '.', '='];
    let state = { current: '0', previous: '', operator: '', shouldReset: false };
    buttons.forEach(btn => {
        const b = document.createElement('button');
        b.textContent = btn;
        b.style.cssText = 'padding:14px;font-size:16px;border:none;border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.08);color:#e2e8f0;';
        b.addEventListener('click', () => handleCalcButton(btn, state, display));
        btnsGrid.appendChild(b);
    });
}

function handleCalcButton(btn, state, display) {
    if (btn === 'C') { state.current = '0'; state.previous = ''; state.operator = ''; state.shouldReset = false; }
    else if (btn === '⌫') state.current = state.current.length > 1 ? state.current.slice(0, -1) : '0';
    else if (btn === '±') state.current = state.current.startsWith('-') ? state.current.slice(1) : '-' + state.current;
    else if (['+', '−', '×', '÷'].includes(btn)) {
        if (state.operator && !state.shouldReset) state.current = String(compute(state.previous, state.current, state.operator));
        state.previous = state.current; state.operator = btn; state.shouldReset = true;
    } else if (btn === '=') {
        if (state.operator && state.previous) { state.current = String(compute(state.previous, state.current, state.operator)); state.previous = ''; state.operator = ''; }
        state.shouldReset = true;
    } else if (btn === '%') { state.current = String(parseFloat(state.current) / 100); state.shouldReset = true; }
    else {
        if (state.shouldReset) { state.current = btn; state.shouldReset = false; }
        else state.current = state.current === '0' ? btn : state.current + btn;
    }
    let displayVal = state.current;
    if (displayVal.length > 12) displayVal = parseFloat(displayVal).toExponential(6);
    display.textContent = displayVal;
}

function compute(a, b, op) {
    const na = parseFloat(a), nb = parseFloat(b);
    switch (op) {
        case '+': return na + nb;
        case '−': return na - nb;
        case '×': return na * nb;
        case '÷': return nb !== 0 ? na / nb : 'Error';
        default: return nb;
    }
}