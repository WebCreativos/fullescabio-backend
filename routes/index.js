module.exports = (router) => {
  router.prefix('/v1')
  router.use('/articulos', require('./articulos'))
}
