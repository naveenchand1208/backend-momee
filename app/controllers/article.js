const Article = require('../models/article')
const ArticleSearch = require('../models/articleSearch')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');
const UserArticle = require('../models/userArticle')
const Auth = require('../models/auth');
const { formatDate } = require('../helpers/util');

exports.add = async (req, res, next) => {
    try {
        console.log('req.body', req.body)
        const { title, categoryId, momType, status, description, week, month, duration } = req.body;
        console.log('req.body', req.body)
        const { file, banner } = req.files || {};

        if (!title || !categoryId || !description || !momType || !status || !file || !duration) {
            return res.apiResponse(false, 'Article params are missing', {}, 400);
        }
        const checkTitle = await Article.findOne({ title: title, momType: momType })
        if (checkTitle) {
            return res.apiResponse(false, 'Title already exists', {}, 400);
        }
        if (momType === 'pregMom' && !week) {
            return res.apiResponse(false, 'Week is required', {}, 400);
        }

        if (momType === 'newMom' && !month) {
            return res.apiResponse(false, 'Month is required', {}, 400);
        }
        const fileUpload = await uploadToCloudinary(file[0], 'articles');
        let bannerUpload;
        if (banner) {
            bannerUpload = await uploadToCloudinary(banner[0], 'articles');
        }
        const now = moment().format('DDMMYYYYHHmmss');
        const uniqueId = `Article-${now}`;
        let maxDoc;
        if (momType === 'pregMom') {
            maxDoc = await Article.findOne({ momType, week }).sort({ index: -1 });
        } else {
            maxDoc = await Article.findOne({ momType, month }).sort({ index: -1 });
        }

        let index;
        if (maxDoc && typeof maxDoc.index === 'number') {
            index = maxDoc.index + 1;
        } else {
            index = 0;
        }
        const newArticle = new Article({
            title,
            categoryId,
            status,
            description,
            file: fileUpload.secure_url,
            public_id: fileUpload.public_id,
            banner: banner ? bannerUpload.secure_url : "",
            banner_public_id: banner ? bannerUpload.public_id : "",
            id: uniqueId,
            momType,
            week,
            month,
            duration,
            index
        });
        await newArticle.save()
        return res.apiResponse(true, "Article added Success", newArticle, 200);
    } catch (error) {
        return res.apiResponse(false, 'Article Add error', { error }, 500);
    }
}

// exports.list = async (req, res, next) => {
//     try {
//         const requests = req.bodyParams;
//         const page = requests.page || 1;
//         const per_page = requests.limit || 10;
//         const pagination = requests.pagination || "true";
//         const skip = (page - 1) * per_page;
//         const match = {};
//         const sortField = requests.sortField || 'createdAt';
//         const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;

//         if (requests.id && requests.id !== '') {
//             match['id'] = requests.id;
//         }
//         if (requests.categoryId && requests.categoryId !== '') {
//             match['categoryId'] = requests.categoryId;
//         }
//         if (req.userDetails && req.userDetails.momType) {
//             match['momType'] = req.userDetails.momType;
//         }
//         if (requests.momType && requests.momType !== '') {
//             match['momType'] = requests.momType;
//         }
//         if (requests.status && requests.status !== '') {
//             match['status'] = requests.status;
//         }
//         if (requests.week && requests.week !== '') {
//             match['week'] = requests.week;
//         }
//         if (requests.month && requests.month !== '') {
//             match['month'] = requests.month;
//         }
//         if (requests.fromDate && requests.toDate) {
//             let startDate = moment(requests.fromDate);
//             let endDate = moment(requests.toDate);
//             if (startDate.isValid() && endDate.isValid()) {
//                 match.createdAt = {
//                     $gte: startDate.startOf('day').toDate(),
//                     $lte: endDate.endOf('day').toDate()
//                 };
//             }
//         }
//         if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
//             console.log('requests.searchKey', requests.searchKey)
//             const searchTerm = requests.searchKey.trim();
//             match['title'] = { $regex: searchTerm, $options: 'i' };
//             await addArticleSearch(requests.searchKey)
//         }
//         const options = {
//             page: page,
//             limit: per_page,
//             skip: skip,
//             sort: { [sortField]: sortOrder },
//             populate: [
//                 {
//                     path: 'category',
//                     select: 'title color file'
//                 }
//             ],
//         };

