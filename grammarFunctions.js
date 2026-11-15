function isNonTerminal(grammar, symbol) {
    return grammar.nonTerminals.includes(symbol);
}

function parseGrammar(productionLines) {
    const productions = {};

    for (const line of productionLines) {
        const arrowIndex = line.indexOf("->");
        if (arrowIndex === -1) {
            throw new Error(`Invalid production line: "${line}"`);
        }

        const head = line.slice(0, arrowIndex).trim();
        const body = line.slice(arrowIndex + 2).trim();

        if (head === "" || body === "") {
            throw new Error(`Invalid production line: "${line}"`);
        }


        const alternatives = body.split(/\s+/).map((alternative) => {
            return alternative === "e" ? [] : Array.from(alternative);
        });

        productions[head] = alternatives;
    }

    if (productions.S === undefined) {
        throw new Error("The grammar must have a line for the start symbol S");
    }

    const nonTerminals = Object.keys(productions).sort();

    const terminalSet = new Set();
    for (const head of nonTerminals) {
        for (const alternative of productions[head]) {
            for (const symbol of alternative) {
                if (nonTerminals.includes(symbol)) {
                    continue;
                }
                if (/^[A-Z]$/.test(symbol)) {
                    throw new Error(`Nonterminal ${symbol} has no production line`);
                }
                terminalSet.add(symbol);
            }
        }
    }
    const terminals = Array.from(terminalSet).sort();

    return { start: "S", nonTerminals, terminals, productions };
}


function firstOfString(first, symbols) {
    const result = new Set();
    let allCanBeEmpty = true;

    for (const symbol of symbols) {
        for (const item of first[symbol]) {
            if (item !== "e") {
                result.add(item);
            }
        }
        if (!first[symbol].has("e")) {
            allCanBeEmpty = false;
            break;
        }
    }

    if (allCanBeEmpty) {
        result.add("e");
    }
    return result;
}

function computeFirst(grammar) {
    const first = {};
    for (const terminal of grammar.terminals) {
        first[terminal] = new Set([terminal]);
    }
    for (const nonTerminal of grammar.nonTerminals) {
        first[nonTerminal] = new Set();
    }

    let changed = true;
    while (changed) {
        changed = false;
        for (const head of grammar.nonTerminals) {
            for (const alternative of grammar.productions[head]) {
                const sizeBefore = first[head].size;
                for (const item of firstOfString(first, alternative)) {
                    first[head].add(item);
                }
                if (first[head].size !== sizeBefore) {
                    changed = true;
                }
            }
        }
    }
    return first;
}


function computeFollow(grammar, first) {
    const follow = {};
    for (const nonTerminal of grammar.nonTerminals) {
        follow[nonTerminal] = new Set();
    }
    follow[grammar.start].add("$");

    let changed = true;
    while (changed) {
        changed = false;
        for (const head of grammar.nonTerminals) {
            for (const alternative of grammar.productions[head]) {
                for (let i = 0; i < alternative.length; i++) {
                    const symbol = alternative[i];
                    if (!isNonTerminal(grammar, symbol)) {
                        continue;
                    }

                    const beta = alternative.slice(i + 1);
                    const firstOfBeta = firstOfString(first, beta);
                    const sizeBefore = follow[symbol].size;

                    for (const item of firstOfBeta) {
                        if (item !== "e") {
                            follow[symbol].add(item);
                        }
                    }
                    if (firstOfBeta.has("e")) {
                        for (const item of follow[head]) {
                            follow[symbol].add(item);
                        }
                    }

                    if (follow[symbol].size !== sizeBefore) {
                        changed = true;
                    }
                }
            }
        }
    }
    return follow;
}


function formatSet(set) {
    const items = Array.from(set).filter((item) => item !== "e" && item !== "$").sort();
    if (set.has("e")) {
        items.push("e");
    }
    if (set.has("$")) {
        items.push("$");
    }
    return "{" + items.join(", ") + "}";
}

module.exports = {
    parseGrammar,
    isNonTerminal,
    firstOfString,
    computeFirst,
    computeFollow,
    formatSet
};