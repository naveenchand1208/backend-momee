const Journey = require('../models/journey')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {

        const {
            name,
            nameTa,
            trimesterId,
            momType,
            status,
            weight,
            height,
            week,
            month,
            babyFruitSize,
            babyFruitSizeTa,
            description,
            descriptionTa,
            notes,
            link
        } = req.body;

        console.log('========== JOURNEY ADD ==========');
        console.log('NAME:', name);
        console.log('NAME TA:', nameTa);
        console.log('FRUIT SIZE:', babyFruitSize);
        console.log('FRUIT SIZE TA:', babyFruitSizeTa);
        console.log('DESCRIPTION:', description);
        console.log('DESCRIPTION TA:', descriptionTa);
        console.log('NOTES:', notes);

        if (!momType) {
            return res.apiResponse(
                false,
                'Mom Type are missing',
                {},
                400
            );
        }

        if (momType === 'newMom' && (
            !name ||
            !nameTa ||
            !status ||
            !description ||
            !descriptionTa ||
            !link ||
            !req.file
        )) {
            return res.apiResponse(
                false,
                'Journey New Mom params are missing',
                {},
                400
            );
        }

        // if (momType === 'pregMom' && (
        //     !name ||
        //     !nameTa ||
        //     !trimesterId ||
        //     !status ||
        //     !babyFruitSize ||
        //     !babyFruitSizeTa ||
        //     !description ||
        //     !descriptionTa ||
        //     !link ||
        //     !req.file
        // )) {
        //     return res.apiResponse(
        //         false,
        //         'Journey Preg Mom params are missing',
        //         {},
        //         400
        //     );
        // }
        if (momType === 'pregMom') {
            const missingFields = [];

            if (!name) missingFields.push('name');
            if (!nameTa) missingFields.push('nameTa');
            if (!trimesterId) missingFields.push('trimesterId');
            if (!status) missingFields.push('status');
            if (!babyFruitSize) missingFields.push('babyFruitSize');
            if (!babyFruitSizeTa) missingFields.push('babyFruitSizeTa');
            if (!description) missingFields.push('description');
            if (!descriptionTa) missingFields.push('descriptionTa');
            if (!link) missingFields.push('link');
            if (!req.file) missingFields.push('file');

            if (missingFields.length > 0) {

                console.log('========== MISSING JOURNEY FIELDS ==========');
                console.log('MOM TYPE:', momType);
                console.log('MISSING:', missingFields);

                return res.apiResponse(
                    false,
                    `Journey Preg Mom params are missing: ${missingFields.join(', ')}`,
                    {
                        missingFields
                    },
                    400
                );
            }
        }

        if (momType === 'pregMom' && !week) {
            return res.apiResponse(
                false,
                'Week is required',
                {},
                400
            );
        }

        if (momType === 'newMom' && !month) {
            return res.apiResponse(
                false,
                'Month is required',
                {},
                400
            );
        }

        let parsedNotes = notes || [];

        if (typeof notes === 'string') {

            try {
                parsedNotes = JSON.parse(notes);
            } catch (err) {

                return res.apiResponse(
                    false,
                    'Invalid notes format. Must be JSON.',
                    {},
                    400
                );
            }
        }

        // Make sure every note has English + Tamil translations
        parsedNotes = parsedNotes.map((note) => {

            const englishTitle =
                note?.translations?.en?.title ||
                note?.title ||
                '';

            const tamilTitle =
                note?.translations?.ta?.title ||
                note?.titleTa ||
                '';

            const descriptions =
                (note?.descriptions || []).map((desc) => {

                    const englishContent =
                        desc?.translations?.en?.content ||
                        desc?.content ||
                        '';

                    const tamilContent =
                        desc?.translations?.ta?.content ||
                        desc?.contentTa ||
                        '';

                    return {
                        id: desc.id,

                        content: englishContent,

                        translations: {
                            en: {
                                content: englishContent
                            },
                            ta: {
                                content: tamilContent
                            }
                        }
                    };
                });

            return {

                id: note.id,

                title: englishTitle,

                translations: {
                    en: {
                        title: englishTitle
                    },
                    ta: {
                        title: tamilTitle
                    }
                },

                descriptions
            };
        });

        const fileUpload =
            await uploadToCloudinary(
                req.file,
                'journey'
            );

        const uniqueId =
            `Journey-${moment().format('DDMMYYYYHHmmss')}`;

        const newJourney = new Journey({

            name,

            translations: {

                en: {
                    name,
                    babyFruitSize: babyFruitSize || '',
                    description: description || ''
                },

                ta: {
                    name: nameTa,
                    babyFruitSize: babyFruitSizeTa || '',
                    description: descriptionTa || ''
                }

            },

            trimesterId,

            status,

            description,

            link,

            file: fileUpload.secure_url,

            public_id: fileUpload.public_id,

            id: uniqueId,

            momType,

            week,

            month,

            weight,

            height,

            babyFruitSize,

            notes: parsedNotes
        });

        await newJourney.save();

        console.log(
            'SAVED JOURNEY:',
            newJourney.toObject()
        );

        return res.apiResponse(
            true,
            "Journey added Success",
            newJourney,
            200
        );

    } catch (error) {

        console.error(
            'Journey Add Error:',
            error
        );

        return res.apiResponse(
            false,
            'Journey Add error',
            { error },
            500
        );
    }
};