//         if (pagination === "true") {
//             options.sort = { index: 1 };
//             Article.paginate(match, options, async function (err, data) {
//                 if (err) {
//                     return res.apiResponse(false, "Error while fetching lists", {}, 404);
//                 }

//                 if (data.docs && Array.isArray(data.docs)) {
//                     data.docs = await markSavedArticles(data.docs, );
//                 }
//                 return res.apiResponse(true, "Success", data, 200);
//             });
//         } else {
//             let articles = [];
//             const query = Object.keys(match).length === 0
//                 ? Article.find({})
//                 : Article.find(match);

//             articles = await query
//                 .populate({
//                     path: 'category',
//                     select: 'title color file'
//                 })
//                 .sort({ index: 1 });

//             const cleanedArticles = await markSavedArticles(articles, req.userDetails.id);
//             return res.apiResponse(true, "Success", { docs: cleanedArticles }, 200);
//         }

//     } catch (error) {
//         return res.apiResponse(false, 'Get list error', {}, 500);
//     }
// }

exports.list = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const page = parseInt(requests.page) || 1;
        const per_page = parseInt(requests.limit) || 10;
        const pagination = requests.pagination !== "false"; // defaults to true
        const skip = (page - 1) * per_page;

        const sortField = requests.sortField || 'createdAt';
        const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;

        const match = {};

        if (requests.id) match['id'] = requests.id;
        if (requests.categoryId) match['categoryId'] = requests.categoryId;
        if (requests.momType) match['momType'] = requests.momType;
        else if (req.userDetails?.momType) match['momType'] = req.userDetails.momType;
        if (requests.status) match['status'] = requests.status;
        if (requests.week) match['week'] = requests.week;
        if (requests.month) match['month'] = requests.month;

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

        if (requests.searchKey?.trim()) {
            const searchTerm = requests.searchKey.trim();
            match.$text = { $search: searchTerm }; // Requires MongoDB text index on title/fields
            addArticleSearch(searchTerm).catch(console.error); // don't await
        }

        // if (pagination) {
        //     Article.paginate(match, {
        //         page,
        //         limit: per_page,
        //         sort: { [sortField]: sortOrder },
        //         populate: {
        //             path: 'category',
        //             select: 'title color file'
        //         },
        //         lean: true // much faster
        //     }, async (err, data) => {
        //         if (err) {
        //             return res.apiResponse(false, "Error while fetching lists", {}, 404);
        //         }
        //         if (Array.isArray(data.docs)) {
        //             data.docs = await markSavedArticles(data.docs, req.userDetails.id);
        //         }
        //         return res.apiResponse(true, "Success", data, 200);
        //     });
        // } else {
        //     const articles = await Article.find(match)
        //         .populate({
        //             path: 'category',
        //             select: 'title color file'
        //         })
        //         .sort({ [sortField]: sortOrder })
        //         .lean(); // faster, no Mongoose overhead

        //     const cleanedArticles = await markSavedArticles(articles, req.userDetails.id);
        //     return res.apiResponse(true, "Success", { docs: cleanedArticles }, 200);
        // }

        if (pagination) {
            Article.paginate(match, {
                page,
                limit: per_page,
                sort: { [sortField]: sortOrder },
                populate: {
                    path: 'category',
                    select: 'title color file'
                },
                // lean: true
            }, async (err, data) => {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                if (Array.isArray(data.docs)) {
                    data.docs = await markSavedArticles(data.docs, req.userDetails.id);
                    data.docs = data.docs.map(article => {
                        // article.id = article.id
                        // delete article.description;
                        // delete article._id;
                        return article;
                    });
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let articles = await Article.find(match)
                .populate({
                    path: 'category',
                    select: 'title color file'
                })
                .sort({ [sortField]: sortOrder })
                .lean();

            let cleanedArticles = await markSavedArticles(articles, req.userDetails.id);
            cleanedArticles = cleanedArticles.map(article => {
                article.id = article.id
                delete article.description;
                // delete article._id;
                return article;
            });

            return res.apiResponse(true, "Success", { docs: cleanedArticles }, 200);
        }
    } catch (error) {
        console.error('List API Error:', error);
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
};

exports.view = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const article = await Article.findOne({ id: requests.id });
        if (!article) {
            return res.apiResponse(false, 'Article not found', {}, 404);
        }
        const userId = req.userDetails.id;
        const alreadyViewed = article.views.some(
            (view) => view.userId.toString() === userId.toString()
        );
        if (!alreadyViewed) {
            article.views.push({ userId, viewed: true });
            article.viewsCount = article.views.length;
            await article.save();
        }
        article.views = [];
        return res.apiResponse(true, 'Success', article, 200);
    } catch (error) {
        console.error('Article View Error:', error);
        return res.apiResponse(false, 'Get Article error', { message: error.message }, 500);
    }
}

