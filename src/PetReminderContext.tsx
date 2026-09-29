import {createContext,useContext,type ReactNode} from 'react';
import {openPetReminder,usePetReminders} from './PetReminderTable';

const Context=createContext<ReturnType<typeof usePetReminders>|null>(null);
export function PetReminderProvider({cursor,children}:{cursor:number;children:ReactNode}){
 const state=usePetReminders(cursor);
 return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useSharedPetReminders(){
 const state=useContext(Context);
 if(!state)throw new Error('小九提示需要位于统一数据源内。');
 return state;
}
export function PetSourcePrompt({kind,id}:{kind:string;id:string}){
 const state=useSharedPetReminders();
 const item=!state.error&&state.data?.items.find(item=>item.sourceKind===kind&&item.sourceId===id);
 return item?<p className="pet-source-prompt" data-pet-reminder-id={item.id}>小九：{item.message}</p>:null;
}
export function HomeEventPrompts(){
 const state=useSharedPetReminders();
 const items=state.error?[]:state.data?.items.filter(item=>item.sourceKind==='event')||[];
 return items.length?<section className="home-todos" aria-label="小九的要事提示"><h2>小九 · 要事检查</h2>{items.map(item=><button key={item.id} data-pet-reminder-id={item.id} onClick={()=>openPetReminder(item)}><span>{item.title}<small className="pet-source-prompt">小九：{item.message}</small></span></button>)}</section>:null;
}
