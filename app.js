const express = require("express");

const automataRoutes = require("./src/routes/automataRoutes");

const app = express();

app.use(express.json());

app.use("/", automataRoutes);

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});