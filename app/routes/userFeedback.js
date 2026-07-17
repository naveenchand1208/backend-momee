const express = require('express')
const router = express.Router()
const userFeedbackController = require('../controllers/userFeedback')
const upload = require('../helpers/multer');

router.post('/add', upload.array('files'), userFeedbackController.add);
router.post('/list', userFeedbackController.list)
router.post('/view', userFeedbackController.view)
router.post('/update', upload.array('files'), userFeedbackController.update);
router.post('/delete', userFeedbackController.delete)

module.exports = router; 