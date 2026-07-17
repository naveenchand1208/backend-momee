const HospitalDepartment = require('../models/hospitalDepartment')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { title, subTitle } = req.body;
        if (!title || !subTitle || !req.file) {
            return res.apiResponse(false, 'Depatment params is missing', {}, 400);
        }
        const checkTitle = await HospitalDepartment.findOne({ title: title })
        if (checkTitle) {
            return res.apiResponse(false, 'Name already exists', {}, 400);
        }
        const { secure_url, public_id } = await uploadToCloudinary(req.file, 'hospitalDepartments');
        const now = moment().format('DDMMYYYYHHmmss');
        const uniqueId = `HospitalDepartment-${now}`;
        const newDept = new HospitalDepartment({
            title,
            subTitle,
            file: secure_url,
            public_id: public_id,
            id: uniqueId
        });
        await newDept.save()
        return res.apiResponse(true, "Depatment added Success", newDept, 200);
    } catch (error) {
        return res.apiResponse(false, 'Depatment Add error', { error }, 500);
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
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match['$or'] = [
                { title: { $regex: searchTerm, $options: 'i' } },
                { subTitle: { $regex: searchTerm, $options: 'i' } }
            ];
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
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            options.sort = { createdAt: -1 };
            HospitalDepartment.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let departments = [];
            const query = Object.keys(match).length === 0
                ? HospitalDepartment.find({})
                : HospitalDepartment.find(match);

            departments = await query
                .sort({ createdAt: -1 });
            return res.apiResponse(true, "Success", { docs: departments }, 200);
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
        const department = await HospitalDepartment.findOne({ id: requests.id })
        if (!department) {
            return res.apiResponse(false, 'Department not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', department, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Department error', {}, 500)
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
            if (req.body.title) updateFields.title = req.body.title;
            if (req.body.subTitle) updateFields.subTitle = req.body.subTitle;
            if (req.body.status) updateFields.status = req.body.status;
            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    const { secure_url, public_id } = await uploadToCloudinary(req.file, 'hospitalDepartments');
                    updateFields.file = secure_url;
                    updateFields.public_id = public_id;
                }
            }
            const updatedDept = await HospitalDepartment.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedDept) {
                return res.apiResponse(false, 'Department not found', {}, 404);
            }
            return res.apiResponse(true, 'Department updated successfully', updatedDept, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Department', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const department = await HospitalDepartment.findOne({ id: requests.id });
        if (!department) {
            return res.apiResponse(false, 'Department not found', {}, 404)
        }
        const result = await HospitalDepartment.deleteOne({ id: requests.id });

        if (result && department.public_id) {
            await deleteFromCloudinary(department.public_id);
        }

        return res.apiResponse(true, 'Department deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Department error', { error }, 500)
    }
}