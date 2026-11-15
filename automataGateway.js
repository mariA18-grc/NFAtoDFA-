const {
    subsetConstruction,
    simulate,
    minimizeDfa
} = require("../functions/automataFunctions");

function convertNfaToDfa(nfa) {
    try {
        const dfa = subsetConstruction(nfa);

        return {
            ok: true,
            data: dfa
        };
    } catch (error) {
        return {
            ok: false,
            error: error.message
        };
    }
}

function simulateOnDfa(dfa, input) {

    try {

        const result = simulate(dfa, input);

        return {
            ok: true,
            data: result
        };

    } catch (error) {

        return {
            ok: false,
            error: error.message
        };
    }
}


function minimizeDfaGateway(dfa) {
    try {
        const result = minimizeDfa(dfa);
        return { ok: true, data: result };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}


module.exports = {
    convertNfaToDfa,
    simulateOnDfa,
    minimizeDfaGateway
};