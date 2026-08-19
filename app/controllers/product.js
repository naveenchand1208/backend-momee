const Product = require('../models/product')
const Order = require('../models/order')
const Auth = require('../models/auth')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');
const { exportToExcel } = require('../helpers/excel');
const PaymentLogs = require('../models/paymentLogs')
const Razorpay = require("razorpay")
const crypto = require("crypto")

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});

// exports.add = async (req, res, next) => {
//     try {
//         const { name, momType, description, actualPrice, discountPercentage } = req.body;
//         console.log('req.body', req.body)
//         const { file1, file2, file3, file4, file5 } = req.files || {};
//         if (!name || !momType || !description || !actualPrice || !discountPercentage || !file1) {
//             return res.apiResponse(false, 'Product params are missing', {}, 400);
//         }
//         const checkTitle = await Product.findOne({ name: name })
//         if (checkTitle) {
//             return res.apiResponse(false, 'Product Name already exists', {}, 400);
//         }
//         const price = actualPrice - (actualPrice * discountPercentage / 100);
//         const upload = async (file) => file ? await uploadToCloudinary(file[0], 'products') : {};
//         const [file1Upload, file2Upload, file3Upload, file4Upload, file5Upload] = await Promise.all([
//             upload(file1),
//             upload(file2),
//             upload(file3),
//             upload(file4),
//             upload(file5),
//         ]);
//         const newProduct = new Product({
//             name,
//             momType,
//             description,
//             actualPrice,
//             price,
//             discountPercentage,
//             id: `Product-${moment().format('DDMMYYYYHHmmss')}`,
//             file1: file1Upload.secure_url,
//             file1_public_id: file1Upload.public_id,
//             file2: file2Upload?.secure_url,
//             file2_public_id: file2Upload?.public_id,
//             file3: file3Upload?.secure_url,
//             file3_public_id: file3Upload?.public_id,
//             file4: file4Upload?.secure_url,
//             file4_public_id: file4Upload?.public_id,
//             file5: file5Upload?.secure_url,
//             file5_public_id: file5Upload?.public_id,
//         });
//         await newProduct.save();
//         return res.apiResponse(true, "Product added successfully", newProduct, 200);

//     } catch (error) {
//         console.error("Add Product Error:", error);
//         return res.apiResponse(false, 'Product Add error', { error }, 500);
//     }
// };

