'use strict';

let modelMetaLogic = require('./modelmeta.logic');

module.exports = (api) => {

  api.get('/all/:targetHost', modelMetaLogic.modelMetaJson);

};
