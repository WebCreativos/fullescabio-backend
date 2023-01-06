const products = require('../models/products')
async function find (ctx) {
  let barcode = ctx.params.barcode
  let data = await products.fyndByBarcode(barcode)
  data = data.map((d)=>{
    return{
      ...d,
      CANTIDAD:0,
      FECHA_VENCI:(d.FECHA_VENCI)? d.FECHA_VENCI[0] : null
    }
  })
  ctx.ok({ data })
}
async function findExtra (ctx) {
  let code = ctx.params.code
  let data = await products.findExtraInfo(code)
  ctx.ok({ data })
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
  const partidas = await products.getPartidas(data.COD_ARTICULO)
  const response = await products.saveAjuste(partidas, data)
  console.log(response)
  ctx.ok({ response })
}

module.exports = {
  find,
  saveLog,
  findExtra,
  saveAjuste,
  saveSobrante,
  findAllLocations
}