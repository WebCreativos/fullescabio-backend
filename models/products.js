const db = require("../config/database.js");
const knex = require("knex");

const findExtraInfo = async (code) => {
  return db.select("*").from("dbo.compro_partidas").where("COD_ARTICULO", code).first().then((row) => row);
};
const findAllLocations = async () => {
  return db.select("ubicacion_partida").from("dbo.compro_partidas").groupBy('ubicacion_partida')
};
// GET SPECIFIC USER BY ID
/*
  const fyndByBarcode = async (barcode) =>{
    console.log(barcode)
    return db('dbo.ARTICULOS').join('dbo.ARTICULOS_CODI_BARRAS', 'dbo.ARTICULOS_CODI_BARRAS.COD_ARTICULO', '=', 'dbo.ARTICULOS.COD_ARTICULO')
    .select('ARTICULOS.COD_ARTICULO','ARTICULOS.COD_BARRAS',
    'ARTICULOS_CODI_BARRAS.UNI_X_BULTO',
    'ARTICULOS.VALIDAR_VENCI','ARTICULOS.DESCRIP_ARTI',
    'ARTICULOS.FECHA_INTE',
    'ARTICULOS.FECHA_ULTIMO_MOV',
    'ARTICULOS.FECHA_ALTA',
    'ARTICULOS.FECHA_MODI',
    )
    .where('ARTICULOS.COD_BARRAS', barcode)
  } 
*/
const fyndByBarcode = async (barcode) => {
  const articulos = db.with('COD_ARTICULOS', function (query) {
      query.select('COD_ARTICULO', 'COD_BARRAS', 'UNI_X_BULTO')
        .from('dbo.ARTICULOS_CODI_BARRAS')
        .unionAll(function () {
          this.select('COD_ARTICULO', 'COD_BARRAS', db.raw("'1'")).from('dbo.ARTICULOS');
        });
    })
    .select('ART.COD_ARTICULO', 'COD.DESCRIP_ARTI', 'ART.COD_BARRAS', 'ART.UNI_X_BULTO', 'COD.VALIDAR_VENCI', 'FECHA_VENCI', 'c.FECHA',
      'c.COD_DEPO',
      'c.COD_PARTIDA',
      'c.CANT_PEND',
      'c.FECHA_VENCI',
      'c.UBICACION_PARTIDA', )
    .from('COD_ARTICULOS as ART')
    .innerJoin('dbo.ARTICULOS as COD', 'ART.COD_ARTICULO', 'COD.COD_ARTICULO')
    .innerJoin('DBO.compro_partidas as C', 'ART.COD_ARTICULO', 'C.COD_ARTICULO')
    .where('ART.COD_BARRAS', barcode)
    .where('c.CANT_PEND', '>', 0)
    .andWhere('c.COD_DEPO', 'DEP')
      .then((row) => {
      console.log(row)
      if(row.FECHA_VENCI?.length>0)
        row.FECHA_VENCI = row.FECHA_VENCI[0]
      return row
    });
  return articulos;

  /*
  return db.select(
    'a.COD_ARTICULO',
    'a.DESCRIP_ARTI',
    'c.FECHA',
    'c.COD_DEPO',
    'c.COD_PARTIDA',
    'c.CANT_PEND',
    'c.FECHA_VENCI',
    'c.UBICACION_PARTIDA',
    db.raw('SUBSTRING(c.ubicacion_partida, 1, 4) clave_1'),
    db.raw('SUBSTRING(c.ubicacion_partida, 6, 1) clave_2'),
    'a.VALIDAR_VENCI',
    'c.CANTI'
  )
  .from('DBO.compro_partidas AS c')
  .innerJoin('DBO.ARTICULOS AS a', 'c.COD_ARTICULO', 'a.COD_ARTICULO')
  .innerJoin('DBO.ARTICULOS_CODI_BARRAS AS acb', 'acb.COD_ARTICULO', 'a.COD_ARTICULO')
  .innerJoin('DBO.COMP_EMITIDOS AS comp', function() {
    this.on('c.TIPO', 'comp.TIPO').andOn('c.NUM', 'comp.NUM');
  })
  .leftJoin('DBO.CLIENTES AS cli', 'comp.CLIENTE', 'cli.NUM_CLIENTE')
  .where('c.CANT_PEND', '>', 0)
  .andWhere('c.COD_DEPO', 'DEP')
  .andWhere(function() {
    this.where('a.COD_BARRAS',barcode).orWhere('acb.COD_BARRAS', barcode);
  })
  .orderBy('FECHA_VENCI','DESC')
  */
  //SQL RAW METHOD
  // return db.raw(`SELECT * FROM users
  //                  WHERE id = ${id}`);
};
const getPartidas = async (code) => {
  return db.select("*").from("dbo.compro_partidas").where("COD_ARTICULO", code).andWhere('CANTI', '>', 0).orderBy('FECHA', 'asc').then((row) => row);

}
const saveAjuste = async (partidas, data) => {
  var diferencia = data.CANT_PEND - data.CANT_CONTEO
  let partis = []



  while (diferencia > 0) {
    // Si ya no quedan partidas, terminamos el bucle
    if (partidas.length === 0) {
      break
    }
    const partida = partidas.shift()
    const cantidadARestar = Math.min(partida.CANTI, diferencia)
    if (cantidadARestar <= partida.CANTI) {
      // Si la cantidad a restar es menor o igual a la cantidad pendiente,
      // restamos la cantidad a restar de la partida y añadimos la partida a la lista de partis
      partida.CANTI -= cantidadARestar
      diferencia = cantidadARestar - partida.CANTI
      partis.push(partida)
    } else {
      // Si la cantidad a restar es mayor a la cantidad pendiente,
      // restamos la cantidad pendiente de la partida y añadimos la partida a la lista de partis
      diferencia = cantidadARestar - partida.CANTI
      partida.CANTI = 0
      partis.push({
        ...partida
      })
    }
    // actualiza la partida
    await db('dbo.TOMAFI_PART').insert({
      COD_ARTICULO: partida.COD_ARTICULO,
      DESCRIP_ARTI: data.DESCRIP_ARTI,
      TIPO_CUENTA: data.cuenta,
      PARTIDA: partida.COD_PARTIDA,
      COSTO: partida.COSTO_UNI,
      CANT_PARTI: partida.CANTI,
      UBICACION_ARTI: data.UBICACION_PARTIDA,
    })
  }

  const LAST_PARTIDA = await db.select("*").from("dbo.compro_partidas").where("COD_ARTICULO", data.COD_ARTICULO).orderBy('FECHA', 'desc').first().then((row) => row);


  await db('dbo.TOMAFI_PART').insert({
    COD_ARTICULO: data.COD_ARTICULO,
    DESCRIP_ARTI: data.DESCRIP_ARTI,
    TIPO_CUENTA: data.cuenta,
    PARTIDA: data.COD_PARTIDA,
    COSTO: LAST_PARTIDA.COSTO_UNI,
    CANT_PARTI: data.CANT_PEND - data.CANT_CONTEO,
    UBICACION_ARTI: data.UBICACION_PARTIDA,
  })

}

