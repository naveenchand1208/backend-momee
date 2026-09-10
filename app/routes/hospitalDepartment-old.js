const express = require('express')
const router = express.Router()
const hospitalDepartmentController = require('../controllers/hospitalDepartment')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), hospitalDepartmentController.add)
router.post('/list', hospitalDepartmentController.list)
router.post('/view', hospitalDepartmentController.view)
router.post('/update', upload.single('file'), hospitalDepartmentController.update)
router.post('/delete', hospitalDepartmentController.delete)

module.exports = router;    