exports.update = async (req, res, next) => {
    try {
        if (req.body) {
            const { id, public_id, banner_public_id, fileChanged, bannerChanged } = req.body;
            if (id === undefined || id === null) {
                return res.apiResponse(false, 'Id is missing', {}, 400);
            }
            const checkTitle = await Article.findOne({ title: req.body.title, momType: req.body.momType })
            if (checkTitle && checkTitle.id !== id) {
                return res.apiResponse(false, 'Title already exists', {}, 400);
            }
            const updateFields = {};
            if (req.body.title) updateFields.title = req.body.title;
            if (req.body.description) updateFields.description = req.body.description;
            if (req.body.categoryId) updateFields.categoryId = req.body.categoryId;
            if (req.body.status) updateFields.status = req.body.status;
            if (req.body.momType && req.body.momType === 'pregMom') {
                updateFields.momType = req.body.momType;
                updateFields.month = 0;
                if (!!req.body.week) updateFields.week = req.body.week;
            }
            if (req.body.momType && req.body.momType === 'newMom') {
                updateFields.momType = req.body.momType;
                updateFields.week = 0;
                if (!!req.body.month) updateFields.month = req.body.month;
            }
            // if (!!req.body.week) updateFields.week = req.body.week;
            // if (!!req.body.month) updateFields.month = req.body.month;
            // if (req.body.momType) updateFields.momType = req.body.momType;
            if (req.body.duration) updateFields.duration = req.body.duration;
            const fileArray = req.files?.file || [];
            const bannerArray = req.files?.banner || [];
            if (fileChanged && public_id && fileArray[0]) {
                await deleteFromCloudinary(public_id);
                const result = await uploadToCloudinary(fileArray[0], 'articles');
                updateFields.file = result.secure_url;
                updateFields.public_id = result.public_id;
            }
            if (bannerChanged && banner_public_id && bannerArray[0]) {
                await deleteFromCloudinary(banner_public_id);
                const result = await uploadToCloudinary(bannerArray[0], 'articles');
                updateFields.banner = result.secure_url;
                updateFields.banner_public_id = result.public_id;
            }
            const updatedArticle = await Article.findOneAndUpdate(
                { id: id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedArticle) {
                return res.apiResponse(false, 'Article not found', {}, 404);
            }
            return res.apiResponse(true, 'Article updated successfully', updatedArticle, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Article', {}, 500);
    }
};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await Article.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Article not found', {}, 404)
        }
        return res.apiResponse(true, 'Article deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Article error', { error }, 500)
    }
}

exports.saveArticle = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const savedArticle = await UserArticle.findOne({ articleId: requests.id, userId: req.userDetails.id });
        if (savedArticle) {
            await savedArticle.deleteOne(); // Deletes the matched document
            return res.apiResponse(true, 'Article Removed from Saved List', {}, 200);
            // return res.apiResponse(false, 'Article Already Saved', {}, 400);
        }
        const article = await Article.findOne({ id: requests.id });
        if (!article) {
            return res.apiResponse(false, 'Article not found', {}, 404)
        }
        const user = await Auth.findOne({ id: req.userDetails.id });
        if (!user) {
            return res.apiResponse(false, 'User not found', {}, 404)
        }
        const uniqueId = `UserArticle-${moment().format('DDMMYYYYHHmmss')}`;
        const userArticle = new UserArticle({
            // article,
            id: uniqueId,
            userId: user.id,
            userName: user.userName,
            articleId: article.id,
        })
        await userArticle.save();
        return res.apiResponse(true, 'Article saved successfully', userArticle, 200)
    } catch (error) {
        return res.apiResponse(false, 'Save Article error', { error }, 500)
    }
}

