require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
const FacebookStrategy = require("passport-facebook").Strategy;


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static(__dirname + "/public"));

app.use(session({
  secret: process.env.MY_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB")


const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id,
      username: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      facebookId: profile.id,
      username: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.route("/auth/facebook")
  .get(passport.authenticate("facebook")

  );


app.route("/auth/facebook/secrets")

  .get(passport.authenticate("facebook", {
      failureRedirect: "/login"
    }),

    function(req, res) {

      // Successful authentication, redirect home.

      res.redirect("/secrets");

    });

app.route("/")
  .get(function(req, res) {
    res.render("home");
  });

app.route("/auth/google")
  .get(passport.authenticate('google', {
    scope: ["profile"]
  }));

app.route("/auth/google/secrets")
  .get(passport.authenticate('google', {
    failureRedirect: '/login',
    successRedirect: '/secrets',
  }));

app.route("/login")

  .get(function(req, res) {
    res.render("login");
  })

  .post(passport.authenticate('local', {
    successRedirect: '/secrets',
    failureRedirect: '/login',
  }));

app.route("/secrets")

  .get(function(req, res) {
    User.find({"secret":{$ne:null}},function(err,foundUsers){
      if(err){
        console.log(err);
      }
      else{
        if(foundUsers){
          res.render("secrets",{usersWithSecrets:foundUsers})
        }
      }
    });

  });


app.route("/logout")
  .get(function(req, res) {
    req.logout(function(err) {
      console.log(err);
    });
    res.redirect("/");
  });


app.route("/register")

  .get(function(req, res) {
    res.render("register");
  })

  .post(function(req, res) {
    User.register({
      username: req.body.username
    }, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register")
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/secrets");
        });
      }

    });

  });

app.route("/submit")
  .get(function(req, res) {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }

  })
  .post(function(req, res) {
    const submittedSecret = req.body.secret;
    console.log(req.user._id);
    User.findById(req.user._id,function(err,foundUser){
      if(err){
        console.log(err);
      }else{
        if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(err){
          if(err){
            console.log(err);
          }else{
            res.redirect("/secrets")
          }
        });
        }
      }
    });
  });



app.listen(3000, function() {
  console.log("server started on port 3000.");
});
