// Import required modules
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);

// Initialize Express app
const app = express();

// Configure EJS as view engine
app.set("view engine", "ejs");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Connect to MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/usersix")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

//session handle

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  })
);

/

// Define user schema and model
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

//define Admin Schema

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const Admin = mongoose.model("Admin", adminSchema);

// Routes
app.get("/", (req, res) => {
  res.render("login");
});

app.post("/", (req, res) => {
  const { username, password } = req.body;

  const admin = Admin.findOne({ username, password });
  if (admin) {
    req.session.admin = admin;
    res.redirect("/admin/dashboard");
    return;
  }


  const user = User.findOne({ username, password })
    .then(() => {
      console.log("user logged in succesfully");
      req.session.user = user;
      res.render("home");
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/signup");
    });
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  const newUser = new User({ username, password });
  newUser
    .save()
    .then(() => {
      console.log("User saved succesfully");
      res.render("home");
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/signup");
    });
});

// admin authentication

const isAdminAuthenticated = (req,res,next)=>{
    if(!req.session.admin){
        next()
    }else{
        res.redirect("/")
    }
}

app.get("/admin/dashboard",isAdminAuthenticated,(req,res)=>{
    if(req.session.admin){
        const users=await User.find();
        res.render("admin_dashboard",{users})
    }else{
        res.redirect("/")
    }
})

app.post("/admin/search", isAdminAuthenticated, async (req, res) => {
    try {
        const { searchQuery } = req.body;
        if (!searchQuery) {
            // Handle empty search query
            return res.redirect('/admin/dashboard');
        }
        const regex = new RegExp(searchQuery, 'i');
        const users = await User.find({ username: { $regex: regex } });
        res.render("admin_dashboard", { users, searchQuery });
    } catch (error) {
        console.error("Error searching users:", error);
        res.status(500).send("Internal Server Error");
    }
});



app.post("/admin/create",isAdminAuthenticated,(req,res)=>{
    const {username,password}=req.body;
    const newUser=new User({username,password});
    newUser.save();
    res.redirect("/admin/dashboard");
})

app.post("/admin/delete/:id",isAdminAuthenticated,(req,res)=>{
    const {id}=req.params;
    User.findByIdAndDelete(id);
    res.redirect("/admin/dashboard");
})

app.post("/admin/edit/:id",isAdminAuthenticated,(req,res)=>{
    const {id} =req.params;
    const {username,password}=req.body;
    User.findByIdAndUpdate(id,{username,password})
    res.redirect("/admin/dashboard")
})

app.get("/logout",(req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.error(err);
        }else{
            res.redirect("/")
        }
    })
})

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
