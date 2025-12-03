const express = require("express")
const app = express();
const path = require('path')
const env = require('dotenv').config();
const db = require('./config/db')
const userRouter = require('./routes/userRouter.js')
db();

app.use(express.json());
app.use(express.urlencoded({extended : true}))


app.set('view engine','ejs');
// Use the root `views` directory so layout and partials are resolvable
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(require("express-ejs-layouts"));
app.set("layout", "layout");

app.use('/',userRouter);


// app.get('/',(req,res)=>{
//     res.render('home');
// })

 

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
    console.log(`Server running on http://localhost:${PORT}`)
})


module.exports = app;
