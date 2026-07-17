const express = require('express')
const router = express.Router()
const hospitalsController = require('../controllers/hospitals')
const upload = require('../helpers/multer');
const { parseMultipartJsonFields } = require('../helpers/util');

router.post('/add', upload.single('file'), parseMultipartJsonFields, hospitalsController.add)
router.post('/list', hospitalsController.list)
router.post('/view', hospitalsController.view)
router.post('/update', upload.single('file'), parseMultipartJsonFields,  hospitalsController.update)
router.post('/delete', hospitalsController.delete)
router.post('/getNearbyHospitals', hospitalsController.getNearbyHospitals)
router.post('/hospitalDownloadExcel', hospitalsController.hospitalDownloadExcel)

module.exports = router;    