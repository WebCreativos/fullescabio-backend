require("dotenv").config();
// pg.defaults.ssl = true;


const knex = require("knex");


module.exports = knex({
  client: "mssql",
  useNullAsDefault: true,
  connection: process.env.DATABASE_URL,
  connection: {
    host: '190.60.174.223',
    port: 50128,
    user: 'full_pruebas',
    password: 'Full$$2020',
    database: 'factu_full_central'
  },
  migrations: {
    directory: "../database/migrations"
  },
  seeds: {
    directory: "../database/seeds"
  }
});

