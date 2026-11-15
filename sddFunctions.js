const { parseGrammar, computeFirst, computeFollow, isNonTerminal } = require("./grammarFunctions");
const { buildLL1Table, parseLL1 } = require("./ll1Functions");

// ------------------------
// 1) LOS DATOS DE LA SDD 
// ------------------------

const sddGrammarLines = [
    "S -> C",
    "C -> MR",
    "M -> r g b",
    "R -> ,MR e"
];

// Tabla de atributos.
const attributeTable = [
    { symbol: "S", name: "score", kind: "synthesized", type: "number", meaning: "resultado principal (puntaje de toda la secuencia)" },
    { symbol: "C", name: "start", kind: "inherited", type: "number", meaning: "posición del primer color (siempre 1)" },
    { symbol: "C", name: "score", kind: "synthesized", type: "number", meaning: "puntaje de toda la secuencia" },
    { symbol: "M", name: "pos", kind: "inherited", type: "number", meaning: "posición del color actual" },
    { symbol: "M", name: "score", kind: "synthesized", type: "number", meaning: "peso del color por su posición" },
    { symbol: "R", name: "pos", kind: "inherited", type: "number", meaning: "posición del siguiente color" },
    { symbol: "R", name: "score", kind: "synthesized", type: "number", meaning: "puntaje de los colores restantes" },
    { symbol: "r, g, b, ,", name: "lexval", kind: "synthesized", type: "char", meaning: "el carácter mismo (dado por el scanner)" }
];

// Peso de cada color: r = 1, g = 2, b = 3.
function colorWeight(character) {
    return { r: 1, g: 2, b: 3 }[character];
}

// Reglas semánticas
function buildRules() {
    return {
        "S -> C": [
            { defines: [1, "start"], uses: [], compute: () => 1, text: "C.start = 1" },
            { defines: [0, "score"], uses: [[1, "score"]], compute: (score) => score, text: "S.score = C.score" }
        ],
        "C -> MR": [
            { defines: [1, "pos"], uses: [[0, "start"]], compute: (start) => start, text: "M.pos = C.start" },
            { defines: [2, "pos"], uses: [[0, "start"]], compute: (start) => start + 1, text: "R.pos = C.start + 1" },
            {
                defines: [0, "score"],
                uses: [[1, "score"], [2, "score"]],
                compute: (mScore, rScore) => mScore + rScore,
                text: "C.score = M.score + R.score"
            }
        ],
        "M -> r": [{ defines: [0, "score"], uses: [[0, "pos"], [1, "lexval"]], compute: (pos, lex) => colorWeight(lex) * pos, text: "M.score = weight(r) * M.pos  /* 1 */" }],
        "M -> g": [{ defines: [0, "score"], uses: [[0, "pos"], [1, "lexval"]], compute: (pos, lex) => colorWeight(lex) * pos, text: "M.score = weight(g) * M.pos  /* 2 */" }],
        "M -> b": [{ defines: [0, "score"], uses: [[0, "pos"], [1, "lexval"]], compute: (pos, lex) => colorWeight(lex) * pos, text: "M.score = weight(b) * M.pos  /* 3 */" }],
        "R -> ,MR": [
            { defines: [2, "pos"], uses: [[0, "pos"]], compute: (pos) => pos, text: "M.pos = R.pos" },
            { defines: [3, "pos"], uses: [[0, "pos"]], compute: (pos) => pos + 1, text: "R1.pos = R.pos + 1" },
            {
                defines: [0, "score"],
                uses: [[2, "score"], [3, "score"]],
                compute: (mScore, r1Score) => mScore + r1Score,
                text: "R.score = M.score + R1.score"
            }
        ],
        "R -> e": [
            { defines: [0, "score"], uses: [], compute: () => 0, text: "R.score = 0" }
        ]
    };
}

const defaultSDD = {
    grammarLines: sddGrammarLines,
    attributes: attributeTable,
    rules: buildRules(),
    mainAttribute: { symbol: "S", name: "score" }
};

// Ciclo:  C.start -> M.pos -> M.score -> C.score -> C.start
function makeCircularSDD() {
    const rules = buildRules();
    rules["S -> C"][0] = {
        defines: [1, "start"],
        uses: [[1, "score"]],
        compute: (score) => score,
        text: "C.start = C.score   /* circular a proposito */"
    };
    return { ...defaultSDD, rules };
}

