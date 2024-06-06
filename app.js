const express = require("express");
const bodyparser = require("body-parser");
const _ = require("lodash");

const session = require("express-session");
const passport = require("passport");
const passportlocalmongoose = require("passport-local-mongoose");

const mongoose = require("mongoose");

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyparser.urlencoded({extended : true}));

app.use(session({
    secret: "this is my secret",
    resave:false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://kartik:kartik123@cluster0.8ou8ajo.mongodb.net/?retryWrites=true&w=majority").then(()=>console.log("mongo connected")).catch(err => console.log(err));

const userschema = new mongoose.Schema({
    username: String,
    password: String,
    Speed: {
      type: [
        {
          type: Number,
          validate: {
            validator: function(v) {
              return Array.isArray(v) && v.length <= 10;
            },
            message: 'Speed array can only store up to 10 records',
          },
        },
      ],
    },
    Accuracy: {
      type: [
        {
          type: Number,
          validate: {
            validator: function(v) {
              return Array.isArray(v) && v.length <= 10;
            },
            message: 'Accuracy array can only store up to 10 records',
          },
        },
      ],
    },
    maxs : {
        type : Number,
        default : 0
    },
    maxa : {
        type : Number,
        default : 0
    },
});


userschema.plugin(passportlocalmongoose);

const usermodel = mongoose.model("GoType",userschema);

passport.use(usermodel.createStrategy());

passport.serializeUser(usermodel.serializeUser()); 
passport.deserializeUser(usermodel.deserializeUser());



//////paragraph data base///////////////////////////////
const paraschema = new mongoose.Schema({
    para : String
});

const paramodel = mongoose.model("paragraph",paraschema);


/////////////////////////////////////////////////////////
var paragraph="";
function parasplit()
{
    paragraph = paragraph.toLowerCase();
    paragraph = paragraph.replace(/[^a-zA-Z0-9 ]/g, '');
    var words = paragraph.split(" ");
}

////////////////////////////////////////////////////////
app.route("/")
.get(function(req,res){
    
    paramodel.aggregate([{$sample : {size : 1}}]).then(result=>{
        if(result.length > 0)
            paragraph = result[0].para;
        parasplit();
    }).then(result=>{
        if(req.isAuthenticated())
        {
            res.render("home" , {islog : true ,para : paragraph});
        }
        else
        {
            res.render("home",{islog : false ,para : paragraph});  
        }   
    });    
})
.post(function(req,res){
    const wpm = req.body.Wpm;
    const acc = req.body.Acc;
    if(req.user)
    {
        usermodel.findOne({_id : req.user._id }).then(result =>{
            if(result.Speed.length < 10)
            {
                usermodel.updateOne({_id : req.user._id} , {$push : {Speed : wpm , Accuracy : acc}}).then(result => {
                    
                });
            }
            else
            {
                usermodel.updateOne({ _id : req.user._id },
                {
                    $push: {
                    Speed: { $each: [wpm], $slice: -10 },
                    Accuracy: { $each: [acc], $slice: -10 },
                    },
                }).then(result => {
                    
                });;
            }
        }); 
    }
});

app.route("/login")
.get(function(req,res){
    res.render("login",{error_mess: ""});
})
.post(function(req,res){
    
    const user = new usermodel({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user,function(err){
        if(err)
            console.log(err);
        else
        {
            passport.authenticate("local",function(err,user,info){
                if(err)
                    console.log(err);
                if(!user)
                {
                    res.render("login",{error_mess: "Invalid User ID or Password"});
                }
                else    
                    res.redirect("/");
            })(req,res);
        }
    });

});

app.route("/signup")
.get(function(req,res){
    res.render("signup");
})
.post(function(req,res){
    
    usermodel.register({username: req.body.username},req.body.password,function(err,user){
        if(err)
        {
            console.log(err);
            res.redirect("/signup");
        } 
        else
        {
            passport.authenticate("local")(req,res,function(){
                res.redirect("/");
            }); 
        }
    });  
});;

app.route("/userprofile")
.get(function(req,res){
    if(req.isAuthenticated())
    {   
        var s,a;
        usermodel.findOne({_id : req.user._id}).then(result=>{
            s = result.Speed;
            a = result.Accuracy;
            var m = Math.max(...s);
            var maxi = s.indexOf(m);
            if(m>=result.maxs)
            {
                usermodel.updateOne({_id : req.user._id} , {$set: {maxs : s[maxi] , maxa : a[maxi]}}).then(ans=>{
                    res.render("userprofile" , {name : result.username , speed: s , accuracy: a , maxs : s[maxi] , maxa : a[maxi]});
                });
            }
            else
                res.render("userprofile" , {name : result.username , speed: s , accuracy: a , maxs : result.maxs , maxa : result.maxa});
        });
    }
    else
    {
        res.render("login" , {error_mess : "Please login to view your profile"});
    }  
});

app.route("/logout")
.get(function(req,res){
    req.logout(err=>{
        if(err)
            console.log(err);
    });
    
    res.redirect("/");
});

app.listen("8000",function(req,res){
    console.log("server started");
});
