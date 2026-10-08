// Screen and window positions are Electron DIP coordinates, including negative monitors.
export const PET_SIZE={width:122,height:156};
const margin=12,gap=10;
const clamp=(v,min,max)=>Math.round(Math.max(min,Math.min(v,max)));
export function placePet(anchor,area){
 const width=Math.min(490,area.width),height=Math.min(720,area.height);
 const x=clamp(anchor.x,area.x+margin,area.x+area.width-PET_SIZE.width-margin);
 const y=clamp(anchor.y,area.y+margin,area.y+area.height-PET_SIZE.height-margin);
 // Prefer space above/left; when the window reaches an edge the pet moves inside it.
 const window={x:clamp(x-width+PET_SIZE.width+margin,area.x,area.x+area.width-width),y:clamp(y-height+PET_SIZE.height+margin,area.y,area.y+area.height-height),width,height};
 const pet={x:x-window.x,y:y-window.y,...PET_SIZE};
 const above=pet.y-gap-margin,below=height-pet.y-pet.height-gap-margin;
 const up=above>=below,panelHeight=Math.min(540,Math.max(0,up?above:below)),panelWidth=Math.min(440,width-2*margin);
 const panel={x:clamp(pet.x+pet.width-panelWidth,margin,width-panelWidth-margin),y:up?pet.y-gap-panelHeight:pet.y+pet.height+gap,width:panelWidth,maxHeight:panelHeight};
 const speech={x:clamp(pet.x+pet.width-230,margin,width-230-margin),y:up?pet.y-gap-100:pet.y+pet.height+gap};
 const labelLeft=pet.x>=168?-168:pet.width+gap;
 return {anchor:{x,y},window,pet,panel,speech,labelLeft};
}
