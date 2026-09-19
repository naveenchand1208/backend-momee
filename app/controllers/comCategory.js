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
        console.log("COMMUNITY CATEGORY BODY:", req.body);

        let translations = {};

        if (req.body.translations) {
            translations =
                typeof req.body.translations === 'string'
                    ? JSON.parse(req.body.translations)
                    : req.body.translations;
        }

        const title = req.body.title;

        const titleTa =
            translations?.ta?.title ||
            req.body.titleTa ||
            '';

        const color = req.body.color;
        const status = req.body.status;
        const momType = req.body.momType;

        console.log("ENGLISH TITLE:", title);
        console.log("TAMIL TITLE:", titleTa);
        console.log("TRANSLATIONS:", translations);
        console.log("REQ.FILE:", req.file);

        if (!title || !titleTa || !color || !status || !momType || !req.file) {
            return res.apiResponse(
                false,
                "Required fields are missing",
                null,
                400
            );
        }

        // IMPORTANT: pass req.file, NOT req.file.path
        const { secure_url, public_id } =
            await uploadToCloudinary(
                req.file,
                'communityCategory'
            );

        const uniqueId = `ComCat-${Date.now()}`;

        const newCategory = new ComCategory({
            id: uniqueId,

            title: title,

            translations: {
                en: {
                    title: title
                },
                ta: {
                    title: titleTa
                }
            },

            color: color,
            status: status,
            momType: momType,

            file: secure_url,
            public_id: public_id
        });

        await newCategory.save();

        console.log(
            "SAVED CATEGORY:",
            JSON.stringify(newCategory.toObject(), null, 2)
        );

        return res.apiResponse(
            true,
            "Community category added successfully",
            newCategory,
            200
        );

    } catch (error) {
        console.error("Community Category Add Error:", error);
        next(error);
    }
};

// exports.add = async (req, res, next) => {
//     try {
//        // const { title, color, status, momType } = req.body;
//        const { title, titleTa, color, status, momType } = req.body;
//         if (!title || !titleTa || !color || !status || !momType || !req.file) {
//             return res.apiResponse(false, 'Category details is missing', {}, 400);
//         }
//         const checkTitle = await ComCategory.findOne({ title: title })
//         if (checkTitle) {
//             return res.apiResponse(false, 'Title already exists', {}, 400);
//         }
//         const uniqueId = `ComCat-${moment().format('DDMMYYYYHHmmss')}`;
//          const { secure_url, public_id } = await uploadToCloudinary(req.file, 'communityCategory');
//         let newCategory = new ComCategory({
//             title,
//             translations: {
//                 en: {
//                     title: title
//                 },
//                 ta: {
//                     title: titleTa
//                 }
//             },
//             color,
//             status,
//             file: secure_url,
//             public_id,
//             id: `${uniqueId}`,
//             momType: momType
//         });
//         await newCategory.save();
//         return res.apiResponse(true, "Category added Success", newCategory, 200);
//     } catch (error) {
//         return res.apiResponse(false, 'Category Add error', {}, 500);
//     }
// }

