import {useEffect,useRef} from 'react';
import type {PetSourceTarget} from './PetReminderTable';
export function usePetTarget(page:string,handle:(item:PetSourceTarget)=>boolean){
 const handler=useRef(handle);handler.current=handle;
 const consume=()=>{try{const value=sessionStorage.getItem('petReminderTarget');if(!value)return;const item=JSON.parse(value) as PetSourceTarget;if(item.actionTarget.page===page&&handler.current(item))sessionStorage.removeItem('petReminderTarget');}catch{sessionStorage.removeItem('petReminderTarget');}};
 useEffect(()=>{consume();});
 useEffect(()=>{window.addEventListener('pet-reminder-target',consume);return()=>window.removeEventListener('pet-reminder-target',consume);},[page]);
}
export function focusPetSource(id:string){requestAnimationFrame(()=>requestAnimationFrame(()=>{const element=document.getElementById(id);element?.scrollIntoView({block:'center',behavior:'smooth'});element?.focus({preventScroll:true});}));}
