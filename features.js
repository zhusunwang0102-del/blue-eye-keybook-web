"use strict";

const featureState={notesSiteId:null,noteTags:new Set(),filterTags:new Set(),onlyNotes:false,siteSort:"manual",picker:new Set(),previewUrls:[],exportGeneration:0,exportBusy:false,textExportBusy:false,drag:null};
function featureText(value,max=6000){return typeof value==="string"?value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,"").replace(/\r/g,"").slice(0,max):"";}
function normalizeSiteTags(raw){const seen=new Set();return (Array.isArray(raw)?raw:[]).map(v=>featureText(v,32).replace(/\n/g," ").trim()).filter(v=>{const k=v.toLocaleLowerCase();if(!v||seen.has(k))return false;seen.add(k);return true;}).slice(0,50);}
function normalizeSiteNote(raw){return featureText(raw,6000);}
function normalizeReviewMetric(raw){const s=raw&&typeof raw==="object"?raw:{};return {show:s.show===true,mode:["exact","estimate","custom"].includes(s.mode)?s.mode:"exact",value:featureText(s.value,32),text:featureText(s.text,60),unit:["¥","$","积分","额度点",""].includes(s.unit)?s.unit:"¥"};}
function normalizeReviewWebsite(raw){const value=raw&&typeof raw==="object"?raw:{};return {show:value.show===true,value:featureText(value.value,2048).replace(/\n/g,"").trim()};}
function normalizeReviewEntry(raw){return {siteId:featureText(raw.siteId,120),name:featureText(raw.name,60)||"未命名站点",website:normalizeReviewWebsite(raw.website),spent:normalizeReviewMetric(raw.spent),spentCheckedAt:featureText(raw.spentCheckedAt,40),legacyRecharge:raw.recharge||raw.legacyRecharge?normalizeReviewMetric(raw.recharge||raw.legacyRecharge):null,calls:normalizeReviewMetric(raw.calls),callsCheckedAt:featureText(raw.callsCheckedAt,40),ratingMode:raw.ratingMode==="index"?"index":"stars",stars:Math.max(0,Math.min(5,Math.floor(Number(raw.stars)||0))),ratingLabel:featureText(raw.ratingLabel,24)||"推荐指数",ratingText:featureText(raw.ratingText,60),comment:featureText(raw.comment,6000)};}
function normalizeReviewDraft(raw,sites=[]){const s=raw&&typeof raw==="object"?raw:{};const seen=new Set();return {title:featureText(s.title,80)||"我的中转站食用推荐",author:featureText(s.author,40),theme:["light","dark","cream"].includes(s.theme)?s.theme:"light",items:(Array.isArray(s.items)?s.items:[]).filter(v=>v&&typeof v==="object"&&typeof v.siteId==="string"&&!seen.has(v.siteId)&&(seen.add(v.siteId),true)).slice(0,100).map(v=>{const item=normalizeReviewEntry(v),site=sites.find(s=>s.id===item.siteId);if(!v.website&&site)item.website.value=normalizeReviewWebsite({value:site.websiteUrl}).value;if(!v.spent&&site){const cached=reviewSpentCache(site);if(cached){item.spent=cached.metric;item.spentCheckedAt=cached.checkedAt;}}return item;})};}
function reviewDraft(){if(!state.data)return null;if(!state.data.reviewDraft)state.data.reviewDraft=normalizeReviewDraft(null);return state.data.reviewDraft;}
function reviewAccountCache(site,field){if(!site)return null;const account=normalizeBalance(site.balance);return [account.cache,site.activity?.origin===account.origin&&site.activity?.userId===account.userId?site.activity.summary:null].filter(s=>s&&historyNumber(s[field],field==="requestCount")!==null&&Number.isFinite(Date.parse(s.checkedAt))).sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt))[0]||null;}
function reviewCallsCache(site){return reviewAccountCache(site,"requestCount");}
function reviewSpentCache(site){const cached=reviewAccountCache(site,"usedQuota");if(!cached)return null;const config=normalizeBalance(site.balance),amount=Number(cached.usedQuota)/(config.unit==="points"?1:config.divisor);if(!Number.isFinite(amount)||amount<0)return null;const digits=["USD","CNY"].includes(config.unit)?2:config.unit==="points"?4:6;return {metric:normalizeReviewMetric({value:String(Number(amount.toFixed(digits))),unit:{USD:"$",CNY:"¥",points:"额度点",credits:"积分"}[config.unit]}),checkedAt:cached.checkedAt};}
function newReviewEntry(site){const summary=reviewCallsCache(site),spent=reviewSpentCache(site);return normalizeReviewEntry({siteId:site.id,name:site.name,website:{value:site.websiteUrl},spent:spent?.metric,spentCheckedAt:spent?.checkedAt,calls:{value:summary?.requestCount||"",unit:""},callsCheckedAt:summary?.checkedAt||""});}
async function importReviewData(item,kind,refresh=false){const data=state.data,draft=reviewDraft(),generation=featureState.exportGeneration,site=data?.sites.find(s=>s.id===item.siteId);if(!site)throw Error("原站点已移除，仍可手动填写");if(refresh){if(!site.balance?.enabled)throw Error("请先在站点详情配置并开启账户余额查询");if(!supportsBalanceQuery())throw Error(BALANCE_ERROR_MESSAGES.native);if(!await refreshSiteBalance(site.id,false,"account"))throw Error("本次查询未更新，请稍后再试或带入已有结果");}if(state.data!==data||reviewDraft()!==draft||!draft.items.includes(item)||generation!==featureState.exportGeneration)return false;
 if(kind==="spent"){const cached=reviewSpentCache(site);if(!cached)throw Error("暂无累计历史金额，请先查询；站点未提供时可自行填写");item.spent.value=cached.metric.value;item.spent.unit=cached.metric.unit;item.spentCheckedAt=cached.checkedAt;}
 else{const cached=reviewCallsCache(site);if(!cached)throw Error("暂无累计调用次数，请先查询；站点未提供时可自行填写");item.calls.value=cached.requestCount;item.callsCheckedAt=cached.checkedAt;}
 invalidateReview();renderReviewCards();return true;}
