const { isNonTerminal } = require("./grammarFunctions");


function productionList(grammar) {
    const list = [{ head: "S'", body: [grammar.start] }];
    for (const head of grammar.nonTerminals) {
        for (const body of grammar.productions[head]) {
            list.push({ head, body });
        }
    }
    return list;
}


function encodeItem(prodId, dot) {
    return `${prodId}:${dot}`;
}

function decodeItem(item) {
    const [prodId, dot] = item.split(":");
    return { prodId: Number(prodId), dot: Number(dot) };
}

function sortItems(items) {
    return Array.from(items).sort((a, b) => {
        const x = decodeItem(a);
        const y = decodeItem(b);
        return x.prodId - y.prodId || x.dot - y.dot;
    });
}


function formatItem(prods, item) {
    const { prodId, dot } = decodeItem(item);
    const { head, body } = prods[prodId];
    const left = body.slice(0, dot).join("");
    const right = body.slice(dot).join("");
    return `${head} -> ${left}.${right}`;
}


function closure(grammar, prods, items) {
    const result = new Set(items);
    let changed = true;

    while (changed) {
        changed = false;
        for (const item of Array.from(result)) {
            const { prodId, dot } = decodeItem(item);
            const body = prods[prodId].body;
            if (dot >= body.length) {
                continue;
            }
            const next = body[dot];
            if (!isNonTerminal(grammar, next)) {
                continue;
            }
            for (let p = 0; p < prods.length; p++) {
                if (prods[p].head === next) {
                    const newItem = encodeItem(p, 0);
                    if (!result.has(newItem)) {
                        result.add(newItem);
                        changed = true;
                    }
                }
            }
        }
    }
    return result;
}


function goTo(grammar, prods, items, symbol) {
    const moved = new Set();
    for (const item of items) {
        const { prodId, dot } = decodeItem(item);
        const body = prods[prodId].body;
        if (dot < body.length && body[dot] === symbol) {
            moved.add(encodeItem(prodId, dot + 1));
        }
    }
    return closure(grammar, prods, moved);
}


function buildSLR1(grammar, follow) {
    const prods = productionList(grammar);
    const symbols = [...grammar.terminals, ...grammar.nonTerminals];

    const states = [];      
    const stateIndex = {}; 
    const gotoMap = [];     

    function addState(items) {
        const sorted = sortItems(items);
        const key = sorted.join("|");
        if (stateIndex[key] === undefined) {
            stateIndex[key] = states.length;
            states.push(sorted);
            gotoMap.push({});
        }
        return stateIndex[key];
    }

    addState(closure(grammar, prods, new Set([encodeItem(0, 0)])));

    
    for (let i = 0; i < states.length; i++) {
        for (const symbol of symbols) {
            const target = goTo(grammar, prods, states[i], symbol);
            if (target.size > 0) {
                gotoMap[i][symbol] = addState(target);
            }
        }
    }

    const action = states.map(() => ({}));
    const gotoTable = states.map(() => ({}));
    const conflicts = [];

    function describe(act) {
        if (act.type === "shift") {
            return `shift ${act.state}`;
        }
        if (act.type === "accept") {
            return "accept";
        }
        const { head, body } = prods[act.prod];
        return `reduce ${head} -> ${body.length === 0 ? "e" : body.join("")}`;
    }

    function setAction(state, symbol, newAction) {
        const current = action[state][symbol];
        if (current === undefined) {
            action[state][symbol] = newAction;
        } else if (JSON.stringify(current) !== JSON.stringify(newAction)) {
            conflicts.push(`state ${state}, symbol ${symbol}: ${describe(current)} / ${describe(newAction)}`);
        }
    }

    states.forEach((items, i) => {
        for (const item of items) {
            const { prodId, dot } = decodeItem(item);
            const { head, body } = prods[prodId];

            if (dot < body.length) {
                const next = body[dot];
                if (!isNonTerminal(grammar, next)) {
                    setAction(i, next, { type: "shift", state: gotoMap[i][next] });
                }
            } else if (prodId === 0) {
                setAction(i, "$", { type: "accept" });
            } else {
                for (const symbol of follow[head]) {
                    setAction(i, symbol, { type: "reduce", prod: prodId });
                }
            }
        }

        for (const nonTerminal of grammar.nonTerminals) {
            if (gotoMap[i][nonTerminal] !== undefined) {
                gotoTable[i][nonTerminal] = gotoMap[i][nonTerminal];
            }
        }
    });

    return {
        prods,
        states,
        gotoMap,
        action,
        goto: gotoTable,
        conflicts,
        isSLR1: conflicts.length === 0
    };
}

function parseSLR1(grammar, slr, input) {
    const tokens = [...Array.from(input), "$"];
    const stateStack = [0];
    const symbolStack = [];
    const steps = [];
    let position = 0;

    while (true) {
        const state = stateStack[stateStack.length - 1];
        const current = tokens[position];
        const act = slr.action[state][current];

        let stackText = String(stateStack[0]);
        for (let i = 0; i < symbolStack.length; i++) {
            stackText += ` ${symbolStack[i]} ${stateStack[i + 1]}`;
        }
        const inputText = tokens.slice(position).join("");

        if (act === undefined) {
            steps.push({ stack: stackText, input: inputText, action: "error" });
            return { accepted: false, steps };
        }

        if (act.type === "accept") {
            steps.push({ stack: stackText, input: inputText, action: "accept" });
            return { accepted: true, steps };
        }

        if (act.type === "shift") {
            steps.push({ stack: stackText, input: inputText, action: `shift ${act.state}` });
            symbolStack.push(current);
            stateStack.push(act.state);
            position++;
        } else {
            const { head, body } = slr.prods[act.prod];
            steps.push({
                stack: stackText,
                input: inputText,
                action: `reduce ${head} -> ${body.length === 0 ? "e" : body.join("")}`
            });

            for (let k = 0; k < body.length; k++) {
                stateStack.pop();
                symbolStack.pop();
            }
            const top = stateStack[stateStack.length - 1];
            const next = slr.goto[top][head];
            if (next === undefined) {
                steps.push({ stack: stackText, input: inputText, action: "error" });
                return { accepted: false, steps };
            }
            symbolStack.push(head);
            stateStack.push(next);
        }
    }
}

module.exports = { buildSLR1, parseSLR1, formatItem };