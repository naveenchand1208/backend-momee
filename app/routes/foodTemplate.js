const express = require('express')
const router = express.Router()
const foodTemplateController = require('../controllers/foodTemplate')
const upload = require('../helpers/multer');
const { parseMultipartJsonFields } = require('../helpers/util');

router.post('/add', upload.single('file'), parseMultipartJsonFields, foodTemplateController.add)
router.post('/list', foodTemplateController.list)
router.post('/view', foodTemplateController.view)
router.post('/update', upload.single('file'), parseMultipartJsonFields, foodTemplateController.update)
router.post('/delete', foodTemplateController.delete)

module.exports = router;    