exports.add = async (req, res, next) => {
    try {
        const {
            name, momType, description, actualPrice, discountPercentage
        } = req.body;
        if (!name || !momType || !description || !actualPrice || !discountPercentage) {
            return res.apiResponse(false, 'Product add params is missing', {}, 400);
        }
        // || req.files.length > 0
        // const checkTitle = await Product.findOne({ name: name })
        // if (checkTitle) {
        //     return res.apiResponse(false, 'Product Name already exists', {}, 400);
        // }
        const uploadedFiles = [];
        for (const file of req.files) {
            const result = await uploadToCloudinary(file, `products`);
            uploadedFiles.push({
                public_id: result.public_id,
                url: result.secure_url,
                fileChanged: false
            });
        }
        // const price = actualPrice - (actualPrice * discountPercentage / 100);
        const price = Math.round(actualPrice - (actualPrice * discountPercentage / 100));
        const uniqueId = `Product-${moment().format('DDMMYYYYHHmmss')}`;
        const newProduct = new Product({
            name,
            momType,
            description,
            actualPrice,
            price,
            discountPercentage,
            id: uniqueId,
            files: uploadedFiles,
        });
        await newProduct.save();
        return res.apiResponse(true, "Product added Success", newProduct, 200);
    } catch (error) {
        return res.apiResponse(false, "Add Product Error", 500)
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
            Product.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let products = [];
            if (Object.keys(match).length === 0) {
                products = await Product.find({});
            } else {
                products = await Product.find(match);
            }
            return res.apiResponse(true, "Success", { docs: products }, 200);
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
        const product = await Product.findOne({ id: requests.id })
        if (!product) {
            return res.apiResponse(false, 'Product not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', product, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Product error', {}, 500)
    }
}

// exports.update = async (req, res, next) => {
//     try {
//         const {
//             id,
//             name,
//             momType,
//             description,
//             status,
//             file1Changed,
//             file2Changed,
//             file3Changed,
//             file4Changed,
//             file5Changed,
//             file1_public_id,
//             file2_public_id,
//             file3_public_id,
//             file4_public_id,
//             file5_public_id,
//         } = req.body;

//         if (!id) {
//             return res.apiResponse(false, 'Product ID is missing', {}, 400);
//         }

//         const updateFields = {};

//         if (name) updateFields.name = name;
//         if (momType) updateFields.momType = momType;
//         if (description) updateFields.description = description;
//         if (status) updateFields.status = status;

//         // if (actualPrice && discountPercentage) {
//         //     updateFields.actualPrice = actualPrice;
//         //     updateFields.discountPercentage = discountPercentage;
//         //     updateFields.price = actualPrice - (actualPrice * discountPercentage / 100);
//         // }

//         const upload = async (file, folder) => file ? await uploadToCloudinary(file[0], folder) : null;

//         const { file1, file2, file3, file4, file5 } = req.files || {};

//         // Handle file1
//         if (file1Changed === 'true' && file1_public_id && file1) {
//             await deleteFromCloudinary(file1_public_id);
//             const result = await upload(file1, 'products');
//             if (result) {
//                 updateFields.file1 = result.secure_url;
//                 updateFields.file1_public_id = result.public_id;
//             }
//         }

//         // Handle file2
//         if (file2Changed === 'true' && file2_public_id && file2) {
//             await deleteFromCloudinary(file2_public_id);
//             const result = await upload(file2, 'products');
//             if (result) {
//                 updateFields.file2 = result.secure_url;
//                 updateFields.file2_public_id = result.public_id;
//             }
//         }

//         // Handle file3
//         if (file3Changed === 'true' && file3_public_id && file3) {
//             await deleteFromCloudinary(file3_public_id);
//             const result = await upload(file3, 'products');
//             if (result) {
//                 updateFields.file3 = result.secure_url;
//                 updateFields.file3_public_id = result.public_id;
//             }
//         }

//         // Handle file4
//         if (file4Changed === 'true' && file4_public_id && file4) {
//             await deleteFromCloudinary(file4_public_id);
//             const result = await upload(file4, 'products');
//             if (result) {
//                 updateFields.file4 = result.secure_url;
//                 updateFields.file4_public_id = result.public_id;
//             }
//         }

//         // Handle file5
//         if (file5Changed === 'true' && file5_public_id && file5) {
//             await deleteFromCloudinary(file5_public_id);
//             const result = await upload(file5, 'products');
//             if (result) {
//                 updateFields.file5 = result.secure_url;
//                 updateFields.file5_public_id = result.public_id;
//             }
//         }

//         const updatedProduct = await Product.findOneAndUpdate(
//             { id },
//             { $set: updateFields },
//             { new: true }
//         );

//         if (!updatedProduct) {
//             return res.apiResponse(false, 'Product not found', {}, 404);
//         }

//         return res.apiResponse(true, 'Product updated successfully', updatedProduct, 200);

//     } catch (error) {
//         console.error('Update Error:', error);
//         return res.apiResponse(false, 'Error updating Product', { error }, 500);
//     }
// };

exports.update = async (req, res, next) => {
    try {
        if (req.body) {
            const body = Object(req.body);
            const { id, actualPrice, discountPercentage } = body;
            if (id === undefined || id === null) {
                return res.apiResponse(false, 'Id is missing', {}, 400);
            }
            const product = await Product.findOne({ id })
            if (!product) {
                return res.apiResponse(false, 'Product Not Found', {}, 404);
            }

            const validMomTypes = ['newMom', 'pregMom'];
            const validStatuses = ['Active', 'Inactive'];

            let updateFields = {};
            if (req.body.name) updateFields.name = req.body.name;
            if (req.body.momType) {
                if (!validMomTypes.includes(req.body.momType)) {
                    return res.apiResponse(false, `Invalid momType. Must be one of: ${validMomTypes.join(', ')}`, {}, 400);
                }
                updateFields.momType = req.body.momType;
            }
            // if (req.body.price) updateFields.price = req.body.price;
            // if (req.body.actualPrice) updateFields.actualPrice = req.body.actualPrice;
            // if (req.body.discountPercentage) updateFields.discountPercentage = req.body.discountPercentage;
            if (req.body.description) updateFields.description = req.body.description;
            if (req.body.status) {
                if (!validStatuses.includes(req.body.status)) {
                    return res.apiResponse(false, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, {}, 400);
                }
                updateFields.status = req.body.status;
            }

            const finalActualPrice = actualPrice !== undefined ? actualPrice : product.actualPrice;
            console.log('finalActualPrice', finalActualPrice)
            const finalDiscount = discountPercentage !== undefined ? discountPercentage : product.discountPercentage;
            console.log('finalDiscount', finalDiscount)

            // Calculate final price (no decimals)
            const price = Math.round(finalActualPrice - (finalActualPrice * finalDiscount / 100));
            updateFields.actualPrice = finalActualPrice;
            updateFields.discountPercentage = finalDiscount;
            updateFields.price = price;
            const uploadedFiles = [];
            if (req.files) {
                for (const file of req.files) {
                    const result = await uploadToCloudinary(file, 'products');
                    uploadedFiles.push({
                        public_id: result.public_id,
                        url: result.secure_url,
                        fileChanged: false,
                    });
                }
            }

            let finalOldFiles = [];
            let oldFiles = req.body.oldFiles;

            // Step 1: Parse oldFiles if it's a JSON string
            if (typeof oldFiles === 'string') {
                try {
                    oldFiles = JSON.parse(oldFiles);
                } catch (e) {
                    console.error('Invalid JSON in oldFiles');
                    oldFiles = [];
                }
            }

            // Step 2: Handle oldFiles logic
            if (Array.isArray(oldFiles)) {
                for (const file of oldFiles) {
                    const isChanged = file.fileChanged === true || file.fileChanged === 'true';
                    if (isChanged && file.public_id) {
                        await deleteFromCloudinary(file.public_id); // Remove from Cloudinary
                    } else {
                        finalOldFiles.push(file); // Retain file if not changed
                    }
                }
            } else {
                // If no oldFiles sent, retain existing product files
                finalOldFiles = product.files || [];
            }

            // Step 3: Merge all
            const updatedFilesArray = finalOldFiles.concat(uploadedFiles);

            // Step 4: Set the update
            // updateFields = {
            updateFields.files = updatedFilesArray;
            // };

            const updatedProduct = await Product.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true, runValidators: true }
            );
            if (!updatedProduct) {
                return res.apiResponse(false, 'Product not found', {}, 404);
            }
            return res.apiResponse(true, 'Product updated successfully', updatedProduct, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        if (error.name === 'ValidationError') {
            return res.apiResponse(false, error.message, {}, 400);
        }
        return res.apiResponse(false, 'Error updating Product', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const product = await Product.findOne({ id: requests.id })
        if (!product) {
            return res.apiResponse(false, 'Product not found', {}, 404)
        }
        if (product.files) {
            for (const file of product.files) {
                await deleteFromCloudinary(file.public_id);
            }
        }
        // if (product) {
        //     const publicIds = [
        //         product.file1_public_id,
        //         product.file2_public_id,
        //         product.file3_public_id,
        //         product.file4_public_id,
        //         product.file5_public_id,
        //     ];
        //     for (const publicId of publicIds) {
        //         if (publicId) {
        //             await deleteFromCloudinary(publicId);
        //         }
        //     }
        // }
        const result = await Product.deleteOne({ id: requests.id });
        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Product not found', {}, 404)
        }
        return res.apiResponse(true, 'Product deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Product error', { error }, 500)
    }
}

async function getPaymentMethod(userId) {
    if (!userId) return null;

    const user = await Auth.findOne({ id: userId }).select('paymentMethod');
    return user?.paymentMethod || null;
}

exports.createOrder = async (req, res, next) => {
    const { amount, userId, productId } = req.bodyParams;
    if (!amount || !productId) {
        return res.apiResponse(false, "Amount Or productId is Missing", {}, 400);
    }
    const options = {
        amount: amount * 100, // in paisa
        currency: "INR",
        receipt: "order_subscription",
        notes: {
            userId: req.userDetails.id,
        }
    };
    try {
        const order = await razorpay.orders.create(options);
        console.log('order', order)
        res.apiResponse(true, "Success", order, 200);
        const obj = {
            userId: req.userDetails.id || userId,
            method: "pending",
            productId,
            amount,
            orderId: order.id,
            paymentId: "",
            paymentStatus: "created",
            logStatus: "order_created"
        }
        await addPaymentLog(obj)
        // setTimeout(() => {
        //     console.log('Shutting down server after sending order response...');
        //     process.exit(0); // Clean exit
        // }, 1000);
    } catch (err) {
        return res.apiResponse(false, err.message, {}, 500);
    }
}

async function addPaymentLog(req) {
    // const response = await razorpay.payments.fetch(razorpay_payment_id);
    const newLog = new PaymentLogs({
        userId: req?.userId,
        method: req.method || "",
        productId: req.productId || "",
        amount: Number(req.amount) || 0,
        module: "orderSubscription",
        paymentId: req?.paymentId || "",
        orderId: req?.orderId || "",
        paymentStatus: req?.paymentStatus || "",
        logStatus: req?.logStatus || "",
    })
    await newLog.save();
}

exports.addOrder = async (req, res, next) => {
    console.log('req.bodyParams', req.bodyParams)
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, productId, quantity } =
        req.bodyParams;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !productId || !quantity) {
        return res.apiResponse(false, 'Order params is missing', {}, 400);
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
            productId,
            method,
            orderId: razorpay_order_id || "",
            amount: Number(response?.amount) / 100 || 0,
            paymentId: razorpay_payment_id || "",
            paymentStatus: response?.status || "Signature Verfied",
            logStatus: "signature_verification_success",
            quantity: quantity,
        }
        await addPaymentLog(obj)
        // res.apiResponse(true, "Payment verified", {}, 200);
        const orders = await makeOrder(obj, res)
        await Auth.findOneAndUpdate(
            { id: req.userDetails.id },
            { method: "" },
            { new: true }
        );
        // if (orders) {
        //     return res.apiResponse(true, "Order added Success", newOrder, 200);
        // } else {
        //     return res.apiResponse(false, "Order Failed", {}, 500);
        // }
        // return;
        // res.status(200).json({ success: true, message: "Payment verified" });
    } else {
        const response = await razorpay.payments.fetch(razorpay_payment_id);
        const obj = {
            userId: userId,
            productId,
            method,
            orderId: razorpay_order_id || "",
            amount: Number(response?.amount) / 100 || 0,
            paymentId: razorpay_payment_id || "",
            paymentStatus: response?.status || "Invalid signature",
            logStatus: "signature_verification_failed",
        }
        await addPaymentLog(obj)
        await Auth.findOneAndUpdate(
            { id: req.userDetails.id },
            { method: "" },
            { new: true }
        );
        return res.apiResponse(true, "Invalid signature", {}, 200);
        // res.status(400).json({ success: false, message: "Invalid signature" });
    }
}
exports.cancelCheckoutOrder = async (req, res, next) => {
    try {
        console.log('coming')
        const { amount, paymentId, paymentStatus, orderId, productId } = req.bodyParams;
        if (!amount || !orderId || !productId) {
            return res.apiResponse(false, "Params is Missing", {}, 400);
        }
        const method = await getPaymentMethod(req.userDetails.id)
        const obj = {
            userId: req.userDetails.id,
            productId,
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
        return res.apiResponse(false, error.message, {}, 500);
    }
}

exports.paymentFailed = async (req, res, next) => {
    try {
        const { amount, paymentId, paymentStatus, orderId, productId } = req.bodyParams;
        if (!amount || !paymentId || !orderId || !productId) {
            return res.apiResponse(false, "Params is Missing", {}, 400);
        }
        const method = await getPaymentMethod(req.userDetails.id)
        const obj = {
            userId: req.userDetails.id,
            method,
            productId,
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
        return res.apiResponse(false, error.message, {}, 500);
    }
}

async function makeOrder(req, res) {
    try {
        const { userId, productId, quantity, amount, paymentId } = req;
        // if (!userId || !productId || !quantity) {
        //     return res.apiResponse(false, 'Order params is missing', {}, 400);
        // }
        const uniqueId = `Order-${moment().format('DDMMYYYYHHmmss')}`;
        const newOrder = new Order({
            userId,
            productId,
            quantity,
            amount,
            paymentId,
            id: uniqueId,
        });
        await newOrder.save();

        // if (newOrder) {
        //     return true;
        // } else {
        //     return false;
        // }
        return res.apiResponse(true, "Order added Success", newOrder, 200);
    } catch (error) {
        return res.apiResponse(false, 'Order Add error', { error }, 500);
    }
}
exports.orderList = async (req, res, next) => {
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
        if (requests.productId && requests.productId !== '') {
            match['productId'] = requests.productId;
        }
        if (requests.userId && requests.userId !== '') {
            match['userId'] = requests.userId;
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
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
            populate: [
                { path: 'product' },
                { path: 'user', select: 'userName id' }
            ]
        };
        if (pagination === "true") {
            options.sort = { createdAt: -1 };
            Order.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            // let orders = [];
            // if (Object.keys(match).length === 0) {
            //     orders = await Order.find({}).populate(['product', 'user']);
            // } else {
            //     orders = await Order.find(match).populate(['product', 'user']);
            // }
            let orders = [];
            const query = Object.keys(match).length === 0
                ? Order.find({})
                : Order.find(match)
                    .populate({ path: 'product' })
                    .populate({
                        path: 'user',
                        select: 'userName id'
                    })
            orders = await query.sort({ createdAt: -1 });
            return res.apiResponse(true, "Success", { docs: orders }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}
exports.viewOrder = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const order = await Order.findOne({ id: requests.id }).populate(['product', 'user'])
        if (!order) {
            return res.apiResponse(false, 'Order not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', order, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Order error', {}, 500)
    }
}
exports.updateOrder = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const updateFields = {};
        if (requests.status) updateFields.status = requests.status;
        if (requests.quantity) updateFields.quantity = requests.quantity;
        const updatedOrder = await Order.findOneAndUpdate(
            { id: requests.id },
            { $set: updateFields },
            { new: true }
        );
        if (!updatedOrder) {
            return res.apiResponse(false, 'Order not found', {}, 404);
        }
        return res.apiResponse(true, 'Order updated successfully', updatedOrder, 200);
    } catch (error) {
        return res.apiResponse(false, 'Error updating Order', {}, 500);
    }

};

exports.deleteOrder = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const order = await Order.findOne({ id: requests.id })
        if (!order) {
            return res.apiResponse(false, 'Order not found', {}, 404)
        }
        const result = await Order.deleteOne({ id: requests.id });
        return res.apiResponse(true, 'Order deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Order error', { error }, 500)
    }
}

