/* Pure, dependency-free import/quality helpers. No AI or grammar-perfect claims. */
(function(global){"use strict";
const IMAGE_RE=/^\[\[image:(https?:\/\/[^\]|]+)(?:\|([^\]]*))?\]\]$/i;
function blocksFromText(text){
  return String(text||"").replace(/\r\n?/g,"\n").split(/\n\s*\n/g)
    .map(p=>p.trim()).filter(Boolean).map(part=>{
      const m=part.match(IMAGE_RE);
      return m?{type:"illustration",src:m[1].trim(),alt:(m[2]||"").trim(),caption:(m[2]||"").trim()}:{type:"paragraph",text:part};
    });
}
function textFromBlocks(blocks){
  return (blocks||[]).map(b=>b.type==="illustration"?
   "[[image:"+(b.src||"")+"|"+(b.caption||"")+"]]":b.text||"").join("\n\n");
}
function analyze(text,terms=[]){
  const issues=[], paragraphs=blocksFromText(text).filter(b=>b.type==="paragraph").map(b=>b.text);
  const normalized=new Map();
  paragraphs.forEach((p,index)=>{
    const short=p.replace(/\s+/g," ").toLowerCase();
    if(short.length>24&&normalized.has(short))issues.push({kind:"duplicate",message:"Давхардсан догол мөр: "+(index+1)});
    normalized.set(short,index);
    if(p.length>1800)issues.push({kind:"length",message:"Хэт урт догол мөр: "+(index+1)});
    if(/[!?.,]{4,}/.test(p))issues.push({kind:"punctuation",message:"Давтагдсан цэг тэмдэг: "+(index+1)});
    if(/(?:\bchapter\s+\d+\b|\bvolume\s+\d+\b)/i.test(p)&&p.length<120)
      issues.push({kind:"english",message:"Орчуулагдаагүй гарчиг байж магадгүй: "+(index+1)});
  });
  if(!paragraphs.length)issues.push({kind:"empty",message:"Орчуулгын текст хоосон байна."});
  for(const term of terms){
    if(!term.source_term||!term.translated_term)continue;
    const source=String(term.source_term),translated=String(term.translated_term);
    if(text.toLocaleLowerCase().includes(source.toLocaleLowerCase())&&!text.toLocaleLowerCase().includes(translated.toLocaleLowerCase()))
      issues.push({kind:"glossary",message:"Нэр томьёо шалга: "+source+" → "+translated});
  }
  return issues;
}
async function importText(file){
  if(!file||file.size>20*1024*1024)throw Error("20 MB-аас бага файл сонгоно уу.");
  const extension=(file.name||"").split(".").pop().toLowerCase();
  if(["txt","md","markdown"].includes(extension))return file.text();
  if(extension==="docx"){
    if(!global.mammoth)throw Error("DOCX унших library ачаалагдсангүй. Сүлжээгээ шалгана уу.");
    const result=await global.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
    return result.value||"";
  }
  if(extension==="epub"){
    if(!global.JSZip)throw Error("EPUB унших ZIP library ачаалагдсангүй.");
    const zip=await global.JSZip.loadAsync(await file.arrayBuffer(),{checkCRC32:true});
    const root=await zip.file("META-INF/container.xml")?.async("text");
    if(!root)throw Error("EPUB container.xml байхгүй.");
    const xml=s=>new DOMParser().parseFromString(s,"application/xml");
    const container=xml(root);
    const el=container.querySelector("rootfile");
    const opfPath=el?.getAttribute("full-path");
    if(!opfPath||!zip.file(opfPath))throw Error("EPUB content.opf олдсонгүй.");
    const opf=xml(await zip.file(opfPath).async("text"));
    const base=opfPath.includes("/")?opfPath.slice(0,opfPath.lastIndexOf("/")+1):"";
    const items=new Map([...opf.getElementsByTagName("item")].map(n=>[n.getAttribute("id"),n.getAttribute("href")]));
    const spine=[...opf.getElementsByTagName("itemref")].map(n=>items.get(n.getAttribute("idref"))).filter(Boolean);
    if(spine.length>250)throw Error("250-аас олон EPUB хэсэг байна.");
    let length=0;const result=[];
    for(const href of spine){
      const path=base+href.split("#")[0].replace(/^\.\//,"");
      const found=zip.file(path);
      if(!found)continue;
      const content=await found.async("text");
      length+=content.length;
      if(length>8*1024*1024)throw Error("EPUB доторх текст 8 MB-аас хэтэрлээ.");
      const doc=new DOMParser().parseFromString(content,"text/html");
      doc.querySelectorAll("script,style,nav,svg").forEach(el=>el.remove());
      const parts=Array.from(doc.body.querySelectorAll("h1,h2,h3,p,blockquote")).map(node=>node.textContent.trim()).filter(Boolean);
      result.push(parts.length?parts.join("\n\n"):doc.body.textContent.trim());
    }
    return result.filter(Boolean).join("\n\n\n");
  }
  throw Error("TXT, MD, DOCX, EPUB формат дэмжинэ.");
}
global.RRNovelQuality=Object.freeze({blocksFromText,textFromBlocks,analyze,importText});
})(window);