exports.savedArticlesList = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const page = requests.page || 1;
        const per_page = requests.limit || 10;
        const pagination = requests.pagination || "true";
        const skip = (page - 1) * per_page;
        const match = {};
        const sortField = requests.sortField || 'createdAt';
        const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;

        if (requests.id && requests.id !== '') {
            match['userId'] = requests.id;
        }

        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
            populate: [
                {
                    path: 'articles',
                    // select: 'title color file'
                },
                {
                    path: 'user',
                    select: 'userName id file'
                },
            ],
        };

        if (pagination === "true") {
            UserArticle.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                if (data.docs && Array.isArray(data.docs)) {
                    data.docs = data.docs.map((doc) => {
                        const obj = doc.toObject();
                        if (obj.article && obj.article.views) {
                            obj.article.views = [];
                        }
                        return obj;
                    });
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            const userArticles = await UserArticle.find(match || {})
                .populate({ path: 'articles' })
                .populate({ path: 'user', select: 'userName id file' });

            const cleanedArticles = userArticles.map(item => {
                const obj = item.toObject();
                if (obj.article?.views) obj.article.views = [];
                return obj;
            });
            return res.apiResponse(true, "Success", { docs: cleanedArticles }, 200);
        }
    } catch (error) {
        console.error("List Fetch Error:", error);
        return res.apiResponse(false, 'Get list error', { message: error.message }, 500);
    }
}

exports.deleteSavedArticle = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await UserArticle.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Article not found', {}, 404)
        }
        return res.apiResponse(true, 'Article deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Article error', { error }, 500)
    }
}

exports.script = async (req, res, next) => {
    try {
        const result = await Auth.updateMany(
            {
                $or: [
                    { completedWeeks: { $exists: false } },
                    { enteredWeeks: { $exists: false } },
                    { completedMonths: { $exists: false } },
                    { enteredMonths: { $exists: false } },
                ]
            },
            {
                $set: {
                    completedWeeks: 0,
                    enteredWeeks: 0,
                    completedMonths: 0,
                    enteredMonths: 0,
                }
            }
        );
        console.log(`Updated ${result.modifiedCount} documents.`);
        return res.apiResponse(true, 'Article updated successfully', result, 200)
    } catch (err) {
        console.error('Error updating documents:', err);
        return res.apiResponse(true, 'Article updated successfully', result, 200)
    }
}

const markSavedArticles = async (articles, loginUserId) => {
    if (!loginUserId || !articles.length) return articles;

    const articleIds = articles.map((a) => a.id.toString());
    // console.log('articleIds', articleIds)
    const savedDocs = await UserArticle.find({
        userId: loginUserId,
        articleId: { $in: articleIds }
    }).select("articleId");
    // console.log('savedDocs', savedDocs)

    const savedArticleIds = new Set(savedDocs.map((doc) => doc.articleId.toString()));
    // console.log('savedArticleIds', savedArticleIds)

    return articles.map((article) => {
        const obj = article.toObject();
        obj.views = [];
        obj.description = "";
        obj.saved = savedArticleIds.has(obj.id.toString());
        return obj;
    });
};

// const markSavedArticles = async (articles, loginUserId) => {
//     if (!loginUserId || !Array.isArray(articles) || articles.length === 0) {
//         return articles;
//     }

//     const articleIds = articles.map(a => a.id.toString());

//     const savedDocs = await UserArticle.find({
//         userId: loginUserId,
//         articleId: { $in: articleIds }
//     }).select("articleId").lean();

//     const savedArticleIds = new Set(savedDocs.map(doc => doc.articleId.toString()));

//     return articles.map(article => {
//         article.description = "";
//         article.views = [];
//         article.saved = savedArticleIds.has(article.id.toString());
//         return article;
//     });
// };

