# NFA to DFA Web Server — Assignments 1 & 2 & 3

### Student Information

- Full Name: María Paula Gómez García
- Class: Lenguajes Formales 
- Teacher: Adolfo Andrés Castro Sánchez
- Partner: Joseph Buenaños

## Description

This project implements a web server that converts a Non-deterministic Finite Automaton (NFA) into an equivalent Deterministic Finite Automaton (DFA) using the Subset Construction Algorithm.

The server also provides an endpoint to simulate an input string on a DFA and determine whether the string is accepted or rejected.

The application was developed using JavaScript, Node.js and Express.

---

## Technologies and Versions

- Operating System: Windows 10 22H2 (64-bit)
- Programming Language: JavaScript
- Node.js: v24.19.0
- npm: 11.17.0
- Express: 5.2.1
- ESLint: 10.8.1
- IDE: Visual Studio Community 2026

---

## Project Architecture

The project follows the following architecture:

```text
HTTP Request
     ↓
Routes
     ↓
Controller
     ↓
Gateway
     ↓
Functions
     ↓
HTTP Response
```

The project structure is:

```text
NFAToDFA/
│
├── src/
│   ├── controllers/
│   │   └── automataController.js
│   │
│   ├── functions/
│   │   └── automataFunctions.js
│   │
│   ├── gateways/
│   │   └── automataGateway.js
│   │
│   └── routes/
│       └── automataRoutes.js
│
├── app.js
├── package.json
├── README.md
└── eslint.config.js
```

### Functions

`automataFunctions.js` contains the main automata logic.

The most important functions are:

- `isEpsilonSymbol()` identifies epsilon transitions.
- `buildDeltaTable()` creates a transition lookup table.
- `epsilonClosure()` calculates all states reachable through epsilon transitions.
- `move()` calculates the states reachable using an alphabet symbol.
- `nameSubset()` generates names for DFA states.
- `validateNfa()` validates the NFA received by the server.
- `subsetConstruction()` converts the NFA into a DFA.
- `simulate()` simulates an input string on a DFA.

### Gateway

`automataGateway.js` acts as an intermediary between the Controller and the Functions layer.

It executes the automata operations and handles errors produced by the Functions layer.

### Controller

`automataController.js` receives HTTP request data, validates the required fields, calls the Gateway and generates the corresponding HTTP response.

### Routes

`automataRoutes.js` defines the available endpoints:

- `POST /convert`
- `POST /simulate`

---

## NFA to DFA Conversion Algorithm

The NFA is converted to a DFA using the Subset Construction Algorithm.

Each state in the resulting DFA represents a set of states from the original NFA.

The algorithm works as follows:

1. Calculate the epsilon closure of the initial NFA state.
2. Use this set as the initial DFA state.
3. Add the state to a queue of states that must be processed.
4. For every DFA state and every symbol in the alphabet:
   - Apply the `move()` operation.
   - Calculate the epsilon closure of the result.
   - Create a new DFA state if that subset has not been discovered before.
   - Record the transition.
5. Continue until there are no new states to process.
6. A DFA state is accepting if it contains at least one accepting state from the original NFA.

The implementation also creates the empty state `∅` when no NFA state can be reached for a specific transition.

---

## Epsilon Transitions

The program supports epsilon transitions.

The following representations are recognized as epsilon:

```text
ε
epsilon
eps
empty string
```

Epsilon transitions do not consume an input symbol.

For example:

```text
0 --epsilon--> 1
1 --a--> 2
```

The epsilon closure of state `0` is:

```text
{0, 1}
```

Therefore, the initial DFA state becomes:

```text
01
```

---

## Installation

Open a terminal in the project directory and install the dependencies:

```bash
npm install
```

---

## Running the Server

Start the application with:

```bash
npm start
```

On Windows PowerShell, the following command can also be used:

```powershell
npm.cmd start
```

The server will start on port 3000.

Expected output:

```text
Server running on port 3000
```

The server URL is:

```text
http://localhost:3000
```

---

## POST /convert

This endpoint receives an NFA and converts it into an equivalent DFA.

### Request Example

