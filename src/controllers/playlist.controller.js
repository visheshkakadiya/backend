import mongoose, {isValidObjectId} from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async(req, res) => {
    const {name, description} = req.body

    if(!name || !description){
        throw new ApiError(400, "name and description both are required");
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id,
    })

    if (!playlist) {
        throw new ApiError(500, "failed to create playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "playlist created successfully")
        );
})

const updatePlaylist = asyncHandler(async(req, res) => {
    const {name, description} = req.body
    const {playlistId} = req.params;

    if (!name || !description) {
        throw new ApiError(400, "name and description both are required");
    }

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid PlaylistId");
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if(playlist.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "only owner can edit the playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set: {
                name,
                description,
            }
        },
        {new: true}
    )

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "playlist updated successfully"
            )
        );
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can delete the playlist");
    }

    await Playlist.findByIdAndDelete(playlist?._id);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "playlist deleted successfully"
            )
        );
});

const addVideoToPlaylist = asyncHandler(async(req, res) => {
    const {videoId} = req.params
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid PlaylistId or videoId");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    if (!video) {
        throw new ApiError(404, "video not found");
    }

    if(playlist.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "only owner can add video to thier playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet: {
                videos: videoId,
            }
        },
        {new: true}
    )

    if (!updatedPlaylist) {
        throw new ApiError(
            400,
            "failed to add video to playlist please try again"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedPlaylist, "Added video to playlist successfully")
        );
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid PlaylistId or videoId");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    if (!video) {
        throw new ApiError(404, "video not found");
    }

    if (playlist.owner?.toString() !== req.user?._id.toString()
    ) {
        throw new ApiError(
            404,
            "only owner can remove video from thier playlist"
        );
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId,
            },
        },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Removed video from playlist successfully"
            )
        );
});

const getPlaylistById = asyncHandler(async(req, res) => {
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId");
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    const playlistVideos = await Playlist.aggregate([
            {
              $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
              }
            },
            {
              $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
              }
            },
            {
              $unwind: {
                path: "$videos",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $match: {
                "videos.isPublished": true
              }
            },
            {
              $lookup: {
                from: "users",
                localField: "videos.owner",
                foreignField: "_id",
                as: "videos.owner" // Embed the video owner details
              }
            },
            {
              $addFields: {
                "videos.owner": { $arrayElemAt: ["$videos.owner", 0] } // Extract the first owner (single owner per video)
              }
            },
            {
              $group: {
                _id: "$_id",
                name: { $first: "$name" },
                description: { $first: "$description" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                totalViews: { $sum: "$videos.views" },
                totalVideos: { $sum: 1 }, // Count total videos during grouping
                videos: { $push: "$videos" }
              }
            },
            {
              $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                  _id: 1,
                  "videoFile.url": 1,
                  "thumbnail.url": 1,
                  title: 1,
                  description: 1,
                  duration: 1,
                  createdAt: 1,
                  views: 1,
                  owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                  }
                }
              }
            }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, playlistVideos[0], "playlist fetched successfully"));
})

const getUserPlaylists = asyncHandler(async(req, res) => {
    const {userId} = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner",
                },
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                firstVideoThumbnail: {
                    $arrayElemAt: ["$videos.thumbnail.url", 0]
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1,
                createdAt: 1,
                firstVideoThumbnail: 1,
                owner: {
                    username: 1,
                }
            }
        },
    ]);

    return res
    .status(200)
    .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
})

export {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getUserPlaylists,
};