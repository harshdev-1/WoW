const express = require('express');
const passport = require('passport');
const User = require('../models/userModel'); // Adjust the path based on your project structure
const Post = require('../models/postModel')
const LocalStrategy = require('passport-local').Strategy;
 
const upload = require('../middlewares/multer');
const UserModel = require('../models/userModel');


const router = express.Router();

// Login route to render the login form
router.get('/login', (req, res) => {
  res.send(`Login Page ${req.user ? req.user.username : ''}`);
});

// Use a custom LocalStrategy for authentication
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await User.findOne({ username });

      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }

      const isValidPassword = await user.verifyPassword(password);

      if (!isValidPassword) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

router.post('/login', passport.authenticate('local', {
  successRedirect: '/user/Profile',
  failureRedirect: '/',
}));

// Signup route to render the signup form
router.get('/signup', (req, res) => {
  res.send('Signup Page');
});
router.get("/",function(req,res){
  res.render("find")
})
router.get('/find/:user', async function (req, res) {
  try {
      const userData = req.params.user;
      const rData = new RegExp(userData, 'i'); // 'i' flag for case-insensitive search

      // Using async/await to handle the asynchronous nature of MongoDB queries
      const data = await UserModel.find({ username: rData });

      if (data.length === 0) {
          // No user found
          return res.status(404).json({ message: 'User not found' });
      }

      // Send the found user data back to the client
      res.status(200).json(data);
  } catch (error) {
      // Handle any errors that may occur during the query
      console.error('Error finding user:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Signup route to handle form submission
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Create a new user
    const newUser = new User({ username, password,email });

    // Register the user with a hashed password
    await User.register(newUser, password);

    // Log in the user after successful signup
    req.login(newUser, (err) => {
      if (err) {
        console.error(err);
        return res.redirect('/user/login');
      }

      // Redirect to the Profile with the username available in req.user
      res.redirect('/user/Profile');
    });
  } catch (error) {
    console.error(error);
    res.redirect('/'); // Handle the error appropriately
  }
});

// Profile route accessible only if authenticated
router.get('/Profile', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('post');

    res.render('Profile', { user,username:req.user.username ,email:req.user.email});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/post', isLoggedIn,upload.single('input-b1'), async function(req, res) {
  try {
    if (!req.user || !req.user._id) {
      // Handle the case where user information is not available
      throw new Error('User information not available');
    }

    const userId = req.user._id;
    const post = await Post.create({
      userId,
      postText: req.body.PostText,
    });

    const user = await User.findOne({username:req.user.username})
    await user.post.push(post._id)
    await user.save();

    res.redirect("/user/profile");
  } catch (error) {
    console.error(error);
    // Handle the error appropriately, e.g., send an error response
    res.status(500).send('Internal Server Error');
  }
});


router.get("/:user", async function (req, res) {
  try {
      const username = req.params.user;
      const regex = new RegExp('^'+username +"$", "i"); // Case-insensitive regex

      const data = await User.findOne({ username: regex });

      if (!data) {
          return res.json("Available");
      } else {
          return res.json("Not available");
      }
  } catch (error) {
      console.error("Error checking username availability:", error);
      return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/profile/:user", async function(req, res) {
  const data = await UserModel.findOne({ username: req.params.user });
  const post = await UserModel.findOne({ username: req.params.user }).populate('post')
  if (!data) {
    // User not found, handle accordingly (redirect, show an error page, etc.)
    return res.status(404).send("User not found");
  }
  // data.post.forEach(element => {
  //   var post = element.populate('postText')
  //   console.log(post);
  // });
  res.render("FINDprofile", { user: data ,post});
});

router.get("/add-follower/:user",isLoggedIn ,async function(req,res){
  findUser = UserModel.find(req.params.user)
})

// Logout route
router.post('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});
// Middleware to check if the user is authenticated
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

module.exports = router;
