import type {PetSourceTarget} from './PetReminderTable';
export type PetLayout={pet:{x:number;y:number};panel:{x:number;y:number;width:number;maxHeight:number};speech:{x:number;y:number};labelLeft:number};
export type DesktopTarget={page:string;source?:PetSourceTarget};
export type DesktopSettings={autostart:boolean;supported:boolean;logFile:string;backend:{shared:boolean;owned:boolean}|null};
declare global {interface Window {xiaojiuDesktop?:{
 role:'main'|'pet';openMain:(target?:DesktopTarget)=>Promise<boolean>;settings:()=>Promise<DesktopSettings>;setAutostart:(enabled:boolean)=>Promise<DesktopSettings>;
 retry:()=>Promise<void>;logs:()=>Promise<void>;serverLogs:()=>Promise<void>;quit:()=>Promise<void>;mouse:(interactive:boolean)=>void;drag:(active:boolean)=>void;
 move:(dx:number,dy:number)=>void;onPetLayout:(callback:(layout:PetLayout)=>void)=>()=>void;
 onNavigate:(callback:(target:DesktopTarget)=>void)=>()=>void;
}}}
export const desktop=window.xiaojiuDesktop;
export function navigateDesktop(target:DesktopTarget){if(desktop?.role==='pet'){void desktop.openMain(target);return true;}return false;}
