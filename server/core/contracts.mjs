import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import {routes,CONTRACT_VERSION} from '../../contracts/generated/routes.mjs';

const specification=JSON.parse(fs.readFileSync(new URL('../../contracts/openapi.json',import.meta.url),'utf8'));
const schemaId='https://xiaojiu.local/contracts/schema';
// No coercion, default insertion or field removal: request hashes must stay identical.
const ajv=new Ajv2020({strict:false,validateFormats:false,coerceTypes:false,useDefaults:false,removeAdditional:false,allErrors:false});
function localRefs(value){
 if(Array.isArray(value))return value.map(localRefs);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='$ref'&&typeof v==='string'&&v.startsWith('#/components/schemas/')?schemaId+'#/$defs/'+v.slice('#/components/schemas/'.length):localRefs(v)]));
 return value;
}
ajv.addSchema({$id:schemaId,$defs:localRefs(specification.components.schemas)});
const validators=new Map();
export function contractValidator(schema){
 const key=JSON.stringify(schema);
 if(!validators.has(key))validators.set(key,ajv.compile(localRefs(schema)));
 return validators.get(key);
}
export function contractOperation(route){return specification.paths[route.schemaPath][route.method.toLowerCase()];}

// Register aliases at the SAME point as their old handlers, preserving auth order.
// No prefix rewriting, redirects or separate business writes.
export function installContractRoutes(app){
 const definitions=new Map(routes.map(route=>[route.method+' '+route.legacy,route]));
 const registered=new Set();
 for(const method of ['get','post','patch','put','delete']){
  const original=app[method].bind(app);
  app[method]=function(paths,...handlers){
   // Express app.get(name) is also a settings getter.
   if(!handlers.length)return original(paths);
   for(const legacy of Array.isArray(paths)?paths:[paths]){
    const definition=definitions.get(method.toUpperCase()+' '+legacy);
    if(!definition){
     if(typeof legacy==='string'&&legacy.startsWith('/api/'))throw new Error(`Unregistered HTTP contract: ${method} ${legacy}`);
     original(legacy,...handlers);continue;
    }
    const operation=contractOperation(definition);
    const bodySchema=operation.requestBody?.content?.['application/json']?.schema;
    const validateBody=operation['x-field-coverage']==='reviewed'&&bodySchema?contractValidator(bodySchema):null;
    const guard=(req,res,next)=>{
     res.setHeader('X-Contract-Version',CONTRACT_VERSION);
     if(validateBody&&!validateBody(req.body))return next(Object.assign(new Error('提交内容格式无效，请检查字段类型和必填内容。'),{status:400}));
     next();
    };
    original(definition.path,guard,...handlers);
    // Legacy keeps its original validation/error behavior during migration.
    original(legacy,...handlers);
    registered.add(method.toUpperCase()+' '+legacy);
   }
   return app;
  };
 }
 return {assertComplete(){const missing=[...definitions.keys()].filter(key=>!registered.has(key));if(missing.length)throw new Error('HTTP contract handlers missing: '+missing.join(', '));}};
}
