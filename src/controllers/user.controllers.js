import asyncHandler from "../utils/asyncHandler.js";
import ApiErros from "../utils/ApiErros.js";
import { User } from "../models/user.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponses from "../utils/ApiResponses.js";

const registerUser = asyncHandler(async (req, res) => {
    // get the user data 
    // validation - check for empty
    // check if user is already exist 
    // check for the images and avatar
    // upload them to cloudinary
    // create user object - create entry in db
    // remove password and refresh token from the response
    // check for user creation
    // return the response

    const { fullName, email, username, password } = req.body;

    if (
        [fullName, email, username, password].some(field => field?.trim() === "")
    ) {
        throw new ApiErros(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiErros(409, "email or username already exist");
    }

    // handle the files
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path; 
    // this will throw undefined error

    let coverImageLocalPath;
    if (req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiErros(400, "Avatar is requied");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiErros(400, "Avatar is requied");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshTokens"
    );

    if (!createdUser) {
        throw new ApiErros(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponses(200, "Created the user record successfully", createdUser)
    )

});

export default registerUser;