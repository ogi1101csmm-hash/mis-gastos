
const DEFAULT_CATEGORIES = [
  {name:'Supermercado', icon:'🛒'},
  {name:'Restaurantes', icon:'🍽️'},
  {name:'Transporte', icon:'🚗'},
  {name:'Ocio', icon:'🎾'},
  {name:'Suscripciones', icon:'📱'},
  {name:'Casa', icon:'🏠'},
  {name:'Viajes', icon:'✈️'},
  {name:'Salud', icon:'💊'},
  {name:'Ropa', icon:'👕'},
  {name:'Otros', icon:'📦'}
];

const fmt = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'});
let state = JSON.parse(localStorage.getItem('misGastosData') || 'null') || {
  budget: 1200,
  expenses: [],
  incomes: [],
  savings: [],
  recurring: [],
  categories: DEFAULT_CATEGORIES
};
state.expenses = Array.isArray(state.expenses) ? state.expenses : [];
state.incomes = Array.isArray(state.incomes) ? state.incomes : [];
state.savings = Array.isArray(state.savings) ? state.savings : [];
state.recurring = Array.isArray(state.recurring) ? state.recurring : [];
state.categories = Array.isArray(state.categories) && state.categories.length ? state.categories : DEFAULT_CATEGORIES;
let current = new Date();
current.setDate(1);

function save(){ localStorage.setItem('misGastosData', JSON.stringify(state)); render(); }
function monthKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function sameMonth(dateStr,d=current){ return dateStr?.startsWith(monthKey(d)); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function monthLabel(d){ return d.toLocaleDateString('es-ES',{month:'long',year:'numeric'}); }
function daysInMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); }
function daysRemaining(d){
  const now = new Date();
  if(now.getFullYear()===d.getFullYear() && now.getMonth()===d.getMonth()) return Math.max(1, daysInMonth(d)-now.getDate()+1);
  return daysInMonth(d);
}
function catMeta(name){ return state.categories.find(c=>c.name===name) || {name,icon:'📦'}; }

function recurringForMonth(d=current){
  const y=d.getFullYear(), m=d.getMonth();
  const lastDay=new Date(y,m+1,0).getDate();
  return state.recurring.map(r=>{
    const day=Math.min(Number(r.day)||1,lastDay);
    const date=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return {
      id:`recurring-${r.id || r.name}-${monthKey(d)}`,
      amount:Number(r.amount),
      name:r.name,
      category:r.category,
      date,
      method:'Recurrente',
      notes:'Gasto recurrente',
      type:'expense',
      recurring:true
    };
  });
}

function render(){
  document.getElementById('monthTitle').textContent = monthLabel(current);

  const manualExpenses = state.expenses.filter(x=>sameMonth(x.date));
  const recurringExpenses = recurringForMonth(current);
  const ex = [...manualExpenses, ...recurringExpenses];
  const inc = state.incomes.filter(x=>sameMonth(x.date));
  const sav = state.savings.filter(x=>sameMonth(x.date));

  const spent = ex.reduce((a,b)=>a+Number(b.amount||0),0);
  const income = inc.reduce((a,b)=>a+Number(b.amount||0),0);
  const saved = sav.reduce((a,b)=>a+Number(b.amount||0),0);

  // El ahorro reduce el disponible, pero NO forma parte del gasto.
  const remaining = Number(state.budget||0) + income - spent - saved;

  budgetValue.textContent = fmt.format(Number(state.budget||0));
  spentValue.textContent = fmt.format(spent);
  savedValue.textContent = fmt.format(saved);
  remainingValue.textContent = fmt.format(remaining);

  const pct = Number(state.budget)>0 ? Math.min(100,Math.round(spent/Number(state.budget)*100)) : 0;
  progressBar.style.width = pct+'%';
  progressText.textContent = `${pct}% utilizado en gastos`;
  dailyBudget.textContent = `${fmt.format(Math.max(0,remaining)/daysRemaining(current))}/día`;

  const grouped = {};
  ex.forEach(x=>grouped[x.category]=(grouped[x.category]||0)+Number(x.amount||0));
  const cats = Object.entries(grouped).sort((a,b)=>b[1]-a[1]);
  categoryCount.textContent = `${cats.length} categorías`;
  categoryList.innerHTML = cats.length ? cats.map(([name,amount])=>{
    const c=catMeta(name);
    const p=spent?Math.round(amount/spent*100):0;
    return `<div class="cat-row"><div class="cat-icon">${c.icon}</div><div><div class="cat-name">${escapeHtml(name)}</div><div class="cat-sub">${p}% del gasto</div></div><div class="cat-amount">${fmt.format(amount)}</div></div>`;
  }).join('') : `<div class="empty">Todavía no hay gastos este mes.</div>`;

  const movements = [
    ...manualExpenses.map(x=>({...x,type:'expense'})),
    ...recurringExpenses,
    ...inc.map(x=>({...x,type:'income'})),
    ...sav.map(x=>({...x,type:'saving'}))
  ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);

  recentList.innerHTML = movements.length ? movements.map(movementHTML).join('') : `<div class="empty">No hay movimientos este mes.</div>`;

  savingsMonthTotal.textContent = `${fmt.format(saved)} este mes`;
  savingsList.innerHTML = sav.length
    ? sav.sort((a,b)=>b.date.localeCompare(a.date)).map(x=>movementHTML({...x,type:'saving'})).join('')
    : `<div class="empty">Todavía no has registrado ahorro este mes.</div>`;

  recurringList.innerHTML = state.recurring.length ? state.recurring.map((r,i)=>{
    const c=catMeta(r.category);
    return `<div class="movement"><div class="movement-icon">${c.icon}</div><div><div class="movement-title">${escapeHtml(r.name)}</div><div class="movement-meta">Día ${r.day} · ${escapeHtml(r.category)}</div></div><div class="movement-amount">${fmt.format(Number(r.amount||0))}</div></div>`;
  }).join('') : `<div class="empty">No tienes gastos recurrentes configurados.</div>`;

  populateSelects();
}

