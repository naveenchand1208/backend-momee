const express = require('express')
const router = express.Router()
const hospitalDepartmentController = require('../controllers/hospitalDepartment')
const upload = require('../helpers/multer');
const { parseMultipartJsonFields } = require('../helpers/util');

router.post('/add', upload.single('file'), parseMultipartJsonFields, hospitalDepartmentController.add)
router.post('/list', hospitalDepartmentController.list)
router.post('/view', hospitalDepartmentController.view)
router.post('/update', upload.single('file'), parseMultipartJsonFields, hospitalDepartmentController.update)
router.post('/delete', hospitalDepartmentController.delete)

module.exports = router;    