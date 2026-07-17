const Community = require('../models/community')
const ComCat = require('../models/comCategory')
const Auth = require('../models/auth')
const ComCategory = require('../models/comCategory')
const moment = require('moment');
const CommunitySearch = require('../models/communitySearch');
const fireBaseNotification = require('../helpers/pushNotification');

exports.add = async (req, res, next) => {
    try {
        const { title, userId, description, categoryId } = req.bodyParams;
        if (!title || !userId || !description || !categoryId) {
            return res.apiResponse(false, 'Title or UserId or Description or categoryId is missing', {}, 400);
        }
        const user = await Auth.findOne({ id: userId })
        if (!user) {
            return res.apiResponse(false, 'User not found', {}, 404);
        }
        const Category = await ComCat.findOne({ id: categoryId })
        if (!Category) {
            return res.apiResponse(false, 'Category not found', {}, 404);
        }
        const momType = Category.momType;
        const uniqueId = `Community-${moment().format('DDMMYYYYHHmmss')}${userId}`;
        const newCommunity = new Community({
            title,
            userId,
            description,
            categoryId,
            momType,
            id: uniqueId
        });
        await newCommunity.save()
        const populatedCommunity = await Community.findById(newCommunity._id)
            .populate({
                path: 'user',
                select: 'userName profile'
            })
            .populate({
                path: 'category',
                select: 'title color file'
            });
        await setLikeAndCommentCounts(populatedCommunity)
        return res.apiResponse(true, "Community added Success", populatedCommunity, 200);
    } catch (error) {
        return res.apiResponse(false, 'Community Add error', { error }, 500);
    }
}

exports.addLike = async (req, res, next) => {
    try {
        const { userId, liked, communityId } = req.bodyParams;
        if (!userId) {
            return res.apiResponse(false, 'UserId or communityId is missing', {}, 400);
        }
        const user = await Auth.findOne({ id: userId })
        if (!user) {
            return res.apiResponse(false, 'User not found', {}, 404);
        }
        const community = await Community.findOne({ id: communityId })
        if (!community) {
            return res.apiResponse(false, 'Community not found', {}, 404);
        }
        const existingLikeIndex = community.like.findIndex(like => like.userId === userId);
        console.log('liked', liked)
        if (existingLikeIndex !== -1) {
            community.like[existingLikeIndex].liked = liked;
            community.markModified('like');
        } else {
            const dateAndTime = moment().format('DD-MM-YYYY HH:mm')
            community.like.push({ userId, liked, dateAndTime });
        }
        await community.save();
        const { totalLikes, totalComments } = await setLikeAndCommentCounts(community)
        community.totalLikes = totalLikes;
        community.totalComments = totalComments;
        await community.save();
        // if (String(userId) !== String(community.userId) && liked) {
        //     const postOwner = await Auth.findOne({ id: community.userId });
        //     const deviceInfos = postOwner?.deviceInfos || [];
        //     for (const info of deviceInfos) {
        //         const title = "Community Likes";
        //         const body = `Hi, ${postOwner.userName} — ${user.userName} is Liked on your post`;
        //         await fireBaseNotification(info.fcmToken, {
        //             title,
        //             body,
        //             data: {
        //                 type: 'like',
        //                 postId: community.id?.toString(),
        //             }
        //         });
        //     }
        // }
        res.apiResponse(true, "Community Liked Success", community, 200);
        if (String(userId) !== String(community.userId) && liked) {
            const obj = {
                fromUserId: userId,
                toUserId: community.userId,
                community: {
                    id: community.id,
                    title: community.title,
                },
                type: "Community Like"
            }
            await notifyUser(obj)
            // (async () => {
            //     try {
            //         const postOwner = await Auth.findOne({ id: community.userId, logout: false });
            //         if (postOwner) {
            //             const deviceInfos = postOwner?.deviceInfos || [];

            //             for (const info of deviceInfos) {
            //                 const title = "Community Likes";
            //                 const body = `Hi, ${postOwner.userName} — ${user.userName} liked your post`;

            //                 await fireBaseNotification(info.fcmToken, {
            //                     title,
            //                     body,
            //                     data: {
            //                         type: 'like',
            //                         postId: community.id?.toString(),
            //                     }
            //                 });
            //             }
            //         }
            //     } catch (notificationError) {
            //         console.error('Notification failed:', notificationError);
            //     }
            // })();
        }
    } catch (error) {
        return res.apiResponse(false, 'Add Like error', {}, 500);
    }
}