function tagCatalog(extra=[]){const counts=new Map();for(const site of state.data?.sites||[])for(const tag of site.tags||[])counts.set(tag,(counts.get(tag)||0)+1);for(const tag of extra)if(!counts.has(tag))counts.set(tag,0);return Array.from(counts,([name,count])=>({name,count}));}
function orderedTags(query,order,extra=[]){return tagCatalog(extra).filter(v=>v.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a,b)=>order==="name"?a.name.localeCompare(b.name,"zh-CN"):(order==="count-asc"?a.count-b.count:b.count-a.count)||a.name.localeCompare(b.name,"zh-CN"));}
function featureSiteSearch(site){return [site.name,getGroup(site.groupId)?.name||"",...(site.tags||[]),site.note||""].join("\n").toLocaleLowerCase();}
function filterBySiteNotes(site){return (!featureState.onlyNotes||Boolean(site.note?.trim()))&&(!featureState.filterTags.size||(site.tags||[]).some(tag=>featureState.filterTags.has(tag)));}
function sortSitesByNotes(sites){const kind=featureState.siteSort;if(kind==="manual")return sites;return [...sites].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(kind==="note-desc"?(b.note||"").length-(a.note||"").length:kind==="tags-asc"?(a.tags||[]).length-(b.tags||[]).length:(b.tags||[]).length-(a.tags||[]).length)||a.order-b.order);}
function makeTagOption(name,count,checked,onChange){const label=makeElement("label",{className:"tag-option"}),input=makeElement("input",{type:"checkbox"});input.checked=checked;input.addEventListener("change",()=>onChange(input.checked));label.append(input,makeElement("span",{text:name}),makeElement("small",{text:`${count} 站`}));return label;}
function renderFeatureFilters(){if(!state.data)return;$("note-filter-summary").textContent=`${tagCatalog().length} 标签 · ${state.data.sites.filter(s=>s.note?.trim()).length} 站有备注${featureState.filterTags.size?` · 已选 ${featureState.filterTags.size}`:""}`;const list=$("note-filter-tags");list.replaceChildren();orderedTags($("note-filter-search").value,$("note-filter-order").value).forEach(t=>list.append(makeTagOption(t.name,t.count,featureState.filterTags.has(t.name),yes=>{yes?featureState.filterTags.add(t.name):featureState.filterTags.delete(t.name);setArranging(false);renderFeatureFilters();renderEntries();})));}
function makeSiteNotesButton(site){const button=makeElement("button",{type:"button",className:"secondary-button notes-detail-entry"},[makeElement("span",{text:"站点备注"}),makeElement("small",{text:`${(site.tags||[]).length} 标签${site.note?.trim()?" · 有备注":" · 点开编辑"}`}),createIcon("chevron-right")]);button.addEventListener("click",()=>openSiteNotes(site.id));return button;}
function openSiteNotes(siteId){const site=state.data?.sites.find(v=>v.id===siteId);if(!site)return;featureState.notesSiteId=site.id;featureState.noteTags=new Set(site.tags||[]);$("site-notes-site").textContent=site.name;$("site-note-input").value=site.note||"";$("site-tag-new").value="";$("site-tag-search").value="";$("site-notes-error").textContent="";renderNoteTags();$("site-notes-dialog").showModal();}
function renderNoteTags(){const options=$("site-tag-options");options.replaceChildren();orderedTags($("site-tag-search").value,"name",[...featureState.noteTags]).forEach(t=>options.append(makeTagOption(t.name,t.count,featureState.noteTags.has(t.name),yes=>{yes?featureState.noteTags.add(t.name):featureState.noteTags.delete(t.name);$("site-tag-count").textContent=`已选 ${featureState.noteTags.size} 个标签 · 可多选`;})));$("site-tag-count").textContent=`已选 ${featureState.noteTags.size} 个标签 · 可多选`;}
function addNoteTag(){const tag=normalizeSiteTags([$("site-tag-new").value])[0];if(!tag)return;if(featureState.noteTags.size>=50)return showToast("每站最多 50 个标签","error");const existing=[...featureState.noteTags].find(t=>t.toLocaleLowerCase()===tag.toLocaleLowerCase())||tagCatalog().find(t=>t.name.toLocaleLowerCase()===tag.toLocaleLowerCase())?.name;featureState.noteTags.add(existing||tag);$("site-tag-new").value="";$("site-tag-search").value="";renderNoteTags();}
function saveSiteNotes(event){event.preventDefault();const site=state.data?.sites.find(v=>v.id===featureState.notesSiteId);if(!site)return;site.tags=normalizeSiteTags([...featureState.noteTags]);site.note=normalizeSiteNote($("site-note-input").value);site.updatedAt=nowIso();scheduleSave();$("site-notes-dialog").close();renderAll();showToast("标签与备注已保存");}