```json
{
    "states": [0, 1, 2],
    "alphabet": ["a"],
    "initial": 0,
    "accepting": [2],
    "transitions": [
        {
            "from": 0,
            "symbol": "epsilon",
            "to": 1
        },
        {
            "from": 1,
            "symbol": "a",
            "to": 2
        }
    ]
}
```

### Response Example

```json
{
    "dfaStates": [
        "01",
        "2",
        "∅"
    ],
    "alphabet": [
        "a"
    ],
    "initialState": "01",
    "acceptingStates": [
        "2"
    ],
    "transitions": [
        {
            "from": "01",
            "symbol": "a",
            "to": "2"
        },
        {
            "from": "2",
            "symbol": "a",
            "to": "∅"
        },
        {
            "from": "∅",
            "symbol": "a",
            "to": "∅"
        }
    ],
    "unreachableStates": []
}
```

---

## POST /simulate

This endpoint receives a DFA and an input string.

It returns:

- `accepted`: indicates whether the string is accepted.
- `path`: shows the sequence of DFA states visited during the simulation.

### Request Example

```json
{
    "dfa": {
        "dfaStates": ["0", "1"],
        "alphabet": ["a"],
        "initialState": "0",
        "acceptingStates": ["1"],
        "transitions": [
            {
                "from": "0",
                "symbol": "a",
                "to": "1"
            },
            {
                "from": "1",
                "symbol": "a",
                "to": "1"
            }
        ]
    },
    "input": "aaa"
}
```

### Response Example

```json
{
    "accepted": true,
    "path": [
        "0",
        "1",
        "1",
        "1"
    ]
}
```

---

## Rejected String Example

For the DFA generated from:

```text
0 --epsilon--> 1 --a--> 2
```

the input:

```text
aa
```

produces:

```json
{
    "accepted": false,
    "path": [
        "01",
        "2",
        "∅"
    ]
}
```

---

## Error Handling

The server validates the received automata.

For example, if a simulation contains a symbol that is not part of the DFA alphabet, the server returns an HTTP 400 response.

Example:

```json
{
    "error": "Invalid DFA: The symbol is not in the alphabet."
}
```

The NFA validation also checks:

- Required states.
- Alphabet.
- Initial state.
- Accepting states.
- Transitions.
- Invalid epsilon symbols inside the alphabet.
- Invalid transition states.
- Invalid transition symbols.

---

## Tested Scenarios

The application was manually tested with:

- Basic NFA to DFA conversion.
- DFA string acceptance.
- DFA string rejection.
- NFA epsilon transitions.
- Empty DFA state (`∅`).
- Invalid symbols outside the DFA alphabet.
- HTTP error handling.

All tested scenarios produced the expected results.

---

## Conclusion

The project implements an NFA to DFA web server using JavaScript, Node.js and Express.

The Subset Construction Algorithm, epsilon closure and move operations are used to generate a deterministic automaton equivalent to the original NFA.

The application also allows DFA simulation and returns both the acceptance result and the path followed by the input string.


## Assignment 2  — DFA Minimization

### New Endpoint

**POST /minimize**

This endpoint receives a DFA and returns the pairs of equivalent states,
following the marking algorithm (table-filling algorithm) based on
Kozen (1997), Lectures 13 and 14.

### How the DFA is sent to the server

The DFA is sent as a JSON object in the request body, using the same
structure as the `/convert` endpoint from Assignment 1:

```json
{
    "states": [0, 1, 2, 3, 4, 5],
    "alphabet": ["a", "b"],
    "initial": 0,
    "accepting": [1, 4, 5],
    "transitions": [
        {"from": 0, "symbol": "a", "to": 1},
        {"from": 0, "symbol": "b", "to": 2},
        {"from": 1, "symbol": "a", "to": 3},
        {"from": 1, "symbol": "b", "to": 4},
        {"from": 2, "symbol": "a", "to": 4},
        {"from": 2, "symbol": "b", "to": 3},
        {"from": 3, "symbol": "a", "to": 5},
        {"from": 3, "symbol": "b", "to": 5},
        {"from": 4, "symbol": "a", "to": 5},
        {"from": 4, "symbol": "b", "to": 5},
        {"from": 5, "symbol": "a", "to": 5},
        {"from": 5, "symbol": "b", "to": 5}
    ]
}
```

