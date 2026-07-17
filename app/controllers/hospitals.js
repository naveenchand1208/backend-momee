const Hospital = require('../models/hospitals')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');
const { addressToLatLng } = require('../helpers/geocoder');
const HospitalDepartment = require('../models/hospitalDepartment');
const { exportToExcel } = require('../helpers/excel');

exports.add = async (req, res, next) => {
    try {
        const { name, address, mobile, latitude, longitude, email, departmentIds, typeIds, Doctors, facilities } = req.body;
        if (!name || !address || !mobile || !req.file || !email || departmentIds.length === 0 || typeIds.length === 0 || Doctors.length === 0 || facilities.length === 0) {
            return res.apiResponse(false, 'Hospital params is missing', {}, 400);
        }
        const checkTitle = await Hospital.findOne({ name: name })
        if (checkTitle) {
            return res.apiResponse(false, 'Hospital Name already exists', {}, 400);
        }
        const { secure_url, public_id } = await uploadToCloudinary(req.file, 'hospitals');
        const now = moment().format('DDMMYYYYHHmmss');
        const uniqueId = `Hospital-${now}`;
        const newHospital = new Hospital({
            name,
            email,
            address,
            mobile,
            latitude,
            longitude,
            file: secure_url,
            public_id: public_id,
            id: uniqueId,
            departmentIds: departmentIds,
            typeIds: typeIds,
            Doctors: Doctors,
            facilities: facilities,
            // departmentIds: safeParse(departmentIds),
            // typeIds: safeParse(typeIds),
            // Doctors: safeParse(Doctors),
            // facilities: safeParse(facilities),
        });
        newHospital.location = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };
        await newHospital.save()
        return res.apiResponse(true, "Hospital added Success", newHospital, 200);
    } catch (error) {
        return res.apiResponse(false, 'Hospital Add error', { error }, 500);
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
//         if (req.userDetails && req.userDetails.momType) {
//             match['momType'] = req.userDetails.momType;
//         }
//         if (requests.status && requests.status !== '') {
//             match['status'] = requests.status;
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
//             const searchTerm = requests.searchKey.trim();
//             match['$or'] = [
//                 { name: { $regex: searchTerm, $options: 'i' } },
//                 { email: { $regex: searchTerm, $options: 'i' } }
//             ];
//         }
//         const options = {
//             page: page,
//             limit: per_page,
//             skip: skip,
//             sort: { [sortField]: sortOrder },
//         };
//         if (pagination === "true") {
//             // options.sort = { createdAt: 1 };
//             Hospital.paginate(match, options, async function (err, data) {
//                 if (err) {
//                     return res.apiResponse(false, "Error while fetching lists", {}, 404);
//                 }
//                 data.docs = await Promise.all(
//                     data.docs.map(async (item) => {
//                         const raw = item.toObject();
//                         const parsed = bulkSafeParse(raw, ['departmentIds', 'facilities', 'typeIds', 'Doctors']);
//                         const departments = await getDepartments(parsed.departmentIds);
//                         const Doctors = await Promise.all(
//                             parsed.Doctors.map(async (doc) => ({
//                                 ...doc,
//                                 department: await getDepartments(safeParse(doc.departmentIds))
//                             }))
//                         );
//                         return {
//                             ...raw,
//                             ...parsed,
//                             Doctors,
//                             departments
//                         };
//                     })
//                 );
//                 return res.apiResponse(true, "Success", data, 200);
//             });
//         } else {
//             const query = Object.keys(match).length === 0
//                 ? Hospital.find({})
//                 : Hospital.find(match);
//             const hospitalDocs = await query.sort({ createdAt: 1 });
//             const Hospitals = await Promise.all(
//                 hospitalDocs.map(async (item) => {
//                     const raw = item.toObject();
//                     const parsed = bulkSafeParse(raw, ['departmentIds', 'facilities', 'typeIds', 'Doctors']);
//                     const departments = await getDepartments(parsed.departmentIds);
//                     const Doctors = await Promise.all(
//                         parsed.Doctors.map(async (doc) => ({
//                             ...doc,
//                             department: await getDepartments(safeParse(doc.departmentIds))
//                         }))
//                     );
//                     return {
//                         ...raw,
//                         ...parsed,
//                         Doctors,
//                         departments
//                     };
//                 })
//             );
//             return res.apiResponse(true, "Success", { docs: Hospitals }, 200);
//         }
//     } catch (error) {
//         return res.apiResponse(false, 'Get list error', {}, 500);
//     }
// }

exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 10, pagination = "true", sortField = 'createdAt', sortOrder = 'desc',
            id, status, fromDate, toDate, searchKey, typeId, departmentId, latitude, longitude } = req.bodyParams;
        const match = {};
        if (id) match.id = id;
        if (req.userDetails?.momType) match.momType = req.userDetails.momType;
        if (typeId) match.typeIds = { $in: [typeId] };
        if (departmentId) match.departmentIds = { $in: [departmentId] };
        if (latitude) match.latitude = latitude;
        if (longitude) match.longitude = longitude;
        if (status) match.status = status;
        if (fromDate && toDate) {
            const start = moment(fromDate);
            const end = moment(toDate);
            if (start.isValid() && end.isValid()) {
                match.createdAt = {
                    $gte: start.startOf('day').toDate(),
                    $lte: end.endOf('day').toDate()
                };
            }
        }
        if (searchKey?.trim()) {
            const regex = { $regex: searchKey.trim(), $options: 'i' };
            match.$or = [{ name: regex }, { email: regex }];
        }

        if (pagination === "true") {
            const options = {
                page,
                limit,
                skip: (page - 1) * limit,
                sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 }
            };

            Hospital.paginate(match, options, async (err, data) => {
                if (err) return res.apiResponse(false, "Error while fetching lists", {}, 404);
                data.docs = await Promise.all(data.docs.map(await enrichHospital));
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            const hospitalDocs = await Hospital.find(match).sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 });
            const Hospitals = await Promise.all(hospitalDocs.map(enrichHospital));
            return res.apiResponse(true, "Success", { docs: Hospitals }, 200);
        }
    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
};

