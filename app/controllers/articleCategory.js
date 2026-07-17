const ArticleCategory = require('../models/articleCategory')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

// exports.add = async (req, res, next) => {
//     try {
//         const { title, color, status } = req.body;
//         let momTypes = req.body.momTypes;
//         if (!title || !color || !status || !req.file || !momTypes) {
//             return res.apiResponse(false, 'Article details are missing', {}, 400);
//         }
//         const checkTitle = await ArticleCategory.findOne({ title: title })
//         if (checkTitle) {
//             return res.apiResponse(false, 'Title already exists', {}, 400);
//         }
//         if (typeof momTypes === 'string') {
//             try {
//                 momTypes = JSON.parse(momTypes);
//             } catch {
//                 return res.apiResponse(false, 'Invalid momTypes format', {}, 400);
//             }
//         }
//         if (!Array.isArray(momTypes) || momTypes.length === 0) {
//             return res.apiResponse(false, 'momTypes must be a non-empty array', {}, 400);
//         }
//         const uniqueId = `ArtCat-${moment().format('DDMMYYYYHHmmss')}`;
//         // const categoryToSave = momTypes.length === 2
//         //     ? ['pregMom', 'newMom'].map((type, idx) =>
//         //         new ArticleCategory({
//         //             title,
//         //             color,
//         //             status,
//         //             file: secure_url,
//         //             public_id,
//         //             id: `${uniqueId}-${idx + 1}`,
//         //             momTypes: momTypes.filter(m => m === type),
//         //             momType: type
//         //         }))
//         //     : [
//         //         new ArticleCategory({
//         //             title,
//         //             color,
//         //             status,
//         //             file: secure_url,
//         //             public_id,
//         //             id: uniqueId,
//         //             momTypes,
//         //             momType: momTypes[0]
//         //         })
//         //     ];
//         // await Promise.all(categoryToSave.map(cat => cat.save()));
//         const categoryToSave = await (async () => {
//             if (momTypes.length === 2) {
//                 // Handle both pregMom and newMom
//                 const categories = [];
//                 for (let idx = 0; idx < momTypes.length; idx++) {
//                     const type = momTypes[idx];

//                     // Find current max index for momType
//                     const maxDoc = await ArticleCategory.findOne({ momType: type }).sort({ index: -1 });
//                     const nextIndex = maxDoc ? maxDoc.index + 1 : 0;
//                     const { secure_url, public_id } = await uploadToCloudinary(req.file, 'articleCategory');

//                     categories.push(new ArticleCategory({
//                         title,
//                         color,
//                         status,
//                         file: secure_url,
//                         public_id,
//                         id: `${uniqueId}-${idx + 1}`,
//                         momTypes: [type],
//                         momType: type,
//                         index: nextIndex
//                     }));
//                 }
//                 return categories;
//             } else {
//                 const type = momTypes[0];
//                 const maxDoc = await ArticleCategory.findOne({ momType: type }).sort({ index: -1 });
//                 const nextIndex = maxDoc ? maxDoc.index + 1 : 0;
//                 const { secure_url, public_id } = await uploadToCloudinary(req.file, 'articleCategory');

//                 return [
//                     new ArticleCategory({
//                         title,
//                         color,
//                         status,
//                         file: secure_url,
//                         public_id,
//                         id: uniqueId,
//                         momTypes,
//                         momType: type,
//                         index: nextIndex
//                     })
//                 ];
//             }
//         })();

//         // Save all new documents
//         await Promise.all(categoryToSave.map(cat => cat.save()));
//         return res.apiResponse(true, 'Category added successfully', categoryToSave, 200);
//     } catch (error) {
//         return res.apiResponse(false, 'Category Add error', { error: error }, 500);
//     }

// }

