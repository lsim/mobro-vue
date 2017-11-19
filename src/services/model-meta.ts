import Event from './event';

import axios, {AxiosRequestConfig} from 'axios';
import 'rxjs/Rx';
import * as _ from 'lodash';

export class ModelMetaService {

  allTypes: Array<IRawModelType>;
  typeHierarchyLoaded = false;
  currentModelMetaHost: string;
  hostChanged: Event<string> = new Event<string>();
  detailsChanged: Event<ModelDetails> = new Event<ModelDetails>();

  buildTypeHierarchy(allTypes: Array<IRawModelType>) {
    let modelTypeMap: {[key: string]: ModelType} = {};
    // First a pass to create an object instance for each raw type object
    allTypes.forEach((rawType: IRawModelType) => modelTypeMap[rawType.path] = new ModelType(rawType));
    let typeLookup = (s: string) => <ModelType>modelTypeMap[s];
    // Then a pass to set up references between object instances
    _.values(modelTypeMap).forEach((modelType: ModelType) => modelType.setReferenceProperties(typeLookup));
    // Lastly a pass to build ancestor lists and set inbound references
    _.values(modelTypeMap).forEach((modelType: ModelType) => {
      modelType.createAndReturnAncestorList();
      modelType.setInboundReferences(<Array<ModelType>>_.values(modelTypeMap));
    });
    return modelTypeMap;
  }

  getFullTypeHierarchy(): Promise<{[key: string]: ModelType}> {
    if (this.typeHierarchyLoaded) {
      return new Promise((resolve) => {
        const typeHierarchy = this.buildTypeHierarchy(this.allTypes);
        resolve(typeHierarchy);
      });
    }
    return this.sendFapiRequest('all', this.currentModelMetaHost)
      .then((responseObj: any) => {
        this.handleNewModelDetails(responseObj.system);
        let allTypesObj = responseObj.modelMeta;
        this.allTypes = <Array<IRawModelType>>_.values(allTypesObj);
        this.typeHierarchyLoaded = true;
        return this.buildTypeHierarchy(this.allTypes);
      });
  }

  handleNewModelDetails(modelDetails: ModelDetails) {
    modelDetails.host = this.currentModelMetaHost;
    this.detailsChanged.emit(modelDetails);
  }

  setModelMetaHost(modelMetaHost: string) {
    if (modelMetaHost !== this.currentModelMetaHost) {
      this.allTypes = [];
      this.typeHierarchyLoaded = false;
      this.currentModelMetaHost = modelMetaHost;
      this.hostChanged.emit(modelMetaHost);
    }
  }

  private sendFapiRequest(endpoint: string, ...args: string[]) {
    let argPart = args.length > 0 ? '/' + args.join('/') : '';
    let url = `/api/${endpoint}${argPart}`;

    let axiosConfig: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    return axios.get(url, axiosConfig)
      .then(x => JSON.parse(x.data))
      .catch(error => console.debug(`Request for ${url} failed with error ${error}`));
  }
}

export default new ModelMetaService();

enum PropertyType {
  primitive,
  object,
  enum,
  reference,
  collection
}

interface IRawModelProperty {
  // all
  type: string;
  // all
  propertyName: string;
  // all
  attributes: Array<string>;
  // all
  path: string;
  // type object/reference
  referenceType: string;
  // type enum
  values: Array<string>;
  isMember: boolean;
  // type primitive
  name: string;
  // type collection
  collectionType: string;
  // type collection
  parameterType: string;
}

let propertyMapper: any = {
  primitive: { description: (p: any) => p.name },
  object: { description: (p: any) => p.referenceType },
  enum: { description: (p: any) => `enum (${p.values.join(',')})` },
  reference: { description: (p: any) => p.referenceType, referencedTypeName: (p: any) => p.referenceType },
  collection: { description: (p: any) => p.parameterType + '+', referencedTypeName: (p: any) => p.parameterType }
};

export class ModelProperty {
  name: string;
  isNullable: boolean;
  isNotNull: boolean;
  isImmutable: boolean;
  description: string;
  referencedType: ModelType;
  type: string;

  constructor(rawProp: IRawModelProperty, typeLookup: (s: string) => ModelType) {
    this.name = rawProp.propertyName;
    this.isNullable = rawProp.attributes.indexOf('Nullable') >= 0;
    this.isNotNull = rawProp.attributes.indexOf('NotNull') >= 0;
    this.isImmutable = rawProp.attributes.indexOf('Immutable') >= 0;
    this.type = rawProp.type;

    let mapper = propertyMapper[rawProp.type];
    this.description = mapper.description(rawProp);
    if (mapper.referencedTypeName) {
      let refTypeName = mapper.referencedTypeName(rawProp);
      if (refTypeName) {
        this.referencedType = typeLookup(refTypeName);
      }
    }
  }
}

export interface IRawModelType {
  _extends: string;
  attributes: string[];
  fields: any; // Seems we can't use the Map<string, stuff> yet. Browser complains.
  path: string;
}

export class ModelType {
  name: string;
  superType: ModelType;
  ancestors: Array<ModelType>;
  properties: Array<ModelProperty> = [];
  attributes: Array<string>;
  rawModelEntity: IRawModelType;
  subtypes: Array<ModelType> = [];
  inboundRefs: Array<InboundReference> = [];

  constructor(rawModelEntity: IRawModelType) {
    this.rawModelEntity = rawModelEntity;
    this.name = rawModelEntity.path;
    this.attributes = rawModelEntity.attributes;
  }

  setReferenceProperties(typeLookup: (s: string) => ModelType) {
    this.superType = typeLookup(this.rawModelEntity._extends);
    if (this.superType !== undefined) {
      this.superType.addSubtype(this);
    }
    this.properties = _.values(this.rawModelEntity.fields)
      .map((prop: any) => {
        if (prop.attributes && !_.isArray(prop.attributes)) { // In berlin and older versions, attributes is an object
          let attributes: Array<String> = [];
          for (let fieldName in prop.attributes) {
            if (fieldName === 'nullable' && prop.attributes[fieldName] === 'true') {
              attributes.push('Nullable');
            } else if (fieldName === 'nullable' && prop.attributes[fieldName] === 'false') {
              attributes.push('NotNull');
            }
          }
          if (_.keys(prop.attributes).length === 0) {
            attributes.push('Immutable');
          }
          prop.attributes = attributes;
        }
        return prop;
      })
      .map((rawProp: IRawModelProperty) => new ModelProperty(rawProp, typeLookup))
      .sort((p1: any, p2: any) => p1.name.localeCompare(p2.name));
  }

  createAndReturnAncestorList(): Array<ModelType> {
    if (this.ancestors) {
      return this.ancestors;
    }
    this.ancestors = [];
    if (this.superType !== undefined) {
      this.ancestors = [this.superType].concat(this.superType.createAndReturnAncestorList());
    }
    return this.ancestors;
  }

  setInboundReferences(allTypes: Array<ModelType>) {
    let result: Array<InboundReference> = [];
    allTypes.forEach((t) => {
      let newInboundRefs = t.properties
        .filter((p) => p.referencedType === this)
        .map((p: ModelProperty) => new InboundReference(p.name, t));
      if (newInboundRefs.length > 0) {
        result = result.concat(newInboundRefs);
      }
    });
    this.inboundRefs = result;
  }

  // TODO: create UI allowing the user to set this
  addSubtype(type: ModelType) {
    this.subtypes.push(type);
  }
}

export class InboundReference {
  constructor(public propName: string, public ownerType: ModelType) {}
}

export interface ModelDetails {
  host: string;
  cis: string;
  mapi: string;
  database: string;
}