exports.list = async (req, res, next) => {
    try {
        const requests = req.bodyParams;

        const page = requests.page || 1;
        const per_page = requests.limit || 10;
        const pagination = requests.pagination || "true";
        const skip = (page - 1) * per_page;

        const match = {};

        if (requests.id && requests.id !== '') {
            match.id = requests.id;
        }

        if (req.userDetails && req.userDetails.momType) {
            match.momType = req.userDetails.momType;
        }

        if (requests.momType && requests.momType !== '') {
            match.momType = requests.momType;
        }

        if (requests.status && requests.status !== '') {
            match.status = requests.status;
        }

        if (
            requests.searchKey !== undefined &&
            requests.searchKey.trim() !== ''
        ) {
            const searchTerm = requests.searchKey.trim();
            match.title = {
                $regex: searchTerm,
                $options: 'i'
            };
        }

        const options = {
            page: page,
            limit: per_page,
            skip: skip
        };

        if (pagination === "true") {

            ComCategory.paginate(
                match,
                options,
                function (err, data) {

                    if (err) {
                        return res.apiResponse(
                            false,
                            "Error while fetching lists",
                            {},
                            404
                        );
                    }

                    // IMPORTANT
                    data.docs = data.docs.map((item) => {

                        const category =
                            typeof item.toObject === 'function'
                                ? item.toObject()
                                : item;

                        category.titleTa =
                            category?.translations?.ta?.title || '';

                        return category;
                    });

                    console.log(
                        "CATEGORY LIST:",
                        JSON.stringify(data.docs, null, 2)
                    );

                    return res.apiResponse(
                        true,
                        "Success",
                        data,
                        200
                    );
                }
            );

        } else {

            let categories = await ComCategory.find(match).lean();

            categories = categories.map((category) => {

                category.titleTa =
                    category?.translations?.ta?.title || '';

                return category;
            });

            console.log(
                "CATEGORY LIST:",
                JSON.stringify(categories, null, 2)
            );

            return res.apiResponse(
                true,
                "Success",
                {
                    docs: categories
                },
                200
            );
        }

    } catch (error) {
        console.error("Get Community Category List Error:", error);

        return res.apiResponse(
            false,
            'Get list error',
            {},
            500
        );
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
//         const options = {
//             page: page,
//             limit: per_page,
//             skip: skip
//         };
//         if (pagination === "true") {
//             ComCategory.paginate(match, options, function (err, data) {
//                 if (err) {
//                     return res.apiResponse(false, "Error while fetching lists", {}, 404);
//                 }
//                 return res.apiResponse(true, "Success", data, 200);
//             });
//         } else {
//             let categories = [];
//             if (Object.keys(match).length === 0) {
//                 categories = await ComCategory.find({});
//             } else {
//                 categories = await ComCategory.find(match);
//             }
//             return res.apiResponse(true, "Success", { docs: categories }, 200);
//         }

//     } catch (error) {
//         return res.apiResponse(false, 'Get list error', {}, 500);
//     }
// }

exports.view = async (req, res, next) => {
    try {

        const requests = req.bodyParams;

        if (!requests.id) {
            return res.apiResponse(
                false,
                'Id is missing',
                {},
                400
            );
        }

        const category = await ComCategory
            .findOne({ id: requests.id })
            .lean();

        if (!category) {
            return res.apiResponse(
                false,
                'Category not found',
                {},
                404
            );
        }

        const tamilTitle =
            category?.translations?.ta?.title || '';

        category.titleTa = tamilTitle;

        category.translations = {
            en: {
                title:
                    category?.translations?.en?.title ||
                    category?.title ||
                    ''
            },

            ta: {
                title: tamilTitle
            }
        };

        // Prevent global localization from replacing
        // the bilingual values in admin
        category.__skipLocalization = true;

        console.log(
            'CATEGORY ENGLISH:',
            category.title
        );

        console.log(
            'CATEGORY TAMIL:',
            tamilTitle
        );

        console.log(
            'CATEGORY TRANSLATIONS:',
            JSON.stringify(
                category.translations,
                null,
                2
            )
        );

        return res.apiResponse(
            true,
            'Success',
            category,
            200
        );

    } catch (error) {

        console.error(
            'Get Category Error:',
            error
        );

        return res.apiResponse(
            false,
            'get category error',
            {},
            500
        );
    }
}

// exports.view = async (req, res, next) => {
//     try {
//         var requests = req.bodyParams;
//         if (!requests.id) {
//             return res.apiResponse(false, 'Id is missing', {}, 400);
//         }
//         const category = await ComCategory.findOne({ id: requests.id })
//         if (!category) {
//             return res.apiResponse(false, 'Category not found', {}, 404);
//         }
//         return res.apiResponse(true, 'Success', category, 200);
//     } catch (error) {
//         return res.apiResponse(false, 'get category error', {}, 500)
//     }
// }

exports.update = async (req, res, next) => {
    try {

        console.log("COMMUNITY CATEGORY UPDATE BODY:", req.body);

        const { id, public_id, fileChanged } = req.body;

        if (!id) {
            return res.apiResponse(false, "ID is required", null, 400);
        }

        let translations = {};

        if (req.body.translations) {
            translations =
                typeof req.body.translations === 'string'
                    ? JSON.parse(req.body.translations)
                    : req.body.translations;
        }

        const existingCategory = await ComCategory.findOne({ id });

        if (!existingCategory) {
            return res.apiResponse(
                false,
                "Community category not found",
                null,
                404
            );
        }

        const title =
            req.body.title ||
            existingCategory.title ||
            '';

        const titleTa =
            translations?.ta?.title ||
            req.body.titleTa ||
            existingCategory?.translations?.ta?.title ||
            '';

        console.log("UPDATE ENGLISH TITLE:", title);
        console.log("UPDATE TAMIL TITLE:", titleTa);

        const updateFields = {
            title: title,

            translations: {
                en: {
                    title: title
                },
                ta: {
                    title: titleTa
                }
            }
        };

        if (req.body.color) {
            updateFields.color = req.body.color;
        }

        if (req.body.status) {
            updateFields.status = req.body.status;
        }

        if (req.body.momType) {
            updateFields.momType = req.body.momType;
        }

        // File changed
        if (fileChanged === 'true' || fileChanged === true) {

            if (req.file) {

                if (public_id) {
                    await deleteFromCloudinary(public_id);
                }

                // const { secure_url, public_id: newPublicId } =
                //     await uploadToCloudinary(
                //         req.file.path,
                //         'communityCategory'
                //     );
                const { secure_url, public_id: newPublicId } =
                    await uploadToCloudinary(
                        req.file,
                        'communityCategory'
                );
                updateFields.file = secure_url;
                updateFields.public_id = newPublicId;
            }
        }

        const updatedCategory =
            await ComCategory.findOneAndUpdate(
                { id: id },
                { $set: updateFields },
                { new: true }
            );

        console.log(
            "UPDATED TRANSLATIONS:",
            JSON.stringify(updatedCategory.translations, null, 2)
        );

        return res.apiResponse(
            true,
            "Community category updated successfully",
            updatedCategory,
            200
        );

    } catch (error) {
        console.error("Community Category Update Error:", error);
        next(error);
    }
};

// exports.update = async (req, res, next) => {
//     try {
//         if (req.body) {
//             const { id, public_id, fileChanged } = req.body;
//             if (id === undefined || id === null) {
//                 return res.apiResponse(false, 'Id is missing', {}, 400);
//             }
//             const updateFields = {};
//             if (req.body.title) {
//                 const checkTitle = await ComCategory.findOne({ title: req.body.title })
//                 if (checkTitle && checkTitle.id !== id) {
//                     return res.apiResponse(false, 'Title already exists', {}, 400);
//                 }
//                 updateFields.title = req.body.title;
//             }
//             // if (req.body.title) updateFields.title = req.body.title;
//             if (req.body.color) updateFields.color = req.body.color;
//             if (req.body.momType) updateFields.momType = req.body.momType;
//             if (req.body.status) updateFields.status = req.body.status;

//             if (fileChanged && public_id) {
//                 await deleteFromCloudinary(public_id);
//                 if (req.file) {
//                     const result = await uploadToCloudinary(req.file, 'communityCategory');
//                     updateFields.file = result.secure_url;
//                     updateFields.public_id = result.public_id;
//                 }
//             }

//             const updatedCategory = await ComCategory.findOneAndUpdate(
//                 { id: id },
//                 { $set: updateFields },
//                 { new: true }
//             );
//             if (!updatedCategory) {
//                 return res.apiResponse(false, 'Category not found', {}, 404);
//             }
//             return res.apiResponse(true, 'Category updated successfully', updatedCategory, 200);
//         } else {
//             return res.apiResponse(false, 'Payload is missing', {}, 400);
//         }
//     } catch (error) {
//         console.error('Update Error:', error);
//         return res.apiResponse(false, 'Error updating Category', {}, 500);
//     }

// };

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