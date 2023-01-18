const db = require("../config/database.js");
const knex = require("knex");

const findExtraInfo = async (code) => {
  return db.select("*").from("dbo.compro_partidas").where("COD_ARTICULO", code).first().then((row) => row);
};
const findAllLocations = async () => {
  return db.select("ubicacion_partida").from("dbo.compro_partidas").groupBy('ubicacion_partida')
};
const getPartidasWithPendCant = async (loc) => {
  return db.select("[CP].[CANT_PEND]","[COD].[DESCRIP_ARTI]").from("dbo.compro_partidas AS cp").
  innerJoin('dbo.ARTICULOS as COD', 'COD.COD_ARTICULO', 'cp.COD_ARTICULO').where('cp.CANT_PEND', '>', 0).andWhere('cp.ubicacion_partida', loc).then((row) => row);
}


const fyndByBarcode = async (barcode) => {
  var articulos = await db.with('COD_ARTICULOS', function (query) {
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
    articulos = articulos.reduce((acc, curr) => {
      const index = acc.findIndex(item => item.UBICACION_PARTIDA === curr.UBICACION_PARTIDA)
      index > -1 ? acc[index].CANT_PEND += curr.CANT_PEND : acc.push({
        ...curr,
        CANT_PEND: curr.CANT_PEND
      })
      return acc
    }, []).map((d)=>{
      return{
        ...d,
        CANTIDAD:0,
        FECHA_VENCI:(d.FECHA_VENCI)? d.FECHA_VENCI[0] : null
      }
    })
        
  return articulos;
};
const saveAjuste = async (data) => {
  var diferencia = data.CANT_PEND - data.CANT_CONTEO
  let partis = []

  const partidas = await db.select("*").from("dbo.compro_partidas")
  .where("COD_ARTICULO", data.COD_ARTICULO).andWhere('CANT_PEND', '>', 0)
  .andWhere('CANT_PEND', '>', 0)
  .andWhere('COD_DEPO', data.COD_DEPO)
  .orderBy('FECHA', 'asc').then((row) => row);


  while (diferencia > 0) {
    // Si ya no quedan partidas, terminamos el bucle
    if (partidas.length === 0) {
      break
    }
    const partida = partidas.shift()
    const cantidadARestar = Math.min(partida.CANT_PEND, diferencia)
    if (cantidadARestar <= partida.CANT_PEND) {
      // Si la cantidad a restar es menor o igual a la cantidad pendiente,
      // restamos la cantidad a restar de la partida y añadimos la partida a la lista de partis
      partida.CANT_PEND -= cantidadARestar
      diferencia = cantidadARestar - partida.CANT_PEND
      partis.push(partida)
    } else {
      // Si la cantidad a restar es mayor a la cantidad pendiente,
      // restamos la cantidad pendiente de la partida y añadimos la partida a la lista de partis
      diferencia = cantidadARestar - partida.CANT_PEND
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
      AJUSTE_PARTI: partida.CANT_PEND,
      UBICACION_ARTI: data.UBICACION_PARTIDA,
      FECHA_EJEC: new Date(),
    })
  }

  const LAST_PARTIDA = await db.select("*").from("dbo.compro_partidas").where("COD_ARTICULO", data.COD_ARTICULO).orderBy('FECHA', 'desc').first().then((row) => row);


  await db('dbo.TOMAFI_PART').insert({
    COD_ARTICULO: data.COD_ARTICULO,
    DESCRIP_ARTI: data.DESCRIP_ARTI,
    TIPO_CUENTA: data.cuenta,
    PARTIDA: data.COD_PARTIDA,
    COSTO: LAST_PARTIDA.COSTO_UNI,
    AJUSTE_PARTI: data.CANT_PEND - data.CANT_CONTEO,
    UBICACION_ARTI: data.UBICACION_PARTIDA,
    FECHA_EJEC: new Date(),
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
    FECHA_EJEC: new Date(),
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
    AJUSTE_PARTI: data.CANT_CONTEO,
    UBICACION_ARTI: data.UBICACION_PARTIDA,
    FECHA_EJEC: new Date(),
  })

}


module.exports = {
  getPartidasWithPendCant,
  findAllLocations,
  fyndByBarcode,
  findExtraInfo,
  saveSobrante,
  saveAjuste,
  saveLog
}
