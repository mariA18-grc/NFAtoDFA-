const EPSILON_SYMBOL = new Set([
    "ε",
    "epsilon",
    "eps",
    ""
]);

function isEpsilonSymbol(symbol) {
    if (typeof symbol !== "string") {
        return false;
    }

    return EPSILON_SYMBOL.has(symbol.toLowerCase());

}
    
function buildDeltaTable(transitions) {
    const delta = new Map();

    for (const transition of transitions) {
        const { from, symbol, to } = transition;

        const normalizedSymbol = isEpsilonSymbol(symbol) ? "ε" : symbol;

        if (!delta.has(from)) {
            delta.set(from, new Map());
        }

        if (!delta.get(from).has(normalizedSymbol)) {
            delta.get(from).set(normalizedSymbol, new Set());
        }

        delta.get(from).get(normalizedSymbol).add(to);
    }

    return delta;
}

function epsilonClosure(states, delta) {
    const closure = new Set(states);
    const stack = [...states];

    while (stack.length > 0) {
        const state = stack.pop();

        const epsilonTargets = delta.get(state)?.get("ε") ?? new Set();

        for (const target of epsilonTargets) {
            if (!closure.has(target)) {
                closure.add(target);
                stack.push(target);
            }

        }

    }

    return closure;
}

function move(states, symbol, delta) {
    const result = new Set();

    for (const state of states) {
        const targets = delta.get(state)?.get(symbol) ?? new Set();

        for (const target of targets) {
            result.add(target);
        }
    }

    return result;
}

function nameSubset(subset) {
    const sorted = [...subset].sort((a, b) => {
        const numberA = Number(a);
        const numberB = Number(b);

        if(!Number.isNaN(numberA) && !Number.isNaN(numberB)) {
            return numberA - numberB;
        } 

         return String(a).localeCompare(String(b));
    });

    if (sorted.length === 0) {
        return "∅";
    }

    const allSingleCharacter = sorted.every((state) => String(state).length === 1);

    if (allSingleCharacter) {
        return sorted.join("");
    }
    return `{${sorted.join(",")}}`;
}

function validateNfa(nfa) {
    if (!nfa || typeof nfa !== "object" || Array.isArray(nfa)) {
        throw new Error("Invalid NFA: NFA must be a valid object.");
    }

    const {
        states,
        alphabet,
        initial,
        accepting,
        transitions
    } = nfa;

    if (!Array.isArray(states) || states.length === 0) {
        throw new Error("Invalid NFA: ´states´must be a non-empty array.");
    }

    if (!Array.isArray(alphabet)) {
        throw new Error("Invalid NFA: ´alphabet´ must be an array.");
    }

    if (!Array.isArray(accepting)) {
        throw new Error("Invalid NFA: ´accepting´ must be an array.");
    }

    if (!Array.isArray(transitions)) {
        throw new Error("Invalid NFA: ´transitions´ must be an array.");
    }

    const stateSet = new Set(states);
    const alphabetSet = new Set(alphabet);

    if (stateSet.size !== states.length) {
        throw new Error("Invalid NFA: ´states´ must contain unique values.");
    }

    if (!stateSet.has(initial)) {
        throw new Error("Invalid NFA: ´initial´ state must be one of the states.");
    }

    for (const states of accepting) {
        if (!stateSet.has(states)) {
            throw new Error("Invalid NFA:All ´accepting´states must be one of the states.");
        }
    }

    for (const symbol of alphabet) {
        if (typeof symbol !== "string") {
            throw new Error("Invalid NFA: All symbols in the ´alphabet´ must be strings.");
        }

        if (isEpsilonSymbol(symbol)) {
            throw new Error("Invalid Nfa: The ´alphabet´must not contain epsilon symbols.");
        }
    }

    for (const transition of transitions) {
        if (!transition || typeof transition !== "object" || Array.isArray(transition)) {
            throw new Error("Invalid NFA: Each transition must be a valid object.");
        }

        const { from, symbol, to } = transition;


        if (!stateSet.has(from)) {
            throw new Error("Invalid NFA: The ´from´ state in each transition must be one of the states.");
        }

        if (!stateSet.has(to)) {
            throw new Error("Invalid NFA: The ´to´ state in each transition must be one of the states.");
        }

        if (typeof symbol !== "string") {
            throw new Error("Invalid NFA: The ´symbol´in each transition must be a string.");
        }

        if (!isEpsilonSymbol(symbol) && !alphabetSet.has(symbol)) {
            throw new Error(
                "Invalid NFA: The ´symbol´ in each transition must be an epsilon symbol or one of the symbols in the ´alphabet´."
            );

        }
    }

    return true;

}

