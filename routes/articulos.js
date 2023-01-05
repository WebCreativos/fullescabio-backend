const Router = require('koa-router')
const router = new Router()
const Ctrl = require('../controllers/articulos')

router.get('/extrainfo/:code', Ctrl.findExtra)
router.get('/findlocations', Ctrl.findAllLocations)
router.post('/saveSobrante', Ctrl.saveSobrante)
router.post('/saveAjuste', Ctrl.saveAjuste)
router.post('/saveLog', Ctrl.saveLog)
router.get('/:barcode', Ctrl.find)

module.exports = router.routes()
