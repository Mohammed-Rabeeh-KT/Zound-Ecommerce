const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/userSchema");

const loadLogin = (req, res) => {
  res.render("user/login", { message: null });
};

const loadSignup = (req, res) => {
  res.render("user/signup", { message: null });
}


const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;  

    const hash = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hash,
    });

    res.redirect("user/login");
  } catch (error) {
    console.error("Error during signup:", error);
    res.redirect("user/signup", { message: "Error during signup. Please try again." });
  }
}


const login = async (req, res) => {
    const {email,password,remember} = req.body;

    try{

        const user = await User.findOne({email});

        if(!user){
            return res.render('user/login',{message : "Invalid email or user doesn't exist."})
        }

        if(user.isBlocked){
            return res.render('user/login' , {message : "Your account has been blocked."})
        }

        const validPassword = await bcrypt.compare(password,user.password);
        if(!validPassword){
            return  res.render('user/login',{message : "Invalid email or password."})
        }

        const token = jwt.sign({id:user._id}, process.env.JWT_SECRET, 
          {expiresIn: remember ? '7d':'1d'});


        res.cookie('authToken',token,{
            httpOnly: true,
            maxAge: remember ? 7*24*60*60*1000 : null
        });


        res.redirect('/');
    }

    catch(error){
        console.error("Error during login:", error);
        res.render('/login',{message : "Error during login. Please try again."})
    }
};


module.exports = {
    loadLogin,
    loadSignup,
    signup,
    login
}