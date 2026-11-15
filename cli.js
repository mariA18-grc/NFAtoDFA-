const readline = require("readline");
const {
    parseGrammar,
    computeFirst,
    computeFollow,
    formatSet
} = require("./src/functions/grammarFunctions");
const { buildLL1Table, parseLL1 } = require("./src/functions/ll1Functions");
const { buildSLR1, parseSLR1, formatItem } = require("./src/functions/slrFunctions");
const {
    defaultSDD,
    makeCircularSDD,
    createSddEnvironment,
    evaluateInput,
    classifySDD
} = require("./src/functions/sddFunctions");

const rl = readline.createInterface({ input: process.stdin });
const lineIterator = rl[Symbol.asyncIterator]();


async function nextLine() {
    const { value, done } = await lineIterator.next();
    return done ? null : value;
}

function printSets(grammar, first, follow) {
    for (const nonTerminal of grammar.nonTerminals) {
        console.log(`First(${nonTerminal}) = ${formatSet(first[nonTerminal])}`);
    }
    for (const nonTerminal of grammar.nonTerminals) {
        console.log(`Follow(${nonTerminal}) = ${formatSet(follow[nonTerminal])}`);
    }
}

function printTables(grammar, ll1, slr) {
    const columns = [...grammar.terminals, "$"];
    const symbols = [...grammar.terminals, ...grammar.nonTerminals];

    console.log("LL(1) table:");
    for (const nonTerminal of grammar.nonTerminals) {
        for (const column of columns) {
            const production = ll1.table[nonTerminal][column];
            if (production !== undefined) {
                const text = production.length === 0 ? "e" : production.join("");
                console.log(`  M[${nonTerminal}, ${column}] = ${nonTerminal} -> ${text}`);
            }
        }
    }
    console.log(ll1.isLL1 ? "  (no conflicts: the grammar is LL(1))" : "  (conflict: the grammar is not LL(1))");

    console.log("LR(0) automaton:");
    slr.states.forEach((items, index) => {
        console.log(`  I${index}:`);
        for (const item of items) {
            console.log(`    ${formatItem(slr.prods, item)}`);
        }
        for (const symbol of symbols) {
            if (slr.gotoMap[index][symbol] !== undefined) {
                console.log(`    on ${symbol} -> I${slr.gotoMap[index][symbol]}`);
            }
        }
    });

    console.log("SLR(1) table:");
    slr.states.forEach((items, index) => {
        for (const column of columns) {
            const act = slr.action[index][column];
            if (act === undefined) {
                continue;
            }
            let text = "acc";
            if (act.type === "shift") {
                text = `s${act.state}`;
            } else if (act.type === "reduce") {
                text = `r${act.prod}`;
            }
            console.log(`  ACTION[${index}, ${column}] = ${text}`);
        }
        for (const nonTerminal of grammar.nonTerminals) {
            if (slr.goto[index][nonTerminal] !== undefined) {
                console.log(`  GOTO[${index}, ${nonTerminal}] = ${slr.goto[index][nonTerminal]}`);
            }
        }
    });
    slr.prods.forEach((production, number) => {
        const text = production.body.length === 0 ? "e" : production.body.join("");
        console.log(`  production ${number}: ${production.head} -> ${text}`);
    });
    for (const conflict of slr.conflicts) {
        console.log(`  conflict at ${conflict}`);
    }
    console.log(slr.isSLR1 ? "  (no conflicts: the grammar is SLR(1))" : "  (the grammar is not SLR(1))");
}


function printSddInfo(sdd) {
    const env = createSddEnvironment(sdd);

    console.log("Grammar of the SDD:");
    for (const line of sdd.grammarLines) {
        console.log(`  ${line}`);
    }

    console.log("Attribute table (symbol.attribute, kind, type, meaning):");
    for (const row of sdd.attributes) {
        const name = `${row.symbol}.${row.name}`;
        console.log(`  ${name.padEnd(16)}${row.kind.padEnd(13)}${row.type.padEnd(9)}${row.meaning}`);
    }

    console.log("Semantic rules (production: rules):");
    for (const head of env.grammar.nonTerminals) {
        for (const body of env.grammar.productions[head]) {
            const key = `${head} -> ${body.length === 0 ? "e" : body.join("")}`;
            console.log(`  ${key}`);
            for (const rule of sdd.rules[key]) {
                console.log(`      ${rule.text}`);
            }
        }
    }

    const kinds = classifySDD(env.grammar, sdd);
    console.log(`S-attributed: ${kinds.sAttributed ? "yes" : "no"}`);
    console.log(`L-attributed: ${kinds.lAttributed ? "yes" : "no"}`);
    if (env.problems.length === 0) {
        console.log("Checks of section 5.1.1: all passed");
    }
    for (const problem of env.problems) {
        console.log(`Problem: ${problem}`);
    }
}


