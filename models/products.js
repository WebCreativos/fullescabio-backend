const db = require("../config/database.js");
const knex = require("knex");

const findExtraInfo = async (code) => {
  return db.select("*").from("dbo.compro_partidas").where("COD_ARTICULO", code).first().then((row) => row);
};
const findAllLocations = async () => {
  return db.select("ubicacion_partida").from("dbo.compro_partidas").groupBy('ubicacion_partida')
};
const getPartidasWithPendCant = async (loc) => {
  return db.select('*').from("dbo.compro_partidas AS cp").where('cp.CANT_PEND', '>', 0).andWhere('cp.ubicacion_partida', loc).
  groupBy('COD_ARTICULO')
}


const fyndByBarcode = async (data) => {
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
    .where('ART.COD_BARRAS', data.barcode)
    .where('c.CANT_PEND', '>', 0)
    .andWhere('c.COD_DEPO', 'DEP')
    //.andWhere('c.ubicacion_partida', data.ubicacion)
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
  var AJUSTE_PARTI = 0
  let partis = []

  // Verificamos que la tabla "dbo.compro_partidas" existe y tiene el esquema correcto
    const partidas = await db.select("*").from("dbo.compro_partidas")
    .where("COD_ARTICULO", data.COD_ARTICULO).andWhere('CANT_PEND', '>', 0)
    .andWhere('COD_DEPO', data.COD_DEPO)
    .andWhere('UBICACION_PARTIDA', data.UBICACION_PARTIDA)
    .orderBy('FECHA', 'asc').then((row) => row);

    while (diferencia > 0) {
      // Si ya no quedan partidas, terminamos el bucle
      if (partidas.length === 0) {
        break
      }
      const partida = partidas.shift()
      if (diferencia <= partida.CANT_PEND) {
        // Si la cantidad a restar es menor o igual a la cantidad pendiente,
        // restamos la cantidad a restar de la partida y ponemos la cantidad pendiente en 0
        partida.CANT_PEND -= diferencia
        AJUSTE_PARTI = diferencia
        diferencia = 0
        partis.push(partida)
      } else {
        // Si la cantidad a restar es mayor a la cantidad pendiente,
        // restamos la cantidad pendiente de la diferencia 
        diferencia -= partida.CANT_PEND
        AJUSTE_PARTI = partida.CANT_PEND
        partida.CANT_PEND = 0
        partis.push({
          ...partida
        })
      }
    
    // actualiza la partida
    try {
      await db('dbo.TOMAFI_PART').insert({
        COD_ARTICULO: partida.COD_ARTICULO,
        DESCRIP_ARTI: data.DESCRIP_ARTI,
        TIPO_CUENTA: data.cuenta,
        PARTIDA: partida.COD_PARTIDA,
        COSTO: partida.COSTO_UNI,
        CANT_PEND: partida.CANT_PEND,
        AJUSTE_PARTI:AJUSTE_PARTI,
        UBICACION_ARTI: data.UBICACION_PARTIDA,
        CAM_FECH:data.CAM_FECH,
        FECHA_EJEC: new Date(),
        FECHA_VENCI: partida.FECHA_VENCI,
      });
      } catch(error) {
      console.error("Error al actualizar partida: ", error);
      throw error;
      }
      }
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
    CAM_FECH:(data.CAM_FECH)?'Si':'No',
    FECHA_EJEC: new Date(),
    CONTADO:"S"
  })

}
const savePendings = async (data) => {
  await data.articles.forEach(async el => {

    await db('dbo.TOMAFI_LOG').insert({
      USUARIO: data.USUARIO || 'TERMINAR CUENTA',
      UBICACION_ARTI: data.UBICACION_PARTIDA,
      COD_ARTICULO: el.COD_ARTICULO,
      FECHA_EJEC: new Date(),
      CONTADO:"N"
    })      
  });

}


const saveSobrante = async (data) => {

  const LAST_PARTIDA = await db.select("*").from("dbo.compro_partidas").where("COD_ARTICULO", data.COD_ARTICULO).orderBy('FECHA', 'desc').first().then((row) => row);
  const article = await db.select("*").from("dbo.ARTICULOS").where("COD_ARTICULO", data.COD_ARTICULO).first().then((row) => row);

  await db('dbo.TOMAFI_PART').insert({
    COD_ARTICULO: data.COD_ARTICULO,
    DESCRIP_ARTI: data.DESCRIP_ARTI,
    TIPO_CUENTA: 3,
    PARTIDA: 'SOBRANTE',
    COSTO: article.PRECIO_UNI,
    AJUSTE_PARTI: data.CANT_CONTEO,
    CANT_PEND: data.CANT_CONTEO,
    UBICACION_ARTI: data.UBICACION_PARTIDA,
    FECHA_EJEC: new Date(),
    FECHA_VENCI: data.FECHA_VENCI,
  })

}


module.exports = {
  getPartidasWithPendCant,
  findAllLocations,
  fyndByBarcode,
  findExtraInfo,
  savePendings,
  saveSobrante,
  saveAjuste,
  saveLog
}