exports.view = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const hospital = await Hospital.findOne({ id: requests.id })
        if (!hospital) {
            return res.apiResponse(false, 'Hospital not found', {}, 404);
        }
        const HospitalParseAndDeparetment = await enrichHospital(hospital);
        return res.apiResponse(true, 'Success', HospitalParseAndDeparetment, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Hospital error', {}, 500)
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
            if (req.body.name) updateFields.name = req.body.name;
            if (req.body.email) updateFields.email = req.body.email;
            if (req.body.address) updateFields.address = req.body.address;
            if (req.body.mobile) updateFields.mobile = req.body.mobile;
            if (req.body.latitude) updateFields.latitude = req.body.latitude;
            if (req.body.longitude) updateFields.longitude = req.body.longitude;
            if (req.body.status) updateFields.status = req.body.status;
            if (req.body.departmentIds) updateFields.departmentIds = req.body.departmentIds;
            if (req.body.typeIds) updateFields.typeIds = req.body.typeIds;
            if (req.body.Doctors) updateFields.Doctors = req.body.Doctors;
            if (req.body.facilities) updateFields.facilities = req.body.facilities;
            // if (req.body.departmentIds) updateFields.departmentIds = safeParse(req.body.departmentIds);
            // if (req.body.typeIds) updateFields.typeIds = safeParse(req.body.typeIds);
            // if (req.body.Doctors) updateFields.Doctors = safeParse(req.body.Doctors);
            // if (req.body.facilities) updateFields.facilities = safeParse(req.body.facilities);
            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    const { secure_url, public_id } = await uploadToCloudinary(req.file, 'hospitals');
                    updateFields.file = secure_url;
                    updateFields.public_id = public_id;
                }
            }
            const updatedHospital = await Hospital.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedHospital) {
                return res.apiResponse(false, 'Hospital not found', {}, 404);
            }
            return res.apiResponse(true, 'Hospital updated successfully', updatedHospital, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Hospital', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const hospital = await Hospital.findOne({ id: requests.id });
        if (!hospital) {
            return res.apiResponse(false, 'Hospital not found', {}, 404)
        }
        const result = await Hospital.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Hospital not found', {}, 404)
        }
        await deleteFromCloudinary(hospital.public_id)
        return res.apiResponse(true, 'Hospital deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Hospital error', { error }, 500)
    }
}