function reviewNumber(value,integer=false){const text=String(value).trim();if(!/^\d{1,15}(?:\.\d{1,6})?$/.test(text))return null;const n=Number(text);return Number.isFinite(n)&&n<=Number.MAX_SAFE_INTEGER&&(!integer||Number.isInteger(n))?n:null;}
function estimatedReviewValue(value){const n=Number(value),step=n>=100000?10000:n>=10000?1000:n>=1000?500:n>=100?100:n>=10?10:1;return `${Math.floor(n/step)*step}+`;}
function reviewMetricDisplay(metric,kind){if(!metric.show)return null;const name=kind==="calls"?"调用次数":"历史金额";let value;
 if(metric.mode==="custom"||(metric.mode==="estimate"&&metric.text.trim())){value=metric.text.trim();if(!value)throw Error(`请填写${name}的自定义展示文字`);}
 else{const n=reviewNumber(metric.value,kind==="calls");if(n===null)throw Error(`请填写有效的${name}${kind==="calls"?"整数":"数值"}`);value=metric.mode==="estimate"?estimatedReviewValue(n):new Intl.NumberFormat("zh-CN",{maximumFractionDigits:6}).format(n);}
 const label=name+(metric.mode==="estimate"?"（估值）":metric.mode==="custom"?"（自定义）":"");
 return {label,value:kind==="calls"?`${value} 次`:["¥","$"].includes(metric.unit)?metric.unit+value:metric.unit?`${value} ${metric.unit}`:value};}