// exports.orderDownloadExcel = async (req, res) => {
//     try {
//         const requests = req.bodyParams;
//         const query = {
//             momType: requests.momType,
//             ...(requests.status && { status: requests.status }),
//             ...(requests.userId && { userId: requests.userId }),
//         };
//         // if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
//         //     const searchTerm = requests.searchKey.trim();
//         //     const regex = { $regex: searchTerm, $options: 'i' };

//         //     query['$or'] = [
//         //         { userName: regex },
//         //         { email: regex },
//         //     ];
//         // }

//         await exportToExcel({
//             model: Order,
//             headers: [
//                 "SNo",
//                 "Order ID",
//                 "Product ID",
//                 "Product Name",
//                 "Price",
//                 "Actual Price",
//                 "Mom Type",
//                 "Order Status",
//                 "Created At"
//             ],
//             fields: [
//                 "orderId",
//                 "productId",
//                 "productName",
//                 "price",
//                 "actualPrice",
//                 "momType",
//                 "orderStatus",
//                 "createdAt"
//             ],
//             query, // 👈 instead of model+query, we directly pass rows
//             fileName: "orders.xlsx",
//             res//  send stream to browser
//         });
//     } catch (error) {
//         console.error('Export error:', error);
//         res.status(500).json({ message: 'Error exporting Excel' });
//     }
// }