exports.indexScript = async (req, res, next) => {
    // try {
    //     const docs = await Article.find({});
    //     const grouped = {};
    //     for (const doc of docs) {
    //         const type = doc.momType || 'unknown';
    //         if (!grouped[type]) {
    //             grouped[type] = [];
    //         }
    //         grouped[type].push(doc);
    //     }
    //     const bulkOps = [];
    //     for (const [momType, group] of Object.entries(grouped)) {
    //         group.forEach((doc, index) => {
    //             bulkOps.push({
    //                 updateOne: {
    //                     filter: { _id: doc._id },
    //                     update: { $set: { index } }
    //                 }
    //             });
    //         });
    //     }
    //     if (bulkOps.length > 0) {
    //         await Article.bulkWrite(bulkOps);
    //     }
    //     res.status(200).json({ message: "Indexes updated by momType using bulkWrite." });
    // } catch (error) {
    //     console.error("Error during grouped indexing:", error);
    //     res.status(500).json({ message: "An error occurred while updating indexes.", error });
    // }

    try {
        const docs = await Article.find({});
        const grouped = {
            pregMom: {},
            newMom: {},
            others: []
        };

        // Group documents by momType and week/month
        for (const doc of docs) {
            const type = doc.momType || 'unknown';

            if (type === 'pregMom') {
                const week = doc.week || 'unknown';
                grouped.pregMom[week] = grouped.pregMom[week] || [];
                grouped.pregMom[week].push(doc);
            } else if (type === 'newMom') {
                const month = doc.month || 'unknown';
                grouped.newMom[month] = grouped.newMom[month] || [];
                grouped.newMom[month].push(doc);
            } else {
                grouped.others.push(doc); // Fallback for any other momType
            }
        }

        const bulkOps = [];

        // Assign index for pregMom by week
        for (const [week, articles] of Object.entries(grouped.pregMom)) {
            articles.forEach((doc, index) => {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: doc._id },
                        update: { $set: { index } }
                    }
                });
            });
        }

        // Assign index for newMom by month
        for (const [month, articles] of Object.entries(grouped.newMom)) {
            articles.forEach((doc, index) => {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: doc._id },
                        update: { $set: { index } }
                    }
                });
            });
        }

        // Optional: Assign index to others
        grouped.others.forEach((doc, index) => {
            bulkOps.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $set: { index } }
                }
            });
        });

        if (bulkOps.length > 0) {
            await Article.bulkWrite(bulkOps);
        }

        res.status(200).json({ message: "Indexes updated by momType and week/month using bulkWrite." });

    } catch (error) {
        console.error("Error during grouped indexing:", error);
        res.status(500).json({ message: "An error occurred while updating indexes.", error });
    }

};

exports.updateIndex = async (req, res, next) => {
    try {
        const { id, newIndex } = req.bodyParams;
        if (typeof newIndex !== 'number') {
            return res.apiResponse(false, 'Invalid index provided', {}, 400);
        }
        const itemToMove = await Article.findOne({ id });
        console.log('itemToMove', itemToMove)
        if (!itemToMove) {
            return res.apiResponse(false, 'Item not found', {}, 404);
        }
        const { momType, week, month, index: oldIndex } = itemToMove;
        console.log('oldIndex', oldIndex)

        if (Number(oldIndex) === newIndex) {
            return res.apiResponse(true, 'Index unchanged', {}, 200);
        }
        const filter = { momType, newIndex };
        if (momType === 'pregMom') {
            filter.week = week;
            filter.index = newIndex;
        } else if (momType === 'newMom') {
            filter.month = month;
            filter.index = newIndex;
        }
        const targetDoc = await Article.findOne(filter);
        if (!targetDoc) {
            return res.apiResponse(false, 'Target index not found in the specified momType group', {}, 404);
        }
        targetDoc.index = Number(oldIndex);
        itemToMove.index = newIndex;
        await Promise.all([targetDoc.save(), itemToMove.save()]);
        return res.apiResponse(true, 'Index swapped successfully', {}, 200);
    } catch (error) {
        console.error('Update index error:', error);
        res.status(500).json({ message: 'Failed to update indexes', error });
    }
};

