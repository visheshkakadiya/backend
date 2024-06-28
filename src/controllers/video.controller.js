import asyncHandler from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose, { Schema, isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js';

const getAllVideos = asyncHandler(async(req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    const pipeline = []

    if(userId){
        if(!isValidObjectId(userId)){
            throw new ApiError(400, "Invalid userId")
        }
    }

    pipeline.push({
        $match: {
            owner: new mongoose.Types.ObjectId(userId)
        }
    })

    pipeline.push({
        $match: {isPublished: true}
    });

    if(sortBy && sortType){
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        });
    }
    else{
        pipeline.push({
            $sort: {
                createdAt: -1,
            }
        })
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails",
        }
    )

    const videoAggregate = await Video.aggregate(pipeline)

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const video = await Video.aggregatePaginate(videoAggregate, options)

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Videos fetched successfully")
        )
})

const publishAVideo = asyncHandler(async(req, res) => {
    const {title, description} = req. body

    if([title, description].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required")
    }

    const videoFileLocalPath = req.files?.videoFile[0].path
    const thumbnailLocalPath = req.files?.thumbnail[0].path
    
    if (!videoFileLocalPath) {
        throw new ApiError(400, "videoFileLocalPath is required");
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnailLocalPath is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile) {
        throw new ApiError(400, "Video file not found");
    }

    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail not found");
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user?._id,
        isPublished: false,
    })
    
    const videoUploaded = await Video.findById(video._id)

    if(!videoUploaded){
        throw new ApiError(500, "videoUpload failed please try again !!!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Video uploaded successfully")
        )
})

const getVideoById = asyncHandler(async(req, res) => {
    const { videoId } = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId")
    }

    if(!isValidObjectId(req.user?._id)){
        throw new ApiError(400, "Invalid userId")
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false,
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [
                                req.user?._id,
                                "$likes.likedBy"
                            ]
                        },
                        then: true,
                        else: false,
                    }
                }
            }
        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
            }
        }
    ]);

    if(!video){
        throw new ApiError(500, "failed to fetch video")
    }

    // increment views if video fetched successfully
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1,
        }
    })

    await Video.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    })

    return res
        .status(200)
        .json(
            new ApiResponse(200, video[0], "video details fetched successfully")
        )
});

const updateVideo = asyncHandler(async(req, res) => {
    const {title, description} = req.body
    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid vidoId")
    }

    if(!(title && description)){
        throw new ApiError(400, "title and description are required");
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400, "Video not found")
    }

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "You can't edit this video as you are not the owner")
    }

    //deleting old thumbnail and updating with new one
    const thumbnailToDelete = video.thumbnail.public_id;

    const thumbnailLocalPath = req.file?.path

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail is required");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if(!thumbnail){
        throw new ApiError(400, "thumbnail not found");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    public_id: thumbnail.public_id,
                    url: thumbnail.url
                }
            }
        },
        {new: true}
    )

    if(!updatedVideo){
        throw new ApiError(500, "Failed to update video please try again");
    }

    if(updatedVideo){
        await deleteOnCloudinary(thumbnailToDelete)
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedVideo, "Video updated successfully")
        )
})

const deleteVideo = asyncHandler(async(req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "No video found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You can't delete this video as you are not the owner");
    }

    const videoDeleted = await Video.findByIdAndDelete(video?._id);

    if (!videoDeleted) {
        throw new ApiError(400, "Failed to delete the video please try again");
    }

    await deleteOnCloudinary(video.thumbnail.public_id);
    await deleteOnCloudinary(video.videoFile.public_id, "video");

    await Like.deleteMany({
        video: videoId,
    })

    await Comment.deleteMany({
        video: videoId,
    })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Video deleted successfully")
        );
});

const togglePublishStatus = asyncHandler(async(req, res) => {
    const {videoId} = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can't toogle publish status as you are not the owner"
        );
    }

    const toggledVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        {new: true}
    );

    if (!toggledVideoPublish) {
        throw new ApiError(500, "Failed to toogle video publish status");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {isPublished: toggledVideoPublish.isPublished}, "Video publish toggled successfully")
        )
});

export {
    publishAVideo,
    updateVideo,
    deleteVideo,
    getAllVideos,
    getVideoById,
    togglePublishStatus
}