exports.orderDownloadExcel = async (req, res) => {
    try {
        const requests = req.bodyParams;
        console.log("requests", requests);

        // Build query dynamically
        const query = {
            ...(requests.status && { status: requests.status }),
            ...(requests.userId && { userId: requests.userId }),
        };

        // If searching by orderId
        // if (requests.searchKey !== undefined && requests.searchKey.trim() !== "") {
        //     const searchTerm = requests.searchKey.trim();
        //     const regex = { $regex: searchTerm, $options: "i" };
        //     query["$or"] = [
        //         { id: regex }, // order id
        //         { productId: regex } // product id
        //     ];
        // }

        // 1️⃣ Fetch orders
        const orders = await Order.find(query).lean();

        // if (!orders.length) {
        //     return res.status(404).json({ message: "No orders found" });
        // }

        // 2️⃣ Collect productIds and fetch products
        const productIds = orders.map((o) => o.productId);
        const products = await Product.find({ id: { $in: productIds } }).lean();
        const productMap = {};
        products.forEach((p) => {
            productMap[p.id] = p;
        });

        // 3️⃣ Prepare rows in the same format as exportToExcel
        const rows = orders.map((order, index) => {
            const product = productMap[order.productId] || {};
            return {
                sno: index + 1,
                orderId: order.id,
                productId: order.productId,
                productName: product.name || "N/A",
                price: product.price || "N/A",
                actualPrice: product.actualPrice || "N/A",
                momType: product.momType || "N/A",
                orderStatus: order.status,
                createdAt: order.createdAt,
            };
        });

        // 4️⃣ Call exportToExcel utility
        await exportToExcel({
            headers: [
                "SNo",
                "Order ID",
                "Product ID",
                "Product Name",
                "Price",
                "Actual Price",
                "Mom Type",
                "Order Status",
                "Created At"
            ],
            fields: [
                "orderId",
                "productId",
                "productName",
                "price",
                "actualPrice",
                "momType",
                "orderStatus",
                "createdAt"
            ],
            data: rows, // 👈 instead of model+query, we directly pass rows
            fileName: "orders.xlsx",
            res
        });
    } catch (error) {
        console.error("Export error:", error);
        res.status(500).json({ message: "Error exporting Excel" });
    }
};

