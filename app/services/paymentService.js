const Auth = require("../models/auth");
const PaymentLogs = require("../models/paymentLogs");
const Plan = require("../models/subscription");
const UserPlan = require("../models/userSubscription");
const moment = require('moment')

exports.handlePaymentFailed = async ({
    userId,
    amount,
    paymentId,
    paymentStatus,
    orderId,
    method,
    module,
    subscriptionId
}) => {
    // 1️⃣ save log
    const log = new PaymentLogs({
        userId,
        method,
        amount: Number(amount) / 100 || 0,
        module: module || "userSubscription",
        orderId,
        paymentId,
        subscriptionId,
        paymentStatus: paymentStatus || "failed",
        logStatus: "payment_failed",
    });

    await log.save();

    // 2️⃣ Reset method in Auth
    await Auth.findOneAndUpdate(
        { id: userId },
        { method: "" },
        { new: true }
    );

    //  global.io.emit("payment status", {
    //       paymentStatus: "failed"
    //     });

    return true;
};

exports.userSubscription = async ({
    userId,
    amount,
    paymentId,
    paymentStatus,
    orderId,
    method,
    module,
    subscriptionId
}) => {
    // 1️⃣ save log
    console.log('coming-service-sub')
    const log = new PaymentLogs({
        userId,
        method,
        amount: Number(amount) / 100 || 0,
        module: module || "userSubscription",
        orderId,
        paymentId,
        subscriptionId,
        paymentStatus: paymentStatus || "failed",
        logStatus: "payment_success",
    });
    await log.save();
    // if (!userId) {
    //     return res.apiResponse(false, 'UserId is missing', {}, 400);
    // }
    // if (!subscriptionId) {
    //     return res.apiResponse(false, 'Subscription Id is missing', {}, 400);
    // }
    // const user = await Auth.findOne({ id: userId })
    // if (!user) {
    //     return res.apiResponse(false, 'User Not Found', {}, 400);
    // }
    const subscribedPlan = await Plan.findOne({ id: subscriptionId });
    // if (!subscribedPlan) {
    //     return res.apiResponse(false, 'Plan not found', {}, 404);
    // }
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
    let updateFields = {};
    updateFields.id = `UserPlan-${moment().format('DDMMYYYYHHmmss')}`;
    updateFields.planName = subscribedPlan.planName;
    updateFields.userId = userId;
    updateFields.planAmount = subscribedPlan.planAmount;
    updateFields.subscriptionId = subscriptionId;
    if (allowNewPlanWithDates) {
        const months = parseInt(subscribedPlan.durationMonths || 0, 10);
        updateFields.validityStartDate = now.format('DD-MM-YYYY');
        updateFields.validityEndDate = now.clone().add(months, 'months').format('DD-MM-YYYY');
        updateFields.activePlan = true;
        updateFields.expired = false;
    } else {
        updateFields.validityStartDate = "";
        updateFields.validityEndDate = "";
        updateFields.activePlan = false;
        updateFields.expired = false;
    }
    updateFields.paymentId = paymentId;
    const newUserPlan = new UserPlan(updateFields);
    await newUserPlan.save();

    // Step 5: Update user subscription flag
    await Auth.findOneAndUpdate(
        { id: userId },
        { subscribed: true, method: "" },
        { new: true }
    );
    // if(newUserPlan){
    // global.io.emit("payment status", { paymentStatus: "success" });
    // }
    return true;
    // return res.apiResponse(true, 'Payment verified and Plan subscribed successfully', newUserPlan, 200);
} 