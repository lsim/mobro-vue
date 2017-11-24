'use strict';

let http = require('http');
let xmlParser = require('xml-parser');

module.exports = {

  issueGet: (url) => {
    return new Promise((resolve, reject) => {

      http.get(url, (res) => {
        const statusCode = res.statusCode;
        const contentType = res.headers['content-type'];

        let error;
        if (statusCode !== 200) {
          error = new Error(`Request Failed.\n` +
            `Status Code: ${statusCode}`);
        }
        else if (!/^application\/json/.test(contentType) && !/^application\/xml.*/.test(contentType)) {
          error = new Error(`Invalid content-type.\n` +
            `Expected application/json or application/xml but received ${contentType}`);
        }
        if (error) {
          // consume response data to free up memory
          res.resume();
          reject(error);
        }

        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => rawData += chunk);
        res.on('end', () => {
          try {
            let parsedData = null;
            if(/^application\/json/.test(contentType)) {
              parsedData = JSON.parse(rawData);
            } else if(/^application\/xml/.test(contentType)) {
              parsedData = xmlParser(rawData);
            }

            resolve(parsedData);
          } catch (e) {
            reject(error);
          }
        });

      }).on('error', (e) => {
        reject(e);
      });
    });
  }
};