function subsetConstruction(nfa) {

    validateNfa(nfa);

    const {
        states,
        alphabet,
        initial,
        accepting,
        transitions
    } = nfa;

    const delta = buildDeltaTable(transitions);

    const startClosure = epsilonClosure([initial], delta);
    const startName = nameSubset(startClosure);

    const queue = [startClosure];

    const seen = new Map();
    seen.set(startName, startClosure);

    const dfaTransitions = [];

    while (queue.length > 0) {

        const currentSubset = queue.shift();
        const currentName = nameSubset(currentSubset);

        for (const symbol of alphabet) {

            const moved = move(currentSubset, symbol, delta);

            const targetClosure = epsilonClosure(moved, delta);
            const targetName = nameSubset(targetClosure);

            if (!seen.has(targetName)) {
                seen.set(targetName, targetClosure);
                queue.push(targetClosure);
            }

            dfaTransitions.push({
                from: currentName,
                symbol: symbol,
                to: targetName
            });
        }
    }

    const dfaStates = Array.from(seen.keys());

    const acceptingStates = dfaStates.filter((stateName) => {

        const subset = seen.get(stateName);

        return [...subset].some((state) =>
            accepting.includes(state)
        );
    });

    const reachableNfaStates = new Set();

    for (const subset of seen.values()) {

        for (const state of subset) {
            reachableNfaStates.add(state);
        }
    }

    const unreachableStates = states.filter(
        (state) => !reachableNfaStates.has(state)
    );

    return {
        dfaStates,
        alphabet,
        initialState: startName,
        acceptingStates,
        transitions: dfaTransitions,
        unreachableStates
    };
}

function simulate(dfa, input) {
    const {
        alphabet,
        initialState,
        acceptingStates,
        transitions
    } = dfa;

    let currentState = initialState;
    const path = [currentState];

    for (const symbol of input) {
        if (!alphabet.includes(symbol)) {
            throw new Error("Invalid DFA: The symbol is not in the alphabet.");
        }
        const transition = transitions.find((t) => t.from === currentState && t.symbol === symbol);

        if (!transition) {
            return {
                accepted: false, path
            };
        }

        currentState = transition.to;

        path.push(currentState);
    }

    const accepted = acceptingStates.includes(currentState);

    return {
        accepted, path
    };

}

function minimizeDfa(dfa) {
    const { states, alphabet, transitions, accepting } = dfa;


    function delta(estado, simbolo) {
        const t = transitions.find(t => t.from === estado && t.symbol === simbolo);
        return t ? t.to : null;
    }

    const pares = []
    for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
            pares.push([states[i], states[j]]);
        }
    }

    const marcados = new Set();
    const clave = (p, q) => {
        const [a, b] = p < q ? [p, q] : [q, p];
        return `${a},${b}`;
    };


    for (const [p, q] of pares) {
        const pFinal = accepting.includes(p);
        const qFinal = accepting.includes(q);
        if (pFinal !== qFinal) {
            marcados.add(clave(p, q));
        }
    }


   let huboUnCambio = true;
     while (huboUnCambio) {
       huboUnCambio = false;
     for (const [p, q] of pares) {
        if (marcados.has(clave(p, q))) continue;
             for (const simbolo of alphabet) {
                 const p2 = delta(p, simbolo);
                 const q2 = delta(q, simbolo);
                 if (p2 === q2) continue;
                 if (marcados.has(clave(p2, q2))) {
                     marcados.add(clave(p, q));
                     huboUnCambio = true;
                     break;
                 }
             }
     }

  }


    const equivalentes = pares.filter(([p, q]) => !marcados.has(clave(p, q)));

    equivalentes.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));

    return { equivalentPairs: equivalentes };

}

module.exports = {
    subsetConstruction,
    simulate,
    minimizeDfa
};
         