// async function notifyUser(loginUserId, postOwnerId, postId) {
//     try {
//         const postOwner = await Auth.findOne({ id: community.userId, logout: false });
//         if (postOwner) {
//             const deviceInfos = postOwner?.deviceInfos || [];

//             for (const info of deviceInfos) {
//                 const title = "Community Likes";
//                 const body = `Hi, ${postOwner.userName} — ${user.userName} liked your post`;

//                 await fireBaseNotification(info.fcmToken, {
//                     title,
//                     body,
//                     data: {
//                         type: 'like',
//                         postId: community.id?.toString(),
//                     }
//                 });
//             }
//         }
//     } catch (notificationError) {
//         console.error('Notification failed:', notificationError);
//     }
// }

exports.addComment = async (req, res, next) => {
    try {
        const { userId, description, communityId } = req.bodyParams;
        console.log('req.bodyParams', req.bodyParams)
        if (!userId || !description) {
            return res.apiResponse(false, 'UserId or comment is missing', {}, 400);
        }
        const user = await Auth.findOne({ id: userId })
        if (!user) {
            return res.apiResponse(false, 'User not found', {}, 404);
        }
        const community = await Community.findOne({ id: communityId })
        if (!community) {
            return res.apiResponse(false, 'Community not found', {}, 404);
        }
        if (description) {
            const commentId = `Comment-${moment().format('DDMMYYYYHHmmss')}${userId}`;
            const newComment = {
                userId,
                commentId,
                description,
                date: moment().format('DD-MMM-YYYY HH:mm:ss'),
                totalLikes: '0',
                likes: [],
                profile: user.profile,
            }
            community.comment.push(newComment)
        }
        community.comment.sort((a, b) => new Date(b.date) - new Date(a.date));
        await community.save();
        const { totalLikes, totalComments } = await setLikeAndCommentCounts(community)
        community.totalLikes = totalLikes;
        community.totalComments = totalComments;
        await community.save();

        // if (String(userId) !== String(community.userId)) {
        //     const postOwner = await Auth.findOne({ id: community.userId });
        //     const deviceInfos = postOwner?.deviceInfos || [];

        //     for (const info of deviceInfos) {
        //         const shortDescription = description.length > 20
        //             ? description.substring(0, 20) + '...'
        //             : description;

        //         const title = "Community Comments";
        //         const body = `Hi, ${postOwner.userName} — ${user.userName} commented on your post: ${shortDescription}`;

        //         await fireBaseNotification(info.fcmToken, {
        //             title,
        //             body,
        //             data: {
        //                 type: 'comment',
        //                 postId: community.id?.toString(),
        //             }
        //         });
        //     }
        // }
        res.apiResponse(true, "Comment added Success", community, 200);
        if (String(userId) !== String(community.userId)) {
            const obj = {
                fromUserId: userId,
                toUserId: community.userId,
                community: {
                    id: community.id,
                    title: community.title,
                },
                type: "Community Comment"
            }
            await notifyUser(obj)
        }

    } catch (error) {
        return res.apiResponse(false, 'Comment error', { error }, 500);
    }
}

