// Import required modules
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore=require("connect-mongo");

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
      store: MongoStore.create({
         mongoUrl:"mongodb://127.0.0.1:27017/usersix"
      })
    })
  );



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

app.post("/", async (req, res) => {
    const { username, password } = req.body;

    // Check if the user is an admin
    const admin = await Admin.findOne({ username, password });
    if (admin) {
        req.session.admin = admin;
        res.redirect("/admin/dashboard");
        return;
    }

    // Check if the user is an existing user
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        // User exists, attempt login
        if (existingUser.password === password) {
            req.session.user = existingUser;
            console.log("User logged in successfully");
            res.render("home");
            return;
        } else {
            // Incorrect password, redirect to login page
            console.log("Incorrect password for existing user");
            res.redirect("/");
            return;
        }
    }

    // No existing user found, redirect to signup page
    res.redirect("/signup");
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
    if(req.session.admin){
        next()
    }else{
        res.redirect("/")
    }
}

app.post("/admin/login", async (req, res) => {
    const { username, password } = req.body;
    
    // Check if the provided credentials match the default admin credentials
    const admin = await Admin.findOne({ username, password });
    if (admin) {
        // Create a session for the admin
        req.session.admin = admin;
        res.redirect("/admin/dashboard"); // Redirect to admin dashboard
    } else {
        res.status(401).send("Unauthorized access"); // Send 401 Unauthorized status with a message
    }
});


app.get("/admin/dashboard",isAdminAuthenticated,async(req,res)=>{
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
    

      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
      const regex = new RegExp(escapedQuery, 'i');
      const users = await User.find({ username: { $regex: regex } });
      res.render("admin_dashboard", { users, searchQuery });
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).send("Internal Server Error");
    }
  });


app.post("/admin/create",isAdminAuthenticated,async (req,res)=>{
    const {username,password}=req.body;
    const newUser=await new User({username,password});
    newUser.save();
    res.redirect("/admin/dashboard");
})

app.post("/admin/delete/:id",isAdminAuthenticated,async(req,res)=>{
    const {id}=req.params;
    await User.findByIdAndDelete(id);
    res.redirect("/admin/dashboard");
})

app.post("/admin/edit/:id",isAdminAuthenticated,async(req,res)=>{
    const {id} =req.params;
    const {username,password}=req.body;
    await User.findByIdAndUpdate(id,{username,password})
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
