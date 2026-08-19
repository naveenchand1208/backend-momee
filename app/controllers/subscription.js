const Plan = require('../models/subscription')
const Auth = require('../models/auth')
const UserPlan = require('../models/userSubscription')
const PaymentLogs = require('../models/paymentLogs')
const moment = require('moment')
const { exportToExcel } = require('../helpers/excel')
const Razorpay = require("razorpay")
const crypto = require("crypto")
const cron = require('node-cron');
const { handlePaymentFailed } = require('../services/paymentService')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});

async function getPaymentMethod(userId) {
    if (!userId) return null;

    const user = await Auth.findOne({ id: userId }).select('paymentMethod');
    return user?.paymentMethod || null;
}
exports.add = async (req, res, next) => {
    try {
        const { planName, planAmount, color, durationMonths, features } = req.bodyParams;
        if (!planName || !planAmount || !color || !durationMonths ||
            features.length === 0) {
            return res.apiResponse(false, 'Plan details are missing', {}, 400);
        }
        const checkTitle = await Plan.findOne({ planName })
        if (checkTitle) {
            return res.apiResponse(false, 'Plan Name already exists', {}, 400);
        }
        const uniqueId = `plan-${moment().format('DDMMYYYYHHmmss')}`;
        const newPlan = new Plan({
            planName,
            planAmount,
            color,
            durationMonths,
            features,
            id: uniqueId,
        })
        await newPlan.save();
        // const plansToSave = momTypes.length === 2
        //     ? [
        //         new Plan({
        //             ...req.bodyParams,
        //             id: `${uniqueId}-1`,
        //             momTypes: momTypes.filter(item => item !== 'newMom'),
        //             momType: 'pregMom'
        //         }),
        //         new Plan({
        //             ...req.bodyParams,
        //             id: `${uniqueId}-2`,
        //             momTypes: momTypes.filter(item => item !== 'pregMom'),
        //             momType: 'newMom'
        //         })
        //     ]
        //     : [
        //         new Plan({
        //             ...req.bodyParams,
        //             id: uniqueId,
        //             momType: momTypes[0],
        //         })
        //     ];
        // await Promise.all(plansToSave.map(plan => plan.save()));
        return res.apiResponse(true, "Plans added successfully", newPlan, 200);
    } catch (error) {
        console.error(error);
        return res.apiResponse(false, 'Add subscription error', {}, 500);
    }

}

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
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match['planName'] = { $regex: searchTerm, $options: 'i' };
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
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            // options.sort = { createdAt: -1 };
            Plan.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let plans = [];
            const query = Object.keys(match).length === 0
                ? Plan.find({})
                : Plan.find(match);
            plans = await query.sort({ createdAt: -1 });
            return res.apiResponse(true, "Success", { docs: plans }, 200);
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
        const plan = await Plan.findOne({ id: requests.id })
        if (!plan) {
            return res.apiResponse(false, 'plan not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', plan, 200);
    } catch (error) {
        return res.apiResponse(false, 'get plan error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        console.log('requests', requests)
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        console.log('coming')
        const checkTitle = await Plan.findOne({ planName: requests.planName })
        if (checkTitle && checkTitle.id !== requests.id) {
            return res.apiResponse(false, 'Plan Name already exists', {}, 400);
        }
        console.log('coming-1')
        const updateFields = { ...requests };
        console.log('Update Fields:', updateFields);

        const plan = await Plan.findOneAndUpdate(
            { id: requests.id },
            updateFields,
            { new: true }
        );
        if (!plan) {
            return res.apiResponse(false, 'Plan not found', {}, 404);
        }
        return res.apiResponse(true, 'Plan updated successfully', plan, 200);

    } catch (error) {
        return res.apiResponse(false, 'Error updating  Plan', {}, 500);
    }
};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await Plan.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Plan not found', {}, 404)
        }
        return res.apiResponse(true, 'Plan deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'delete plan error', {}, 500)
    }
}