function reviewRatingText(item){return item.ratingMode==="index"?`${item.ratingLabel}：${item.ratingText.trim()||"未评分"}`:item.stars?`${"★".repeat(item.stars)}${"☆".repeat(5-item.stars)}`:"未评分";}
function reviewWebsiteValue(item){if(!item.website?.show)return null;const value=normalizeReviewWebsite(item.website).value;if(!value)throw Error(`请填写“${item.name}”要展示的网站地址`);try{const url=new URL(value);if(!["https:","http:"].includes(url.protocol)||!url.hostname||url.username||url.password)throw Error();}catch{throw Error(`请为“${item.name}”填写完整的 http(s) 网站地址`);}return value;}
function reviewPublicEntries(draft){if(!draft.items.length)throw Error("请先选择至少一个站点");return draft.items.map(item=>({name:item.name,website:reviewWebsiteValue(item),spent:reviewMetricDisplay(item.spent,"spent"),calls:reviewMetricDisplay(item.calls,"calls"),ratingMode:item.ratingMode,stars:item.stars,rating:reviewRatingText(item),comment:item.comment}));}
function reviewTextExport(draft){const entries=reviewPublicEntries(draft);return [draft.title,draft.author?`作者：${draft.author}`:"","个人使用体感，仅供参考。",...entries.flatMap((item,i)=>["",`${i+1}. ${item.name}`,...(item.website?[`网址：${item.website}`]:[]),...[item.spent,item.calls].filter(Boolean).map(m=>`${m.label}：${m.value}`),`评分：${item.rating}`,item.comment]),"",REVIEW_CREDIT.brand,...REVIEW_CREDIT.lines].filter(v=>v!==undefined).join("\n");}
function appendSiteNotes(item,site){const tags=normalizeSiteTags(site.tags),note=normalizeSiteNote(site.note);const content=tags.map(t=>`【${t}】`).join("")+(tags.length&&note?"\n":"")+note;if(!content)return false;if(item.comment.endsWith(content))return false;const value=item.comment?`${item.comment}\n\n${content}`:content;if(value.length>6000)throw Error("导入后超过 6000 字，请先精简评价或备注");item.comment=value;return true;}
function moveReviewItem(fromId,toId){const draft=reviewDraft();if(!draft||fromId===toId)return false;const from=draft.items.findIndex(i=>i.siteId===fromId),to=draft.items.findIndex(i=>i.siteId===toId);if(from<0||to<0)return false;const [item]=draft.items.splice(from,1);draft.items.splice(to,0,item);scheduleSave();return true;}
function wrapReviewLines(text,width,measure){const output=[];for(const paragraph of String(text).replace(/\r/g,"").split("\n")){if(!paragraph){output.push("");continue;}let line="";for(const char of Array.from(paragraph)){if(line&&measure(line+char)>width){output.push(line);line=char;}else line+=char;}output.push(line);}return output;}
const REVIEW_CREDIT={brand:"由蓝瞳密钥簿生成",lines:["评价与数据由作者自行填写，仅代表作者个人体验。","本应用仅提供排版与导出，不代表本应用的评价或推荐。"]};
function layoutReview(draft,measure){
 const entries=reviewPublicEntries(draft),titles=wrapReviewLines(draft.title,650,t=>measure(t,40,true)),authors=draft.author?wrapReviewLines(`作者：${draft.author}`,650,t=>measure(t,24)):[];
 const header=92+titles.length*54+authors.length*34,pages=[];let page,y;
 const finish=()=>{if(page){const last=page.rows.at(-1),bottom=last?last.y+last.height:header;page.height=Math.min(6000,Math.max(620,bottom+214));}};
 const start=()=>{finish();if(pages.length>=100)throw Error("内容较多，请分批选择站点导出");page={rows:[],height:0,header,titles,authors};pages.push(page);return header+38;};
 y=start();const limit=5770;
 entries.forEach((item,index)=>{
  const rows=[],starMode=item.ratingMode==="stars",nameLines=wrapReviewLines(`${index+1}. ${item.name}`,starMode?430:642,t=>measure(t,36,true));
  nameLines.forEach((text,i)=>rows.push({kind:"name",text,font:36,height:53,stars:starMode&&i===0?item.stars:null}));
  if(item.website){rows.push({kind:"gap",height:6});wrapReviewLines(`网址：${item.website}`,642,t=>measure(t,30)).forEach(text=>rows.push({kind:"website",text,font:30,height:46}));}
  const metrics=[item.spent,item.calls].filter(Boolean);
  if(metrics.length){
   rows.push({kind:"gap",height:10});
   const columns=metrics.map(m=>({label:m.label,value:m.value,labelLines:wrapReviewLines(m.label,metrics.length===2?274:602,t=>measure(t,26)),valueLines:wrapReviewLines(m.value,metrics.length===2?274:602,t=>measure(t,34,true))}));
   const inline=columns.length===1&&measure(columns[0].label,26)+measure(columns[0].value,34,true)+40<=602;
   const height=inline?76:Math.max(...columns.map(c=>24+c.labelLines.length*37+8+c.valueLines.length*47));
   rows.push({kind:"metrics",columns,height,inline});
  }
  if(!starMode){rows.push({kind:"gap",height:15});wrapReviewLines(item.rating,642,t=>measure(t,30)).forEach(text=>rows.push({kind:"rating",text,font:30,height:46}));}
  if(item.comment){rows.push({kind:"gap",height:18});wrapReviewLines(item.comment,642,t=>measure(t,32)).forEach(text=>rows.push({kind:"comment",text,font:32,height:text?51:28}));}
  if(y+Math.min(250,rows.reduce((n,r)=>n+r.height,0))>limit)y=start();
  for(const row of rows){
   if(y+row.height>limit){y=start();for(const text of wrapReviewLines(`${index+1}. ${item.name}（续）`,642,t=>measure(t,32,true))){page.rows.push({kind:"name",text,font:32,height:49,y,entry:index,stars:null});y+=49;}}
   page.rows.push({...row,y,entry:index});y+=row.height;
  }
  y+=52;
 });finish();return pages;
}
const REVIEW_PALETTES={light:{bg:"#eaf2fa",card:"#ffffff",ink:"#213d59",muted:"#647d94",accent:"#456f99",line:"#ccdcea"},dark:{bg:"#0e192a",card:"#17283d",ink:"#edf4ff",muted:"#a5bbd1",accent:"#b2d7f8",line:"#30465e"},cream:{bg:"#f5efe2",card:"#fffaf0",ink:"#4a4438",muted:"#82745d",accent:"#a0814c",line:"#ddcfb5"}};
function reviewRoundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function paintReviewPage(canvas,page,draft,index,total){
 canvas.width=750;canvas.height=page.height;const ctx=canvas.getContext("2d"),p=REVIEW_PALETTES[draft.theme]||REVIEW_PALETTES.light;
 ctx.fillStyle=p.bg;ctx.fillRect(0,0,750,page.height);ctx.textBaseline="top";ctx.fillStyle=p.muted;ctx.font='22px sans-serif';ctx.fillText("个人品鉴 / 食用推荐",48,30);
 ctx.fillStyle=p.ink;ctx.font='bold 40px sans-serif';page.titles.forEach((text,i)=>ctx.fillText(text,48,76+i*54));
 if(page.authors.length){ctx.fillStyle=p.muted;ctx.font='24px sans-serif';page.authors.forEach((text,i)=>ctx.fillText(text,48,84+page.titles.length*54+i*34));}
 const groups=[];for(const row of page.rows){const last=groups.at(-1);if(last?.entry===row.entry)last.bottom=row.y+row.height;else groups.push({entry:row.entry,top:row.y,bottom:row.y+row.height});}
 for(const group of groups){ctx.fillStyle=p.card;reviewRoundedRect(ctx,30,group.top-18,690,group.bottom-group.top+38,24);ctx.fill();ctx.strokeStyle=p.line;ctx.lineWidth=1;ctx.stroke();}
 const stars=(value,y)=>{for(let i=0;i<5;i++){ctx.beginPath();for(let j=0;j<10;j++){const a=-Math.PI/2+j*Math.PI/5,r=j%2?6:15,x=538+i*34+Math.cos(a)*r,yy=y+22+Math.sin(a)*r;j?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.closePath();ctx.fillStyle=i<value?p.accent:p.line;ctx.fill();}};
 for(const row of page.rows){
  if(row.kind==="gap")continue;
  if(row.kind==="metrics"){
   const both=row.columns.length===2,w=both?306:642;
   row.columns.forEach((col,i)=>{const x=54+(both?i*336:0);ctx.fillStyle=p.bg;reviewRoundedRect(ctx,x,row.y,w,row.height-5,14);ctx.fill();if(row.inline){ctx.fillStyle=p.muted;ctx.font='26px sans-serif';ctx.fillText(col.label,x+16,row.y+24);ctx.fillStyle=p.ink;ctx.font='bold 34px sans-serif';ctx.textAlign="right";ctx.fillText(col.value,x+w-16,row.y+18);ctx.textAlign="left";return;}ctx.fillStyle=p.muted;ctx.font='26px sans-serif';col.labelLines.forEach((t,j)=>ctx.fillText(t,x+16,row.y+13+j*37));ctx.fillStyle=p.ink;ctx.font='bold 34px sans-serif';const top=row.y+21+col.labelLines.length*37;col.valueLines.forEach((t,j)=>ctx.fillText(t,x+16,top+j*47));});
   continue;
  }
  ctx.fillStyle=row.kind==="website"?p.accent:p.ink;ctx.font=`${row.kind==="name"?"bold ":""}${row.font}px sans-serif`;ctx.fillText(row.text,54,row.y+2);
  if(row.kind==="name"&&row.stars!==null){stars(row.stars,row.y);}
 }
 const footer=page.height-150;ctx.strokeStyle=p.line;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(48,footer);ctx.lineTo(702,footer);ctx.stroke();
 ctx.fillStyle=p.ink;ctx.font='bold 25px sans-serif';ctx.fillText(REVIEW_CREDIT.brand,48,footer+19);ctx.fillStyle=p.muted;ctx.font='21px sans-serif';ctx.textAlign="right";ctx.fillText(`${index+1} / ${total}`,702,footer+22);ctx.textAlign="left";
 ctx.font='22px sans-serif';REVIEW_CREDIT.lines.forEach((text,i)=>ctx.fillText(text,48,footer+63+i*33));
}
function reviewCRC32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function makeReviewZip(files){const encoder=new TextEncoder(),locals=[],central=[];let offset=0,centralSize=0;for(const file of files){const name=encoder.encode(file.name),data=file.bytes,crc=reviewCRC32(data),local=new Uint8Array(30+name.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.set(name,30);locals.push(local,data);const c=new Uint8Array(46+name.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(14,33,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=local.length+data.length;centralSize+=c.length;}const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);return new Blob([...locals,...central,end],{type:"application/zip"});}

function clearReviewPreviews(){for(const url of featureState.previewUrls)URL.revokeObjectURL(url);featureState.previewUrls=[];$("review-previews").replaceChildren();}
function invalidateReview(){featureState.exportGeneration+=1;clearReviewPreviews();scheduleSave();}
function featureInput(value,max,onInput,attrs={}){const input=makeElement("input",{type:"text",attrs:{maxlength:max,...attrs}});input.value=value;input.addEventListener("input",()=>{onInput(input.value);invalidateReview();});return input;}
function featureSelect(value,options,onChange){const select=makeElement("select");for(const [v,label] of options)select.append(makeElement("option",{text:label,attrs:{value:v}}));select.value=value;select.addEventListener("change",()=>{onChange(select.value);invalidateReview();renderReviewCards();});return select;}
function featureField(label,input){return makeElement("label",{className:"field"},[makeElement("span",{text:label}),input]);}
function featureButton(text,fn,cls="small-button"){const button=makeElement("button",{type:"button",text,className:cls});button.addEventListener("click",fn);return button;}
function openReview(){if(!state.data)return;const draft=reviewDraft();$("review-heading").value=draft.title;$("review-author").value=draft.author;$("review-theme").value=draft.theme;$("review-text-mode").value="review";updateReviewTextMode();$("review-error").textContent="";renderReviewCards();if(!$("review-dialog").open)$("review-dialog").showModal();}
function reviewMetricEditor(item,kind){const metric=item[kind],name=kind==="calls"?"调用次数":"历史金额",row=makeElement("div",{className:"review-metric-row"}),toggle=makeElement("input",{type:"checkbox"});toggle.checked=metric.show;toggle.addEventListener("change",()=>{metric.show=toggle.checked;invalidateReview();renderReviewCards();});row.append(makeElement("label",{className:"feature-check"},[toggle,makeElement("span",{text:`展示${name}`})]));
 if(!metric.show)return row;
 row.append(featureField("显示方式",featureSelect(metric.mode,[["exact","精确值"],["estimate","估值"],["custom","自定义文字"]],v=>{metric.mode=v;})));
 if(metric.mode!=="custom")row.append(featureField(kind==="calls"?"次数（可修改）":"累计消耗金额（可带入或修改）",featureInput(metric.value,32,v=>{metric.value=v;},{inputmode:kind==="calls"?"numeric":"decimal",placeholder:kind==="calls"?"例如 2700":"例如 2700"})));
 if(metric.mode!=="exact")row.append(featureField(metric.mode==="estimate"?"估值文字（留空按数值自动取整）":"自定义展示文字",featureInput(metric.text,60,v=>{metric.text=v;},{placeholder:metric.mode==="estimate"?"例如 2500+，可自行改写":"例如 约两千"})));
 if(kind==="spent")row.append(featureField("单位",featureSelect(metric.unit,[["¥","人民币 ¥"],["$","美元 $"],["积分","积分"],["额度点","额度点"],["","不标单位"]],v=>{metric.unit=v;})));
 row.append(makeElement("div",{className:"review-toolbar"},[featureButton(kind==="spent"?"带入历史金额":"带入调用次数",async()=>{try{await importReviewData(item,kind);}catch(error){$("review-error").textContent=error.message;}},"text-button"),featureButton("查询并带入",async event=>{const button=event.currentTarget;button.disabled=true;try{await importReviewData(item,kind,true);}catch(error){if(state.data)$("review-error").textContent=error.message;}finally{button.disabled=false;}},"text-button")]));
 const checkedAt=kind==="spent"?item.spentCheckedAt:item.callsCheckedAt;
 if(Number.isFinite(Date.parse(checkedAt)))row.append(makeElement("p",{className:"section-hint",text:`带入结果更新于 ${formatDateTime(checkedAt)}；展示值可修改。`}));
 if(kind==="spent")row.append(makeElement("p",{className:"section-hint",text:"历史金额为账户累计历史消耗，沿用本站单位与倍率。"}));
 return row;}
function reviewWebsiteEditor(item){const row=makeElement("div",{className:"review-metric-row review-website-editor"}),toggle=makeElement("input",{type:"checkbox"});toggle.checked=item.website.show;toggle.addEventListener("change",()=>{item.website.show=toggle.checked;invalidateReview();renderReviewCards();});row.append(makeElement("label",{className:"feature-check"},[toggle,makeElement("span",{text:"展示网站地址"})]));if(!item.website.show)return row;
 row.append(featureField("网址（可修改为推荐链接）",featureInput(item.website.value,2048,v=>{item.website.value=v;},{inputmode:"url",autocapitalize:"off",spellcheck:"false",placeholder:"https://example.com"})));
 const source=state.data.sites.find(site=>site.id===item.siteId),button=featureButton("带入已保存的网址",()=>{item.website.value=normalizeReviewWebsite({value:source?.websiteUrl}).value;invalidateReview();renderReviewCards();},"text-button");button.disabled=!source?.websiteUrl;row.append(button,makeElement("p",{className:"section-hint",text:"勾选后，推荐图片和推荐文案 TXT 都会带上这个网址。"}));return row;}
function renderReviewCards(){const draft=reviewDraft();if(!draft)return;const container=$("review-cards");container.replaceChildren();$("review-count").textContent=`已选 ${draft.items.length} 站`;
 if(!draft.items.length)container.append(makeElement("p",{className:"section-hint",text:"先批量选择几家站，再填写你的使用体感。"}));
 draft.items.forEach((item,index)=>{
  const card=makeElement("article",{className:"review-card",attrs:{"data-review-site":item.siteId}}),head=makeElement("div",{className:"review-card-header"});
  const grip=featureButton("⠿",()=>{},"small-button review-grip");grip.setAttribute("aria-label",`拖动${item.name}调整顺序，也可按上下方向键`);grip.addEventListener("keydown",event=>{if(!["ArrowUp","ArrowDown"].includes(event.key))return;event.preventDefault();const to=index+(event.key==="ArrowUp"?-1:1);if(draft.items[to]){moveReviewItem(item.siteId,draft.items[to].siteId);invalidateReview();renderReviewCards();}});
  const up=featureButton("↑",()=>{if(index>0){moveReviewItem(item.siteId,draft.items[index-1].siteId);invalidateReview();renderReviewCards();}});up.disabled=index===0;up.setAttribute("aria-label","上移");
  const down=featureButton("↓",()=>{if(draft.items[index+1]){moveReviewItem(item.siteId,draft.items[index+1].siteId);invalidateReview();renderReviewCards();}});down.disabled=index===draft.items.length-1;down.setAttribute("aria-label","下移");
  head.append(grip,makeElement("strong",{text:`${index+1}. ${item.name}`}),up,down,featureButton("移除",()=>{draft.items=draft.items.filter(v=>v!==item);invalidateReview();renderReviewCards();}));card.append(head);
  card.append(featureField("展示名称",featureInput(item.name,60,v=>{item.name=v;})));
  const metrics=makeElement("details",{className:"review-metrics"});metrics.open=item.calls.show||item.spent.show||item.website.show;metrics.append(makeElement("summary",{text:`可选数据 · 已展示 ${Number(item.calls.show)+Number(item.spent.show)+Number(item.website.show)} 项`}),reviewWebsiteEditor(item),reviewMetricEditor(item,"spent"),reviewMetricEditor(item,"calls"));card.append(metrics);
  card.append(featureField("评分方式",featureSelect(item.ratingMode,[["stars","五颗星"],["index","自定义评分指数"]],v=>{item.ratingMode=v;})));
  if(item.ratingMode==="stars"){const stars=makeElement("div",{className:"review-stars",attrs:{role:"group","aria-label":"星级评分"}});for(let n=1;n<=5;n++){const button=featureButton(n<=item.stars?"★":"☆",()=>{item.stars=n;invalidateReview();renderReviewCards();},"");button.setAttribute("aria-label",`${n} 星`);button.setAttribute("aria-pressed",String(n<=item.stars));stars.append(button);}stars.append(featureButton("清除",()=>{item.stars=0;invalidateReview();renderReviewCards();},"text-button"));card.append(stars);}
  else card.append(makeElement("div",{className:"feature-grid"},[featureField("指数名称",featureInput(item.ratingLabel,24,v=>{item.ratingLabel=v;})),featureField("分值 / 展示文字",featureInput(item.ratingText,60,v=>{item.ratingText=v;},{placeholder:"例如 8.5 / 10"}))]));
  const textarea=makeElement("textarea",{attrs:{rows:4,maxlength:6000,placeholder:"写下自己的使用体感与评价"}});textarea.value=item.comment;textarea.addEventListener("input",()=>{item.comment=textarea.value;invalidateReview();});card.append(featureField("我的评价",textarea));
  const source=state.data.sites.find(site=>site.id===item.siteId);const importButton=featureButton("导入本站标签和备注",()=>{try{if(appendSiteNotes(item,source)){invalidateReview();renderReviewCards();showToast("已追加到现有评价后面");}else showToast("没有新备注可导入");}catch(error){$("review-error").textContent=error.message;}},"text-button");importButton.disabled=!source||(!(source.tags||[]).length&&!source.note?.trim());card.append(importButton);container.append(card);
 });}
function pickerSites(){const q=$("review-picker-search").value.trim().toLocaleLowerCase();return sortedSites().filter(site=>!q||featureSiteSearch(site).includes(q));}
function renderReviewPicker(){const list=$("review-picker-list");list.replaceChildren();pickerSites().forEach(site=>{const label=makeElement("label",{className:"tag-option"}),input=makeElement("input",{type:"checkbox"});input.checked=featureState.picker.has(site.id);input.addEventListener("change",()=>{input.checked?featureState.picker.add(site.id):featureState.picker.delete(site.id);$("review-picker-count").textContent=`已选 ${featureState.picker.size} 站（最多 100 站）`;});label.append(input,makeElement("span",{text:site.name}),makeElement("small",{text:(site.tags||[]).map(t=>`【${t}】`).join("")}));list.append(label);});$("review-picker-count").textContent=`已选 ${featureState.picker.size} 站（最多 100 站）`;}
function openReviewPicker(){const draft=reviewDraft();if(!draft)return;featureState.picker=new Set(draft.items.map(i=>i.siteId));$("review-picker-search").value="";$("review-picker-error").textContent="";renderReviewPicker();$("review-picker-dialog").showModal();}
function confirmReviewPicker(){const draft=reviewDraft();if(!draft)return;if(featureState.picker.size>100){$("review-picker-error").textContent="一次最多选择 100 站，请分批制作";return;}const kept=draft.items.filter(i=>featureState.picker.has(i.siteId)),known=new Set(kept.map(i=>i.siteId));for(const site of sortedSites())if(featureState.picker.has(site.id)&&!known.has(site.id))kept.push(newReviewEntry(site));draft.items=kept;invalidateReview();renderReviewCards();$("review-picker-dialog").close();}
function finishReviewDrag(cancel=false){const drag=featureState.drag;featureState.drag=null;$("review-cards").querySelectorAll(".is-moving,.is-drop-target").forEach(el=>el.classList.remove("is-moving","is-drop-target"));if(!cancel&&drag?.over&&moveReviewItem(drag.id,drag.over)){invalidateReview();renderReviewCards();}}
async function downloadFeatureBlob(blob,filename,stillValid=()=>true){if(!stillValid())throw Error("导出已取消");if(window.BlueEyeFiles?.saveBlob)return window.BlueEyeFiles.saveBlob(blob,filename,stillValid);if(window.BlueEyeWeb?.saveBlob)return window.BlueEyeWeb.saveBlob(blob,filename,stillValid);if(window.BlueEyeNative)throw Error("请更新 Android App 后导出图片或文字");const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);}
function siteListTextExport(sites) {
  const sections = sites.map((site, index) => {
    const lines = [`${index + 1}. ${String(site.name || "未命名站点")}`, `网址：${String(site.websiteUrl || "未填写")}`];
    const tags = normalizeSiteTags(site.tags);
    if (tags.length) lines.push(`标签：${tags.map(tag => `【${tag}】`).join("")}`);
    const note = normalizeSiteNote(site.note);
    lines.push(note ? `备注：\n${note}` : "备注：未填写");
    return lines.join("\n");
  });
  return ["蓝瞳密钥簿 · 站点清单", `共 ${sites.length} 个站点`, "", sections.join("\n\n"), "", "由蓝瞳密钥簿导出 · 内容由分享者自行填写。"].join("\n");
}

function updateReviewTextMode() {
  $("review-text-hint").textContent = $("review-text-mode").value === "sites"
    ? `导出全部 ${state.data?.sites.length || 0} 个站点的名称、网站地址、标签和自定义备注；无需批量选择，不受搜索筛选影响，不含令牌字段。`
    : "导出当前推荐的标题、评分和评价，站点范围跟随“批量选择站点”。";
}

async function exportReviewText() {
  const data = state.data;
  if (!data || featureState.textExportBusy || featureState.exportBusy) return;
  const generation = featureState.exportGeneration;
  const valid = () => state.data === data && featureState.exportGeneration === generation;
  const mode = $("review-text-mode");
  const allSites = mode.value === "sites";
  const button = $("review-text");
  featureState.textExportBusy = true;
  button.disabled = true;
  mode.disabled = true;
  $("review-error").textContent = "";
  try {
    if (allSites && !data.sites.length) throw Error("还没有站点可导出，先添加一家吧");
    const content = allSites ? siteListTextExport(sortedSites(data.sites)) : reviewTextExport(reviewDraft());
    const date = new Date();
    const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    const filename = allSites ? `蓝瞳密钥簿-站点清单-${day}.txt` : "食用推荐.txt";
    await downloadFeatureBlob(new Blob(["\ufeff", content], { type: "text/plain;charset=utf-8" }), filename, valid);
    if (valid()) {
      $("review-export-status").textContent = allSites
        ? `已整理全部 ${data.sites.length} 个站点，请按设备提示完成 TXT 保存。`
        : "已发起推荐文案 TXT 保存，请按设备提示选择保存位置。";
    }
  } catch (error) {
    if (valid()) {
      const cancelled = error.name === "AbortError" || /取消/.test(error.message);
      if (cancelled) $("review-export-status").textContent = "已取消 TXT 导出。";
      else $("review-error").textContent = error.message || "TXT 导出未完成，请再试一次。";
    }
  } finally {
    featureState.textExportBusy = false;
    button.disabled = false;
    mode.disabled = false;
  }
}

async function exportReviewImages(save=false){if(featureState.exportBusy||featureState.textExportBusy||!state.data)return;const data=state.data,draft=normalizeReviewDraft(structuredClone(reviewDraft())),generation=++featureState.exportGeneration;featureState.exportBusy=true;$("review-error").textContent="";["review-preview","review-images","review-text"].forEach(id=>{$(id).disabled=true;});
 try{if(document.fonts?.ready)await document.fonts.ready;const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");if(!ctx)throw Error("当前设备不能生成图片");const pages=layoutReview(draft,(text,size,bold=false)=>{ctx.font=`${bold?"bold ":""}${size}px sans-serif`;return ctx.measureText(text).width;});const blobs=[];
  for(let i=0;i<pages.length;i++){if(generation!==featureState.exportGeneration||state.data!==data)throw Error("内容已变化，本次生成已取消，请重新生成");$("review-export-status").textContent=`正在生成 ${i+1} / ${pages.length}…`;paintReviewPage(canvas,pages[i],draft,i,pages.length);const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));if(!blob)throw Error("生成图片失败，请再试一次");blobs.push(blob);await new Promise(resolve=>window.setTimeout(resolve,0));}
  canvas.width=1;canvas.height=1;if(generation!==featureState.exportGeneration||state.data!==data)throw Error("内容已变化，本次生成已取消，请重新生成");clearReviewPreviews();blobs.forEach((blob,i)=>{const url=URL.createObjectURL(blob);featureState.previewUrls.push(url);const figure=makeElement("figure"),img=makeElement("img",{attrs:{src:url,alt:`食用推荐第 ${i+1} 张`,loading:"lazy",width:750,height:pages[i].height}});figure.append(img,makeElement("figcaption",{text:`第 ${i+1} 张 · 750 × ${pages[i].height}`}));$("review-previews").append(figure);});
  if(save){const valid=()=>generation===featureState.exportGeneration&&state.data===data;if(blobs.length===1)await downloadFeatureBlob(blobs[0],"食用推荐.png",valid);else{const files=[];for(let i=0;i<blobs.length;i++)files.push({name:`食用推荐-${String(i+1).padStart(2,"0")}.png`,bytes:new Uint8Array(await blobs[i].arrayBuffer())});if(!valid())throw Error("已取消导出");await downloadFeatureBlob(makeReviewZip(files),"食用推荐-多图.zip",valid);}}
  $("review-export-status").textContent=`已生成 ${blobs.length} 张，宽 750、单张不超过 6000${save?"；请按设备提示保存":"；可先检查预览，再导出图片"}。`;
 }catch(error){if(state.data===data)$("review-error").textContent=error.message;}finally{featureState.exportBusy=false;["review-preview","review-images","review-text"].forEach(id=>{$(id).disabled=false;});}}
