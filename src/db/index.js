import mongoose from "mongoose";

import { DB_NAME } from "../constant.js";

const connectDB = async () => {
    // always use try catch with mongoose connection
    // data base is always under different continent 
    try {
        // syntex: MONGO-URI/databaseName
        const connectDBInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`DB connected !! at: ${connectDBInstance.connection.host}`);
    } catch (error) {
        console.error("ERROR: ", error);
        // terminates the process
        process.exit(1);
    }
}

export default connectDB;