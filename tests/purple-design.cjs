const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const luminance=hex=>{const rgb=hex.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
test('theme text and filled-control pairs meet WCAG AA normal text contrast',()=>{
 for(const [fg,bg] of [['b89bff','242b33'],['a5afbb','242b33'],['f2f5f7','181d23'],['6b3ab8','ffffff'],['5c6571','f5f6f7'],['ffffff','7445cc']]){
  const values=[luminance(fg),luminance(bg)].sort((a,b)=>b-a);
  assert.ok((values[0]+.05)/(values[1]+.05)>=4.5,fg+' on '+bg);
 }
});
test('every public page applies saved theme before styles, including blocked storage',()=>{
 for(const p of ['index.html','reader.html','manga.html','my-library.html','stats.html','feedback.html']){
  const html=read(p),script=html.match(/<script>(try\{const savedTheme=[\s\S]*?)<\/script>/)[1];
  assert.ok(html.indexOf(script)<html.indexOf('rel="stylesheet"'),p);
  for(const stored of [null,'light','dark','invalid']){
   let theme;new Function('localStorage','document',script)({getItem:()=>stored},{documentElement:{setAttribute:(k,v)=>theme=v}});
   assert.equal(theme,stored==='light'?'light':'dark',p);
  }
  let theme;new Function('localStorage','document',script)({getItem:()=>{throw Error()}},{documentElement:{setAttribute:(k,v)=>theme=v}});assert.equal(theme,'dark');
 }
});
test('reader inherits theme variables and selected controls use contrasting fill',()=>{
 const css=read('simple-comix.css');
 assert.match(css,/html\[data-theme="light"\] body\.reader\{\s*--paper:inherit;--card:inherit;--ink:inherit;--mute:inherit;--line:inherit;--red:inherit/);
 assert.match(css,/body\.reader \.dir-btn\.active,[\s\S]*?background:var\(--accent-fill\)/);
});
