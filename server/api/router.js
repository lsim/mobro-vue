'use strict';

let express = require('express');
let config = require('../config');

module.exports = (app) => {

  //Create API sub router
  let api = express.Router();

  //Register routes
  require('./modelmeta/modelmeta.routes')(api);

  //Use the API router
  app.use('/api', api);

  //Forward other requests to static content
  app.use(express.static(config.STATIC_CONTENT_ROOT));

};