exports.userSubscription = async (req, res, next) => {
    try {
        // const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, subscriptionId } =
        //     req.bodyParams;
        const requests = req.bodyParams;
        console.log('requests', requests)
        const orderId = (requests.razorpay_order_id || '').trim();
        const paymentId = (requests.razorpay_payment_id || '').trim();
        const signature = (requests.razorpay_signature || '').trim();
        const userId = requests?.userId || req?.userDetails?.id;
        const sign = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(orderId + "|" + paymentId)
            .digest("hex");
        console.log('sign', sign)
        console.log('razorpay_signature', signature)
        const method = await getPaymentMethod(userId)
        console.log('method', method)
        if (sign === signature) {
            const response = await razorpay.payments.fetch(requests.razorpay_payment_id);
            const obj = {
                // userId: requests.userId,
                userId: userId,
                orderId: orderId,
                method,
                amount: Number(response?.amount) / 100 || 0,
                paymentId: paymentId || "",
                subscriptionId: requests?.subscriptionId || "",
                paymentStatus: response?.status || "Signature Verfied",
                logStatus: "signature_verification_success",
            }
            await addPaymentLog(obj)

            if (!userId) {
                return res.apiResponse(false, 'UserId is missing', {}, 400);
            }
            if (!requests.subscriptionId) {
                return res.apiResponse(false, 'Subscription Id is missing', {}, 400);
            }

            const user = await Auth.findOne({ id: userId })
            if (!user) {
                return res.apiResponse(false, 'User Not Found', {}, 400);
            }

            const subscribedPlan = await Plan.findOne({ id: requests.subscriptionId });
            if (!subscribedPlan) {
                return res.apiResponse(false, 'Plan not found', {}, 404);
            }

            const now = moment();
            let allowNewPlanWithDates = true;

            // Get all plans for the user
            const userPlans = await UserPlan.find({ userId: userId }).sort({ createdAt: 1 });

            // Step 1: Check for current active plan
            const activePlan = userPlans.find(plan => plan.activePlan === true);

            if (activePlan && activePlan.validityEndDate) {
                const endDate = moment(activePlan.validityEndDate, 'DD-MM-YYYY');

                if (endDate.isAfter(now)) {
                    // Active plan is still valid → no need to disturb it
                    allowNewPlanWithDates = false;
                } else {
                    // Expired → mark inactive
                    if (!activePlan.expired) {
                        await UserPlan.updateOne(
                            { id: activePlan.id },
                            { activePlan: false, expired: true }
                        );
                    }

                    // Step 2: Check for other valid (non-expired) plans
                    const validOtherPlans = userPlans.filter(
                        p => !p.expired && p.id !== activePlan.id
                    );

                    if (validOtherPlans.length === 1) {
                        const singlePlan = validOtherPlans[0];

                        if (!singlePlan.validityStartDate || !singlePlan.validityEndDate) {
                            const monthsToAdd = parseInt(subscribedPlan.durationMonths || 0, 10);

                            await UserPlan.updateOne(
                                { id: singlePlan.id },
                                {
                                    activePlan: true,
                                    expired: false,
                                    validityStartDate: now.format('DD-MM-YYYY'),
                                    validityEndDate: now.clone().add(monthsToAdd, 'months').format('DD-MM-YYYY')
                                }
                            );

                            allowNewPlanWithDates = false;
                        }
                    }
                    else if (validOtherPlans.length > 1) {
                        // Step 3: Activate the oldest valid plan
                        const oldest = validOtherPlans.sort(
                            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                        )[0];

                        const updateFields = {
                            activePlan: true,
                            expired: false,
                        };

                        if (!oldest.validityStartDate || !oldest.validityEndDate) {
                            const monthsToAdd = parseInt(subscribedPlan.durationMonths || 0, 10);
                            updateFields.validityStartDate = now.format('DD-MM-YYYY');
                            updateFields.validityEndDate = now.clone().add(monthsToAdd, 'months').format('DD-MM-YYYY');
                        }

                        await UserPlan.updateOne({ id: oldest.id }, updateFields);
                        allowNewPlanWithDates = false;
                    }
                }
            }
            // Step 4: Add new plan
            requests.id = `UserPlan-${moment().format('DDMMYYYYHHmmss')}`;
            requests.planName = subscribedPlan.planName;
            requests.userId = userId;
            requests.planAmount = subscribedPlan.planAmount;

            if (allowNewPlanWithDates) {
                const months = parseInt(subscribedPlan.durationMonths || 0, 10);
                requests.validityStartDate = now.format('DD-MM-YYYY');
                requests.validityEndDate = now.clone().add(months, 'months').format('DD-MM-YYYY');
                requests.activePlan = true;
                requests.expired = false;
            } else {
                requests.validityStartDate = "";
                requests.validityEndDate = "";
                requests.activePlan = false;
                requests.expired = false;
            }
            requests.paymentId = paymentId;
            const newUserPlan = new UserPlan(requests);
            await newUserPlan.save();

            // Step 5: Update user subscription flag
            await Auth.findOneAndUpdate(
                { id: userId },
                { subscribed: true, method: "" },
                { new: true }
            );
            // const io = req.app.get('socketio');
            // const emitData = {
            //     paymentStatus: "failed"
            // };
            // io.emit('payment status', emitData);
            return res.apiResponse(true, 'Payment verified and Plan subscribed successfully', newUserPlan, 200);
        } else {
            const response = await razorpay.payments.fetch(requests.razorpay_payment_id);
            const obj = {
                userId: userId,
                orderId: orderId,
                method,
                amount: Number(response?.amount) / 100 || 0,
                paymentId: paymentId || "",
                subscriptionId: requests?.subscriptionId || "",
                paymentStatus: response?.status || "Invalid signature",
                logStatus: "signature_verification_failed",
            }
            await addPaymentLog(obj)
            await Auth.findOneAndUpdate(
                { id: userId },
                { method: "" },
                { new: true }
            );

            // console.log('razorPay-res-invalid-sigh:', response)
            return res.apiResponse(false, "Invalid signature", {}, 400);
        }
    } catch (error) {
        console.error('Subscription Error:', error);
        return res.apiResponse(false, 'Plan Subscription error', { error }, 500);
    }
};