exports.list = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const page = requests.page || 1;
        const per_page = requests.limit || 10;
        const pagination = requests.pagination || "true";
        const skip = (page - 1) * per_page;
        const match = {};

        if (requests.approved && requests.approved !== '') {
            match['approved'] = requests.approved;
        }

        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        if (requests.isMobile) {
            match['status'] = 'Active';
        }
        if (req.userDetails && req.userDetails.momType) {
            match['momType'] = req.userDetails.momType;
        }
        if (requests.userId && requests.userId !== '') {
            match['userId'] = requests.userId;
        }
        if (requests.likedUserId && requests.likedUserId !== '') {
            match['like'] = {
                $elemMatch: {
                    userId: requests.likedUserId,
                    liked: true
                }
            }
        }
        if (requests.categoryId && requests.categoryId !== '') {
            match['categoryId'] = requests.categoryId;
        }
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match['title'] = { $regex: searchTerm, $options: 'i' };
            await addCommunitySearch(requests.searchKey)
        }
        if (requests.fromDate || requests.toDate) {
            let startDate = moment(requests.fromDate);
            let endDate = moment(requests.toDate);
            if (startDate.isValid() && endDate.isValid()) {
                match.createdAt = {
                    $gte: startDate.startOf('day').toDate(),
                    $lte: endDate.endOf('day').toDate()
                };
            } else if (startDate.isValid() && !endDate.isValid()) {
                match.createdAt = {
                    $gte: startDate.startOf('day').toDate(),
                    $lte: startDate.endOf('day').toDate()
                };
            }
        }
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            populate: [
                {
                    path: 'category',
                    select: 'title color file'
                },
                {
                    path: 'user',
                    select: 'userName profile'
                }
            ]
        };
        if (pagination === "true") {
            options.sort = { createdAt: -1 };
            Community.paginate(match, options, async function (err, data) {
                if (err)
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                console.log('data', data.docs)

                await enrichCommentsWithUsers(data.docs);
                const cleanedDocs = data?.docs?.map(item => {
                    const obj = item.toObject();
                    // console.log('item.like', item.like)
                    const Liked = item.like?.some(like => like.userId?.toString() === req.userDetails.id?.toString() && like.liked);
                    let reportsLength = item.report?.length || 0;
                    obj.userLiked = Liked;
                    obj.like = [];
                    obj.comment = [];
                    obj.report = [];
                    obj.reportsLength = reportsLength;
                    return obj;
                });
                console.log('cleanedDocs', data.docs)
                data.docs = cleanedDocs;
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let community = [];
            const baseQuery = Community.find(match).populate({
                path: 'category',
                select: 'title color file'
            })
                .populate({ path: 'user', select: 'userName profile' });
            community = await baseQuery.exec();
            await enrichCommentsWithUsers(community);

            const cleanedCommunity = community.map(item => {
                const obj = item.toObject();
                console.log('item.like', item.like)
                const Liked = item.like?.some(like => like.userId?.toString() === req.userDetails.id?.toString() && like.liked);
                let reportsLength = item.report?.length || 0;
                obj.userLiked = Liked;
                obj.like = [];
                obj.comment = [];
                obj.report = [];
                obj.reportsLength = reportsLength;
                return obj;
            });
            const result = cleanedCommunity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return res.apiResponse(true, "Success", { docs: result }, 200);
        }
    } catch (error) {
        return res.apiResponse(false, 'Get list error', { error }, 500);
    }
}

exports.view = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }

        let communityDoc = await Community.findOne({ id: requests.id }).populate({
            path: 'category',
            select: 'title color file',
        });

        if (!communityDoc) {
            return res.apiResponse(false, 'Community not found', {}, 404);
        }

        const community = communityDoc.toObject();

        community.comment = [];

        const Liked = community.like?.some(
            (like) =>
                like.userId?.toString() === req.userDetails.id?.toString() && like.liked
        );
        community.liked = Liked;
        community.like = [];

        return res.apiResponse(true, 'Success', community, 200);
    } catch (error) {
        return res.apiResponse(false, 'Get community error', {}, 500);
    }
};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await Community.deleteOne({ id: requests.id });
        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Community not found', {}, 404)
        }
        return res.apiResponse(true, 'Community deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Community error', { error }, 500)
    }
}

exports.deleteCommunityComment = async (req, res) => {
    try {
        const { communityId, commentId } = req.bodyParams;

        // Validation
        if (!communityId || !commentId) {
            return res.apiResponse(false, 'CommunityId and CommentId are required', {}, 400);
        }

        // Check community exists
        const community = await Community.findOne({ id: communityId });

        if (!community) {
            return res.apiResponse(false, 'Community not found', {}, 404);
        }

        // Check comment exists
        const commentIndex = community.comment.findIndex(
            (c) => c.commentId.toString() === commentId
        );

        if (commentIndex === -1) {
            return res.apiResponse(false, 'Comment not found', {}, 404);
        }

        // Remove comment
        community.comment.splice(commentIndex, 1);
        await community.save();

        return res.apiResponse(true, 'Comment deleted successfully', {}, 200);

    } catch (error) {
        console.error('Delete Community Comment Error:', error);
        return res.apiResponse(false, 'Delete Community Comment Error', {}, 500);
    }
};


