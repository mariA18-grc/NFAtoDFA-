// JavaScript del navegador: envia los datos a la API y muestra la respuesta.

const $ = (id) => document.getElementById(id);

async function postJson(path, payload) {
    const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Error desconocido del servidor.");
    }
    return data;
}

// Escapa caracteres HTML usando codigos numericos (asi no se rompe al copiar).
function escapeHtml(text) {
    const amp = String.fromCharCode(38);   // &
    const lt = String.fromCharCode(60);    // <
    const gt = String.fromCharCode(62);    // >
    return String(text)
        .split(amp).join(amp + "amp;")
        .split(lt).join(amp + "lt;")
        .split(gt).join(amp + "gt;");
}

function showError(container, message) {
    container.innerHTML = '<div class="error">' + escapeHtml(message) + '</div>';
}

function pad(text, width) {
    text = String(text);
    return text.length >= width ? text + "  " : text + " ".repeat(width - text.length);
}

function badge(cls, content) {
    return '<span class="badge ' + cls + '">' + content + '</span>';
}

// ---------- 1. Analizar la gramatica ----------
async function analyzeGrammar() {
    const container = $("grammarResult");
    container.innerHTML = "Analizando...";
    try {
        const data = await postJson("/api/grammar", { grammar: $("grammar").value });
        let html = "";

        html += "<p>";
        html += data.ll1.isLL1 ? badge("ok", "Es LL(1) (descendente)") : badge("bad", "No es LL(1)");
        html += data.slr.isSLR1 ? badge("ok", "Es SLR(1) (ascendente)") : badge("bad", "No es SLR(1)");
        html += "</p>";

        html += "<p>";
        html += badge("blue", "Inicial: " + escapeHtml(data.grammar.start));
        html += badge("purple", "No terminales: " + escapeHtml(data.grammar.nonTerminals.join(" ")));
        html += badge("yellow", "Terminales: " + escapeHtml(data.grammar.terminals.join(" ") || "(ninguno)"));
        html += "</p>";

        html += "<h3>FIRST y FOLLOW (seccion 4.4)</h3>";
        html += "<table><tr><th>No terminal</th><th>FIRST</th><th>FOLLOW</th></tr>";
        data.firstSets.forEach((f, i) => {
            html += "<tr><td>" + escapeHtml(f.symbol) + "</td><td>" + escapeHtml(f.set) + "</td><td>" + escapeHtml(data.followSets[i].set) + "</td></tr>";
        });
        html += "</table>";

        html += "<h3>Tabla predictiva LL(1)</h3>";
        if (data.ll1.cells.length === 0) {
            html += '<p class="hint">(sin casillas)</p>';
        } else {
            html += "<table><tr><th>No terminal</th><th>Si ve</th><th>Usa la regla</th></tr>";
            for (const cell of data.ll1.cells) {
                html += "<tr><td>" + escapeHtml(cell.nonTerminal) + "</td><td><code>" + escapeHtml(cell.column) + "</code></td><td>" + escapeHtml(cell.rule) + "</td></tr>";
            }
            html += "</table>";
        }

        html += "<h3>Automata LR(0) (seccion 4.6)</h3>";
        for (const state of data.slr.states) {
            html += '<div class="state-box"><div class="state-title">Estado I' + state.index + "</div>";
            for (const item of state.items) {
                html += '<div class="item">' + escapeHtml(item) + "</div>";
            }
            for (const t of state.transitions) {
                html += '<div class="trans">con <code>' + escapeHtml(t.symbol) + "</code> hacia I" + t.to + "</div>";
            }
            html += "</div>";
        }

        html += "<h3>Producciones numeradas</h3><table><tr><th>#</th><th>Produccion</th></tr>";
        for (const p of data.slr.numberedProductions) {
            html += "<tr><td>" + p.number + "</td><td>" + escapeHtml(p.rule) + "</td></tr>";
        }
        html += "</table>";

        html += "<h3>Tabla SLR(1) - ACTION y GOTO</h3>";
        html += "<table><tr><th>Estado</th><th>Simbolo</th><th>Accion / GOTO</th></tr>";
        for (const a of data.slr.actions) {
            let nice = a.action;
            if (a.action !== "accept") {
                nice = a.action[0] === "s" ? "shift " + a.action.slice(1) : "reduce " + a.action.slice(1);
            }
            html += "<tr><td>I" + a.state + "</td><td><code>" + escapeHtml(a.column) + "</code></td><td>" + escapeHtml(nice) + "</td></tr>";
        }
        for (const g of data.slr.gotos) {
            html += "<tr><td>I" + g.state + "</td><td><code>" + escapeHtml(g.nonTerminal) + "</code></td><td>GOTO hacia I" + g.to + "</td></tr>";
        }
        html += "</table>";

        if (data.slr.conflicts.length > 0) {
            html += "<h3>Conflictos SLR(1)</h3><pre>" + escapeHtml(data.slr.conflicts.join(String.fromCharCode(10))) + "</pre>";
        }

        container.innerHTML = html;
    } catch (error) {
        showError(container, error.message);
    }
}

