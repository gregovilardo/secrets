//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");
const encrypt = require('mongoose-encryption');
const port = 3000;

app.use(express.urlencoded({ enabled: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});
// put this before your user model, becouse the user model use this plugin
// const secret = "Thisisourlittlesecret."; //this should not be on your app.js file, anybody with this and the same package could break your security
//now the secret key is fixed becouse we saved in an .env file outside the app.js 
const secret = process.env.SECRET;
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });
//this encrypt when you call save and decrypt when you call find

const User = new mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("home");
});

app.route("/login")

    .get((req, res) => {
        res.render("login");
    })

    .post((req, res) => {
        let email = req.body.username;
        let password = req.body.password;
        let userData = [];
        User.findOne({ email: email }, (err, userFound) => {
            if (err) {
                console.log(err);
            } else if (userFound) {
                if (password === userFound.password) {
                    res.render("secrets");
                }
            } else {
                console.log("That email is not register on the site");
            }
        });
    });

app.route("/register")

    .get((req, res) => {
        res.render("register");
    })

    .post((req, res) => {
        const newUser = new User({
            email: req.body.username,
            password: req.body.password,
        });
        newUser.save((err) => {
            if (err) {
                console.log(err);
            } else {
                res.render("secrets");
            }
        });
    });

app.listen(port, () => {
    console.log(`server is running on port ${port}`);
});