function resetFeatureSession(){featureState.exportGeneration+=1;finishReviewDrag(true);clearReviewPreviews();featureState.notesSiteId=null;featureState.noteTags.clear();featureState.filterTags.clear();featureState.onlyNotes=false;featureState.siteSort="manual";featureState.picker.clear();["site-note-input","site-tag-new","site-tag-search","review-heading","review-author","review-picker-search","note-filter-search"].forEach(id=>{$(id).value="";});$("site-tag-options").replaceChildren();$("review-cards").replaceChildren();$("review-picker-list").replaceChildren();$("note-filter-tags").replaceChildren();$("note-only").checked=false;$("note-site-sort").value="manual";$("site-notes-site").textContent="";if(window.BlueEyeNative?.cancelFileExport)window.BlueEyeNative.cancelFileExport();}
function bindFeatureEvents(){
 $("site-notes-form").addEventListener("submit",saveSiteNotes);$("site-tag-add").addEventListener("click",addNoteTag);$("site-tag-new").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addNoteTag();}});$("site-tag-search").addEventListener("input",renderNoteTags);
 $("site-notes-dialog").addEventListener("close",()=>{featureState.notesSiteId=null;featureState.noteTags.clear();$("site-note-input").value="";$("site-tag-options").replaceChildren();});
 $("note-filter-search").addEventListener("input",renderFeatureFilters);$("note-filter-order").addEventListener("change",renderFeatureFilters);$("note-only").addEventListener("change",()=>{featureState.onlyNotes=$("note-only").checked;setArranging(false);renderEntries();});$("note-site-sort").addEventListener("change",()=>{featureState.siteSort=$("note-site-sort").value;setArranging(false);renderEntries();});$("note-filter-clear").addEventListener("click",()=>{featureState.filterTags.clear();featureState.onlyNotes=false;featureState.siteSort="manual";$("note-only").checked=false;$("note-site-sort").value="manual";$("note-filter-search").value="";renderFeatureFilters();renderEntries();});
 $("review-open").addEventListener("click",openReview);$("review-text-mode").addEventListener("change",updateReviewTextMode);$("review-choose").addEventListener("click",openReviewPicker);$("review-picker-save").addEventListener("click",confirmReviewPicker);$("review-picker-search").addEventListener("input",renderReviewPicker);for(const [id,yes] of [["review-picker-all",true],["review-picker-none",false]])$(id).addEventListener("click",()=>{pickerSites().forEach(s=>yes?featureState.picker.add(s.id):featureState.picker.delete(s.id));renderReviewPicker();});
 for(const [id,key] of [["review-heading","title"],["review-author","author"],["review-theme","theme"]])$(id).addEventListener(id==="review-theme"?"change":"input",()=>{const draft=reviewDraft();if(draft){draft[key]=$(id).value;invalidateReview();}});
 $("review-preview").addEventListener("click",()=>exportReviewImages(false));$("review-images").addEventListener("click",()=>exportReviewImages(true));$("review-text").addEventListener("click",exportReviewText);$("review-dialog").addEventListener("close",()=>{featureState.exportGeneration+=1;finishReviewDrag(true);clearReviewPreviews();$("review-cards").replaceChildren();});
 const cards=$("review-cards");cards.addEventListener("pointerdown",event=>{const handle=event.target.closest(".review-grip");if(!handle||event.button!==0)return;const card=handle.closest("[data-review-site]");featureState.drag={id:card.dataset.reviewSite,pointer:event.pointerId,over:null};card.classList.add("is-moving");handle.setPointerCapture?.(event.pointerId);event.preventDefault();});cards.addEventListener("pointermove",event=>{const drag=featureState.drag;if(!drag||drag.pointer!==event.pointerId)return;const target=document.elementFromPoint(event.clientX,event.clientY)?.closest("[data-review-site]");cards.querySelectorAll(".is-drop-target").forEach(el=>el.classList.remove("is-drop-target"));if(target&&cards.contains(target)){drag.over=target.dataset.reviewSite;if(drag.over!==drag.id)target.classList.add("is-drop-target");}const dialog=$("review-dialog").querySelector(".dialog-form"),rect=dialog.getBoundingClientRect();if(event.clientY<rect.top+65)dialog.scrollTop-=18;else if(event.clientY>rect.bottom-65)dialog.scrollTop+=18;});cards.addEventListener("pointerup",event=>{if(featureState.drag?.pointer===event.pointerId)finishReviewDrag(false);});cards.addEventListener("pointercancel",()=>finishReviewDrag(true));
}
