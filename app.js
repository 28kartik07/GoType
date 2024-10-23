const express = require("express");
const bodyparser = require("body-parser");
const _ = require("lodash");

const session = require("express-session");
const passport = require("passport");
const passportlocalmongoose = require("passport-local-mongoose");

const mongoose = require("mongoose");

const PORT = 3000;
const URL = `http://localhost:${PORT}/`;

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "this is my secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose
  .connect(
    "mongodb+srv://kartik:kartik123@cluster0.8ou8ajo.mongodb.net/?retryWrites=true&w=majority"
  )
  .then(() => console.log("mongo connected"))
  .catch((err) => console.log(err));

const userschema = new mongoose.Schema({
  username: String,
  password: String,
  Speed: {
    type: [
      {
        type: Number,
        validate: {
          validator: function (v) {
            return Array.isArray(v) && v.length <= 10;
          },
          message: "Speed array can only store up to 10 records",
        },
      },
    ],
  },
  Accuracy: {
    type: [
      {
        type: Number,
        validate: {
          validator: function (v) {
            return Array.isArray(v) && v.length <= 10;
          },
          message: "Accuracy array can only store up to 10 records",
        },
      },
    ],
  },
  maxs: {
    type: Number,
    default: 0,
  },
  maxa: {
    type: Number,
    default: 0,
  },
});

userschema.plugin(passportlocalmongoose);

const usermodel = mongoose.model("GoType", userschema);

passport.use(usermodel.createStrategy());

passport.serializeUser(usermodel.serializeUser());
passport.deserializeUser(usermodel.deserializeUser());

//////paragraph data base///////////////////////////////
const paraschema = new mongoose.Schema({
  para: String,
});
const paramodel = mongoose.model("paragraph", paraschema);
/////////////////////////////////////////////////////////
var paragraph = "";
function parasplit() {
  paragraph = paragraph.toLowerCase();
  paragraph = paragraph.replace(/[^a-zA-Z ]/g, "");
  var words = paragraph.split(" ");
}

// const newpara1 = new paramodel({
//   para : "Generating random paragraphs can be an excellent way for writers to get their creative flow going at the beginning of the day. The writer has no idea what topic the random paragraph will be about when it appears. This forces the writer to use creativity to complete one of three common writing challenges. The writer can use the paragraph as the first one of a short story and build upon it. A second option is to use the random paragraph somewhere in a short story they create. The third option is to have the random paragraph be the ending paragraph in a short story. No matter which of these challenges is undertaken, the writer is forced to use creativity to incorporate the paragraph into their writing."
// })
// const newpara2 = new paramodel({
//   para : "Another productive way to use this tool to begin a daily writing routine. One way is to generate a random paragraph with the intention to try to rewrite it while still keeping the original meaning. The purpose here is to just get the writing started so that when the writer goes onto their day's writing projects, words are already flowing from their fingers."
// })
// const newpara3 = new paramodel({
//   para : "There are usually about 200 words in a paragraph, but this can vary widely. Most paragraphs focus on a single idea that's expressed with an introductory sentence, then followed by two or more supporting sentences about the idea. A short paragraph may not reach even 50 words while long paragraphs can be over 400 words long, but generally speaking they tend to be approximately 200 words in length."
// })

// newpara1.save();
// newpara2.save();
// newpara3.save();
////////////////////////////////////////////////////////
app
  .route("/")
  .get(function (req, res) {
    paramodel
      .aggregate([{ $sample: { size: 1 } }])
      .then((result) => {
        paragraph = result[0].para;
        parasplit();
      })
      .then((result) => {
        if (req.isAuthenticated()) {
          res.render("home", { islog: true, para: paragraph });
        } else {
          res.render("home", { islog: false, para: paragraph });
        }
      });
  })
  .post(function (req, res) {
    const wpm = req.body.Wpm;
    const acc = req.body.Acc;
    if (req.user) {
      usermodel.findOne({ _id: req.user._id }).then((result) => {
        if (result.Speed.length === 0) {
          usermodel
            .updateOne(
              { _id: req.user._id },
              { $push: { Speed: wpm, Accuracy: acc } }
            )
            .then((result) => {});
        } else {
          usermodel
            .updateOne(
              { _id: req.user._id },
              {
                $push: {
                  Speed: { $each: [wpm], $slice: -10 },
                  Accuracy: { $each: [acc], $slice: -10 },
                },
              }
            )
            .then((result) => {});
        }
      });
    }
  });

app
  .route("/login")
  .get(function (req, res) {
    res.render("login", { error_mess: "" });
  })
  .post(function (req, res) {
    const user = new usermodel({
      username: req.body.username,
      password: req.body.password,
    });

    req.login(user, function (err) {
      if (err) console.log(err);
      else {
        passport.authenticate("local", function (err, user, info) {
          if (err) console.log(err);
          if (!user) {
            res.render("login", { error_mess: "Invalid User ID or Password" });
          } else res.redirect("/");
        })(req, res);
      }
    });
  });

app
  .route("/signup")
  .get(function (req, res) {
    res.render("signup");
  })
  .post(function (req, res) {
    usermodel.register(
      { username: req.body.username },
      req.body.password,
      function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("/signup");
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/");
          });
        }
      }
    );
  });

app.route("/userprofile").get(function (req, res) {
  if (req.isAuthenticated()) {
    var s, a;
    usermodel.findOne({ _id: req.user._id }).then((result) => {
      s = result.Speed;
      a = result.Accuracy;
      var m = Math.max(...s);
      var maxi = s.indexOf(m);
      if (m >= result.maxs) {
        usermodel
          .updateOne(
            { _id: req.user._id },
            { $set: { maxs: s[maxi], maxa: a[maxi] } }
          )
          .then((ans) => {
            res.render("userprofile", {
              name: result.username,
              speed: s,
              accuracy: a,
              maxs: s[maxi],
              maxa: a[maxi],
            });
          });
      } else
        res.render("userprofile", {
          name: result.username,
          speed: s,
          accuracy: a,
          maxs: result.maxs,
          maxa: result.maxa,
        });
    });
  } else {
    res.render("login", { error_mess: "Please login to view your profile" });
  }
});

app.route("/logout").get(function (req, res) {
  req.logout((err) => {
    if (err) console.log(err);
  });

  res.redirect("/");
});

app.listen(PORT, function (req, res) {
  console.log(`server started at port ${PORT}`);
  console.log(`visit ${URL} to open page`)
});
