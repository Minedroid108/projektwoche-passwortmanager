const express = require('express');
const app = express();
const path = require('path');
const ejs = require('ejs');

// app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.get('/', (req, res) => {
    res.render('index');
})

app.listen(3000);