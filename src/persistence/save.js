export const SAVE_KEY='based-in-space-moonfall-v2';
export function migrateSave(raw={}){
 if(!raw||typeof raw!=='object')raw={};
 const old=raw.upgrades||{};
 const level=v=>Math.max(0,Math.min(5,Math.floor(Number(v)||0)));
 return {...raw,version:2,credits:Math.max(0,Number(raw.credits)||0),bestScore:Math.max(0,Number(raw.bestScore??raw.highScore??raw.score)||0),runs:Math.max(0,Number(raw.runs)||0),upgrades:{...old,hull:level(old.hull),shield:level(old.shield),engines:level(old.engines)},settings:{...(raw.settings||{})}};
}
export function loadSave(storage){
 try{storage??=globalThis.localStorage;return migrateSave(JSON.parse(storage?.getItem(SAVE_KEY)||storage?.getItem('based-in-space-save')||storage?.getItem('based-in-space')||'{}'));}catch{return migrateSave();}
}
export function saveGame(game,storage){
 const save=migrateSave(game.save||game);
 if(game.player){save.bestScore=Math.max(save.bestScore,game.score||0);if(game.phase==='debrief'&&!game._rewarded){save.credits+=Math.max(50,Math.floor((game.score||0)/10));save.runs++;game._rewarded=true;}game.save=save;}
 try{storage??=globalThis.localStorage;storage?.setItem(SAVE_KEY,JSON.stringify(save));}catch{/* Private browsing / full storage: the current run remains playable. */}
 return save;
}
