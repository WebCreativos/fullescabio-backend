const products = require('../models/products')
async function find (ctx) {
  let query = ctx.request.query
  let data =  await products.fyndByBarcode(query)
  ctx.ok({ data })
}
async function findExtra (ctx) {
  let code = ctx.params.code
  let data = await products.findExtraInfo(code)
  ctx.ok({ data })
}
async function findPartidasWithPendCant (ctx) {
  let loc = ctx.params.loc
  let data = await products.getPartidasWithPendCant(loc)
  ctx.ok(data.count)
}

async function findAllLocations (ctx) {
  let code = ctx.params.code
  let data = (await products.findAllLocations()).map((row) => row.ubicacion_partida)
  ctx.ok({ data })
}
async function saveLog (ctx) {
  const data = ctx.request.body.data
  const response = await products.saveLog(data)
  console.log(response)
  ctx.ok({ response })
}
async function saveSobrante (ctx) {
  const data = ctx.request.body.data
  const response = await products.saveSobrante(data)
  console.log(response)
  ctx.ok({ response })
}


async function saveAjuste (ctx) {
  const data = ctx.request.body.data
  const response = await products.saveAjuste(data)
  console.log(response)
  ctx.ok({ response })
}

module.exports = {
  find,
  saveLog,
  findExtra,
  saveAjuste,
  saveSobrante,
  findAllLocations,
  findPartidasWithPendCant
}