// ---------- 2. Analizar una cadena ----------
async function parseString() {
    const container = $("parseResult");
    container.innerHTML = "Analizando...";
    try {
        const data = await postJson("/api/parse", {
            grammar: $("grammar").value,
            input: $("inputString").value,
            method: $("method").value
        });

        let html = "<p>";
        html += badge("blue", "Metodo: " + escapeHtml(data.method));
        html += badge("purple", "Cadena: <code>" + escapeHtml(data.input) + "</code>");
        html += data.accepted ? badge("ok", "ACEPTADA") : badge("bad", "RECHAZADA");
        html += "</p>";

        html += "<h3>Analisis paso a paso</h3>";
        const nl = String.fromCharCode(10);
        let trace = pad("Pila", 24) + pad("Entrada", 16) + "Accion" + nl;
        trace += "-".repeat(58) + nl;
        for (const step of data.steps) {
            trace += pad(step.stack, 24) + pad(step.input, 16) + step.action + nl;
        }
        html += "<pre>" + escapeHtml(trace) + "</pre>";

        container.innerHTML = html;
    } catch (error) {
        showError(container, error.message);
    }
}

// ---------- 3. SDD ----------
async function evaluateSdd() {
    const container = $("sddResult");
    container.innerHTML = "Evaluando...";
    try {
        const data = await postJson("/api/sdd", {
            input: $("sddInput").value,
            circular: $("circular").checked
        });

        const nl = String.fromCharCode(10);
        let html = "";
        const k = data.info.classification;
        html += "<p>";
        html += badge(k.sAttributed ? "ok" : "purple", "S-atribuida: " + (k.sAttributed ? "si" : "no"));
        html += badge(k.lAttributed ? "ok" : "purple", "L-atribuida: " + (k.lAttributed ? "si" : "no"));
        html += "</p>";

        html += "<h3>Atributos (seccion 5.1)</h3>";
        html += "<table><tr><th>Simbolo.atributo</th><th>Clase</th><th>Significado</th></tr>";
        for (const a of data.info.attributes) {
            const clase = a.kind === "synthesized" ? "sintetizado (sube)" : "heredado (baja)";
            html += "<tr><td><code>" + escapeHtml(a.symbol) + "." + escapeHtml(a.name) + "</code></td><td>" + clase + "</td><td>" + escapeHtml(a.meaning) + "</td></tr>";
        }
        html += "</table>";

        const ev = data.evaluation;
        if (ev) {
            html += "<h3>Resultado para <code>" + escapeHtml(ev.input) + "</code></h3>";
            if (!ev.accepted) {
                html += badge("bad", "La cadena no pertenece al lenguaje");
            } else if (ev.circular) {
                html += badge("bad", "SDD circular - no se puede evaluar");
                html += "<h3>Ciclo encontrado</h3><pre>" + escapeHtml(ev.cycle.join("  ->  ")) + "</pre>";
                html += "<h3>Atributos sin evaluar</h3><pre>" + escapeHtml(ev.stuck.join(", ")) + "</pre>";
            } else {
                html += "<p>" + badge("yellow", escapeHtml(ev.mainLabel) + " = " + ev.mainValue) + "</p>";
                html += "<h3>Arbol anotado</h3><pre>" + escapeHtml(ev.treeLines.join(nl)) + "</pre>";
                if (ev.graphEdges && ev.graphEdges.length > 0) {
                    html += "<h3>Grafo de dependencias (seccion 5.2) - flecha: usado hacia definido</h3><pre>";
                    for (const e of ev.graphEdges) {
                        html += escapeHtml(e.from + "  ->  " + e.to) + nl;
                    }
                    html += "</pre>";
                }
                html += "<h3>Orden de evaluacion - algoritmo de Kahn (seccion 5.2)</h3><pre>";
                ev.orderLines.forEach((line, i) => {
                    html += escapeHtml((i + 1) + ". " + line) + nl;
                });
                html += "</pre>";
            }
        }

        container.innerHTML = html;
    } catch (error) {
        showError(container, error.message);
    }
}

// ---------- Conectar botones ----------
$("analyzeGrammarBtn").addEventListener("click", analyzeGrammar);
$("parseBtn").addEventListener("click", parseString);
$("sddBtn").addEventListener("click", evaluateSdd);

document.querySelectorAll("[data-example]").forEach((btn) => {
    btn.addEventListener("click", () => {
        $("grammar").value = btn.getAttribute("data-example");
        analyzeGrammar();
    });
});

analyzeGrammar();