exports.add = async (req, res, next) => {
    try {
        const { title, color, status, momType } = req.body;
        if (!title || !color || !status || !momType || !req.file) {
            return res.apiResponse(false, 'Category details is missing', {}, 400);
        }
        const checkTitle = await ArticleCategory.findOne({ title: title })
        if (checkTitle) {
            return res.apiResponse(false, 'Title already exists', {}, 400);
        }
        const uniqueId = `ArtCat-${moment().format('DDMMYYYYHHmmss')}`;
         const { secure_url, public_id } = await uploadToCloudinary(req.file, 'articleCategory');
        let newCategory = new ArticleCategory({
            title,
            color,
            status,
            file: secure_url,
            public_id,
            id: `${uniqueId}`,
            momType: momType
        });
        await newCategory.save();
        return res.apiResponse(true, "Category added Success", newCategory, 200);
    } catch (error) {
        return res.apiResponse(false, 'Category Add error', {}, 500);
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
        const sortField = requests.sortField || 'createdAt';
        const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;

        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        if (req.userDetails && req.userDetails.momType) {
            match['momType'] = req.userDetails.momType;
        }
        if (requests.momType && requests.momType !== '') {
            match['momType'] = requests.momType;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match['title'] = { $regex: searchTerm, $options: 'i' };
        }
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            options.sort = { index: 1 };
            ArticleCategory.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let categories = [];
            const query = Object.keys(match).length === 0
                ? ArticleCategory.find({})
                : ArticleCategory.find(match);

            categories = await query
                .sort({ index: 1 });
            return res.apiResponse(true, "Success", { docs: categories }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

exports.view = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const category = await ArticleCategory.findOne({ id: requests.id })
        if (!category) {
            return res.apiResponse(false, 'Category not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', category, 200);
    } catch (error) {
        return res.apiResponse(false, 'get category error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        if (req.body) {
            const { id, public_id, fileChanged } = req.body;
            if (id === undefined || id === null) {
                return res.apiResponse(false, 'Id is missing', {}, 400);
            }
            const updateFields = {};
            if (req.body.title) {
                const checkTitle = await ArticleCategory.findOne({ title: req.body.title, momType: req.body.momType })
                if (checkTitle && checkTitle.id !== id) {
                    return res.apiResponse(false, 'Title already exists', {}, 400);
                }
                updateFields.title = req.body.title;
            }
            // if (req.body.title) updateFields.title = req.body.title;
            if (req.body.color) updateFields.color = req.body.color;
            if (req.body.status) updateFields.status = req.body.status;
            if (req.body.momType) updateFields.momType = req.body.momType;

            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    // const filePath = req.file.path;
                    const result = await uploadToCloudinary(req.file, 'articleCategory');
                    // fs.unlinkSync(filePath);
                    updateFields.file = result.secure_url;
                    updateFields.public_id = result.public_id;
                }
            }

            const updatedCategory = await ArticleCategory.findOneAndUpdate(
                { id: id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedCategory) {
                return res.apiResponse(false, 'Category not found', {}, 404);
            }
            return res.apiResponse(true, 'Category updated successfully', updatedCategory, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Category', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await ArticleCategory.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Category not found', {}, 404)
        }
        return res.apiResponse(true, 'Category deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete category error', { error }, 500)
    }
}

exports.indexScript = async (req, res, next) => {
    try {
        const docs = await ArticleCategory.find({});
        const grouped = {};
        for (const doc of docs) {
            const type = doc.momType || 'unknown';
            if (!grouped[type]) {
                grouped[type] = [];
            }
            grouped[type].push(doc);
        }
        const bulkOps = [];
        for (const [momType, group] of Object.entries(grouped)) {
            group.forEach((doc, index) => {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: doc._id },
                        update: { $set: { index } }
                    }
                });
            });
        }
        if (bulkOps.length > 0) {
            await ArticleCategory.bulkWrite(bulkOps);
        }
        res.status(200).json({ message: "Indexes updated by momType using bulkWrite." });
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
        const itemToMove = await ArticleCategory.findOne({ id });
        if (!itemToMove) {
            return res.apiResponse(false, 'Item not found', {}, 404);
        }
        const oldIndex = itemToMove.index;
        if (oldIndex === newIndex) {
            return res.apiResponse(true, 'Index unchanged', {}, 200);
        }
        // const checkIndex = await ArticleCategory.findOne({ index: newIndex, momType: itemToMove.momType });
        // if (!checkIndex) {
        //     return res.status(400).json({ message: `Index ${newIndex} not available to swap.` });
        // }
        const targetDoc = await ArticleCategory.findOne({ index: newIndex, momType: itemToMove.momType });
        if (!targetDoc) {
            return res.apiResponse(false, 'Target index not found in any document', {}, 404);
        }
        targetDoc.index = oldIndex;
        itemToMove.index = newIndex;
        await Promise.all([targetDoc.save(), itemToMove.save()]);
        return res.apiResponse(true, 'Index swapped successfully', {}, 200);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update indexes', error });
    }
};

exports.updateArticleCategoryImage = async (req, res, next) => {
    try {
        console.log('req.body', req.body)
        if (req.body) {
            const { id, public_id } = req.body;
            if (id === undefined || id === null || !req.file) {
                return res.apiResponse(false, 'Id or File is missing', {}, 400);
            }
            const updateFields = {};
            const result = await uploadToCloudinary(req.file, 'articleCategory');
            updateFields.file = result.secure_url;
            updateFields.public_id = result.public_id;
            const updatedArticle = await ArticleCategory.findOneAndUpdate(
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
//         if (req.userDetails && req.userDetails.momType) {
//             match['momType'] = req.userDetails.momType;
//         }
//         if (requests.momType && requests.momType !== '') {
//             match['momType'] = requests.momType;
//         }
//         if (requests.status && requests.status !== '') {
//             match['status'] = requests.status;
//         }
//         if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
//             const searchTerm = requests.searchKey.trim();
//             match['title'] = { $regex: searchTerm, $options: 'i' };
//         }

//         const isMatchEmpty = Object.keys(match).length === 0;

//         const options = {
//             page: page,
//             limit: per_page,
//             skip: skip,
//             sort: isMatchEmpty ? { index: 1 } : { [sortField]: sortOrder },
//         };

//         if (pagination === "true") {
//             ArticleCategory.paginate(match, options, function (err, data) {
//                 if (err) {
//                     return res.apiResponse(false, "Error while fetching lists", {}, 404);
//                 }
//                 return res.apiResponse(true, "Success", data, 200);
//             });
//         } else {
//             const query = isMatchEmpty ? ArticleCategory.find({}) : ArticleCategory.find(match);
//             const categories = await query.sort(isMatchEmpty ? { index: 1 } : { [sortField]: sortOrder });
//             return res.apiResponse(true, "Success", { docs: categories }, 200);
//         }
//     } catch (error) {
//         return res.apiResponse(false, 'Get list error', {}, 500);
//     }
// };