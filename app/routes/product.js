const express = require('express')
const router = express.Router()
const productController = require('../controllers/product')
const upload = require('../helpers/multer');
const { parseMultipartJsonFields } = require('../helpers/util');

// router.post('/add', upload.fields([
//     { name: 'file1', maxCount: 1 },
//     { name: 'file2', maxCount: 1 },
//     { name: 'file3', maxCount: 1 },
//     { name: 'file4', maxCount: 1 },
//     { name: 'file5', maxCount: 1 },
// ]), productController.add)
router.post('/add', upload.array('files'), parseMultipartJsonFields, productController.add);
router.post('/list', productController.list)
router.post('/view', productController.view)
router.post('/update', upload.array('files'), parseMultipartJsonFields, productController.update);
// router.post('/update', upload.fields([
//     { name: 'file1', maxCount: 1 },
//     { name: 'file2', maxCount: 1 },
//     { name: 'file3', maxCount: 1 },
//     { name: 'file4', maxCount: 1 },
//     { name: 'file5', maxCount: 1 },
// ]), productController.update)
router.post('/delete', productController.delete)
router.post('/addOrder', productController.addOrder)
router.post('/createOrder', productController.createOrder)
router.post('/cancelCheckoutOrder', productController.cancelCheckoutOrder)
router.post('/paymentFailed', productController.paymentFailed)
router.post('/orderList', productController.orderList)
router.post('/viewOrder', productController.viewOrder)
router.post('/updateOrder', productController.updateOrder)
router.post('/deleteOrder', productController.deleteOrder)
router.post('/orderDownloadExcel', productController.orderDownloadExcel)
router.post('/verify', productController.verify)
router.post('/verifyPaymentStatus', productController.verifyPaymentStatus)
// router.post('/add', upload.array('files'), productController.add);


module.exports = router; 