exports.userPlanScript = async (req, res) => {
    try {
        const db = Plan.collection;

        const result = await db.updateMany(
            {},
            {
                $unset: {
                    momType: "",
                    momTypes: ""
                }
            }
        );

        console.log("Matched:", result.matchedCount);
        console.log("Modified:", result.modifiedCount);
        await UserPlan.deleteMany({})
        return res.apiResponse(true, "Removed fields successfully", result, 200);
    } catch (error) {
        console.error("Error updating UserPlans:", error);
        return res.apiResponse(false, "Failed to update UserPlans", {}, 500);
    }
};

exports.userPlanlist = async (req, res, next) => {
    console.log('bocdd')
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
        // if (req.userDetails && req.userDetails.momType) {
        //     match['momType'] = req.userDetails.momType;
        // }
        // if (requests.momType && requests.momType !== '') {
        //     match['momType'] = requests.momType;
        // }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match['planName'] = { $regex: searchTerm, $options: 'i' };
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
            populate: [
                {
                    path: 'user',
                    select: 'userName id'
                },
                {
                    path: 'subscribedPlan',
                    select: 'planName planAmount id'
                }
            ],
        };
        if (pagination === "true") {
            UserPlan.paginate(match, options, async function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                const planAmounts = await calculatePlanAmounts(requests.fromDate, requests.toDate);
                return res.apiResponse(true, "Success", { data, planAmounts }, 200);
            });
        } else {
            let plans = [];
            if (Object.keys(match).length === 0) {
                plans = await UserPlan.find({});
            } else {
                plans = await UserPlan.find(match);
            }

            await UserPlan.populate(plans, [
                {
                    path: 'user',
                    select: 'userName id'
                },
                {
                    path: 'subscribedPlan',
                    select: 'planName planAmount id'
                }
            ]);
            const planAmounts = await calculatePlanAmounts(requests.fromDate, requests.toDate);
            return res.apiResponse(true, "Success", { docs: { plans, planAmounts } }, 200);
        }

    } catch (error) {
        console.log('erttt',error)
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

    const userPlans = await UserPlan.find(query);
    console.log('userPlans', userPlans)
    let totalPlanAmount = 0;

    for (const doc of userPlans) {
        const amount = parseFloat(doc?.planAmount || '0');
        totalPlanAmount += amount;
    }

    return {
        totalPlanAmount,
    };
}

