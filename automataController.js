const {
    convertNfaToDfa,
    simulateOnDfa,
    minimizeDfaGateway
} = require("../gateways/automataGateway");

function convert(req, res) {

    const nfa = req.body;

    const requiredFields = [
        "states",
        "alphabet",
        "initial",
        "accepting",
        "transitions"
    ];

    const missingField = requiredFields.find(
        (field) => nfa[field] === undefined
    );

    if (missingField) {
        return res.status(400).json({
            error: `Missing required field: ${missingField}`
        });
    }

    const result = convertNfaToDfa(nfa);

    if (!result.ok) {
        return res.status(400).json({
            error: result.error
        });
    }

    return res.status(200).json(result.data);
}

function simulateRoute(req, res) {

    const {
        dfa,
        input
    } = req.body;

    if (!dfa) {
        return res.status(400).json({
            error: "Missing required field: dfa"
        });
    }

    if (input === undefined) {
        return res.status(400).json({
            error: "Missing required field: input"
        });
    }

    const result = simulateOnDfa(dfa, input);

    if (!result.ok) {
        return res.status(400).json({
            error: result.error
        });
    }

    return res.status(200).json(result.data);
}


function minimize(req, res) {
    const { states, alphabet, initial, accepting, transitions } = req.body;

    if (!states || !alphabet || initial === undefined || !accepting || !transitions) {
        return res.status(400).json({ error: 'Faltan campos en el input' });
    }

    const result = minimizeDfaGateway({ states, alphabet, initial, accepting, transitions });

    if (!result.ok) {
        return res.status(500).json({ error: result.error });
    }

    res.status(200).json(result.data);
}


module.exports = {
    convert,
    simulateRoute,
    minimize
};