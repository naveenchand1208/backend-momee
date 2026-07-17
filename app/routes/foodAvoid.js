const express = require('express')
const router = express.Router()
const foodAvoidController = require('../controllers/foodAvoid')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), foodAvoidController.add)
router.post('/list', foodAvoidController.list)
router.post('/view', foodAvoidController.view)
router.post('/update', upload.single('file'), foodAvoidController.update)
router.post('/delete', foodAvoidController.delete)

module.exports = router;    