exports.subscriptionDownloadExcel = async (req, res) => {
    try {
        const requests = req.bodyParams;
        console.log('requests', requests)
        // const isPregMom = requests.momType === 'pregMom';
        const query = {
            // momType: requests.momType || '',
            ...(requests.status && { status: requests.status }),
            // ...(requests.momType && { momType: requests.momType }),
        };

        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            query.planName = { $regex: searchTerm, $options: 'i' };
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
            model: Plan,
            headers: [
                'SNo',
                'Plan Name',
                'Plan Amount',
                'Color',
                'Duration Months',
                // 'Mom Type',
                'Status',
                'Created At'
            ],
            fields: [
                'planName',
                'planAmount',
                'color',
                'durationMonths',
                // 'momType',
                'status',
                'createdAt'
            ],
            query,
            fileName: 'subscription.xlsx',
            res //  send stream to browser
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Error exporting Excel' });
    }
};

exports.createOrder = async (req, res, next) => {
    const { amount, subscriptionId } = req.bodyParams;
    if (!amount || !subscriptionId) {
        return res.apiResponse(false, "Amount Or subscription Id is Missing", {}, 400);
    }

    const options = {
        amount: amount * 100,
        currency: "INR",
        receipt: "user_subscription",
        notes: {
            userId: req.userDetails.id,
        }
    };

    try {
        const order = await razorpay.orders.create(options);
        console.log('Razorpay Order:', order);
        const obj = {
            userId: req.userDetails.id,
            subscriptionId,
            amount,
            method: "pending",
            orderId: order.id,
            paymentId: "",
            paymentStatus: "created",
            logStatus: "order_created"
        };

        await addPaymentLog(obj);

        // SEND RESPONSE AT LAST
        return res.apiResponse(true, "Success", order, 200);

    } catch (err) {
        return res.apiResponse(false, err.message, {}, 500);
    }
}

exports.cancelCheckoutOrder = async (req, res, next) => {
    try {
        const { amount, paymentId, paymentStatus, orderId, subscriptionId } = req.bodyParams;
        if (!amount || !orderId || !subscriptionId) {
            return res.apiResponse(false, "Params is Missing", {}, 400);
        }
        const method = await getPaymentMethod(req.userDetails.id)
        const obj = {
            userId: req.userDetails.id,
            subscriptionId,
            method,
            amount: Number(amount) / 100 || 0,
            orderId: orderId || "",
            paymentId: paymentId || "",
            paymentStatus: paymentStatus || "Cancelled",
            logStatus: "user_cancelled_payment"
        }
        await addPaymentLog(obj)
        await Auth.findOneAndUpdate(
            { id: req.userDetails.id },
            { method: "" },
            { new: true }
        );
        return res.apiResponse(true, "Success", {}, 200);
    } catch (error) {

    }
}

//future
// exports.paymentFailed = async (req, res) => {
//     try {
//         console.log('coming-failed-api')
//         let { amount, paymentId, paymentStatus, orderId, method, module, subscriptionId } = req.bodyParams;

//         if (!amount || !paymentId || !orderId) {
//             return res.apiResponse(false, "Params Missing", {}, 400);
//         }
//         method = await getPaymentMethod(req.userDetails.id) || method
//         await handlePaymentFailed({
//             userId: req.userDetails.id,
//             amount,
//             paymentId,
//             paymentStatus,
//             orderId,
//             method,
//             module,
//             subscriptionId
//         });

//         // const log = new PaymentLogs({
//         //     userId: req.userDetails.id,
//         //     method,
//         //     amount: Number(amount) / 100 || 0,
//         //     module: module || "userSubscription",
//         //     orderId,
//         //     paymentId,
//         //     subscriptionId,
//         //     paymentStatus: paymentStatus || "failed",
//         //     logStatus: "payment_failed",
//         // });

//         // await log.save();


//         console.log('coming-after')
//         const io = req.app.get('socketio');
//         const emitData = {
//             paymentStatus: "failed"
//         };
//         io.emit('payment status', emitData);
//         console.log('coming-after-1')

//         return res.apiResponse(true, "Success", {}, 200);
//     } catch (error) {
//         console.log(error);
//         return res.apiResponse(false, "Server error", {}, 500);
//     }
// };

