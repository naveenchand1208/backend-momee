const express = require('express')
const router = express.Router()
const dieticianController = require('../controllers/dietician')
const upload = require('../helpers/multer');

router.post('/add', upload.array('certificates'), dieticianController.add)
// router.post('/list', dieticianController.list)
// router.post('/view', dieticianController.view)
// router.post('/update', upload.array('files'), dieticianController.update)
// router.post('/delete', dieticianController.delete)

module.exports = router;    