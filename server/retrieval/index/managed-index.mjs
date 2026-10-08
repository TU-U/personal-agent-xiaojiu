import {db,getSetting} from '../../store.mjs';
import {indexCollection} from '../../ai/embedding-contract.mjs';
export function managedIndex(config){
 const id=getSetting('activeIndexMigration',null);if(!id)return null;
 const row=db.prepare("SELECT * FROM index_migrations WHERE id=?").get(id);
 if(!row)return null;
 const target=JSON.parse(row.target);
 return target.indexProfile===config.indexProfile&&target.model===config.model&&target.qdrant===config.qdrant&&target.embedding===config.embedding?{...row,compatible:row.collection_name===indexCollection(config)&&['building','ready'].includes(row.state)}:null;
}
export function preserveIndexProfile(old,value){
 return old.indexProfile&&['qdrant','embedding','model'].every(k=>String(value[k]||'').replace(/\/$/,'')===String(old[k]||'').replace(/\/$/,''))?{indexProfile:old.indexProfile}:{};
}