exports.paymentFailed = async (req, res, next) => {
    try {
        const { amount, paymentId, paymentStatus, orderId, subscriptionId } = req.bodyParams;
        if (!amount || !paymentId || !orderId || !subscriptionId) {
            return res.apiResponse(false, "Params is Missing", {}, 400);
        }
        const method = await getPaymentMethod(req.userDetails.id)
        const obj = {
            userId: req.userDetails.id,
            method,
            subscriptionId,
            amount: Number(amount) / 100 || 0,
            orderId: orderId || "",
            paymentId: paymentId || "",
            paymentStatus: paymentStatus || "Failed",
            logStatus: "payment_failed"
        }
        await addPaymentLog(obj)
        res.apiResponse(true, "Success", {}, 200);

        await Auth.findOneAndUpdate(
            { id: req.userDetails.id },
            { method: "" },
            { new: true }
        );
        return;
    } catch (error) {

    }
}

async function addPaymentLog(req) {
    // const response = await razorpay.payments.fetch(razorpay_payment_id);
    const newLog = new PaymentLogs({
        userId: req?.userId || "",
        method: req.method || "",
        amount: Number(req.amount) || 0,
        module: "userSubscription",
        orderId: req?.orderId || "",
        paymentId: req?.paymentId || "",
        subscriptionId: req?.subscriptionId || "",
        paymentStatus: req?.paymentStatus || "",
        logStatus: req?.logStatus || "",
    })
    await newLog.save();
}

exports.verify = async (req, res, next) => {
    console.log('req.bodyParams', req.bodyParams)
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, subscriptionId } =
        req.bodyParams;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !subscriptionId) {
        return res.apiResponse(false, "Params is Missing", {}, 400);
    }
    const sign = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");



    const method = await getPaymentMethod(userId)

    if (sign === razorpay_signature) {
        const response = await razorpay.payments.fetch(razorpay_payment_id);
        const obj = {
            userId: userId,
            method,
            subscriptionId,
            orderId: razorpay_order_id,
            amount: Number(response?.amount) / 100 || 0,
            paymentId: razorpay_payment_id || "",
            paymentStatus: response?.status || "Signature Verfied",
            logStatus: "signature_verification_success",
        }
        await addPaymentLog(obj)
        await Auth.findOneAndUpdate(
            { id: userId },
            { method: "" },
            { new: true }
        );
        return res.apiResponse(true, "Payment verified", {}, 200);
        // res.status(200).json({ success: true, message: "Payment verified" });
    } else {
        const response = await razorpay.payments.fetch(razorpay_payment_id);
        const obj = {
            userId: userId,
            method,
            subscriptionId,
            orderId: razorpay_order_id,
            amount: Number(response?.amount) / 100 || 0,
            paymentId: razorpay_payment_id || "",
            paymentStatus: response?.status || "Invalid signature",
            logStatus: "signature_verification_failed",
        }
        await addPaymentLog(obj)
        await Auth.findOneAndUpdate(
            { id: userId },
            { method: "" },
            { new: true }
        );
        return res.apiResponse(true, "Invalid signature", {}, 200);
        // res.status(400).json({ success: false, message: "Invalid signature" });
    }
}

exports.verifyPaymentStatus = async (req, res, next) => {
    try {
        const { razorpay_payment_id } = req.bodyParams;
        const response = await razorpay.payments.fetch(razorpay_payment_id);
        console.log('razorPay-res-invalid-sigh:', response)
        return res.apiResponse(true, "Success", order, 200);
    } catch (error) {
        return res.apiResponse(false, error.message, {}, 500);
    }
}