async function runSddMode(sdd) {
    const env = createSddEnvironment(sdd);
    if (env.problems.length > 0) {
        for (const problem of env.problems) {
            console.log(`Problem: ${problem}`);
        }
        return;
    }

    while (true) {
        const line = await nextLine();
        if (line === null || line === "") {
            break;
        }

        const input = line === "e" ? "" : line; 
        const result = evaluateInput(env, input);

        if (!result.accepted) {
            console.log("no");
        } else if (result.circular) {
            console.log("The SDD is circular.");
            console.log(`  Cycle found: ${result.cycle.join(" -> ")}`);
            console.log(`  Attributes that could not be evaluated: ${result.stuck.join(", ")}`);
        } else {
            console.log("Annotated parse tree:");
            for (const treeLine of result.treeLines) {
                console.log(`  ${treeLine}`);
            }
            console.log("Evaluation order:");
            result.orderLines.forEach((orderLine, index) => {
                console.log(`  ${index + 1}. ${orderLine}`);
            });
            console.log(`${result.mainLabel} = ${result.mainValue}`);
        }
        console.log("");
    }
}


async function processStrings(parser, showTrace) {
    while (true) {
        const line = await nextLine();
        if (line === null || line === "") {
            break;
        }

        const input = line === "e" ? "" : line; 
        const result = parser(input);

        if (showTrace) {
            const stackWidth = Math.max(...result.steps.map((step) => step.stack.length)) + 3;
            const inputWidth = Math.max(...result.steps.map((step) => step.input.length)) + 3;
            for (const step of result.steps) {
                console.log(`${step.stack.padEnd(stackWidth)}${step.input.padEnd(inputWidth)}${step.action}`);
            }
        }
        console.log(result.accepted ? "yes" : "no");
    }
}

async function main() {
    if (process.argv.includes("--sdd-info")) {
        printSddInfo(defaultSDD);
        rl.close();
        return;
    }
    if (process.argv.includes("--sdd") || process.argv.includes("--sdd-circular")) {
        await runSddMode(process.argv.includes("--sdd-circular") ? makeCircularSDD() : defaultSDD);
        rl.close();
        return;
    }

    const n = parseInt(await nextLine(), 10);
    if (Number.isNaN(n) || n <= 0) {
        throw new Error("The first line must be a number greater than 0");
    }

    const productionLines = [];
    for (let i = 0; i < n; i++) {
        const line = await nextLine();
        if (line === null) {
            throw new Error("Unexpected end of input");
        }
        productionLines.push(line);
    }

    const grammar = parseGrammar(productionLines);
    const first = computeFirst(grammar);
    const follow = computeFollow(grammar, first);

    if (process.argv.includes("--sets")) {
        printSets(grammar, first, follow);
    }
    const showTrace = process.argv.includes("--trace");

    const ll1 = buildLL1Table(grammar, first, follow);
    const llParser = (text) => parseLL1(grammar, ll1.table, text);

    const slr = buildSLR1(grammar, follow);
    const slrParser = (text) => parseSLR1(grammar, slr, text);

    if (process.argv.includes("--tables")) {
        printTables(grammar, ll1, slr);
    }

    if (ll1.isLL1 && slr.isSLR1) {
      
        while (true) {
            console.log("Select a parser (T: for LL(1), B: for SLR(1), Q: quit):");
            const choice = await nextLine();
            if (choice === null) {
                break;
            }
            const letter = choice.trim().toUpperCase();
            if (letter === "Q") {
                break;
            }
            if (letter === "T") {
                await processStrings(llParser, showTrace);
            } else if (letter === "B") {
                await processStrings(slrParser, showTrace);
            }
        }
    } else if (ll1.isLL1) {
    
        console.log("Grammar is LL(1).");
        await processStrings(llParser, showTrace);
    } else if (slr.isSLR1) {
      
        console.log("Grammar is SLR(1).");
        await processStrings(slrParser, showTrace);
    } else {
        
        console.log("Grammar is neither LL(1) nor SLR(1).");
    }

    rl.close();
}

main().catch((error) => {
    console.error(error.message);
    rl.close();
    process.exit(1);
});