function productionKey(head, body) {
    return `${head} -> ${body.length === 0 ? "e" : body.join("")}`;
}

function nonTerminalAttributes(grammar, sdd) {
    return sdd.attributes.filter((row) => isNonTerminal(grammar, row.symbol));
}

function kindOf(grammar, sdd, symbol, name) {
    const row = nonTerminalAttributes(grammar, sdd).find((r) => r.symbol === symbol && r.name === name);
    return row ? row.kind : undefined;
}

function validateSDD(grammar, sdd) {
    const problems = [];
    const attributes = nonTerminalAttributes(grammar, sdd);

    if (attributes.length < 2) {
        problems.push("The SDD needs at least two different attributes");
    }
    if (!attributes.some((row) => row.kind === "synthesized")) {
        problems.push("The SDD needs at least one synthesized attribute");
    }
    if (!attributes.some((row) => row.kind === "inherited")) {
        problems.push("The SDD needs at least one inherited attribute");
    }
    if (attributes.some((row) => row.symbol === grammar.start && row.kind === "inherited")) {
        problems.push("The start symbol must not have inherited attributes");
    }

    for (const head of grammar.nonTerminals) {
        for (const body of grammar.productions[head]) {
            const key = productionKey(head, body);
            const rules = sdd.rules[key];
            if (rules === undefined) {
                problems.push(`${key}: there are no semantic rules`);
                continue;
            }

            const expected = [];
            for (const row of attributes) {
                if (row.symbol === head && row.kind === "synthesized") {
                    expected.push(`0.${row.name}`);
                }
            }
            body.forEach((symbol, index) => {
                for (const row of attributes) {
                    if (row.symbol === symbol && row.kind === "inherited") {
                        expected.push(`${index + 1}.${row.name}`);
                    }
                }
            });

            const defined = rules.map((rule) => `${rule.defines[0]}.${rule.defines[1]}`);
            for (const target of expected) {
                const times = defined.filter((d) => d === target).length;
                if (times !== 1) {
                    problems.push(`${key}: ${target} is defined ${times} times (it must be exactly once)`);
                }
            }
            for (const target of defined) {
                if (!expected.includes(target)) {
                    problems.push(`${key}: a rule defines ${target}, which is not a synthesized attribute of the head or an inherited attribute of a body symbol`);
                }
            }
        }
    }
    return problems;
}

function classifySDD(grammar, sdd) {
    const attributes = nonTerminalAttributes(grammar, sdd);
    const sAttributed = attributes.every((row) => row.kind === "synthesized");

    let lAttributed = true;
    for (const head of grammar.nonTerminals) {
        for (const body of grammar.productions[head]) {
            for (const rule of sdd.rules[productionKey(head, body)] || []) {
                const [position, name] = rule.defines;
                if (position === 0) {
                    continue;
                }
                for (const [usedPosition, usedName] of rule.uses) {
                    const fromHeadInherited = usedPosition === 0 && kindOf(grammar, sdd, head, usedName) === "inherited";
                    const fromTheLeft = usedPosition < position && usedPosition >= 1;
                    const fromItself = usedPosition === position && usedName !== name;
                    if (!(fromHeadInherited || fromTheLeft || fromItself)) {
                        lAttributed = false;
                    }
                }
            }
        }
    }
    return { sAttributed, lAttributed };
}

function createSddEnvironment(sdd) {
    const grammar = parseGrammar(sdd.grammarLines);
    const first = computeFirst(grammar);
    const follow = computeFollow(grammar, first);
    const ll1 = buildLL1Table(grammar, first, follow);
    if (!ll1.isLL1) {
        throw new Error("The grammar of the SDD must be LL(1)");
    }
    return { grammar, ll1, sdd, problems: validateSDD(grammar, sdd) };
}