exports.activatePlan = async (req, res, next) => {
    try {
        const { planId, userId } = req.bodyParams;
        const user = await Auth.findOne({ id: userId })
        if (!user) {
            return res.apiResponse(false, 'User Not Found', {}, 400);
        }
        const userPlans = await UserPlan.find({ userId })
        if (!userPlans || userPlans.length === 0) {
            return res.apiResponse(false, 'No plans found for the user', {}, 404);
        }
        // Step 2: Find the target plan
        const targetPlan = userPlans.find(plan => plan.id === planId);
        if (!targetPlan) {
            return res.apiResponse(false, 'Plan not found in user plans', {}, 404);
        }
        const targetSubscribedPlan = await Plan.findOne({ id: targetPlan.subscriptionId });
        if (!targetSubscribedPlan) {
            return res.apiResponse(false, 'Plan not found in subscribed plans', {}, 404);
        }
        const activePlan = userPlans.find(plan => plan.activePlan === true);
        const now = moment();

        if (activePlan && activePlan.validityEndDate) {
            const now = moment();
            const endDate = moment(activePlan.validityEndDate, 'DD-MM-YYYY').endOf('day');
            console.log('endDate', endDate.format()); // Optional: for debug

            if (endDate.isAfter(now)) {
                if (endDate.isSame(now, 'day')) {
                    return res.apiResponse(false, 'Activated Plan still valid today', {}, 409);
                } else {
                    return res.apiResponse(false, 'Activated Plan still valid in future', {}, 409);
                }
            } else {
                const updateFields = {
                    activePlan: false,
                    expired: true
                };
                await UserPlan.updateOne({ id: activePlan.id }, updateFields);
                const newActivePlan = await activateNewPlan(targetPlan.id, targetSubscribedPlan.durationMonths);
                return res.apiResponse(true, 'Plan Activated successfully', newActivePlan, 200);
            }
        }
        else {
            const newActivePlan = await activateNewPlan(targetPlan.id, targetSubscribedPlan.durationMonths)
            return res.apiResponse(true, 'Plan Activated successfully', newActivePlan, 200);
        }
    } catch (error) {
        return res.apiResponse(false, 'Plan Activated error', { error }, 500);
    }
}

async function activateNewPlan(id, subscribedMonths) {
    if (id && subscribedMonths) {
        console.log('coming')
        const now = moment();
        const updateFields = {};
        const months = parseInt(subscribedMonths || 0, 10);
        updateFields.validityStartDate = now.format('DD-MM-YYYY');
        updateFields.validityEndDate = now.clone().add(months, 'months').format('DD-MM-YYYY');
        updateFields.activePlan = true;
        updateFields.expired = false;
        await UserPlan.updateOne({ id: id }, updateFields);
        const updatedPlan = await UserPlan.findOne({ id: id });
        return updatedPlan;
    }
}

// Function to check & update expired plans
// const checkExpiredPlans = async () => {
//     try {
//         const today = moment().startOf("day").format("DD-MM-YYYY");

//         await UserPlan.updateMany(
//             { validityEndDate: { $lt: today } },
//             { $set: { activePlan: false, expired: true } }
//         );

//         console.log("Expired plans updated:", new Date());
//     } catch (err) {
//         console.error("Cron error:", err);
//     }
// };

const checkExpiredPlans = async () => {
    try {
        const today = moment().startOf("day");
        const plans = await UserPlan.find({ activePlan: true });
        for (let plan of plans) {
            const endDate = moment(plan.validityEndDate, "DD-MM-YYYY").startOf("day");
            if (endDate.isBefore(today)) {
                // await UserPlan.findByIdAndUpdate(plan._id, {
                //     activePlan: false,
                //     expired: true
                // });
                await UserPlan.findOneAndUpdate({ id: plan.id },
                    {
                        $set: {
                            activePlan: false,
                            expired: true
                        }
                    },
                    { new: true }
                );
                console.log(`Plan expired updated: ${plan._id}`);
            }
        }
    } catch (err) {
        console.error("Cron error:", err);
    }
};

// cron.schedule("* * * * * *", checkExpiredPlans);
// cron.schedule("1 0,12 * * *", checkExpiredPlans);
// cron.schedule("50 13 * * *", checkExpiredPlans);
cron.schedule("1 0,12 * * *", checkExpiredPlans);

// RUNS EVERY SECOND
cron.schedule("10 0,12 * * *", async () => {
    try {
        // console.log("User subscription checker running...")
        // Get all users
        const users = await Auth.find({})
        for (let user of users) {
            const userId = user.id.toString();
            if (user && user?.ios) {
                continue; // Skip iOS users
            }

            // Check if user has at least one active plan
            const active = await UserPlan.findOne({
                userId: userId,
                activePlan: true
            });
            if (!active) {
                // No active plan → mark unsubscribed
                // await Auth.findOneAndUpdate({ id: userId },
                //     {
                //         $set: {
                //             subscribed: false
                //         }
                //     },
                //     { new: true }
                // );
                // console.log(`User ${userId} marked as unsubscribed`);
            }
        }
    } catch (err) {
        console.error("Every second cron error:", err);
    }
});