### Response returned by the server

The server returns a JSON object containing the equivalent state pairs,
sorted in lexicographical order:

```json
{
    "equivalentPairs": [[4, 5]]
}
```

### Minimization algorithm explanation

The implementation uses the **marking algorithm** (also known as the
table-filling algorithm), based on the Myhill-Nerode theorem, as
presented in Kozen (1997), Lecture 14, which builds on the subset
construction from Lecture 13.

The algorithm works as follows:

1. **Base case:** every pair of states (p, q) where exactly one of them
   is an accepting state is marked as *distinguishable*, since the empty
   string already tells them apart.
2. **Propagation:** for every unmarked pair (p, q) and every symbol `a`
   in the alphabet, we compute where each state transitions to:
   `p' = delta(p, a)` and `q' = delta(q, a)`. If the pair (p', q') is
   already marked as distinguishable, then (p, q) is marked as
   distinguishable too — because any string that distinguishes p' from
   q' also distinguishes p from q when prefixed with `a`.
3. This process repeats until a full pass produces no new marks
   (a fixed point is reached).
4. All pairs that were **never marked** are equivalent, meaning they
   can be collapsed into a single state without changing the language
   recognized by the automaton.

### Integration with Assignment 1

The new functionality follows the same layered architecture from
Assignment 1:

- **Functions** (`automataFunctions.js`): added `minimizeDfa(dfa)`,
  which implements the marking algorithm described above.
- **Gateway** (`automataGateway.js`): added `minimizeDfaGateway(dfa)`,
  which calls `minimizeDfa` and handles any exceptions.
- **Controller** (`automataController.js`): added `minimize(req, res)`,
  which validates the request body and returns the appropriate HTTP
  response.
- **Routes** (`automataRoutes.js`): added the new route
  `router.post("/minimize", minimize)`.

No existing functionality from Assignment 1 was modified.



## Assignment 3 — FIRST/FOLLOW, LL(1) and SLR(1) Parsers, and a Syntax-Directed Definition

### New Console Tool

This assignment extends the project with a **console application** (`cli.js`) that implements
syntax analysis over context-free grammars. It computes FIRST and FOLLOW sets, classifies a
grammar as LL(1), SLR(1), both or neither, parses input strings with the available parser(s),
and evaluates a Syntax-Directed Definition (SDD) over an annotated parse tree.

Unlike Assignments 1 and 2 (which are consumed through the Express web server), this item is
run entirely from the terminal, which is the interface required by the statement.

All parsing algorithms live in HTTP-independent modules, following the same philosophy as the
rest of the project: the logic knows nothing about input/output or the network.


### Theoretical Sources

| Component | Reference applied |
|---|---|
| FIRST and FOLLOW | Aho et al., Section 4.4.2 |
| LL(1) condition and predictive table | Section 4.4.3, Algorithm 4.31 |
| Non-recursive predictive parser | Section 4.4.4, Algorithm 4.34 |
| Shift/reduce and reduce/reduce conflicts | Section 4.5.4 |
| LR(0) items, CLOSURE and GOTO | Section 4.6.2 |
| LR parser | Section 4.6.3, Algorithm 4.44 |
| SLR construction | Section 4.6.4, Algorithm 4.46 |
| Attributes and annotated parse trees | Sections 5.1.1–5.1.2 |
| Dependency graph, order and SDD classification | Sections 5.2.1–5.2.4 |


### New Files

The following modules were added under `src/functions/`:

```text
NFAToDFA/
│
├── src/
│   └── functions/
│       ├── grammarFunctions.js   (grammar parsing, FIRST and FOLLOW)
│       ├── ll1Functions.js       (LL(1) predictive table and parser)
│       ├── slrFunctions.js       (LR(0) automaton and SLR(1) parser)
│       └── sddFunctions.js       (Syntax-Directed Definition and evaluator)
│
└── cli.js                        (console interface for this assignment)