exports.verify = async (req, res, next) => {
    console.log('req.bodyParams', req.bodyParams)
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, productId } =
        req.bodyParams;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !productId) {
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
            productId,
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
            productId,
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

// exports.add = async (req, res, next) => {
//     try {
//         const { name, momType, description, actualPrice, discountPercentage } = req.body;
//         if (!name || !momType || !description || !actualPrice || !discountPercentage || !file1) {
//             return res.apiResponse(false, 'Product params are missing', {}, 400);
//         }
//         const checkTitle = await Product.find({ name: name })
//         if (checkTitle) {
//             return res.apiResponse(false, 'Product Name already exists', {}, 400);
//         }
//         const price = actualPrice - (actualPrice * discountPercentage / 100);
//         const uploadedFiles = [];
//         for (const file of req.files) {
//             const result = await uploadToCloudinary(file.path, 'products');
//             uploadedFiles.push({
//                 public_id: result.public_id,
//                 url: result.secure_url,
//                 fileChanged: false
//             });
//         }
//         const newProduct = new Product({
//             name,
//             momType,
//             description,
//             actualPrice,
//             price,
//             discountPercentage,
//             id: `Product-${moment().format('DDMMYYYYHHmmss')}`,
//             files: uploadedFiles,
//         });
//         await newProduct.save();
//         return res.apiResponse(true, "Product added successfully", {}, 200);

//     } catch (error) {
//         console.error("Add Product Error:", error);
//         return res.apiResponse(false, 'Product Add error', { error }, 500);
//     }
// };

// exports.update = async (req, res) => {
//   try {
//     const { id, name, momType, description, actualPrice, discountPercentage, existingFiles } = req.body;

//     if (!id || !name || !momType || !description || !actualPrice || !discountPercentage) {
//       return res.apiResponse(false, 'Product update parameters missing', {}, 400);
//     }

//     const product = await Product.findOne({ id });
//     if (!product) {
//       return res.apiResponse(false, 'Product not found', {}, 404);
//     }

//     const updatedFiles = [];
//     const parsedExistingFiles = JSON.parse(existingFiles); // should be array of objects with { public_id, url, fileChanged }

//     let fileIndex = 0;
//     for (const fileMeta of parsedExistingFiles) {
//       if (fileMeta.fileChanged) {
//         // Replace old file
//         if (fileMeta.public_id) {
//           await cloudinary.uploader.destroy(fileMeta.public_id); // delete old image
//         }
//         const newFile = req.files[fileIndex]; // get new uploaded file
//         const uploaded = await uploadToCloudinary(newFile.path, 'products');
//         updatedFiles.push({
//           public_id: uploaded.public_id,
//           url: uploaded.secure_url,
//           fileChanged: false,
//         });
//         fileIndex++;
//       } else {
//         // Keep old file
//         updatedFiles.push({
//           public_id: fileMeta.public_id,
//           url: fileMeta.url,
//           fileChanged: false,
//         });
//       }
//     }

//     const updatedPrice = actualPrice - (actualPrice * discountPercentage / 100);

//     // Update product fields
//     product.name = name;
//     product.momType = momType;
//     product.description = description;
//     product.actualPrice = actualPrice;
//     product.price = updatedPrice;
//     product.discountPercentage = discountPercentage;
//     product.files = updatedFiles;

//     await product.save();

//     return res.apiResponse(true, 'Product updated successfully', {}, 200);
//   } catch (error) {
//     console.error("Update Product Error:", error);
//     return res.apiResponse(false, 'Product Update error', { error }, 500);
//   }
// };

// exports.addOrder = async (req, res, next) => {
//     try {
//         const { userId, productId, quantity } = req.bodyParams;
//         if (!userId || !productId || !quantity) {
//             return res.apiResponse(false, 'Order params is missing', {}, 400);
//         }
//         const uniqueId = `Order-${moment().format('DDMMYYYYHHmmss')}`;
//         const newOrder = new Order({
//             userId,
//             productId,
//             quantity,
//             id: uniqueId,
//         });
//         await newOrder.save();
//         return res.apiResponse(true, "Order added Success", newOrder, 200);
//     } catch (error) {
//         return res.apiResponse(false, 'Order Add error', { error }, 500);
//     }
// }