exports.addLikeForComment = async (req, res, next) => {
    try {
        const { userId, commentId, communityId, liked } = req.bodyParams;
        if (!userId || !commentId || !communityId) {
            return res.apiResponse(false, 'User or comment or community ID is missing', {}, 400);
        }
        const user = await Auth.findOne({ id: userId })
        if (!user) {
            return res.apiResponse(false, 'User not found', {}, 404);
        }
        const community = await Community.findOne({ id: communityId });
        if (!community) {
            return res.apiResponse(false, 'Community not found', {}, 404);
        }

        const comment = community.comment.find(c => c.commentId === commentId);
        if (!comment) {
            return res.apiResponse(false, 'Comment not found', {}, 404);
        }

        //check to change like or create new like object
        const existingLike = comment.likes.find(like => like.userId === userId);
        if (existingLike) {
            existingLike.liked = liked;
        } else {
            const dateAndTime = moment().format('DD-MM-YYYY HH:mm')
            comment.likes.push({ userId, liked, dateAndTime });
        }

        comment.totalLikes = comment.likes.filter(like => like.liked).length;
        // Save updated community
        community.markModified('comment');
        await community.save();
        console.log('liked', liked)

        // if (String(userId) !== String(comment.userId) && liked) {
        //     console.log('coming')
        //     const postOwner = await Auth.findOne({ id: comment.userId });
        //     const deviceInfos = postOwner?.deviceInfos || [];
        //     for (const info of deviceInfos) {
        //         const title = "Comment Likes";
        //         const body = `Hi, ${postOwner.userName} — ${user.userName} is Liked on your comment`;
        //         await fireBaseNotification(info.fcmToken, {
        //             title,
        //             body,
        //             data: {
        //                 type: 'comment',
        //                 postId: community.id?.toString(),
        //             }
        //         });
        //     }
        // }
        res.apiResponse(true, 'Comment liked successfully', community, 200);
        // if (String(userId) !== String(community.userId) && liked) {
        if (liked) {
            const obj = {
                fromUserId: userId,
                toUserId: comment?.userId,
                community: {
                    id: community?.id,
                    title: community?.title,
                },
                type: "Community Comment Like"
            }
            await notifyUser(obj)
        }

    } catch (error) {
        return res.apiResponse(false, 'Add Like Error', {}, 500);
    }
}

exports.commentList = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const page = parseInt(requests.page) || 1;
        const per_page = parseInt(requests.limit) || 10;
        const pagination = requests.pagination || "true";
        const skip = (page - 1) * per_page;

        if (!requests.id) {
            return res.apiResponse(false, 'Community ID is required', {}, 400);
        }

        const community = await Community.findOne({ id: requests.id });
        if (!community) {
            return res.apiResponse(false, 'Community not found', {}, 404);
        }

        let comments = community.comment || [];

        // Enrich comments with user info and empty likes
        for (let i = 0; i < comments.length; i++) {
            const comment = comments[i];
            const user = await Auth.findOne({ id: comment.userId }, 'userName profile');
            const liked = comment.likes?.some(like => like.userId?.toString() === req.userDetails.id?.toString() && like.liked);

            comments[i] = {
                ...comment.toObject?.() || comment,  // Handle Mongoose subdocs or plain objects
                userLiked: liked,
                userName: user ? user.userName : null,
                profile: user ? user.profile : null,
                likes: [],
                reportsLength: comment.report?.length || 0,
                report: [],
            };
        }

        if (pagination === "true") {
            const sorted = comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const paginated = sorted.slice(skip, skip + per_page);
            return res.apiResponse(true, "Success", {
                communityId: community.id,
                comments: paginated,
                total: comments.length,
                page,
                limit: per_page
            }, 200);
        }

        const sortedComments = comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return res.apiResponse(true, "Success", {
            communityId: community.id,
            comments: sortedComments
        }, 200);


    } catch (error) {
        console.error(error);
        return res.apiResponse(false, 'Get list error', { error }, 500);
    }
};

