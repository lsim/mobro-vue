let httpRequest = require('../../services/http-request');

function extractVersions(systemXmlObj) {
  let systemObj = {};
  systemXmlObj.root.children.forEach((child) => systemObj[child.name] = child.content)
  return {
    cis: systemObj.Version,
    mapi: systemObj.ModelAPI,
    database: systemObj.DatabaseVersion
  }
}

function getModelMetaData(targetHost) {
  const modelMetaRequestOptions = {
    hostname: targetHost,
    port: 8081,
    path: '/fapi.model.meta/all',
    headers: {
      'Accept': 'application/json'
    }
  };
  return httpRequest.issueGet(modelMetaRequestOptions).then((result) => {
    console.log(`Successfully forwarded model meta request to ${targetHost}`);
    return result;
  });
}

function getSystemData(targetHost) {
  const systemRequestOptions = {
    hostname: targetHost,
    port: 8080,
    path: '/System',
    headers: {
      'Accept': 'application/xml',
      'User-Agent': 'Mobro-node-server'
    }
  };
  return httpRequest.issueGet(systemRequestOptions).then((result) => {
    console.log(`Successfully forwarded system request to ${targetHost}`);
    return extractVersions(result);
  });
}

module.exports = {

  modelMetaJson: (req, res, next) => {
    const targetHost = req.params.targetHost;
    if(!targetHost) {
      return next("Please specify a host to forward the request to");
    }

    let modelMetaPromise = getModelMetaData(targetHost).catch((error) => {
      next(`Forwarded model.meta request failed ${targetHost} ${error}`);
    });

    let systemPromise = getSystemData(targetHost).catch((error) => {
      next(`Forwarded system request failed ${targetHost} ${error}`);
    });

    Promise.all([modelMetaPromise, systemPromise]).then(([modelMetaResult, systemResult]) => {
      res.json({
        modelMeta: modelMetaResult,
        system: systemResult
      });
    });
  },

  foo: () => 42

};
