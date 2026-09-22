const BabyAnimation = require('../models/babyAnimation')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {

        console.log('========== BABY ANIMATION ADD ==========');
        console.log('BODY:', req.body);
        console.log('FILE:', req.file);
        console.log('NAME:', req.body?.name);
        console.log('BABY SIZE:', req.body?.babySize);
        console.log('BABY WEIGHT:', req.body?.babyWeight);
        console.log('========================================');

        const {
            name,
            babySize,
            babyWeight
        } = req.body;

        if (!name || !babySize || !babyWeight || !req.file) {

            return res.apiResponse(
                false,
                'Params is missing',
                {
                    name: !!name,
                    babySize: !!babySize,
                    babyWeight: !!babyWeight,
                    file: !!req.file
                },
                400
            );
        }

        if (req.file.mimetype !== 'image/gif') {
            return res.apiResponse(
                false,
                'Only GIF files are allowed',
                {},
                400
            );
        }

        const checkTitle = await BabyAnimation.findOne({
            name
        });

        if (checkTitle) {
            return res.apiResponse(
                false,
                'Name already exists',
                {},
                400
            );
        }

        const {
            secure_url,
            public_id
        } = await uploadToCloudinary(
            req.file,
            'babyAnimation'
        );

        const uniqueId =
            `BabyAnimation-${moment().format('DDMMYYYYHHmmss')}`;

        const newAnimation = new BabyAnimation({
            name,
            babySize,
            babyWeight,

            translations: {
                en: {
                    name: name
                }
            },

            file: secure_url,
            public_id: public_id,
            id: uniqueId
        });

        await newAnimation.save();

        console.log(
            'Baby Animation Added:',
            newAnimation.id
        );

        return res.apiResponse(
            true,
            'BabyAnimation added Success',
            newAnimation,
            200
        );

    } catch (error) {

        console.error(
            'Add BabyAnimation Error:',
            error
        );

        return res.apiResponse(
            false,
            'BabyAnimation Add error',
            {
                error: error.message
            },
            500
        );
    }
};

// exports.add = async (req, res, next) => {
//     try {
//         const {
//             name,
//             //nameTa,
//             babySize,
//             babyWeight
//         } = req.body;

//         //if (!name || !nameTa || !babySize || !babyWeight || !req.file) {
//         if (!name || !babySize || !babyWeight || !req.file) {
//             return res.apiResponse(
//                 false,
//                 'Params is missing',
//                 {},
//                 400
//             );
//         }

//         const allowedType = 'image/gif';

//         if (req.file.mimetype !== allowedType) {
//             return res.apiResponse(
//                 false,
//                 'Only GIF files are allowed',
//                 {},
//                 400
//             );
//         }

//         const checkTitle = await BabyAnimation.findOne({
//             name
//         });

//         if (checkTitle) {
//             return res.apiResponse(
//                 false,
//                 'Name already exists',
//                 {},
//                 400
//             );
//         }

//         const {
//             secure_url,
//             public_id
//         } = await uploadToCloudinary(
//             req.file,
//             'babyAnimation'
//         );

//         const uniqueId = `BabyAnimation-${moment().format('DDMMYYYYHHmmss')}`;

//         const newAnimation = new BabyAnimation({
//             name,
//             babySize,
//             babyWeight,

//             translations: {
//                 en: {
//                     name: name
//                 },
//                 // ta: {
//                 //     name: nameTa
//                 // }
//             },

//             file: secure_url,
//             public_id: public_id,
//             id: uniqueId,
//         });

//         console.log(
//             'FINAL TRANSLATIONS:',
//             newAnimation.translations
//         );

//         await newAnimation.save();

//         return res.apiResponse(
//             true,
//             "BabyAnimation added Success",
//             newAnimation,
//             200
//         );

//     } catch (error) {
//         console.error(
//             "Add BabyAnimation Error:",
//             error
//         );

//         return res.apiResponse(
//             false,
//             'BabyAnimation Add error',
//             { error },
//             500
//         );
//     }
// };