// const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
// const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;
// console.log('RAZORPAY_KEY_ID', RAZORPAY_KEY_ID)
// console.log('RAZORPAY_SECRET', RAZORPAY_SECRET)
// // Base64 encode Razorpay credentials for Basic Auth
// const base64Credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_SECRET}`).toString('base64');

// exports.verifyPayment = async (req, res) => {
//     const { payment_id } = req.bodyParams;

//     if (!payment_id) {
//         return res.status(400).json({ success: false, message: 'Payment ID is required' });
//     }

//     try {
//         const response = await fetch(`https://api.razorpay.com/v1/payments/${payment_id}`, {
//             method: 'GET',
//             headers: {
//                 'Authorization': `Basic ${base64Credentials}`,
//                 'Content-Type': 'application/json'
//             }
//         });
//         console.log('response', response)

//         if (!response.ok) {
//             const errorData = await response.json();
//             return res.status(response.status).json({ success: false, message: 'Payment verification failed', error: errorData });
//         }

//         const data = await response.json();
//         console.log('payment', data)
//         if (data.status === 'captured') {
//             return res.status(200).json({ success: true, message: 'Payment verified', data });
//         } else {
//             return res.status(200).json({ success: false, message: `Payment status: ${data.status}` });
//         }
//     } catch (error) {
//         return res.status(500).json({ success: false, message: 'Server error', error: error.message });
//     }
// };


// exports.userSubscription = async (req, res, next) => {
//     await UserPlan.deleteMany({})
//     res.apiResponse(true, 'Plan Subscribed successfully', {}, 200)
// }

// async function subscriptionExcel(req, res) {
//     try {
//         const query = {
//             momType: req.momType,
//             status: req.status,
//         };

//         if (req.fromDate && req.toDate) {
//             const startDate = moment(req.fromDate);
//             const endDate = moment(req.toDate);

//             if (startDate.isValid() && endDate.isValid()) {
//                 query.createdAt = {
//                     $gte: startDate.startOf('day').toDate(),
//                     $lte: endDate.endOf('day').toDate(),
//                 };
//             }
//         }

//         if (req.searchKey !== undefined && req.searchKey.trim() !== '') {
//             const searchTerm = req.searchKey.trim();
//             query.planName = { $regex: searchTerm, $options: 'i' };
//         }

//         await exportToExcel({
//             model: Auth,
//             headers: [
//                 'SNo',
//                 'Plan Name',
//                 'Plan Amount',
//                 'Color',
//                 'Duration Months',
//                 'Mom Type',
//                 'Status',
//                 'Created At'
//             ],
//             fields: [
//                 'planName',
//                 'planAmount',
//                 'color',
//                 'durationMonths',
//                 'momType',
//                 'status',
//                 'createdAt'
//             ],
//             query,
//             fileName: 'pregMom.xlsx',
//             res,
//         });
//     } catch (error) {
//         console.error('Export error:', error);
//         if (!res.headersSent) {
//             res.status(500).json({ message: 'Error exporting Excel' });
//         }
//     }
// }

// async function calculatePlanAmountsss(fromDate = '', toDate = '') {
//     const userPlans = await UserPlan.find({})
//     const now = moment();
//     const thirtyDaysAgo = moment().subtract(30, 'days');

//     let totalPlanAmount = 0;
//     let totalLast30Days = 0;

//     for (const doc of userPlans) {
//         const amount = parseFloat(doc?.subscribedPlan?.planAmount || '0');
//         totalPlanAmount += amount;

//         const createdAt = moment(doc.createdAt);
//         if (createdAt.isBetween(thirtyDaysAgo, now, null, '[]')) {
//             totalLast30Days += amount;
//         }
//     }

//     return {
//         totalPlanAmount,
//         totalLast30Days
//     };
// }

