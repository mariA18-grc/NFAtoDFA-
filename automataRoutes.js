const express = require("express");
const router = express.Router();

const {
    convert, 
    simulateRoute,
    minimize,
} = require("../controllers/automataController");

router.post("/convert", convert);
router.post("/simulate", simulateRoute);
router.post("/minimize", minimize);

module.exports = router;

   