function findCycle(stuck, edges) {
    const state = new Map();
    const path = [];

    function visit(key) {
        state.set(key, 1);
        path.push(key);
        for (const next of edges.get(key)) {
            if (!stuck.has(next)) {
                continue;
            }
            if (state.get(next) === 1) {
                return path.slice(path.indexOf(next)).concat(next);
            }
            if (!state.has(next)) {
                const found = visit(next);
                if (found) {
                    return found;
                }
            }
        }
        path.pop();
        state.set(key, 2);
        return null;
    }

    for (const key of stuck) {
        if (!state.has(key)) {
            const found = visit(key);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

function evaluateTree(sdd, tree) {

    const nodes = [];
    function number(node, depth) {
        node.id = nodes.length + 1;
        node.depth = depth;
        nodes.push(node);
        for (const child of node.children) {
            number(child, depth + 1);
        }
    }
    number(tree, 0);

    const keyOf = (node, attribute) => `${node.id}.${attribute}`;
    const label = (key) => {
        const [id, attribute] = key.split(".");
        return `${nodes[Number(id) - 1].symbol}#${id}.${attribute}`;
    };

    const vertices = [];
    const edges = new Map();
    const indegree = new Map();
    const values = new Map();
    const computations = new Map();

    function addVertex(key) {
        if (!edges.has(key)) {
            vertices.push(key);
            edges.set(key, []);
            indegree.set(key, 0);
        }
    }

    for (const node of nodes) {
        if (node.production === null) {

            addVertex(keyOf(node, "lexval"));
            values.set(keyOf(node, "lexval"), node.lexval);
            continue;
        }

        const ruleKey = productionKey(node.symbol, node.production);
        const rules = sdd.rules[ruleKey];
        if (rules === undefined) {
            throw new Error(`There are no semantic rules for the production ${ruleKey}`);
        }

        for (const rule of rules) {
            const nodeAt = (position) => (position === 0 ? node : node.children[position - 1]);
            const target = keyOf(nodeAt(rule.defines[0]), rule.defines[1]);
            if (computations.has(target)) {
                throw new Error(`The attribute ${label(target)} is defined twice`);
            }
            const sources = rule.uses.map(([position, attribute]) => keyOf(nodeAt(position), attribute));
            computations.set(target, { rule, sources });

            addVertex(target);
            for (const source of sources) {
                addVertex(source);
                edges.get(source).push(target);
                indegree.set(target, indegree.get(target) + 1);
            }
        }
    }

    for (const key of vertices) {
        if (!computations.has(key) && !values.has(key)) {
            throw new Error(`The attribute ${label(key)} is used but never defined`);
        }
    }

    const queue = vertices.filter((key) => indegree.get(key) === 0);
    const order = [];
    for (let index = 0; index < queue.length; index++) {
        const key = queue[index];
        order.push(key);
        for (const next of edges.get(key)) {
            indegree.set(next, indegree.get(next) - 1);
            if (indegree.get(next) === 0) {
                queue.push(next);
            }
        }
    }

    if (order.length < vertices.length) {
        const placed = new Set(order);
        const stuck = new Set(vertices.filter((key) => !placed.has(key)));
        const cycle = findCycle(stuck, edges) || [];
        return {
            circular: true,
            cycle: cycle.map(label),
            stuck: Array.from(stuck).map(label)
        };
    }

    const orderLines = [];
    for (const key of order) {
        const computation = computations.get(key);
        if (computation !== undefined) {
            const args = computation.sources.map((source) => values.get(source));
            values.set(key, computation.rule.compute(...args));
            orderLines.push(`${label(key)} = ${values.get(key)}`);
        }
    }

    const treeLines = nodes.map((node) => {
        const names = [];
        for (const row of sdd.attributes) {
            const applies = row.symbol.split(", ").includes(node.symbol);
            if (applies && values.has(keyOf(node, row.name))) {
                names.push(`${row.name}=${values.get(keyOf(node, row.name))}`);
            }
        }
        return `${"  ".repeat(node.depth)}${node.symbol}#${node.id}  ${names.join(", ")}`;
    });

    const main = sdd.mainAttribute;
    return {
        circular: false,
        treeLines,
        orderLines,
        mainLabel: `${main.symbol}.${main.name}`,
        mainValue: values.get(keyOf(tree, main.name))
    };
}

function evaluateInput(env, input) {
    const result = parseLL1(env.grammar, env.ll1.table, input);
    if (!result.accepted) {
        return { accepted: false };
    }
    return { accepted: true, ...evaluateTree(env.sdd, result.tree) };
}

module.exports = {
    defaultSDD,
    makeCircularSDD,
    createSddEnvironment,
    evaluateInput,
    classifySDD
};
