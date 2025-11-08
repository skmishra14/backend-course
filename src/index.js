import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({
    path: "./.env"
});

const PORT = process.env.PORT || 8000;

// better way is to create db file at separate location and import funtions
connectDB()
.then(() => {
    app.listen(PORT, () => {
        console.log(`App is listening on port: ${PORT}`);
    })
})
.catch((error) => {
    console.log('MONGO connection error !! ', error);
})









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