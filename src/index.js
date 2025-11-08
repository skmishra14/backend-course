import dotenv from "dotenv";
import express from "express";
import connectDB from "./db/index.js";

dotenv.config({
    path: "./.env"
});
const app = express();

// better way is to create db file at separate location and import funtions
connectDB()









// another way of connecting to backend.
/* IIFE -> Immediately Invoked Function Expression
;( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on(()=>{
            console.log('Something went wrong');
        });
        app.listen(process.env.PORT, ()=> {
            console.log(`App is listening on PORT: ${process.env.PORT}`);
        });
    } catch (error) {
        console.error("ERROR: ", error);
    }
})()
*/