exports.hospitalDownloadExcel = async (req, res) => {
    try {
        const requests = req.bodyParams;
        console.log('requests', requests)
        const query = {
            ...(requests.status && { status: requests.status }),
        };
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            const regex = { $regex: searchTerm, $options: 'i' };

            query['$or'] = [
                { name: regex },
                { email: regex },
            ];
        }
        if (requests.fromDate && requests.toDate) {
            const startDate = moment(requests.fromDate);
            const endDate = moment(requests.toDate);

            if (startDate.isValid() && endDate.isValid()) {
                query.createdAt = {
                    $gte: startDate.startOf('day').toDate(),
                    $lte: endDate.endOf('day').toDate(),
                };
            }
        }

        await exportToExcel({
            model: Hospital,
            headers: [
                'SNo',
                'Name',
                'Email',
                'Address',
                'Mobile',
                'Latitude',
                'Longitude',
                'Status',
                'Created At'
            ],
            fields: [
                'name',
                'email',
                'address',
                'mobile',
                'latitude',
                'longitude',
                'status',
                'createdAt'
            ],
            query,
            fileName: 'hospital.xlsx',
            res //  send stream to browser
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Error exporting Excel' });
    }
};

// exports.getNearbyHospitals = async (req, res, next) => {
//     try {
//         const { latitude, longitude, typeId } = req.bodyParams;

//         if (!latitude || !longitude) {
//             return res.apiResponse(false, "Latitude and Longitude are required", {}, 400);
//         }

//         const maxDistanceKm = 30;
//         const maxDistanceMeters = maxDistanceKm * 1000;

//         const hospitals = await Hospital.find({
//             location: {
//                 $near: {
//                     $geometry: {
//                         type: "Point",
//                         coordinates: [parseFloat(longitude), parseFloat(latitude)]
//                     },
//                     $maxDistance: maxDistanceMeters
//                 }
//             },
//             status: 'Active'
//         });

//         // Add distance to each hospital
//         const lat1 = parseFloat(latitude);
//         const lon1 = parseFloat(longitude);

//         const hospitalsWithDistance = hospitals.map(h => {
//             const lat2 = parseFloat(h.latitude);
//             const lon2 = parseFloat(h.longitude);
//             const distance = calculateDistanceKm(lat1, lon1, lat2, lon2);
//             return {
//                 ...h.toObject(),
//                 distance: distance.toFixed(2) // km
//             };
//         });

//         const HospitalsFinal = await Promise.all(hospitalsWithDistance.map(getDepartmentWithHospital));
//         return res.apiResponse(true, "Nearby hospitals fetched successfully", HospitalsFinal, 200);
//     } catch (error) {
//         console.error(error);
//         return res.apiResponse(false, "Error fetching nearby hospitals", { error: error.message }, 500);
//     }
// };

exports.getNearbyHospitals = async (req, res, next) => {
    try {
        const { latitude, longitude, typeId } = req.bodyParams;

        if (!latitude || !longitude) {
            return res.apiResponse(false, "Latitude and Longitude are required", {}, 400);
        }

        const maxDistanceKm = 10;
        const maxDistanceMeters = maxDistanceKm * 1000;

        const match = {
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: maxDistanceMeters
                }
            },
            status: 'Active'
        };

        if (typeId) {
            match.typeIds = typeId; // MongoDB matches if array contains this value
        }

        const hospitals = await Hospital.find(match);

        const lat1 = parseFloat(latitude);
        const lon1 = parseFloat(longitude);

        const hospitalsWithDistance = hospitals.map(h => {
            const lat2 = parseFloat(h.latitude);
            const lon2 = parseFloat(h.longitude);
            const distance = calculateDistanceKm(lat1, lon1, lat2, lon2);
            return {
                ...h.toObject(),
                distance: distance.toFixed(2) // km
            };
        });

        const HospitalsFinal = await Promise.all(hospitalsWithDistance.map(getDepartmentWithHospital));
        console.log('HospitalsFinal', HospitalsFinal)
        return res.apiResponse(true, "Nearby hospitals fetched successfully", HospitalsFinal, 200);
    } catch (error) {
        console.error(error);
        return res.apiResponse(false, "Error fetching nearby hospitals", { error: error.message }, 500);
    }
};

const getDepartmentWithHospital = async (item) => {
    const hospital = item;
    // const hospital = item.toObject();
    // const parsed = bulkSafeParse(raw, ['departmentIds', 'facilities', 'typeIds', 'Doctors']);
    const departments = await getDepartments(hospital.departmentIds);
    const Doctors = await Promise.all(
        hospital.Doctors.map(async (doc) => ({
            ...doc,
            department: await getDepartments(doc.departmentIds)
        }))
    );
    return { ...hospital, Doctors, departments };
};

const enrichHospital = async (item) => {
    const hospital = item.toObject();
    // const parsed = bulkSafeParse(raw, ['departmentIds', 'facilities', 'typeIds', 'Doctors']);
    const departments = await getDepartments(hospital.departmentIds);
    const Doctors = await Promise.all(
        hospital.Doctors.map(async (doc) => ({
            ...doc,
            department: await getDepartments(doc.departmentIds)
        }))
    );
    return { ...hospital, Doctors, departments };
};

// const enrichHospital = async (item) => {
//     // console.log('item', item, typeof item)
//     const raw = item.toObject();
//     // console.log('raw', raw)
//     const parsed = bulkSafeParse(raw, ['departmentIds', 'facilities', 'typeIds', 'Doctors']);
//     const departments = await getDepartments(parsed.departmentIds);
//     const Doctors = await Promise.all(
//         parsed.Doctors.map(async (doc) => ({
//             ...doc,
//             department: await getDepartments(safeParse(doc.departmentIds))
//         }))
//     );
//     return { ...raw, ...parsed, Doctors, departments };
// };

function safeParse(value) {
    try {
        if (typeof value === 'string') {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [parsed];
        } else if (Array.isArray(value)) {
            // Convert stringified numbers to actual numbers if possible
            return value.map((v) => {
                if (typeof v === 'string' && !isNaN(v)) {
                    return Number(v);
                }
                return v;
            });
        } else {
            return [value];
        }
    } catch {
        return [];
    }
}

const bulkSafeParse = (obj, keys = []) => {
    const result = { ...obj };
    keys.forEach(key => {
        const val = obj[key];
        result[key] = Array.isArray(val) ? safeParse(val[0]) : safeParse(val);
    });
    return result;
};

const getDepartments = async (departmentIds = []) => {
    if (!Array.isArray(departmentIds) || departmentIds.length === 0) return [];
    const matched = await HospitalDepartment.find({ id: { $in: departmentIds } }, 'id title file');
    return matched;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