exports.communityLikesCount = async (req, res, next) => {
    try {
        const { fromDate, toDate } = req.bodyParams;

        // Case 1: No date filter → sum all totalLikes fields
        if (!fromDate || !toDate) {
            const result = await Community.aggregate([
                { $group: { _id: null, totalLikes: { $sum: "$totalLikes" } } }
            ]);
            const totalLikes = result[0]?.totalLikes || 0;
            return res.apiResponse(true, 'Success', totalLikes, 200);
            // return res.json({
            //     success: true,
            //     totalLikes: result[0]?.totalLikes || 0
            // });
        }

        // Case 2: With date filter → check like[] array
        const from = moment(fromDate, "DD-MM-YYYY").startOf("day").toDate();
        const to = moment(toDate, "DD-MM-YYYY").endOf("day").toDate();

        const result = await Community.aggregate([
            { $unwind: "$like" },
            {
                $match: {
                    "like.liked": true,
                    "like.dateAndTime": { $exists: true, $ne: "" }
                }
            },
            {
                $addFields: {
                    likeDate: {
                        $dateFromString: {
                            dateString: "$like.dateAndTime",
                            format: "%d-%m-%Y %H:%M",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $match: {
                    likeDate: { $ne: null, $gte: from, $lte: to }
                }
            },
            {
                $group: {
                    _id: null,
                    totalLikes: { $sum: 1 }
                }
            }
        ]);

        console.log("result:", result);

        return res.json({
            success: true,
            totalLikes: result[0]?.totalLikes || 0
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

exports.communityCommentsLikesCount = async (req, res, next) => {
    try {
        const { fromDate, toDate } = req.bodyParams;

        // Case 1: No date filter → sum all comment.totalLikes fields
        if (!fromDate || !toDate) {
            const result = await Community.aggregate([
                { $unwind: "$comment" },
                {
                    $group: {
                        _id: null,
                        totalLikes: { $sum: { $toInt: "$comment.totalLikes" } } // ensure numeric
                    }
                }
            ]);

            const totalLikes = result[0]?.totalLikes || 0;
            return res.apiResponse(true, "Success", totalLikes, 200);
        }

        // Case 2: With date filter → check comment.likes[]
        const from = moment(fromDate, "DD-MM-YYYY").startOf("day").toDate();
        const to = moment(toDate, "DD-MM-YYYY").endOf("day").toDate();

        const result = await Community.aggregate([
            { $unwind: "$comment" },
            { $unwind: "$comment.likes" },
            {
                $match: {
                    "comment.likes.liked": true,
                    "comment.likes.dateAndTime": { $exists: true, $ne: "" }
                }
            },
            {
                $addFields: {
                    likeDate: {
                        $dateFromString: {
                            dateString: "$comment.likes.dateAndTime",
                            format: "%d-%m-%Y %H:%M",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $match: { likeDate: { $ne: null, $gte: from, $lte: to } }
            },
            {
                $group: { _id: null, totalLikes: { $sum: 1 } }
            }
        ]);

        return res.json({
            success: true,
            totalLikes: result[0]?.totalLikes || 0
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.communityCommentsCount = async (req, res, next) => {
    try {
        const { fromDate, toDate } = req.bodyParams;

        // Case 1: No date filter → sum all totalComments fields
        if (!fromDate || !toDate) {
            const result = await Community.aggregate([
                { $group: { _id: null, totalComments: { $sum: "$totalComments" } } }
            ]);
            const totalComments = result[0]?.totalComments || 0;
            return res.apiResponse(true, 'Success', totalComments, 200);
        }

        // Case 2: With date filter
        const from = moment(fromDate, "DD-MM-YYYY").startOf("day").toDate();
        const to = moment(toDate, "DD-MM-YYYY").endOf("day").toDate();

        const result = await Community.aggregate([
            { $unwind: "$comment" },
            {
                $match: {
                    "comment.date": { $exists: true, $ne: "" }
                }
            },
            {
                $addFields: {
                    commentDate: {
                        $dateFromString: {
                            dateString: "$comment.date",
                            format: "%d-%b-%Y %H:%M:%S",  //  matches "21-Aug-2025 18:57:17"
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $match: {
                    commentDate: { $ne: null, $gte: from, $lte: to }
                }
            },
            {
                $group: {
                    _id: null,
                    totalComments: { $sum: 1 }
                }
            }
        ]);

        console.log("result:", result);

        return res.json({
            success: true,
            totalComments: result[0]?.totalComments || 0
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.communitySearchlist = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const page = parseInt(requests.page) || 1;
        const per_page = parseInt(requests.limit) || 10;
        const pagination = requests.pagination !== "false";
        const skip = (page - 1) * per_page;
        const match = {};
        const sortField = requests.sortField || 'createdAt';
        const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;
        if (requests.id) match['id'] = requests.id;
        if (req.userDetails?.momType) match['momType'] = req.userDetails.momType;
        if (requests.status) match['status'] = requests.status;
        if (requests.fromDate && requests.toDate) {
            const startDate = moment(requests.fromDate);
            const endDate = moment(requests.toDate);
            if (startDate.isValid() && endDate.isValid()) {
                match.createdAt = {
                    $gte: startDate.startOf('day').toDate(),
                    $lte: endDate.endOf('day').toDate()
                };
            }
        }
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match['searchKey'] = { $regex: searchTerm, $options: 'i' };
        }
        const sortOptions = { [sortField]: sortOrder };
        if (pagination) {
            const options = {
                page,
                limit: per_page,
                sort: sortOptions,
            };
            CommunitySearch.paginate(match, options, (err, data) => {
                if (err) {
                    return res.apiResponse(false, "Error while fetching list", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            const query = Object.keys(match).length ? CommunitySearch.find(match) : CommunitySearch.find({});
            const articles = await query.sort(sortOptions);
            return res.apiResponse(true, "Success", { docs: articles }, 200);
        }
    } catch (error) {
        console.error('List Error:', error);
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
};

exports.approveCommunity = async (req, res, next) => {
    try {
        const { id } = req.bodyParams;

        if (!id) {
            return res.apiResponse(false, 'Community ID is required', {}, 400);
        }

        const community = await Community.findOne({ id });

        if (!community) {
            return res.apiResponse(false, 'Community not found', {}, 404);
        }

        community.approved = true;
        await community.save();

        return res.apiResponse(true, 'Community approved successfully', community, 200);

    } catch (error) {
        console.error('Approve Community Error:', error);
        return res.apiResponse(false, 'Approve Community Error', {}, 500);
    }
};


async function setLikeAndCommentCounts(data) {
    const id = data.id;
    let totalLikes = 0;
    let totalComments = 0;
    if (data.like.length > 0) {
        totalLikes = data.like.filter(item => item.liked === true).length;
    }
    if (data.comment.length > 0) {
        totalComments = data.comment.length;
    }
    return { totalLikes, totalComments }
}

async function checkUser() {
    const user = await Auth.findOne({ id: userId })
    if (!user) {
        return res.apiResponse(false, 'User not found', {}, 404);
    }
}

async function enrichCommentsWithUsers(communities) {
    const allUserIds = new Set();
    for (const post of communities) {
        if (post.comment) {
            post.comment.forEach(c => allUserIds.add(c.userId));
        }
    }

    const users = await Auth.find({ id: { $in: Array.from(allUserIds) } }).lean();
    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    for (const post of communities) {
        post.comment = post.comment.map(c => ({
            ...c,
            user: userMap[c.userId] || null
        }));
    }
}

async function addCommunitySearch(searchKey) {
    if (searchKey) {
        await CommunitySearch.findOneAndUpdate(
            { searchKey },
            { $inc: { searchCount: 1 }, $setOnInsert: { searchKey } },
            { upsert: true, new: true }
        );
    }
}

async function notifyUser({
    fromUserId,        // the user who triggered the action (e.g., liked)
    toUserId,          // the post owner
    community = {},         // the full community object
    type = 'like',     // notification type: 'like', 'comment', etc.
}) {
    try {
        if (!fromUserId || !toUserId) {
            console.log('UserId is Missing')
        }
        console.log('community', community)
        const [fromUser, toUser] = await Promise.all([
            Auth.findOne({ id: fromUserId }),
            Auth.findOne({ id: toUserId, logout: false }),
        ]);

        if (!fromUser || !toUser) return;

        const deviceInfos = toUser.deviceInfos || [];

        let title = "Community Notification";
        let body = `Hi, ${toUser.userName} — ${fromUser.userName} liked your post`;

        // 🔁 Customize content based on type
        console.log('type', type)
        switch (type) {
            case 'Community Like':
                title = "New Likes";
                body = `Hi, ${toUser.userName} — ${fromUser.userName} liked your post`;
                break;

            case 'Community Comment':
                title = "New Comment";
                body = `Hi, ${toUser.userName} — ${fromUser.userName} commented on your post`;
                break;
            case 'Community Comment Like':
                title = "New Comment Likes";
                body = `Hi, ${toUser.userName} — ${fromUser.userName} liked your comment`;
                break;
            case 'like':
                title = "New Likes";
                body = `Hi, ${toUser.userName} — ${fromUser.userName} liked your comment`;
                break;

            // case 'reminder':
            //     title = "Water Reminder";
            //     body = `Hi, ${toUser.userName} — stay hydrated!`;
            //     break;

            default:
                title = "New Likes";
                body = `Hi, ${toUser.userName} — you have a new notification`;
        }

        // for (const info of deviceInfos) {
        //     await fireBaseNotification(info.fcmToken, {
        //         title,
        //         body,
        //         data: {
        //             type,
        //             postId: community?.id?.toString() || '',
        //             communityTitle: community?.title || '',
        //         }
        //     });
        // }
        await Promise.allSettled(
            deviceInfos.map(info =>
                fireBaseNotification(info.fcmToken, {
                    title,
                    body,
                    data: {
                        type,
                        postId: community?.id?.toString() || '',
                        communityTitle: community?.title || '',
                    }
                }).catch(err => {
                    console.error(`❌ Error sending to ${info.fcmToken}:`, err.message);
                    if (err.errorInfo?.code === 'messaging/registration-token-not-registered') {
                        return Auth.updateMany(
                            { "deviceInfos.fcmToken": info.fcmToken },
                            { $pull: { deviceInfos: { fcmToken: info.fcmToken } } }
                        );
                    }
                })
            )
        );

    } catch (error) {
        console.error("Notification failed:", error);
    }
}

exports.reportCommunity = async (req, res) => {
    try {
        const { communityId, reason } = req.bodyParams;

        if (!communityId || !reason) {
            return res.apiResponse(
                false,
                "Community ID and reason are required",
                {},
                400
            );
        }

        const community = await Community.findOne({ id: communityId });
        console.log('community-1', community)
        if (!community) {
            return res.apiResponse(
                false,
                "Community not found",
                {},
                404
            );
        }
        console.log('community-2', community)

        if (!community.report) {
            community.report = [];
        }
        console.log('community-3', community)

        const alreadyReported = community.report.some(
            (r) => r.userId.toString() === req.userDetails.id.toString()
        );

        if (alreadyReported) {
            console.log('community-4', community)
            return res.apiResponse(
                false,
                "You already reported this community",
                {},
                400
            );
        }

        community.report.push({
            reportId: `CommunityReport-${moment().format("DDMMYYYYHHmmss")}${req.userDetails.id}`,
            userId: req.userDetails.id,
            reason,
            // userType: req.userDetails.userType,
        });
        console.log('community-5', community)

        await community.save();

        return res.apiResponse(
            true,
            "Community reported successfully",
            {},
            200
        );

    } catch (error) {
        return res.apiResponse(
            false,
            error.message || "Failed to report community",
            {},
            400
        );
    }
};

exports.reportComment = async (req, res) => {
    try {
        const { communityId, commentId, reason } = req.bodyParams;

        if (!communityId || !commentId || !reason) {
            return res.apiResponse(
                false,
                "Community ID, Comment ID and reason are required",
                {},
                400
            );
        }

        const community = await Community.findOne({ id: communityId });

        if (!community) {
            return res.apiResponse(
                false,
                "Community not found",
                {},
                404
            );
        }

        const comment = community.comment.find(
            (item) => item.commentId.toString() === commentId.toString()
        );
        console.log('comment', comment)
        if (!comment) {
            return res.apiResponse(
                false,
                "Comment not found",
                {},
                404
            );
        }

        if (!comment.report) {
            comment.report = [];
        }
        console.log('comment report', comment.report)

        const alreadyReported = comment?.report?.some(
            (r) => r.userId.toString() === req.userDetails.id.toString()
        );

        if (alreadyReported) {
            return res.apiResponse(
                false,
                "You already reported this comment",
                {},
                400
            );
        }

        comment.report.push({
            reportId: `CommunityCommentReport-${moment().format('DDMMYYYYHHmmss')}${req.userDetails.id}`,
            userId: req.userDetails.id,
            reason,
            createdAt: moment().format("DD-MMM-YYYY HH:mm:ss")
            // userType: req.userDetails.userType,
        });

        console.log('comment report after push', comment.report)
        community.markModified("comment");

        await community.save();

        return res.apiResponse(
            true,
            "Comment reported successfully",
            {},
            200
        );

    } catch (error) {
        return res.apiResponse(
            false,
            error.message || "Failed to report comment",
            {},
            400
        );
    }
};

exports.CommunityReportList = async (req, res) => {
    try {
        const requests = req.bodyParams;

        const page = Number(requests.page) || 1;
        const per_page = Number(requests.limit) || 10;
        const pagination = requests.pagination || "true";
        const skip = (page - 1) * per_page;

        const { communityId, reportId } = requests;

        if (!communityId) {
            return res.apiResponse(
                false,
                "Community ID is required",
                {},
                400
            );
        }

        const community = await Community.findOne({ id: communityId });

        if (!community) {
            return res.apiResponse(
                false,
                "Community not found",
                {},
                404
            );
        }

        let reports = community.report || [];

        if (reportId) {
            reports = reports.filter(
                (item) => item.reportId.toString() === reportId.toString()
            );
        }

        if (pagination === "true") {
            const totalDocs = reports.length;
            const paginatedReports = reports.slice(skip, skip + per_page);

            return res.apiResponse(
                true,
                "Success",
                {
                    docs: paginatedReports,
                    totalDocs,
                    limit: per_page,
                    page,
                    totalPages: Math.ceil(totalDocs / per_page),
                    hasNextPage: page < Math.ceil(totalDocs / per_page),
                    hasPrevPage: page > 1,
                },
                200
            );
        }

        return res.apiResponse(
            true,
            "Success",
            { docs: reports },
            200
        );

    } catch (error) {
        return res.apiResponse(
            false,
            error.message || "Get report list error",
            {},
            500
        );
    }
};

exports.commentReportList = async (req, res) => {
    try {
        const requests = req.bodyParams;

        const page = Number(requests.page) || 1;
        const per_page = Number(requests.limit) || 10;
        const pagination = requests.pagination || "true";
        const skip = (page - 1) * per_page;

        const { communityId, commentId, reportId } = requests;

        if (!communityId || !commentId) {
            return res.apiResponse(
                false,
                "Community ID and Comment ID are required",
                {},
                400
            );
        }

        const community = await Community.findOne({ id: communityId });

        if (!community) {
            return res.apiResponse(
                false,
                "Community not found",
                {},
                404
            );
        }

        const comment = community.comment.find(
            (item) => item.commentId.toString() === commentId.toString()
        );

        if (!comment) {
            return res.apiResponse(
                false,
                "Comment not found",
                {},
                404
            );
        }

        let reports = comment.report || [];

        if (reportId) {
            reports = reports.filter(
                (item) => item.reportId.toString() === reportId.toString()
            );
        }

        if (pagination === "true") {
            const totalDocs = reports.length;
            const paginatedReports = reports.slice(skip, skip + per_page);

            return res.apiResponse(
                true,
                "Success",
                {
                    docs: paginatedReports,
                    totalDocs,
                    limit: per_page,
                    page,
                    totalPages: Math.ceil(totalDocs / per_page),
                    hasNextPage: page < Math.ceil(totalDocs / per_page),
                    hasPrevPage: page > 1,
                },
                200
            );
        }

        return res.apiResponse(
            true,
            "Success",
            { docs: reports },
            200
        );

    } catch (error) {
        return res.apiResponse(
            false,
            error.message || "Get comment report list error",
            {},
            500
        );
    }
};