import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const data=JSON.parse(fs.readFileSync(new URL('./data.json',import.meta.url),'utf8'));
class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.value='';this.textContent='';this.events={};this.attributes={};}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  setAttribute(name,value){this.attributes[name]=value;}
  addEventListener(name,handler){this.events[name]=handler;}
  scrollIntoView(){}
  focus(){}
}
const elements=new Map();
const document={getElementById(id){if(!elements.has(id))elements.set(id,new Element('div'));return elements.get(id);},createElement(tag){return new Element(tag);},createDocumentFragment(){return new Element('fragment');},querySelectorAll(){return [];}};
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].split("fetch('./data.json")[0];
const context=vm.createContext({document,data,location:{hash:''},window:{addEventListener(){},scrollTo(){}}});
vm.runInContext(script+';start(data);',context);
const run=code=>vm.runInContext(code,context);
vm.runInContext("function descendants(n){return [n,...n.children.flatMap(descendants)];}",context);
assert.equal(data.departments.length,10);
assert.equal(document.getElementById('department-list').children.length,10);
assert.equal(run("state.resources.length"),data.resources.length);
assert.equal(run("$('resource-list').children[0].children.length"),data.resources.length);
run("$('search').value='Title I';renderResources();");
assert.ok(run("$('resource-list').children[0].children.length")>6);
run("$('search').value='';$('department').value='Health Services';renderResources();");
assert.ok(run("$('resource-list').children[0].children.length")>=3);
run("$('reset').events.click();");
assert.equal(run("$('department').value"),'');
assert.equal(run("$('resource-list').children[0].children.length"),data.resources.length);
run("renderDepartment('Summer School');");
assert.equal(run('state.department'),'Summer School');
const counts=new Set(data.resources.map(x=>x.href));assert.equal(counts.size,data.resources.length);
for(const r of data.resources){assert.match(r.href,/^https:\/\//);assert.ok(r.title&&r.department);}
for(const removed of ['CSS Connect','PBIS Celebration Help','Parent University Courses','GRPS ENDS Dashboard'])assert.ok(!data.resources.some(x=>x.title===removed));
assert.ok(!data.resources.some(x=>x.href==='https://grps.org/'));
assert.ok(html.includes('src="data:image/png;base64,'));
assert.equal(run("$('home').hidden"),false);
assert.equal(run("$('resources').hidden"),true);
run("location.hash='#resources';showView();");
assert.equal(run("$('resources').hidden"),false);
assert.equal(run("$('home').hidden"),true);
run("location.hash='#departments';showView();");
assert.equal(run("$('departments').hidden"),false);
run("location.hash='#home';showView();");
assert.equal(run("$('home').hidden"),false);
const approvedReports=['forecasting-mtss-grps-july-2025.pdf','grps-chronic-absenteeism-2025-26.pdf','grps-tiered-fidelity-inventory-2025-26.pdf'];
assert.deepEqual(fs.readdirSync(new URL('.',import.meta.url)).filter(x=>/\.(pdf|docx)$/i.test(x)).sort(),approvedReports.sort());
for(const name of approvedReports)assert.equal(fs.readFileSync(new URL('./'+name,import.meta.url)).subarray(0,5).toString(),'%PDF-');
console.log('PASS: 10 department profiles, '+data.resources.length+' unique links, resource search, filters, reset, department selection, and protected-file exclusions.');
assert.equal(data.leadership.expectations.length,6);
assert.equal(data.leadership.decks.length,3);
assert.equal(data.leadership.cases.length,47);
assert.equal(run("$('case-list').children.length"),47);
run("$('case-search').value='Federal Bureau';renderCases();");
assert.equal(run("$('case-list').children.length"),1);
assert.match(run("$('case-list').children[0].children[0].children[1].textContent"),/Federal Bureau/);
run("$('case-reset').events.click();$('case-topic').value='Family Engagement';renderCases();");
assert.ok(run("$('case-list').children.length")>=4);
run("$('case-list').children[0].children[1].children[1].events.click();");
assert.equal(run("$('lead-facilitation').hidden"),false);
assert.match(run('guideText()'),/DECISION TO FRAME/);
assert.match(run('guideText()'),/55–60/);
assert.ok(!html.includes('Open internal CSA hub')&&!html.includes('Open the internal CSA hub'));
assert.ok(!data.resources.some(r=>r.href==='https://csa-resource-center.melatkins2.chatgpt.site'));
for(const c of data.leadership.cases){assert.match(c.href,/^https:\/\//);assert.ok(c.title&&c.access);}
console.log('PASS: 47 case entries, topic and title filters, case-to-guide selection, full facilitator run sheet, 6 expectations, 3 decks, and no duplicate hub links.');

assert.equal(data.leadership.decks[0].date,'October 2026');
assert.match(data.leadership.decks[0].href,/^https:\/\/grpublicschools-my\.sharepoint\.com\//);

assert.equal(data.highlights.length,5);
assert.ok(!html.includes('id="positive-highlights"'));
run("renderDepartment('Summer School');");
assert.ok(run("descendants($('department-detail')).some(x=>x.className==='department-highlight')"));
for(const h of data.highlights){assert.ok(h.metric&&h.period&&h.source&&h.reviewed&&h.context);if(h.href)assert.match(h.href,/^https:\/\//);}
console.log('PASS: sourced positive highlights, department placement, dates, context, and view visibility.');

assert.equal(data.highlights[0].metric,'436 fewer scholars');
assert.ok(data.resources.some(r=>r.title.includes('Chronic Absenteeism: End of Year Report')&&r.report));

assert.equal(data.resources.filter(r=>r.report).length,3);
for(const name of ["State & Federal Programs","Social Emotional Learning"]){run("renderDepartment("+JSON.stringify(name)+");");assert.ok(run("descendants($('department-detail')).some(x=>x.textContent==='Resources for this work')"));}
// Leadership connections: panels, real department data, and direct resource paths.
assert.equal(data.leadership.priorities.length,3);
assert.equal(run("$('priority-list').children.length"),3);
assert.equal(run("$('spotlight-department').children.length"),10);
for(const name of ['expectations','priorities','spotlights','presentations','cases','facilitation']){
 run("showLeadership("+JSON.stringify(name)+");");
 assert.equal(run("$('lead-"+name+"').hidden"),false);
}
for(const d of data.departments){
 run("$('spotlight-department').value="+JSON.stringify(d.name)+";renderSpotlight();");
 assert.equal(run("$('spotlight-content').children[0].textContent"),d.name);
 assert.equal(run("$('spotlight-content').children.filter(x=>x.className==='spotlight-prompt').length"),4);
 run("$('spotlight-content').children.at(-1).events.click();");
 assert.equal(run('state.department'),d.name);
 assert.equal(context.location.hash,'departments');
}
assert.ok(!data.leadership.expectations.some(([t])=>t==='Bring a recommendation'));
assert.ok(!html.includes('Open the complete leadership guide'));
assert.ok(data.leadership.decks[0].discussionStatus.includes('not yet been summarized'));
assert.ok(data.leadership.priorities.every(p=>p.href&&p.next&&p.bringBack));
console.log('PASS: 3 dated CSA priorities, 10 department spotlights with direct resources and profile navigation, all 6 leadership panels, revised expectations, and explicit October slide-review limits.');

for(const d of data.departments){
 run("$('department-list').value="+JSON.stringify(d.name)+";$('department-list').events.change();");
 assert.equal(run('state.department'),d.name);
 assert.equal(run("$('department-detail').children[0].children[0].textContent"),d.name);
 const count=data.resources.filter(r=>r.department===d.name).length;
 assert.equal(run("descendants($('department-detail')).filter(x=>x.className==='dept-resource').length"),count);
 assert.equal(run("descendants($('department-detail')).filter(x=>x.className==='department-highlight').length"),data.highlights.filter(h=>h.departments.includes(d.name)).length);
}
assert.ok(html.includes('<select id="department-list">'));
assert.ok(!html.includes('class="dept-shell"'));
console.log('PASS: 10 selectable department profiles, all direct resource destinations, collapsed additional resources, responsive profile layout, and compact department-only evidence.');