// exports.userPlanScript = async (req, res) => {
//     try {
//         const plans = await Plan.find({});
//         const bulkOps = plans.map(plan => {
//             return {
//                 updateOne: {
//                     filter: { _id: plan._id },
//                     update: {
//                         $unset: {
//                             momType: "",
//                             momTypes: ""
//                         }
//                     }
//                 }
//             };
//         });
//         if (bulkOps.length > 0) {
//             const result = await Plan.bulkWrite(bulkOps);
//             // console.log("BulkWrite result:", result);
//             console.log("Modified documents:", result.modifiedCount);
//         }
//         const updatedPlans = await Plan.find({}).lean();
//         return res.apiResponse(true, "Updated successfully", { docs: updatedPlans }, 200);
//     } catch (error) {
//         console.error("Error updating UserPlans:", error);
//         return res.apiResponse(false, "Failed to update UserPlans", {}, 500);
//     }
// };

// exports.userSubscription = async (req, res, next) => {
//     try {
//         var requests = req.bodyParams;
//         if (!requests.userId || !requests.subscriptionId) {
//             return res.apiResponse(false, 'Id is missing', {}, 400);
//         }
//         const subscribedPlan = await Plan.findOne({ id: requests.subscriptionId });
//         if (subscribedPlan) {
//             const monthsToAdd = parseInt(subscribedPlan.durationMonths || 0, 10);
//             requests.validityStartDate = moment().format('DD-MM-YYYY');
//             requests.validityEndDate = moment().add(monthsToAdd, 'months').format('DD-MM-YYYY');
//             requests.id = `UserPlan-${moment().format('DDMMYYYYHHmmss')}`;
//             requests.planName = subscribedPlan.planName;
//             requests.planAmount = subscribedPlan.planAmount;
//             requests.activePlan = true;
//         }
//         const newUserPlan = new UserPlan(requests)
//         await newUserPlan.save()
//         const updatedUser = await Auth.findOneAndUpdate(
//             { id: requests.userId },
//             { subscribed: true },
//             { new: true }
//         );

//         if (!updatedUser) {
//             return res.apiResponse(false, 'User not found', {}, 404);
//         }

//         return res.apiResponse(true, 'Plan Subscribed successfully', newUserPlan, 200)
//     } catch (error) {
//         return res.apiResponse(false, 'Plan Subscription error', { error }, 500)
//     }
// }

// exports.userSubscription = async (req, res, next) => {
//     try {
//         const requests = req.bodyParams;

//         if (!requests.userId || !requests.subscriptionId) {
//             return res.apiResponse(false, 'Id is missing', {}, 400);
//         }

//         const subscribedPlan = await Plan.findOne({ id: requests.subscriptionId });
//         if (!subscribedPlan) {
//             return res.apiResponse(false, 'Plan not found', {}, 404);
//         }

//         const latestPlan = await UserPlan.findOne({ userId: requests.userId })
//             .sort({ createdAt: -1 }); // get latest plan

//         const now = moment();
//         let canStartNew = true;

//         if (latestPlan && latestPlan.validityEndDate) {
//             const endDate = moment(latestPlan.validityEndDate, 'DD-MM-YYYY');
//             if (now.isBefore(endDate)) {
//                 // Previous plan still active
//                 canStartNew = false;
//             } else {
//                 // Previous plan expired, update it
//                 await UserPlan.updateOne({ id: latestPlan.id }, { expired: true });
//             }
//         }

//         // Prepare new user plan
//         requests.id = `UserPlan-${moment().format('DDMMYYYYHHmmss')}`;
//         requests.planName = subscribedPlan.planName;
//         requests.planAmount = subscribedPlan.planAmount;

//         if (canStartNew) {
//             const months = parseInt(subscribedPlan.durationMonths || 0, 10);
//             requests.validityStartDate = now.format('DD-MM-YYYY');
//             requests.validityEndDate = now.clone().add(months, 'months').format('DD-MM-YYYY');
//             requests.activePlan = true;
//             requests.expired = false;
//         } else {
//             requests.activePlan = false;
//             requests.expired = false;
//         }

//         const newUserPlan = new UserPlan(requests);
//         await newUserPlan.save();

//         await Auth.findOneAndUpdate(
//             { id: requests.userId },
//             { subscribed: true },
//             { new: true }
//         );

//         return res.apiResponse(true, 'Plan subscribed successfully', newUserPlan, 200);
//     } catch (error) {
//         console.error('Subscription Error:', error);
//         return res.apiResponse(false, 'Plan Subscription error', { error }, 500);
//     }
// };