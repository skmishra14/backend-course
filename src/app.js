import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// setting up cors to allow the urls
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

// setting up various cases to handle url params
//1. allow json file to access only 16kb of file at a time 
app.use(express.json({limit: '16kb'}));

//2. get the encoded url, extended will the nested params as well
app.use(express.urlencoded({extended: true, limit: '16kb'}));

//3. store the images/gifs temporarly
app.use(express.static('public')); 

app.use(cookieParser());


// import router and use that
import userRouter from './routers/user.routers.js';

app.use('/api/v1/users', userRouter);

export default app;