const saveLog = async (data) => {
  await db('dbo.TOMAFI_LOG').insert({
    USUARIO: data.USUARIO || 'SIX',
    UBICACION_ARTI: data.UBICACION_PARTIDA,
    COD_ARTICULO: data.COD_ARTICULO,
    DESCRIP_ARTI: data.DESCRIP_ARTI,
    FECHA_VENCI: data.FECHA_VENCI,
    CANTIDAD: data.CANT_PEND,
    UNI_X_BULTO: data.UNI_X_BULTO,
    CANT_CONTEO: data.CANT_CONTEO,
    CANT_SISTEMA: data.CANTI,
    DIFERENCIA: (data.CANT_PEND - data.CANT_CONTEO),
    ULTIMO_REG: data.ULTIMO_REG ?? 'No',
    DEPOSITO: data.COD_DEPO,
    TIPO_CUENTA: data.cuenta,
  })

}
const saveSobrante = async (data) => {

  const LAST_PARTIDA = await db.select("*").from("dbo.compro_partidas").where("COD_ARTICULO", data.COD_ARTICULO).orderBy('FECHA', 'desc').first().then((row) => row);

  await db('dbo.TOMAFI_PART').insert({
    COD_ARTICULO: data.COD_ARTICULO,
    DESCRIP_ARTI: data.DESCRIP_ARTI,
    TIPO_CUENTA: data.cuenta,
    PARTIDA: 'CONTEO',
    COSTO: LAST_PARTIDA.COSTO_UNI,
    CANT_PARTI: data.CANT_CONTEO,
    UBICACION_ARTI: data.UBICACION_PARTIDA,
  })

}


module.exports = {
  findAllLocations,
  fyndByBarcode,
  findExtraInfo,
  saveSobrante,
  getPartidas,
  saveAjuste,
  saveLog
}