// exports.add = async (req, res, next) => {
//     try {
//         const { name, nameTa, babySize, babyWeight } = req.body;
//         let translations = {};
//         if (req.body.translations) {
//             try {
//                 translations =
//                     typeof req.body.translations === 'string'
//                         ? JSON.parse(req.body.translations)
//                         : req.body.translations;
//             } catch (error) {
//                 console.error('Invalid translations JSON:', error);

//                 return res.apiResponse(
//                     false,
//                     'Invalid translations data',
//                     {},
//                     400
//                 );
//             }
//         }
//         if (!name || !babySize || !babyWeight || !req.file) {
//             return res.apiResponse(false, 'Params is missing', {}, 400);
//         }
//         const allowedType = 'image/gif';
//         if (req.file.mimetype !== allowedType) {
//             return res.apiResponse(false, 'Only GIF files are allowed', {}, 400);
//         }
//         const checkTitle = await BabyAnimation.findOne({ name })
//         if (checkTitle) {
//             return res.apiResponse(false, 'Name already exists', {}, 400);
//         }
//         const { secure_url, public_id } = await uploadToCloudinary(req.file, 'babyAnimation');
//         const uniqueId = `BabyAnimation-${moment().format('DDMMYYYYHHmmss')}`;
//         const newAnimation = new BabyAnimation({
//             name,
//             babySize,
//             babyWeight,
//             translations: {
//                 en: {
//                     name: name
//                 },
//                 ta: {
//                   name: translations?.ta?.name || nameTa || ''
//                 }
//             },
//             file: secure_url,
//             public_id: public_id,
//             id: uniqueId,
//         });
//         await newAnimation.save();
//         return res.apiResponse(true, "BabyAnimation added Success", newAnimation, 200);
//     } catch (error) {
//         console.error("Add BabyAnimation Error:", error);
//         return res.apiResponse(false, 'BabyAnimation Add error', { error }, 500);
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
        const sortField = requests.sortField || 'createdAt';
        const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;

        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.fromDate && requests.toDate) {
            let startDate = moment(requests.fromDate);
            let endDate = moment(requests.toDate);
            if (startDate.isValid() && endDate.isValid()) {
                match.createdAt = {
                    $gte: startDate.startOf('day').toDate(),
                    $lte: endDate.endOf('day').toDate()
                };
            }
        }
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match['name'] = { $regex: searchTerm, $options: 'i' };
        }
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            BabyAnimation.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let animations = [];
            if (Object.keys(match).length === 0) {
                animations = await BabyAnimation.find({});
            } else {
                animations = await BabyAnimation.find(match);
            }
            return res.apiResponse(true, "Success", { docs: animations }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

exports.view = async (req, res, next) => {
    try {
        const requests = req.bodyParams;

        console.log('========== BABY ANIMATION VIEW ==========');
        console.log('BODY PARAMS:', requests);
        console.log('=========================================');

        if (!requests || !requests.id) {
            return res.apiResponse(
                false,
                'Id is missing',
                {},
                400
            );
        }

        const animation = await BabyAnimation
            .findOne({ id: requests.id })
            .lean();

        if (!animation) {
            return res.apiResponse(
                false,
                'BabyAnimation not found',
                {},
                404
            );
        }

        // English name only
        animation.name =
            animation?.translations?.en?.name ||
            animation?.name ||
            '';

        // No Tamil required
        animation.__skipLocalization = true;

        console.log('BABY ANIMATION FOUND:', animation.id);
        console.log('NAME:', animation.name);

        return res.apiResponse(
            true,
            'Success',
            animation,
            200
        );

    } catch (error) {

        console.error(
            'BabyAnimation View Error:',
            error
        );

        return res.apiResponse(
            false,
            'get BabyAnimation error',
            {
                error: error.message
            },
            500
        );
    }
};

// exports.view = async (req, res, next) => {
//     try {
//         const requests = req.bodyParams;

//         if (!requests.id) {
//             return res.apiResponse(
//                 false,
//                 'Id is missing',
//                 {},
//                 400
//             );
//         }

//         const animation = await BabyAnimation
//             .findOne({ id: requests.id })
//             .lean();

//         if (!animation) {
//             return res.apiResponse(
//                 false,
//                 'BabyAnimation not found',
//                 {},
//                 404
//             );
//         }

//         // ==========================================
//         // GET EXISTING TAMIL
//         // ==========================================

//         // let tamilName =
//         //     animation?.translations?.ta?.name ||
//         //     animation?.nameTa ||
//         //     '';

//         // ==========================================
//         // AUTO CREATE TAMIL FOR WEEK TITLES
//         // ==========================================

//         if (!tamilName && animation?.name) {

//             const weekMatch = animation.name.match(
//                 /^Week\s+(\d+)$/i
//             );

//             if (weekMatch) {
//                 const weekNumber = weekMatch[1];

//                 tamilName = `வாரம் ${weekNumber}`;
//             }
//         }

//         // ==========================================
//         // SEND TAMIL TO ADMIN FORM
//         // ==========================================

//         //animation.nameTa = tamilName;

//         animation.translations = {
//             en: {
//                 name:
//                     animation?.translations?.en?.name ||
//                     animation?.name ||
//                     ''
//             },

//             ta: {
//                 name: tamilName
//             }
//         };

//         // Prevent global localization
//         animation.__skipLocalization = true;

//         return res.apiResponse(
//             true,
//             'Success',
//             animation,
//             200
//         );

//     } catch (error) {

//         console.error(
//             'BabyAnimation View Error:',
//             error
//         );

//         return res.apiResponse(
//             false,
//             'get BabyAnimation error',
//             {},
//             500
//         );
//     }
// };

// exports.view = async (req, res, next) => {
//     try {
//         var requests = req.bodyParams;
//         if (!requests.id) {
//             return res.apiResponse(false, 'Id is missing', {}, 400);
//         }
//         const animations = await BabyAnimation.findOne({ id: requests.id })
//         if (!animations) {
//             return res.apiResponse(false, 'BabyAnimation not found', {}, 404);
//         }
//         return res.apiResponse(true, 'Success', animations, 200);
//     } catch (error) {
//         return res.apiResponse(false, 'get BabyAnimation error', {}, 500)
//     }
// }

// exports.update = async (req, res, next) => {
//     try {
//         if (req.body) {
//             const body = Object(req.body);
//             const { id, public_id, fileChanged } = body;
//             if (id === undefined || id === null) {
//                 return res.apiResponse(false, 'Id is missing', {}, 400);
//             }
//             const updateFields = {};
//             let translations = {};
//             if (req.body.translations) {
//                 try {
//                     translations =
//                         typeof req.body.translations === 'string'
//                             ? JSON.parse(req.body.translations)
//                             : req.body.translations;
//                 } catch (error) {
//                     console.error('Invalid translations JSON:', error);

//                     return res.apiResponse(
//                         false,
//                         'Invalid translations data',
//                         {},
//                         400
//                     );
//                 }
//             }
//             if (req.body.name) updateFields.name = req.body.name;
//             updateFields.translations = {
//                 en: {
//                     name: req.body.name || ''
//                 },
//                 ta: {
//                     name: translations?.ta?.name || ''
//                 }
//             };
//             if (req.body.babySize) updateFields.babySize = req.body.babySize;
//             if (req.body.babyWeight) updateFields.babyWeight = req.body.babyWeight;
//             if (req.body.status) updateFields.status = req.body.status;
//             if (fileChanged && public_id) {
//                 await deleteFromCloudinary(public_id);
//                 if (req.file) {
//                     const { secure_url, public_id } = await uploadToCloudinary(req.file, 'babyAnimation');
//                     updateFields.file = secure_url;
//                     updateFields.public_id = public_id;
//                 }
//             }
//             const updatedAnimation = await BabyAnimation.findOneAndUpdate(
//                 { id },
//                 { $set: updateFields },
//                 { new: true }
//             );
//             if (!updatedAnimation) {
//                 return res.apiResponse(false, 'Animation not found', {}, 404);
//             }
//             return res.apiResponse(true, 'Animation updated successfully', updatedAnimation, 200);
//         } else {
//             return res.apiResponse(false, 'Payload is missing', {}, 400);
//         }
//     } catch (error) {
//         console.error('Update Error:', error);
//         return res.apiResponse(false, 'Error updating Animation', {}, 500);
//     }

// };


// exports.update = async (req, res, next) => {
//     try {
//         if (!req.body) {
//             return res.apiResponse(
//                 false,
//                 'Payload is missing',
//                 {},
//                 400
//             );
//         }

//         const body = Object(req.body);

//         const {
//             id,
//             public_id,
//             fileChanged
//         } = body;

//         if (!id) {
//             return res.apiResponse(
//                 false,
//                 'Id is missing',
//                 {},
//                 400
//             );
//         }

//         // ==========================================
//         // GET TRANSLATIONS
//         // ==========================================

//         let translations = {};

//         if (req.body.translations) {
//             try {
//                 translations =
//                     typeof req.body.translations === 'string'
//                         ? JSON.parse(req.body.translations)
//                         : req.body.translations;
//             } catch (error) {
//                 console.error(
//                     'Invalid translations JSON:',
//                     error
//                 );

//                 return res.apiResponse(
//                     false,
//                     'Invalid translations data',
//                     {},
//                     400
//                 );
//             }
//         }

//         // ==========================================
//         // GET EXISTING RECORD
//         // ==========================================

//         const existingAnimation =
//             await BabyAnimation.findOne({ id });

//         if (!existingAnimation) {
//             return res.apiResponse(
//                 false,
//                 'Animation not found',
//                 {},
//                 404
//             );
//         }

//         // ==========================================
//         // UPDATE FIELDS
//         // ==========================================

//         const updateFields = {};

//         if (
//             req.body.name !== undefined &&
//             req.body.name !== ''
//         ) {
//             updateFields.name = req.body.name;
//         }

//         if (
//             req.body.babySize !== undefined &&
//             req.body.babySize !== ''
//         ) {
//             updateFields.babySize = req.body.babySize;
//         }

//         if (
//             req.body.babyWeight !== undefined &&
//             req.body.babyWeight !== ''
//         ) {
//             updateFields.babyWeight = req.body.babyWeight;
//         }

//         if (req.body.status) {
//             updateFields.status = req.body.status;
//         }

//         // ==========================================
//         // TRANSLATIONS
//         // ==========================================

//         updateFields.translations = {
//             en: {
//                 name:
//                     req.body.name ||
//                     existingAnimation?.translations?.en?.name ||
//                     existingAnimation?.name ||
//                     ''
//             },

//             // ta: {
//             //     name:
//             //         translations?.ta?.name ||
//             //         req.body.nameTa ||
//             //         existingAnimation?.translations?.ta?.name ||
//             //         ''
//             // }
//         };

//         // ==========================================
//         // FILE
//         // ==========================================

//         if (fileChanged && public_id) {

//             await deleteFromCloudinary(public_id);

//             if (req.file) {

//                 const {
//                     secure_url,
//                     public_id: newPublicId
//                 } = await uploadToCloudinary(
//                     req.file,
//                     'babyAnimation'
//                 );

//                 updateFields.file = secure_url;
//                 updateFields.public_id = newPublicId;
//             }
//         }

//         // ==========================================
//         // DEBUG
//         // ==========================================

//         console.log(
//             'UPDATE BABY ANIMATION'
//         );

//         console.log(
//             'English:',
//             updateFields.translations.en.name
//         );

//         // ==========================================
//         // UPDATE DATABASE
//         // ==========================================

//         const updatedAnimation =
//             await BabyAnimation.findOneAndUpdate(
//                 { id },
//                 { $set: updateFields },
//                 {
//                     new: true
//                 }
//             );

//         if (!updatedAnimation) {
//             return res.apiResponse(
//                 false,
//                 'Animation not found',
//                 {},
//                 404
//             );
//         }

//         return res.apiResponse(
//             true,
//             'Animation updated successfully',
//             updatedAnimation,
//             200
//         );

//     } catch (error) {

//         console.error(
//             'Update Error:',
//             error
//         );

//         return res.apiResponse(
//             false,
//             'Error updating Animation',
//             {},
//             500
//         );
//     }
// };

exports.update = async (req, res, next) => {
    try {

        if (!req.body) {
            return res.apiResponse(
                false,
                'Payload is missing',
                {},
                400
            );
        }

        const body = Object(req.body);

        const {
            id,
            public_id,
            fileChanged
        } = body;

        console.log('========== BABY ANIMATION UPDATE ==========');
        console.log('BODY:', req.body);
        console.log('ID:', id);
        console.log('STATUS:', req.body.status);
        console.log('============================================');

        if (!id) {
            return res.apiResponse(
                false,
                'Id is missing',
                {},
                400
            );
        }

        // ==========================================
        // GET EXISTING RECORD
        // ==========================================

        const existingAnimation =
            await BabyAnimation.findOne({ id });

        if (!existingAnimation) {
            return res.apiResponse(
                false,
                'Animation not found',
                {},
                404
            );
        }

        // ==========================================
        // UPDATE FIELDS
        // ==========================================

        const updateFields = {};

        if (
            req.body.name !== undefined &&
            req.body.name !== ''
        ) {
            updateFields.name = req.body.name;
        }

        if (
            req.body.babySize !== undefined &&
            req.body.babySize !== ''
        ) {
            updateFields.babySize = req.body.babySize;
        }

        if (
            req.body.babyWeight !== undefined &&
            req.body.babyWeight !== ''
        ) {
            updateFields.babyWeight = req.body.babyWeight;
        }

        // ==========================================
        // STATUS
        // ==========================================

        if (
            req.body.status !== undefined &&
            req.body.status !== ''
        ) {
            updateFields.status = req.body.status;
        }

        // ==========================================
        // ENGLISH TRANSLATION
        // ==========================================

        updateFields.translations = {
            en: {
                name:
                    req.body.name ||
                    existingAnimation?.translations?.en?.name ||
                    existingAnimation?.name ||
                    ''
            }
        };

        // ==========================================
        // FILE
        // ==========================================

        if (fileChanged && public_id) {

            await deleteFromCloudinary(public_id);

            if (req.file) {

                const {
                    secure_url,
                    public_id: newPublicId
                } = await uploadToCloudinary(
                    req.file,
                    'babyAnimation'
                );

                updateFields.file = secure_url;
                updateFields.public_id = newPublicId;
            }
        }

        // ==========================================
        // DEBUG
        // ==========================================

        console.log('UPDATE BABY ANIMATION');
        console.log('ID:', id);
        console.log('Name:', updateFields.name);
        console.log('Baby Size:', updateFields.babySize);
        console.log('Baby Weight:', updateFields.babyWeight);
        console.log('Status:', updateFields.status);

        // ==========================================
        // UPDATE DATABASE
        // ==========================================

        const updatedAnimation =
            await BabyAnimation.findOneAndUpdate(
                { id },
                {
                    $set: updateFields
                },
                {
                    new: true
                }
            );

        if (!updatedAnimation) {
            return res.apiResponse(
                false,
                'Animation not found',
                {},
                404
            );
        }

        console.log(
            'UPDATED STATUS:',
            updatedAnimation.status
        );

        return res.apiResponse(
            true,
            'Animation updated successfully',
            updatedAnimation,
            200
        );

    } catch (error) {

        console.error(
            'Update Error:',
            error
        );

        return res.apiResponse(
            false,
            'Error updating Animation',
            {
                error: error.message
            },
            500
        );
    }
};
exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const animation = await BabyAnimation.findOne({ id: requests.id })
        if (!animation) {
            return res.apiResponse(false, 'BabyAnimation not found', {}, 404)
        }
        if (animation && animation.public_id) {
            await deleteFromCloudinary(animation.public_id);
        }
        const result = await BabyAnimation.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'BabyAnimation not found', {}, 404)
        }
        return res.apiResponse(true, 'BabyAnimation deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete BabyAnimation error', { error }, 500)
    }
}