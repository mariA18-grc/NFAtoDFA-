const { isNonTerminal, firstOfString } = require("./grammarFunctions");

function buildLL1Table(grammar, first, follow) {
    const table = {};
    let isLL1 = true;

    for (const head of grammar.nonTerminals) {
        table[head] = {};

        for (const alternative of grammar.productions[head]) {
            const firstOfAlternative = firstOfString(first, alternative);

            const columns = new Set();
            for (const item of firstOfAlternative) {
                if (item !== "e") {
                    columns.add(item);
                }
            }
            if (firstOfAlternative.has("e")) {
                for (const item of follow[head]) {
                    columns.add(item);
                }
            }

            for (const column of columns) {
                if (table[head][column] !== undefined) {
                    isLL1 = false;
                } else {
                    table[head][column] = alternative;
                }
            }
        }
    }

    return { table, isLL1 };
}


function makeNode(symbol) {
    return { symbol, production: null, children: [], lexval: null };
}


function parseLL1(grammar, table, input) {
    const tokens = [...Array.from(input), "$"];
    const root = makeNode(grammar.start);
    const stack = ["$", grammar.start]; 
    const nodeStack = [null, root];     
    const steps = [];
    let position = 0;

    while (true) {
        const top = stack[stack.length - 1];
        const current = tokens[position];
        const stackText = stack.slice().reverse().join("");
        const inputText = tokens.slice(position).join("");

        if (top === "$") {
            const accepted = current === "$";
            steps.push({ stack: stackText, input: inputText, action: accepted ? "accept" : "error" });
            return { accepted, steps, tree: accepted ? root : null };
        }

        if (!isNonTerminal(grammar, top)) {
            if (top === current) {
                steps.push({ stack: stackText, input: inputText, action: `match ${top}` });
                stack.pop();
                nodeStack.pop().lexval = top;
                position++;
            } else {
                steps.push({ stack: stackText, input: inputText, action: "error" });
                return { accepted: false, steps, tree: null };
            }
        } else {
            const production = table[top][current];
            if (production === undefined) {
                steps.push({ stack: stackText, input: inputText, action: "error" });
                return { accepted: false, steps, tree: null };
            }
            steps.push({
                stack: stackText,
                input: inputText,
                action: `${top} -> ${production.length === 0 ? "e" : production.join("")}`
            });
            stack.pop();
            const node = nodeStack.pop();
            node.production = production;
            node.children = production.map(makeNode);
            for (let i = production.length - 1; i >= 0; i--) {
                stack.push(production[i]);
                nodeStack.push(node.children[i]);
            }
        }
    }
}

module.exports = { buildLL1Table, parseLL1 };