import ApiErros from "../utils/ApiErros.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from "../models/user.models.js";

dotenv.config({
    path: "./.env"
});

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // in header Authorization Bearer <token>
        // we only require <token>, so just replace 'Bearer ' with empty string
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiErros(401, "Unauthorized access");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiErros(401, "Invalid Access token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiErros(401, error?.message || "Invalid Access token");
    }
})