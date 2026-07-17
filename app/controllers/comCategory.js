const ComCategory = require('../models/comCategory')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

// exports.add = async (req, res, next) => {
//     try {
//         const { title, color, status } = req.body;
//         let momTypes = req.body.momTypes;
//         if (!title || !color || !status || !req.file || !momTypes) {
//             return res.apiResponse(false, 'Category details is missing', {}, 400);
//         }
//         const checkTitle = await ComCategory.findOne({ title: title })
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
//         console.log('coming')
//         const uniqueId = `ComCat-${moment().format('DDMMYYYYHHmmss')}`;
//         const categoryToSave =
//             momTypes.length === 2
//                 ? await Promise.all(
//                     ['pregMom', 'newMom'].map(async (type, idx) => {
//                         const { secure_url, public_id } = await uploadToCloudinary(req.file, 'communityCategory');
//                         return new ComCategory({
//                             title,
//                             color,
//                             status,
//                             file: secure_url,
//                             public_id,
//                             id: `${uniqueId}-${idx + 1}`,
//                             momTypes: [type],
//                             momType: type
//                         });
//                     })
//                 )
//                 : [
//                     await (async () => {
//                         const { secure_url, public_id } = await uploadToCloudinary(req.file, 'communityCategory');
//                         return new ComCategory({
//                             title,
//                             color,
//                             status,
//                             file: secure_url,
//                             public_id,
//                             id: uniqueId,
//                             momTypes,
//                             momType: momTypes[0]
//                         });
//                     })()
//                 ];
//         await Promise.all(categoryToSave.map(cat => cat.save()));
//         return res.apiResponse(true, "Category added Success", categoryToSave, 200);
//     } catch (error) {
//         return res.apiResponse(false, 'Category Add error', {}, 500);
//     }
// }

exports.add = async (req, res, next) => {
    try {
        const { title, color, status, momType } = req.body;
        if (!title || !color || !status || !momType || !req.file) {
            return res.apiResponse(false, 'Category details is missing', {}, 400);
        }
        const checkTitle = await ComCategory.findOne({ title: title })
        if (checkTitle) {
            return res.apiResponse(false, 'Title already exists', {}, 400);
        }
        const uniqueId = `ComCat-${moment().format('DDMMYYYYHHmmss')}`;
         const { secure_url, public_id } = await uploadToCloudinary(req.file, 'communityCategory');
        let newCategory = new ComCategory({
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
            skip: skip
        };
        if (pagination === "true") {
            ComCategory.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let categories = [];
            if (Object.keys(match).length === 0) {
                categories = await ComCategory.find({});
            } else {
                categories = await ComCategory.find(match);
            }
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
        const category = await ComCategory.findOne({ id: requests.id })
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
                const checkTitle = await ComCategory.findOne({ title: req.body.title })
                if (checkTitle && checkTitle.id !== id) {
                    return res.apiResponse(false, 'Title already exists', {}, 400);
                }
                updateFields.title = req.body.title;
            }
            // if (req.body.title) updateFields.title = req.body.title;
            if (req.body.color) updateFields.color = req.body.color;
            if (req.body.momType) updateFields.momType = req.body.momType;
            if (req.body.status) updateFields.status = req.body.status;

            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    const result = await uploadToCloudinary(req.file, 'communityCategory');
                    updateFields.file = result.secure_url;
                    updateFields.public_id = result.public_id;
                }
            }

            const updatedCategory = await ComCategory.findOneAndUpdate(
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
        const result = await ComCategory.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Category not found', {}, 404)
        }
        return res.apiResponse(true, 'Category deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete category error', { error }, 500)
    }
}