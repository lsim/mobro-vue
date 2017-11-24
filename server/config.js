'use strict';

//TODO: this needs to go into a configuration file
let BUILD_TYPE = 'prod';

module.exports = {

  STATIC_CONTENT_ROOT: `${__dirname}/../../dist/${BUILD_TYPE}`,
  NODE_MODULES_ROOT: `${__dirname}/../../node_modules`
};
