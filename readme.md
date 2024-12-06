This backend is a robust and scalable API designed for managing video content, user profiles, and interactions. Built with Node.js and Express, and powered by MongoDB, it supports various features such as video uploads, user authentication, video publishing, search, and more.

Key Features

1. User Authentication
   User registration and login using JWT-based authentication.
   Secure password storage with bcrypt.
   User roles and permissions (e.g., admin, regular users).

2. Video Management
   Upload videos and thumbnails with integration to Cloudinary.
   CRUD operations for videos, including:
   Create, update, delete, and fetch videos.
   Toggle video publishing status (isPublished).
   Add metadata like title, description, views, and duration.

3. Search and Filtering
   Comprehensive search capabilities using MongoDB's aggregation framework:
   Search by title or description.
   Filter videos by user ID, publishing status, or other fields.
   Sorting options (e.g., views, createdAt, duration).
   Pagination support with page and limit query parameters.

4. Playlists and Suggestions
   Create, update, and delete playlists.
   Add videos to playlists with aggregation for playlist details.
   Randomized video suggestions using a shuffle algorithm or $sample in MongoDB aggregation.

5. User Profiles
   View and edit user profiles, including avatars.
   Fetch profile data for individual users.
   Subscription functionality for channels.

6. Comments and Interactions
   Add, edit, and delete comments on videos.
   Like/dislike videos and comments.
   Fetch comments with pagination.

7. Analytics
   Track video views and store unique viewer counts.
   Aggregate statistics like total views, likes, and subscriptions.
   
8. Error Handling and Validation
   Centralized error handling with custom error classes (e.g., ApiError).
   Input validation using Joi and other middleware.
   Comprehensive HTTP status codes for all responses.

   Tech Stack :-
   Backend:
   Node.js: Runtime environment for the backend.
   Express.js: Web framework for API routing and middleware.
   MongoDB: Database for storing video, user, and interaction data.
   Mongoose: ODM for MongoDB.

   Additional Tools:-
   Cloudinary: For video and image uploads.
   jsonwebtoken: For handling authentication tokens.
   bcrypt: For secure password hashing.
   aggregate-paginate-v2: Simplifies pagination in MongoDB aggregation pipelines.