exports.updateArticleImage = async (req, res, next) => {
    try {
        console.log('req.body', req.body)
        if (req.body) {
            const { id, public_id } = req.body;
            if (id === undefined || id === null || !req.file) {
                return res.apiResponse(false, 'Id or File is missing', {}, 400);
            }
            const updateFields = {};
            const result = await uploadToCloudinary(req.file, 'articles');
            updateFields.file = result.secure_url;
            updateFields.public_id = result.public_id;
            const updatedArticle = await Article.findOneAndUpdate(
                { id: id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedArticle) {
                return res.apiResponse(false, 'Article not found', {}, 404);
            }
            return res.apiResponse(true, 'Article updated successfully', updatedArticle, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Article', {}, 500);
    }
};

exports.articleSearchlist = async (req, res, next) => {
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
            ArticleSearch.paginate(match, options, (err, data) => {
                if (err) {
                    return res.apiResponse(false, "Error while fetching list", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            const query = Object.keys(match).length ? ArticleSearch.find(match) : ArticleSearch.find({});
            const articles = await query.sort(sortOptions);
            return res.apiResponse(true, "Success", { docs: articles }, 200);
        }
    } catch (error) {
        console.error('List Error:', error);
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
};

async function addArticleSearch(searchKey) {
    if (searchKey) {
        await ArticleSearch.findOneAndUpdate(
            { searchKey },
            { $inc: { searchCount: 1 }, $setOnInsert: { searchKey } },
            { upsert: true, new: true }
        );


    }
}

// exports.weekChange = async (req, res) => {
//     try {
//         const articles = await Article.find();

//         for (const article of articles) {
//             const weekStr = article.week?.toString().trim() || '';
//             const weekNumber = parseInt(weekStr.replace(/[^0-9]/g, ''), 10);

//             if (!isNaN(weekNumber)) {
//                 article.week = weekNumber;
//                 await article.save(); // save updated week to DB
//             }
//         }
//         res.status(200).json({
//             success: true,
//             message: 'Week fields normalized and saved successfully',
//         });
//     } catch (err) {
//         console.error('Error updating articles:', err);
//         res.status(500).json({ success: false, message: 'Server error' });
//     }
// };

// exports.list = async (req, res) => {
//     try {
//         const result = await Article.updateMany(
//             {},
//             {
//                 $set: {
//                     banner: '',
//                     banner_public_id: ''
//                 }
//             }
//         );

//         return res.apiResponse(
//             true,
//             'All article banners cleared successfully',
//             { modifiedCount: result.modifiedCount },
//             200
//         );
//     } catch (error) {
//         console.error('Error clearing article banners:', error);
//         return res.apiResponse(false, 'Failed to clear article banners', { error }, 500);
//     }
// };

// exports.list = async (req, res, next) => {
//     try {
//         const requests = req.bodyParams;
//         const page = requests.page || 1;
//         const per_page = requests.limit || 10;
//         const pagination = requests.pagination || "true";
//         const skip = (page - 1) * per_page;
//         const match = {};
//         const sortField = requests.sortField || 'createdAt';
//         const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;
//         // const { fromDate, toDate } = req.bodyParams;

//         if (requests.id && requests.id !== '') {
//             match['id'] = requests.id;
//         }
//         if (requests.categoryId && requests.categoryId !== '') {
//             match['categoryId'] = requests.categoryId;
//         }
//         if (req.userDetails && req.userDetails.momType) {
//             match['momType'] = req.userDetails.momType;
//         }
//         if (requests.momType && requests.momType !== '') {
//             match['momType'] = requests.momType;
//         }
//         if (requests.status && requests.status !== '') {
//             match['status'] = requests.status;
//         }
//         if (requests.week && requests.week !== '') {
//             match['week'] = requests.week;
//         }
//         if (requests.month && requests.month !== '') {
//             match['month'] = requests.month;
//         }
//         if (requests.fromDate && requests.toDate) {
//             let startDate = moment(requests.fromDate);
//             let endDate = moment(requests.toDate);
//             if (startDate.isValid() && endDate.isValid()) {
//                 match.createdAt = {
//                     $gte: startDate.startOf('day').toDate(),
//                     $lte: endDate.endOf('day').toDate()
//                 };
//             }
//         }
//         if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
//             console.log('requests.searchKey', requests.searchKey)
//             const searchTerm = requests.searchKey.trim();
//             match['title'] = { $regex: searchTerm, $options: 'i' };
//             await addArticleSearch(requests.searchKey)
//         }
//         const options = {
//             page: page,
//             limit: per_page,
//             skip: skip,
//             sort: { [sortField]: sortOrder },
//             populate: [
//                 {
//                     path: 'category',
//                     select: 'title color file'
//                 }
//             ],
//         };

//         if (pagination === "true") {
//             options.sort = { index: 1 };

//             const start = Date.now(); //  Start timer

//             Article.paginate(match, options, async function (err, data) {
//                 const durationMs = Date.now() - start; //  End timer

//                 if (err) {
//                     return res.apiResponse(false, "Error while fetching lists", {}, 404);
//                 }

//                 if (data.docs && Array.isArray(data.docs)) {
//                     data.docs = await markSavedArticles(data.docs, req.userDetails.id);
//                 }

//                 //  Add queryTime in response
//                 return res.apiResponse(true, "Success", { ...data, queryTimeMs: durationMs }, 200);
//             });
//         } else {
//             let articles = [];
//             const query = Object.keys(match).length === 0
//                 ? Article.find({})
//                 : Article.find(match);

//             const start = Date.now(); //  Start

//             articles = await query
//                 .populate({
//                     path: 'category',
//                     select: 'title color file'
//                 })
//                 .sort({ index: 1 });

//             const durationMs = Date.now() - start; //  End

//             const cleanedArticles = await markSavedArticles(articles, req.userDetails.id);

//             //  Include timing in response
//             return res.apiResponse(true, "Success", { docs: cleanedArticles, queryTimeMs: durationMs }, 200);
//         }


//     } catch (error) {
//         return res.apiResponse(false, 'Get list error', {}, 500);
//     }
// }

// exports.list = async (req, res, next) => {
//     try {
//         const requests = req.bodyParams;
//         const page = parseInt(requests.page) || 1;
//         const limit = parseInt(requests.limit) || 10;
//         const pagination = requests.pagination !== "false";
//         const skip = (page - 1) * limit;
//         const sortField = requests.sortField || 'createdAt';
//         const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;

//         const match = {};

//         if (requests.id) match['id'] = requests.id;
//         if (requests.categoryId) match['categoryId'] = requests.categoryId;
//         if (req.userDetails?.momType) match['momType'] = req.userDetails.momType;
//         if (requests.momType) match['momType'] = requests.momType;
//         if (requests.status) match['status'] = requests.status;
//         if (requests.week) match['week'] = requests.week;
//         if (requests.month) match['month'] = requests.month;

//         if (requests.fromDate && requests.toDate) {
//             const startDate = moment(requests.fromDate).startOf('day').toDate();
//             const endDate = moment(requests.toDate).endOf('day').toDate();
//             match.createdAt = { $gte: startDate, $lte: endDate };
//         }

//         if (requests.searchKey?.trim()) {
//             const searchTerm = requests.searchKey.trim();
//             match.title = { $regex: searchTerm, $options: 'i' };
//             await addArticleSearch(searchTerm);
//         }

//         const start = Date.now(); // Start timing

//         if (pagination) {
//             const options = {
//                 page,
//                 limit,
//                 sort: { [sortField]: sortOrder },
//                 populate: {
//                     path: 'category',
//                     select: 'title color file'
//                 },
//                 lean: true // improve performance by returning plain JS objects
//             };

//             Article.paginate(match, options, async (err, data) => {
//                 if (err) return res.apiResponse(false, "Error while fetching lists", {}, 404);

//                 data.docs = await markSavedArticles(data.docs, req.userDetails?.id);
//                 const durationMs = Date.now() - start;

//                 return res.apiResponse(true, "Success", {
//                     ...data,
//                     queryTimeMs: durationMs
//                 }, 200);
//             });
//         } else {
//             const articles = await Article.find(match)
//                 .sort({ [sortField]: sortOrder })
//                 .skip(skip)
//                 .limit(limit)
//                 .populate({
//                     path: 'category',
//                     select: 'title color file'
//                 })
//                 .lean();

//             const cleanedArticles = await markSavedArticles(articles, req.userDetails?.id);
//             const durationMs = Date.now() - start;

//             return res.apiResponse(true, "Success", {
//                 docs: cleanedArticles,
//                 queryTimeMs: durationMs
//             }, 200);
//         }

//     } catch (error) {
//         console.error("List Fetch Error:", error);
//         return res.apiResponse(false, 'Get list error', {}, 500);
//     }
// };