'use strict';

let express = require('express');
let app = express();
let router = require('./api/router');
let bodyParser = require('body-parser');

module.exports = {
  initServer: function () {
    app.use(bodyParser.json());

    router(app);

    app.listen(3000, function () {
      console.log('Mobro server listening on port 3000!');
    });
  }
};
