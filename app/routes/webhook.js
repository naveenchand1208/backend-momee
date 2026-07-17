// routes/webhook.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const PaymentLogs = require('../models/paymentLogs')
const Auth = require('../models/auth')
const { handlePaymentFailed, userSubscription } = require("../services/paymentService");

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

router.post(
  '/razorpay-webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      console.log('coming-hook');

      const signature = req.headers['x-razorpay-signature'];

      if (!signature) {
        console.error('❌ Missing Razorpay signature');
        return res.status(400).send('Signature required');
      }

      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(req.body.toString()) // convert buffer → string
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('❌ Invalid webhook signature');
        return res.status(400).send('Invalid signature');
      }

      if (req.body.event === "payment.retry.started") {
        console.log("Retry started:", req.body.payload.payment.entity);
      }
      if (req.body.event === "payment.retry.failed") {
        console.log("Retry failed:", req.body.payload.payment.entity);
      }

      //  Signature verified
      const payload = JSON.parse(req.body.toString('utf8'));
      console.log('Webhook Event:', payload.event);

      // const payload = JSON.parse(body);
      const payment = payload.payload.payment.entity;
      // console.log('payment:', payment);
      const userId = payment?.notes?.userId;

      const user = await Auth.findOneAndUpdate({ id: userId }, { $set: { paymentMethod: payment.method } }, { new: true })
      // console.log('user:', user);
      let retry = false;
      const existing = await PaymentLogs.findOne({ orderId: payment.order_id, paymentStatus: "created" });
      const count = await PaymentLogs.countDocuments({ orderId: payment.order_id });


      if (count > 1) {
        retry = true;
        // console.log("🔄 Retry attempt for order:", payment.order_id);
      } else {
        retry = false;
        // console.log("🆕 First attempt for order:", payment.order_id);
      }

      //future
      // if (retry && payment.status === "failed") {
      //   await handlePaymentFailed({
      //     userId,
      //     amount: payment.amount,
      //     paymentId: payment.id,
      //     paymentStatus: payment.status,
      //     orderId: payment.order_id,
      //     method: payment.method,
      //     module: existing.module,
      //     subscriptionId: existing.subscriptionId
      //   });
      //   console.log('retry and failed')
      //   global.io.emit("payment status", {
      //     paymentStatus: "failed"
      //   });

      //   console.log("Socket emitted from webhook");
      // }
      // else if (retry && payment.status === "captured") {
      //   console.log("retry and success");
      //   global.io.emit("payment status", { paymentStatus: "success" });
      //   const payload = {
      //     userId,
      //     amount: payment.amount,
      //     paymentId: payment.id,
      //     paymentStatus: payment.status,
      //     orderId: payment.order_id,
      //     module: existing.module,
      //     method: payment.method,
      //     subscriptionId: existing.subscriptionId,
      //   };

      //   let result = null;

      //   // switch (existing.module) {
      //   //   case "userSubscription":
      //   //     result = await userSubscription(payload);
      //   //     break;
      //   //   case "dietSubscription":
      //   //     result = await dietSubscription(payload);
      //   //     break;
      //   //   case "exerciseSubscription":
      //   //     result = await exerciseSubscription(payload);
      //   //     break;
      //   //   default:
      //   //     console.log("Unknown module:", existing.module);
      //   //     return; // stop
      //   // }

      //   //  Only emit if subscription success
      //   // if (result === true) {
      //   //   global.io.emit("payment status", { paymentStatus: "success" });
      //   // }
      // }

      // retry = false;
      res.status(200).send('Webhook received successfully');
    } catch (err) {
      console.error('Webhook error:', err);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;


