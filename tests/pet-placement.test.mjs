import {test} from 'node:test';
import assert from 'node:assert/strict';
import {placePet,PET_SIZE} from '../desktop/pet-placement.mjs';
test('pet can reach all four edges, including upper half and negative monitor coordinates',()=>{
 for(const area of [{x:0,y:0,width:1920,height:1040},{x:-1280,y:-900,width:1280,height:860},{x:0,y:40,width:1024,height:728}]){
  for(const target of [{x:area.x,y:area.y},{x:area.x+area.width,y:area.y},{x:area.x,y:area.y+area.height},{x:area.x+area.width,y:area.y+area.height},{x:area.x+area.width/2,y:area.y+area.height/2}]){
   const {anchor,window,pet,panel}=placePet(target,area);
   assert.equal(window.x+pet.x,anchor.x);assert.equal(window.y+pet.y,anchor.y);
   assert.ok(anchor.x>=area.x&&anchor.y>=area.y&&anchor.x+PET_SIZE.width<=area.x+area.width&&anchor.y+PET_SIZE.height<=area.y+area.height);
   assert.ok(panel.x>=0&&panel.y>=0&&panel.x+panel.width<=window.width&&panel.y+panel.maxHeight<=window.height);
   if(target.y===area.y)assert.equal(anchor.y,area.y+12,'no 720px window-height restriction');
   assert.ok(panel.y+panel.maxHeight<=pet.y||panel.y>=pet.y+PET_SIZE.height,'panel does not cover the pet');
  }
 }
});
