require('dotenv/config')
const express = require("express");
const cors = require('cors')
const mongoose = require("mongoose");
const morgan =  require("morgan")

const userRoute = require('./routes/user');
const projectRoute = require('./routes/project');
const db = process.env.MONGODB;
const app = express();

// MIDDLEWARE
app.use(cors())
app.use(express.json()) // alternative to body-parser
app.use(morgan('dev')) // used for logs during development
app.use('/users', userRoute);
app.use('/projects', projectRoute);
app.use((req, res, next)=>{
    res.status(500).send('Invalid url')
})



//CONNECT TO DB WITH MONGOOSE
mongoose.connect(
    //!IMPORTANT: HIDE DB URL IN ENV FILE
    db,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    }
);


// STARTING SERVER
const port = 5000
app.listen(port, err => {
    if(err){console.log(`Server cant listen on port ${port}`); return}
    console.log(`Server listening on port ${port}`)
})

// // CHECK IF ERROR,SO NOT CRASHING
process.on("uncaughtException", (err, data) => {
    if (err) { console.log(err) }
    return
})