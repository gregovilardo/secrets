//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");
const port = 3000;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
//find or create is a mongoose package that gives functionality to the findOrCreate function of passport.js Oauth20
//the original is mongoose-findorcreate but it seems that does not have mainteing
const findOrCreate = require("mongoose-find-or-create");

app.use(express.urlencoded({ enabled: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(
    session({
        secret: "Our little secret.",
        resave: false,
        saveUninitialized: false,
    })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: "http://localhost:3000/auth/google/secrets",
            userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
        },
        function (accessToken, refreshToken, profile, cb) {
            console.log(profile);
            User.findOrCreate({ googleId: profile.id }, function (err, user) {
                return cb(err, user);
            });
        }
    )
);

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.render("login");
    }
});

app.post("/submit", (req, res) => {
    const secret = req.body.secret;
    console.log(req.user.id);
    User.findById(req.user.id, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = secret;
                foundUser.save(() => {
                    res.redirect("/secrets");
                });
            }
        }
    });
});

app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);

app.get(
    "/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect("/secrets");
    }
);

app.route("/login")

    .get((req, res) => {
        res.render("login");
    })

    .post((req, res) => {
        const user = new User({
            username: req.body.username,
            password: req.body.password,
        });
        req.login(user, (err) => {
            if (err) {
                console.log(err);
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                });
            }
        });
    });

app.route("/register")

    .get((req, res) => {
        res.render("register");
    })

    .post((req, res) => {
        User.register(
            { username: req.body.username },
            req.body.password,
            (err, user) => {
                if (err) {
                    console.log(err);
                    res.redirect("/register");
                } else {
                    passport.authenticate("local")(req, res, function () {
                        res.redirect("/secrets");
                    });
                }
            }
        );
    });

app.get("/secrets", (req, res) => {
    User.find({"secret": {$ne: null}}, (err, foundUser) =>{
        if (err) {
            console.log(err)
        } else {
            if (foundUser) {
                res.render("secrets", { userWithSecrets: foundUser })
            }
        }
    })
});

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});

app.listen(port, () => {
    console.log(`server is running on port ${port}`);
});
