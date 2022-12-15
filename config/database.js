require("dotenv").config();
const pg = require("pg");
// pg.defaults.ssl = true;


const knex = require("knex");


module.exports = knex({
  client: "mssql",
  useNullAsDefault: true,
  connection: process.env.DATABASE_URL,
  connection: {
    host: '',
    port: '',
    user: '',
    password: '',
    database: ''
  },
  migrations: {
    directory: "../database/migrations"
  },
  seeds: {
    directory: "../database/seeds"
  }
});

