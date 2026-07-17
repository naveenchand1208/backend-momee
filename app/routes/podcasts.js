const express = require('express')
const router = express.Router()
const podCastsController = require('../controllers/podcasts')
const upload = require('../helpers/multer');

router.post('/add', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'music', maxCount: 1 }]), podCastsController.add)
router.post('/list', podCastsController.list)
router.post('/view', podCastsController.view)
router.post('/update', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'music', maxCount: 1 }]), podCastsController.update)
router.post('/delete', podCastsController.delete)

module.exports = router;    