function movementHTML(m){
  if(m.type==='income') return `<div class="movement"><div class="movement-icon">💵</div><div><div class="movement-title">${escapeHtml(m.name)}</div><div class="movement-meta">${formatDate(m.date)} · Ingreso</div></div><div class="movement-amount income-amount">+${fmt.format(m.amount)}</div></div>`;
  if(m.type==='saving') return `<div class="movement"><div class="movement-icon">💰</div><div><div class="movement-title">${escapeHtml(m.name)}</div><div class="movement-meta">${formatDate(m.date)} · Ahorro</div></div><div class="movement-amount saving-amount">${fmt.format(m.amount)}</div></div>`;
  const c=catMeta(m.category);
  return `<div class="movement"><div class="movement-icon">${c.icon}</div><div><div class="movement-title">${escapeHtml(m.name)}</div><div class="movement-meta">${formatDate(m.date)} · ${escapeHtml(m.category)}${m.recurring?' · Recurrente':''}</div></div><div class="movement-amount">-${fmt.format(m.amount)}</div></div>`;
}
function formatDate(s){ return new Date(s+'T12:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short'}); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function populateSelects(){
  const opts=state.categories.map(c=>`<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
  expenseCategory.innerHTML=opts; recurringCategory.innerHTML=opts;
}

prevMonth.onclick=()=>{current.setMonth(current.getMonth()-1);render();}
nextMonth.onclick=()=>{current.setMonth(current.getMonth()+1);render();}

addExpenseBtn.onclick=()=>{expenseForm.reset();expenseDate.value=todayISO();expenseDialog.showModal();}
addIncomeBtn.onclick=()=>{incomeForm.reset();incomeDate.value=todayISO();incomeDialog.showModal();}
addSavingBtn.onclick=()=>{savingForm.reset();savingName.value='Ahorro mensual';savingDate.value=todayISO();savingDialog.showModal();}
addRecurringBtn.onclick=()=>{recurringForm.reset();recurringDay.value=1;recurringDialog.showModal();}
settingsBtn.onclick=openSettings;

expenseForm.addEventListener('submit',e=>{
  if(e.submitter?.value==='cancel') return;
  e.preventDefault();
  if(!expenseForm.reportValidity()) return;
  state.expenses.push({
    id:crypto.randomUUID?.()||String(Date.now()),
    amount:Number(expenseAmount.value), name:expenseName.value.trim(),
    category:expenseCategory.value, date:expenseDate.value,
    method:expenseMethod.value, notes:expenseNotes.value.trim()
  });
  expenseDialog.close(); save();
});

incomeForm.addEventListener('submit',e=>{
  if(e.submitter?.value==='cancel') return;
  e.preventDefault();
  if(!incomeForm.reportValidity()) return;
  state.incomes.push({
    id:crypto.randomUUID?.()||String(Date.now()),
    amount:Number(incomeAmount.value), name:incomeName.value.trim(), date:incomeDate.value
  });
  incomeDialog.close(); save();
});

savingForm.addEventListener('submit',e=>{
  if(e.submitter?.value==='cancel') return;
  e.preventDefault();
  if(!savingForm.reportValidity()) return;
  state.savings.push({
    id:crypto.randomUUID?.()||String(Date.now()),
    amount:Number(savingAmount.value),
    name:savingName.value.trim(),
    date:savingDate.value,
    notes:savingNotes.value.trim()
  });
  savingDialog.close();
  save();
});

recurringForm.addEventListener('submit',e=>{
  if(e.submitter?.value==='cancel') return;
  e.preventDefault();
  if(!recurringForm.reportValidity()) return;
  state.recurring.push({
    id:crypto.randomUUID?.()||String(Date.now()),
    name:recurringName.value.trim(), amount:Number(recurringAmount.value),
    category:recurringCategory.value, day:Number(recurringDay.value)
  });
  recurringDialog.close(); save();
});

function openSettings(){
  budgetInput.value=state.budget;
  settingsDialog.showModal();
}
settingsForm.addEventListener('submit',e=>{
  if(e.submitter?.value==='cancel') return;
  e.preventDefault();
  state.budget=Number(budgetInput.value||0); settingsDialog.close(); save();
});

viewAllBtn.onclick=showAllMovements;
document.querySelector('[data-view="movements"]').onclick=showAllMovements;
function showAllMovements(){
  const all=[
    ...state.expenses.filter(x=>sameMonth(x.date)).map(x=>({...x,type:'expense'})),
    ...recurringForMonth(current),
    ...state.incomes.filter(x=>sameMonth(x.date)).map(x=>({...x,type:'income'})),
    ...state.savings.filter(x=>sameMonth(x.date)).map(x=>({...x,type:'saving'}))
  ].sort((a,b)=>b.date.localeCompare(a.date));
  listDialogTitle.textContent=`Movimientos · ${monthLabel(current)}`;
  fullMovementList.innerHTML=all.length?all.map(movementHTML).join(''):`<div class="empty">No hay movimientos.</div>`;
  listDialog.showModal();
}
closeListDialog.onclick=()=>listDialog.close();

document.querySelector('[data-view="stats"]').onclick=showStats;
function showStats(){
  const ex=[...state.expenses.filter(x=>sameMonth(x.date)), ...recurringForMonth(current)];
  const inc=state.incomes.filter(x=>sameMonth(x.date));
  const spent=ex.reduce((a,b)=>a+Number(b.amount),0);
  avgDaily.textContent=fmt.format(spent/daysInMonth(current));
  movementCount.textContent=ex.length+inc.length;
  incomeTotal.textContent=fmt.format(inc.reduce((a,b)=>a+Number(b.amount),0));
  const grouped={}; ex.forEach(x=>grouped[x.category]=(grouped[x.category]||0)+Number(x.amount));
  const cats=Object.entries(grouped).sort((a,b)=>b[1]-a[1]);
  topCategory.textContent=cats[0]?.[0]||'—';
  const max=cats[0]?.[1]||1;
  statsBars.innerHTML=cats.length?cats.map(([name,amount])=>`<div class="bar-row"><div>${escapeHtml(name)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(amount/max*100)}%"></div></div><div>${fmt.format(amount)}</div></div>`).join(''):`<div class="empty">Sin datos todavía.</div>`;
  statsDialog.showModal();
}
closeStatsDialog.onclick=()=>statsDialog.close();
document.querySelector('[data-view="settings"]').onclick=openSettings;
document.querySelector('[data-view="home"]').onclick=()=>render();

exportBtn.onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='mis-gastos-backup.json'; a.click(); URL.revokeObjectURL(a.href);
}
importInput.onchange=async(e)=>{
  const file=e.target.files[0]; if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!data || !Array.isArray(data.expenses)) throw new Error();
    state=data;
    state.expenses=Array.isArray(state.expenses)?state.expenses:[];
    state.incomes=Array.isArray(state.incomes)?state.incomes:[];
    state.savings=Array.isArray(state.savings)?state.savings:[];
    state.recurring=Array.isArray(state.recurring)?state.recurring:[];
    state.categories=Array.isArray(state.categories)&&state.categories.length?state.categories:DEFAULT_CATEGORIES;
    save(); alert('Datos importados correctamente.');
  }catch{ alert('El archivo no es válido.'); }
}
clearBtn.onclick=()=>{
  if(confirm('¿Seguro que quieres borrar todos los datos?')){
    localStorage.removeItem('misGastosData');
    state={budget:1200,expenses:[],incomes:[],savings:[],recurring:[],categories:DEFAULT_CATEGORIES};
    settingsDialog.close(); save();
  }
}

if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js')); }
render();