// exports.add = async (req, res, next) => {
//     try {
//         const { name, trimesterId, momType, status, weight, height, week, month, babyFruitSize, description, notes, link } = req.body;
//         if (!momType) {
//             return res.apiResponse(false, 'Mom Type are missing', {}, 400);
//         }
//         if (momType === 'newMom' && (!name || !status || !description || !link || notes.length === 0 || !req.file)
//         ) {
//             return res.apiResponse(false, 'Journey New Mom params are missing', {}, 400);
//         }
//         if (momType === 'pregMom' && (!name || !trimesterId || !weight || !height || !momType || !status || !babyFruitSize || !description || !link || notes.length === 0 || !req.file)
//         ) {
//             return res.apiResponse(false, 'Journey Preg Mom params are missing', {}, 400);
//         }
//         if (momType === 'pregMom' && !week) {
//             return res.apiResponse(false, 'Week is required', {}, 400);
//         }
//         if (momType === 'newMom' && !month) {
//             return res.apiResponse(false, 'Month is required', {}, 400);
//         }
//         let parsedNotes = notes;
//         if (typeof notes === 'string') {
//             try {
//                 parsedNotes = JSON.parse(notes);
//             } catch (err) {
//                 return res.apiResponse(false, 'Invalid notes format. Must be JSON.', {}, 400);
//             }
//         }
//         const fileUpload = await uploadToCloudinary(req.file, 'journey');
//         const uniqueId = `Journey-${moment().format('DDMMYYYYHHmmss')}`;
//         const newJourney = new Journey({
//             name,
//             trimesterId,
//             status,
//             description,
//             link,
//             file: fileUpload.secure_url,
//             public_id: fileUpload.public_id,
//             id: uniqueId,
//             momType,
//             week,
//             month,
//             weight,
//             height,
//             babyFruitSize,
//             description,
//             link,
//             notes: parsedNotes,
//         });
//         await newJourney.save()
//         return res.apiResponse(true, "Journey added Success", newJourney, 200);
//     } catch (error) {
//         return res.apiResponse(false, 'Journey Add error', { error }, 500);
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
        if (req.userDetails && req.userDetails.momType) {
            match['momType'] = req.userDetails.momType;
        }
        if (requests.trimesterId && requests.trimesterId !== '') {
            match['trimesterId'] = requests.trimesterId;
        }
        if (requests.momType && requests.momType !== '') {
            match['momType'] = requests.momType;
        }
        if (requests.week && requests.week !== '') {
            match['week'] = requests.week;
        }
        if (requests.month && requests.month !== '') {
            match['month'] = requests.month;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
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
            Journey.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let journeys = [];
            if (Object.keys(match).length === 0) {
                journeys = await Journey.find({});
            } else {
                journeys = await Journey.find(match);
            }
            return res.apiResponse(true, "Success", { docs: journeys }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

// exports.view = async (req, res, next) => {
//     try {
//         var requests = req.bodyParams;
//         if (!requests.id) {
//             return res.apiResponse(false, 'Id is missing', {}, 400);
//         }
//         const journey = await Journey.findOne({ id: requests.id })
//         if (!journey) {
//             return res.apiResponse(false, 'Journey not found', {}, 404);
//         }
//         return res.apiResponse(true, 'Success', journey, 200);
//     } catch (error) {
//         return res.apiResponse(false, 'get Journey error', {}, 500)
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

        const journey =
            await Journey
                .findOne({ id: requests.id })
                .lean();

        if (!journey) {
            return res.apiResponse(
                false,
                'Journey not found',
                {},
                404
            );
        }

        // Admin needs English + Tamil
        if (requests.admin === true) {
            journey.__skipLocalization = true;
        }

        return res.apiResponse(
            true,
            'Success',
            journey,
            200
        );

    } catch (error) {

        console.error(
            'get Journey error:',
            error
        );

        return res.apiResponse(
            false,
            'get Journey error',
            {},
            500
        );
    }
};

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

        const {
            id,
            public_id,
            fileChanged,

            name,
            nameTa,

            description,
            descriptionTa,

            trimesterId,

            status,

            link,

            weight,
            height,

            week,
            month,

            momType,

            babyFruitSize,
            babyFruitSizeTa,

            notes
        } = req.body;

        if (id === undefined || id === null) {
            return res.apiResponse(
                false,
                'Id is missing',
                {},
                400
            );
        }

        const existingJourney =
            await Journey.findOne({ id });

        if (!existingJourney) {
            return res.apiResponse(
                false,
                'Journey not found',
                {},
                404
            );
        }

        const updateFields = {};

        // Existing English fields
        if (name) {
            updateFields.name = name;
        }

        if (description) {
            updateFields.description = description;
        }

        if (trimesterId) {
            updateFields.trimesterId = trimesterId;
        }

        if (status) {
            updateFields.status = status;
        }

        if (link) {
            updateFields.link = link;
        }

        if (weight !== undefined && weight !== '') {
            updateFields.weight = weight;
        }

        if (height !== undefined && height !== '') {
            updateFields.height = height;
        }

        if (week) {
            updateFields.week = week;
        }

        if (month) {
            updateFields.month = month;
        }

        if (momType) {
            updateFields.momType = momType;
        }

        if (babyFruitSize) {
            updateFields.babyFruitSize = babyFruitSize;
        }

        // Main English + Tamil translations
        updateFields.translations = {

            en: {
                name:
                    name ||
                    existingJourney?.translations?.en?.name ||
                    existingJourney?.name ||
                    '',

                babyFruitSize:
                    babyFruitSize ||
                    existingJourney?.translations?.en?.babyFruitSize ||
                    existingJourney?.babyFruitSize ||
                    '',

                description:
                    description ||
                    existingJourney?.translations?.en?.description ||
                    existingJourney?.description ||
                    ''
            },

            ta: {
                name:
                    nameTa ||
                    existingJourney?.translations?.ta?.name ||
                    '',

                babyFruitSize:
                    babyFruitSizeTa ||
                    existingJourney?.translations?.ta?.babyFruitSize ||
                    '',

                description:
                    descriptionTa ||
                    existingJourney?.translations?.ta?.description ||
                    ''
            }
        };

        // Notes
        if (notes) {

            let parsedNotes = notes;

            if (typeof notes === 'string') {
                parsedNotes = JSON.parse(notes);
            }

            updateFields.notes =
                parsedNotes.map((note) => {

                    const englishTitle =
                        note?.translations?.en?.title ||
                        note?.title ||
                        '';

                    const tamilTitle =
                        note?.translations?.ta?.title ||
                        note?.titleTa ||
                        '';

                    const descriptions =
                        (note?.descriptions || []).map(
                            (desc) => {

                                const englishContent =
                                    desc?.translations?.en?.content ||
                                    desc?.content ||
                                    '';

                                const tamilContent =
                                    desc?.translations?.ta?.content ||
                                    desc?.contentTa ||
                                    '';

                                return {

                                    id: desc.id,

                                    content: englishContent,

                                    translations: {

                                        en: {
                                            content:
                                                englishContent
                                        },

                                        ta: {
                                            content:
                                                tamilContent
                                        }

                                    }
                                };
                            }
                        );

                    return {

                        id: note.id,

                        title: englishTitle,

                        translations: {

                            en: {
                                title: englishTitle
                            },

                            ta: {
                                title: tamilTitle
                            }

                        },

                        descriptions
                    };
                });
        }

        // File
        if (
            fileChanged &&
            public_id &&
            req.file
        ) {

            await deleteFromCloudinary(
                public_id
            );

            const result =
                await uploadToCloudinary(
                    req.file,
                    'journey'
                );

            updateFields.file =
                result.secure_url;

            updateFields.public_id =
                result.public_id;
        }

        console.log(
            'JOURNEY UPDATE FIELDS:',
            updateFields
        );

        const updatedJourney =
            await Journey.findOneAndUpdate(
                { id },

                {
                    $set: updateFields
                },

                {
                    new: true
                }
            );

        if (!updatedJourney) {
            return res.apiResponse(
                false,
                'Journey not found',
                {},
                404
            );
        }

        return res.apiResponse(
            true,
            'Journey updated successfully',
            updatedJourney,
            200
        );

    } catch (error) {

        console.error(
            'Update Error:',
            error
        );

        return res.apiResponse(
            false,
            'Error updating Journey',
            {},
            500
        );
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
//             if (req.body.name) updateFields.name = req.body.name;
//             if (req.body.description) updateFields.description = req.body.description;
//             if (req.body.trimesterId) updateFields.trimesterId = req.body.trimesterId;
//             if (req.body.status) updateFields.status = req.body.status;
//             if (req.body.link) updateFields.link = req.body.link;
//             if (req.body.weight) updateFields.weight = req.body.weight;
//             if (req.body.height) updateFields.height = req.body.height;
//             if (!!req.body.week) updateFields.week = req.body.week;
//             if (!!req.body.month) updateFields.month = req.body.month;
//             if (req.body.momType) updateFields.momType = req.body.momType;
//             if (req.body.babyFruitSize) updateFields.babyFruitSize = req.body.babyFruitSize;
//             if (req.body.notes) {
//                 if (typeof req.body.notes === 'string') {
//                     updateFields.notes = JSON.parse(req.body.notes);
//                 } else {
//                     updateFields.notes = req.body.notes;
//                 }
//             }
//             // if (req.body.notes) updateFields.notes = req.body.notes;
//             if (fileChanged && public_id && req.file) {
//                 await deleteFromCloudinary(public_id);
//                 const result = await uploadToCloudinary(req.file, 'journey');
//                 updateFields.file = result.secure_url;
//                 updateFields.public_id = result.public_id;
//             }
//             const updatedJourney = await Journey.findOneAndUpdate(
//                 { id: id },
//                 { $set: updateFields },
//                 { new: true }
//             );
//             if (!updatedJourney) {
//                 return res.apiResponse(false, 'Journey not found', {}, 404);
//             }
//             return res.apiResponse(true, 'Journey updated successfully', updatedJourney, 200);
//         } else {
//             return res.apiResponse(false, 'Payload is missing', {}, 400);
//         }
//     } catch (error) {
//         console.error('Update Error:', error);
//         return res.apiResponse(false, 'Error updating Journey', {}, 500);
//     }
// };

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const journey = await Journey.findOne({ id: requests.id });
        if (!journey) {
            return res.apiResponse(false, 'Journey not found', {}, 404)
        }
        await deleteFromCloudinary(journey?.public_id);
        const result = await Journey.deleteOne({ id: requests.id });
        return res.apiResponse(true, 'Journey deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Journey error', { error }, 500)
    }
}