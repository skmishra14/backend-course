import asyncHandler from "../utils/asyncHandler.js";
import ApiErros from "../utils/ApiErros.js";
import { User } from "../models/user.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponses from "../utils/ApiResponses.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// generate access and refresh token
const getAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        // save the user details without checking
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiErros(500,
            "Something went wrong while creating access token and refresh token");
    }
}

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

const loginUser = asyncHandler(async (req, res) => {
    // get the data
    // username or email -> for the access
    // find the user
    // check password
    // access and refresh token creation
    // send cookies (User enters)

    const { email, username, password } = req.body;

    if (!email && !username) {
        throw new ApiErros(400, "Username or email requied");
    }

    // alternate way
    // if (! (email || username))))

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiErros(404, "user does not exist");
    }

    const isPasswordValid = user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiErros(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await getAccessTokenAndRefreshToken(user._id);

    // now user will not have the accessToken and refreshToken as it was created earlier
    // so we have 2 ways 
    // 1. call the database and get the updated user
    // 2. add accessToken and refreshToken to the same user

    // making a call to database
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const option = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(
            new ApiResponses(
                200,
                "User logged in successfully",
                {
                    user: loggedInUser, accessToken, refreshToken
                }
            )
        )
});

const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const option = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", option)
        .clearCookie("refreshToken", option)
        .json(
            new ApiResponses(
                200,
                "User logged out successfully",
                {}
            )
        )
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiErros(401, "Unauthorized access");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiErros(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiErros(401, "Refresh token expired");
        }

        const { accessToken, newRefreshToken } = await getAccessTokenAndRefreshToken(user?._id);

        const option = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, option)
            .cookie("refreshToken", newRefreshToken, option)
            .json(
                new ApiResponses(
                    200,
                    "generated new access and refresh token",
                    { accessToken, refreshToken: newRefreshToken }
                )
            )
    } catch (error) {
        throw new ApiErros(401, error?.message || "Something went wrong");
    }

});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiErros(400, 'Invalid Password');
    }

    user.password = newPassword;
    user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponses(200, 'Password changed successfully', {}));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponses(200, 'Got the user', req.user));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiErros(400, 'Fill the rquired fields');
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponses(200, 'User data has been updated', user));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiErros(400, 'avatar file is missing');
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiErros(500, 'Something went missing while uploading avatar to cloudinary');
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponses(200, 'Avatar updated successfully', user));
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiErros(400, 'CoverImage file is missing');
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiErros(500, 'Something went wrong while updating coverImage to cloudinary');
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponses(200, 'CoverImage updated successfully', user));
});

// working on aggregation pipeline
const getUserChannelPorfile = asyncHandler(async (req, res) => {
    const {username} = req.params;

    if(!username?.trim()) {
        throw new ApiErros(400, 'Username not present');
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'channel',
                as: 'subscribers'
            }
        },
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'subscriber',
                as: 'subscribedTo'
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: '$subscribers'
                },
                channelsSubscribedToCount: {
                    $size: '$subscribedTo'
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: ['req.user?._id', '$subscriptions.subscriber']},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    // TODO: remove this after seeing the response.
    console.log('--- channel value ---', channel);

    if (!channel?.length) {
        throw new ApiErros(404, "Channel does not exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponses(200, 'User channel data fetched successfully', channel[0])
        )
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
          $lookup: {
            from: 'videos',
            localField: 'watchHistory',
            foreignField: '_id',
            as: 'watchHistory',
            pipeline: [
                {
                    $lookup: {
                        from: 'users',
                        localField: 'owner',
                        foreignField: '_id',
                        as: 'owner',
                        pipeline: [
                            {
                                $project: {
                                    fullName: 1,
                                    username: 1,
                                    avatar: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $addFields: {
                        owner: {
                            $first: '$owner'
                        }
                    }
                }
            ]
          }  
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponses(200, 'Watch history fetched successfully', user[0].watchHistory)
        )
})

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelPorfile,
    getUserWatchHistory
};