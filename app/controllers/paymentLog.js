const PaymentLogs = require('../models/paymentLogs')
const ApplePaymentHistory = require('../models/applePaymentHistory')
const moment = require('moment')


exports.list = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const page = parseInt(requests.page, 10) || 1;
        const per_page = parseInt(requests.limit, 10) || 10;
        const pagination = requests.pagination || "true";
        const skip = (page - 1) * per_page;
        const match = {};
        const sortField = requests.sortField || 'createdAt';
        const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;
        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        if (requests.userId && requests.userId !== '') {
            match['userId'] = requests.userId;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        // if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
        //     const searchTerm = requests.searchKey.trim();
        //     match['planName'] = { $regex: searchTerm, $options: 'i' };
        // }
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
            populate: [
                {
                    path: 'user',
                    select: 'userName'
                }
            ]
        };
        if (pagination === "true") {
            options.sort = { createdAt: -1 };
            PaymentLogs.paginate(match, options, async function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                const planAmounts = await calculatePlanAmounts(requests.fromDate, requests.toDate);
                return res.apiResponse(true, "Success", { data, planAmounts }, 200);
            });
        } else {
            let logs = [];
            const query = Object.keys(match).length === 0
                ? PaymentLogs.find({})
                : PaymentLogs.find(match);
            logs = await query.sort({ createdAt: -1 })
                .populate({ path: 'user', select: 'userName profile' });
            const planAmounts = await calculatePlanAmounts(requests.fromDate, requests.toDate);
            return res.apiResponse(true, "Success", { docs: logs, planAmounts }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

async function calculatePlanAmounts(fromDate = '', toDate = '') {
    const query = {};

    // Parse and validate fromDate
    const from = fromDate ? moment(fromDate, [moment.ISO_8601, 'YYYY-MM-DD', 'DD-MM-YYYY'], true) : null;
    const to = toDate ? moment(toDate, [moment.ISO_8601, 'YYYY-MM-DD', 'DD-MM-YYYY'], true) : null;

    if (from && from.isValid() && to && to.isValid()) {
        query.createdAt = {
            $gte: from.startOf('day').toDate(),
            $lte: to.endOf('day').toDate(),
        };
    } else if (from && from.isValid() && !toDate) {
        query.createdAt = {
            $gte: from.startOf('day').toDate(),
            $lte: from.endOf('day').toDate(),
        };
    }
    query.logStatus = "signature_verification_success";

    const userPlans = await PaymentLogs.find(query);
    console.log('userPlans', userPlans)
    let totalPlanAmount = 0;

    for (const doc of userPlans) {
        const amount = parseFloat(doc?.amount || '0');
        // console.log('amount', amount)
        totalPlanAmount += amount;
        // console.log('totalPlanAmount', totalPlanAmount)
    }
    // console.log('totalPlanAmount-1', totalPlanAmount)
    return {
        totalPlanAmount,
    };
}

exports.iosList = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const page = parseInt(requests.page, 10) || 1;
        const per_page = parseInt(requests.limit, 10) || 10;
        const pagination = requests.pagination || "true";
        const skip = (page - 1) * per_page;
        const match = {};
        const sortField = requests.sortField || 'createdAt';
        const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;
        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        if (requests.userId && requests.userId !== '') {
            match['userId'] = requests.userId;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        // if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
        //     const searchTerm = requests.searchKey.trim();
        //     match['planName'] = { $regex: searchTerm, $options: 'i' };
        // }
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
            populate: [
                {
                    path: 'user',
                    select: 'userName'
                }
            ]
        };
        if (pagination === "true") {
            options.sort = { createdAt: -1 };
            ApplePaymentHistory.paginate(match, options, async function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                const planAmounts = await calculateIosPlanAmounts(requests.fromDate, requests.toDate);
                return res.apiResponse(true, "Success", { data, planAmounts }, 200);
            });
        } else {
            let logs = [];
            const query = Object.keys(match).length === 0
                ? ApplePaymentHistory.find({})
                : ApplePaymentHistory.find(match);
            logs = await query.sort({ createdAt: -1 })
                .populate({ path: 'user', select: 'userName profile' });
            const planAmounts = await calculateIosPlanAmounts(requests.fromDate, requests.toDate);
            return res.apiResponse(true, "Success", { docs: logs, planAmounts }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

async function calculateIosPlanAmounts(fromDate = '', toDate = '') {
    const query = {};

    // Parse and validate fromDate
    const from = fromDate ? moment(fromDate, [moment.ISO_8601, 'YYYY-MM-DD', 'DD-MM-YYYY'], true) : null;
    const to = toDate ? moment(toDate, [moment.ISO_8601, 'YYYY-MM-DD', 'DD-MM-YYYY'], true) : null;

    if (from && from.isValid() && to && to.isValid()) {
        query.createdAt = {
            $gte: from.startOf('day').toDate(),
            $lte: to.endOf('day').toDate(),
        };
    } else if (from && from.isValid() && !toDate) {
        query.createdAt = {
            $gte: from.startOf('day').toDate(),
            $lte: from.endOf('day').toDate(),
        };
    }
    query.paymentStatus = "Success";

    const userPlans = await ApplePaymentHistory.find(query);
    // console.log('userPlans', userPlans)
    let totalPlanAmount = 0;

    for (const doc of userPlans) {
        const amount = parseFloat(doc?.amount || '0');
        // console.log('amount', amount)
        totalPlanAmount += amount;
        // console.log('totalPlanAmount', totalPlanAmount)
    }
    // console.log('totalPlanAmount-1', totalPlanAmount)
    return {
        totalPlanAmount,
    };
}
