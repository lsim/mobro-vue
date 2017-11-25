#!/bin/bash

# This script builds a zip file suitable for copying and unpacking into a hosting environment

zip -r mobro-bundle.zip ./server ./dist -x server/node_modules/\*

pushd deploy-scripts

zip -u ../mobro-bundle.zip install-service.sh
zip -u ../mobro-bundle.zip start.sh

popd
