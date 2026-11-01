'use strict';
/* ====== QUẢN LÝ TIỀN – dữ liệu lưu trong máy (localStorage) ====== */
const $ = s => document.querySelector(s), K = 'qlt_v1';
const DEF = {
  init: false, b0: 0, tx: [], budget: 0, hide: false,
  cats: [['🍜','Ăn uống'],['🛵','Di chuyển'],['🛍️','Mua sắm'],['🧾','Hóa đơn'],['🎮','Giải trí'],['💊','Sức khỏe'],['📦','Khác'],['💰','Thu nhập']],
  quick: [
    {id:1,t:'out',n:'Cà phê',a:25000,e:'☕',c:'#e17055',k:'Ăn uống'},
    {id:2,t:'out',n:'Ăn sáng',a:30000,e:'🥖',c:'#fdcb6e',k:'Ăn uống'},
    {id:3,t:'out',n:'Gửi xe',a:5000,e:'🛵',c:'#74b9ff',k:'Di chuyển'},
    {id:4,t:'out',n:'Xăng',a:50000,e:'⛽',c:'#a29bfe',k:'Di chuyển'},
    {id:5,t:'out',n:'Trà sữa',a:40000,e:'🧋',c:'#fd79a8',k:'Ăn uống'},
    {id:6,t:'in',n:'Lương',a:10000000,e:'💰',c:'#00b894',k:'Thu nhập'}],
  set: {theme:'auto',confirm:false,vib:true,pin:'',bk:Date.now()}
};
const clone = o => JSON.parse(JSON.stringify(o));
function load(d) { const o = clone(DEF); Object.assign(o, d || {}); o.set = Object.assign(clone(DEF.set), (d || {}).set); return o; }
let S; try { S = load(JSON.parse(localStorage[K])); } catch (e) { S = load(); }
let view = 'home', edit = false, F = {q:'',type:'',cat:'',r:'all'}, _ty, _q, _qt = 'out', shown = null, tt;

/* ====== Tiện ích ====== */
const save = () => { localStorage[K] = JSON.stringify(S); };
const num = v => parseInt(String(v).replace(/\D/g, '')) || 0;           // tiền luôn là số nguyên
const fmt = n => (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('vi-VN') + 'đ';
const fa = el => { const n = num(el.value); el.value = n ? n.toLocaleString('vi-VN') : ''; };
const bal = () => S.b0 + S.tx.reduce((a, t) => a + (t.type === 'in' ? t.amt : -t.amt), 0); // số dư = đầu kỳ + giao dịch
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const dkey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
const mkey = ts => { const d = new Date(ts); return d.getFullYear() * 12 + d.getMonth(); };
const tm = ts => new Date(ts).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
const ce = c => (S.cats.find(x => x[1] === c) || ['📦'])[0];
const vib = () => S.set.vib && navigator.vibrate && navigator.vibrate(15);
const theme = () => { document.documentElement.dataset.theme = S.set.theme; };
const opt = (v, l, cur) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`;
function dayLabel(ts) {
  const k = dkey(ts), n = Date.now();
  if (k === dkey(n)) return 'Hôm nay'; if (k === dkey(n - 864e5)) return 'Hôm qua';
  return new Date(ts).toLocaleDateString('vi-VN', {weekday:'long', day:'numeric', month:'numeric'});
}
function mstat(off = 0) {
  const n = new Date(), m = n.getFullYear() * 12 + n.getMonth() - off; let i = 0, o = 0; const bc = {};
  S.tx.forEach(t => { if (mkey(t.ts) !== m) return; if (t.type === 'in') i += t.amt; else { o += t.amt; bc[t.cat] = (bc[t.cat] || 0) + t.amt; } });
  return {i, o, bc};
}

/* ====== Toast + hoàn tác ====== */
function toast(m, undo) {
  const el = $('#toast');
  el.innerHTML = `<span>${m}</span>${undo ? '<button id="un">HOÀN TÁC</button>' : ''}`;
  el.classList.add('show');
  if (undo) $('#un').onclick = () => { undo(); el.classList.remove('show'); };
  clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 5000);
}

/* ====== Giao dịch ====== */
function addTx(t) {
  t.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5); t.ts = t.ts || Date.now();
  S.tx.push(t); save(); render();
  toast((t.type === 'in' ? 'Đã cộng ' : 'Đã trừ ') + fmt(t.amt) + ' – ' + esc(t.name || t.cat), () => { S.tx = S.tx.filter(x => x.id !== t.id); save(); render(); });
}
function qp(id) {                                   // bấm nút trừ/cộng nhanh
  const q = S.quick.find(x => x.id == id); if (edit) return qEdit(id);
  if (S.set.confirm && !confirm((q.t === 'in' ? 'Cộng ' : 'Trừ ') + fmt(q.a) + ' – ' + q.n + '?')) return;
  vib(); addTx({type:q.t, amt:q.a, name:q.n, e:q.e, cat:q.k || (q.t === 'in' ? 'Thu nhập' : 'Khác')});
}
const sh = h => { $('#sheet').innerHTML = `<div class="bd" onclick="cl()"></div><div class="card sheet">${h}</div>`; $('#sheet').className = 'open'; };
const cl = () => { $('#sheet').className = ''; };
function txSheet(t) {
  const e = !!t.id; t = Object.assign({type:'out', amt:0, cat:S.cats[0][1], note:'', ts:Date.now()}, t); _ty = t.type;
  const d = new Date(t.ts - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  sh(`<h3>${e ? 'Sửa giao dịch' : 'Thêm giao dịch'}</h3>
  <div class="seg"><button id="s-out" class="${t.type === 'out' ? 'on' : ''}" onclick="stype('out')">Chi</button><button id="s-in" class="${t.type === 'in' ? 'on' : ''}" onclick="stype('in')">Thu</button></div>
  <input id="f-a" class="big" inputmode="numeric" placeholder="0" value="${t.amt ? t.amt.toLocaleString('vi-VN') : ''}" oninput="fa(this)">
  <select id="f-c">${S.cats.map(c => opt(c[1], c[0] + ' ' + c[1], t.cat)).join('')}</select>
  <input id="f-n" placeholder="Ghi chú" value="${esc(t.note)}"><input id="f-d" type="datetime-local" value="${d}">
  <button class="btn" onclick="saveTx('${t.id || ''}')">Lưu</button>${e ? `<button class="btn red" onclick="delTx('${t.id}')">Xóa giao dịch</button>` : ''}`);
}
function stype(t) { _ty = t; $('#s-out').className = t === 'out' ? 'on' : ''; $('#s-in').className = t === 'in' ? 'on' : ''; if (t === 'in') $('#f-c').value = 'Thu nhập'; }
function saveTx(id) {
  const a = num($('#f-a').value); if (!a) return toast('Nhập số tiền lớn hơn 0');
  const o = {type:_ty, amt:a, cat:$('#f-c').value, note:$('#f-n').value.trim(), ts:new Date($('#f-d').value).getTime() || Date.now()};
  if (id) { Object.assign(S.tx.find(x => x.id === id), o); save(); cl(); render(); } else { cl(); addTx(o); }
}
const editTx = id => txSheet(S.tx.find(x => x.id === id));
function delTx(id) {
  const t = S.tx.find(x => x.id === id); S.tx = S.tx.filter(x => x !== t); save(); cl(); render();
  toast('Đã xóa giao dịch', () => { S.tx.push(t); save(); render(); });
}

/* ====== Nút nhanh ====== */
function qEdit(id) {
  const q = S.quick.find(x => x.id == id) || {id:Date.now(), t:_qt, n:'', a:0, e:'💸', c:'#6c5ce7', k:_qt === 'in' ? 'Thu nhập' : 'Khác', _n:1}; _q = q;
  sh(`<h3>${q._n ? 'Thêm nút mới' : 'Sửa nút'}</h3>
  <div class="two2"><input id="q-e" value="${esc(q.e)}" style="width:72px;text-align:center;font-size:24px"><input id="q-n" placeholder="Tên (vd: Cà phê)" value="${esc(q.n)}"></div>
  <input id="q-a" class="big" inputmode="numeric" placeholder="Số tiền cố định" value="${q.a ? q.a.toLocaleString('vi-VN') : ''}" oninput="fa(this)">
  <select id="q-t">${opt('out', 'Trừ tiền', q.t)}${opt('in', 'Cộng tiền', q.t)}</select>
  <select id="q-k">${S.cats.map(c => opt(c[1], c[0] + ' ' + c[1], q.k)).join('')}</select>
  <div class="srow"><span>Màu nút</span><input id="q-c" type="color" value="${q.c}" style="width:60px;padding:2px;margin:0"></div>
  <button class="btn" onclick="qSave()">Lưu</button>${q._n ? '' : `<button class="btn red" onclick="qDel(${q.id})">Xóa nút</button>`}`);
}
function qSave() {
  const q = _q; q.n = $('#q-n').value.trim(); q.a = num($('#q-a').value); q.e = $('#q-e').value || '💸';
  q.c = $('#q-c').value; q.t = $('#q-t').value; q.k = $('#q-k').value;
  if (!q.n || !q.a) return toast('Nhập tên và số tiền');
  delete q._n; if (!S.quick.some(x => x.id == q.id)) S.quick.push(q); save(); cl(); render();
}
const qDel = id => { S.quick = S.quick.filter(x => x.id != id); save(); cl(); render(); };
function qMove(id, d) {
  const i = S.quick.findIndex(x => x.id == id), j = i + d; if (j < 0 || j >= S.quick.length) return;
  [S.quick[i], S.quick[j]] = [S.quick[j], S.quick[i]]; save(); render();
}
const tile = q => `<div class="tile" style="--c:${q.c}" onclick="qp(${q.id})"><span>${esc(q.e)}</span><b>${esc(q.n)}</b><small>${q.t === 'in' ? '+' : '-'}${fmt(q.a)}</small>${edit ? `<i class="mv l" onclick="event.stopPropagation();qMove(${q.id},-1)">‹</i><i class="mv r" onclick="event.stopPropagation();qMove(${q.id},1)">›</i>` : ''}</div>`;
const grid = (t, l) => `<div class="grid">${S.quick.filter(q => q.t === t).slice(0, l || 99).map(tile).join('')}${t === 'out' ? `<div class="tile dash" onclick="txSheet({type:'out'})"><span>➕</span><b>Khác…</b><small>Số tiền tùy ý</small></div>` : ''}</div>`;
const row = t => `<div class="row" onclick="editTx('${t.id}')"><span class="ic">${esc(t.e || ce(t.cat))}</span><div class="mid"><b>${esc(t.name || t.cat)}</b><small>${esc(t.cat)} · ${tm(t.ts)}${t.note ? ' · ' + esc(t.note) : ''}</small></div><b class="${t.type}">${t.type === 'in' ? '+' : '-'}${fmt(t.amt)}</b></div>`;

/* ====== Các màn hình ====== */
function vHome() {
  const m = mstat(), b = S.budget, raw = b ? m.o / b * 100 : 0, p = Math.min(raw, 100);
  const rec = [...S.tx].sort((a, b) => b.ts - a.ts).slice(0, 5).map(row).join('');
  return `<header><div><h1>Xin chào 👋</h1><small>${new Date().toLocaleDateString('vi-VN', {weekday:'long', day:'numeric', month:'long'})}</small></div></header>
  <div class="hero"><small>Tổng tiền hiện tại</small><div class="amt" id="bal">${S.hide ? '••••••' : fmt(bal())}</div>
  <button class="eye" onclick="S.hide=!S.hide;save();render()">${S.hide ? '👁️' : '🙈'}</button>
  <div class="two"><div><small>Thu tháng này</small><b>+${fmt(m.i)}</b></div><div><small>Chi tháng này</small><b>-${fmt(m.o)}</b></div></div></div>
  ${b ? `<div class="card"><div class="bh"><b>Ngân sách tháng</b><span>${fmt(m.o)} / ${fmt(b)}</span></div><div class="bar"><i class="${raw >= 100 ? 'r' : raw >= 80 ? 'o' : ''}" style="width:${p}%"></i></div>${raw >= 100 ? '<small class="red">⚠️ Đã vượt ngân sách tháng!</small>' : raw >= 80 ? `<small>⚠️ Đã dùng ${Math.round(raw)}% ngân sách</small>` : ''}</div>` : ''}
  <div class="sec"><b>⚡ Trừ nhanh</b><a onclick="go('quick')">Xem tất cả</a></div>${grid('out', 5)}
  <div class="sec"><b>Gần đây</b><a onclick="go('hist')">Tất cả</a></div><div class="card list">${rec || '<p class="empty">Chưa có giao dịch</p>'}</div>`;
}
function vQuick() {
  return `<header><h1>Trừ tiền nhanh</h1><button class="chip ${edit ? 'on' : ''}" onclick="edit=!edit;render()">${edit ? 'Xong' : '✏️ Sửa'}</button></header>
  <p class="hint">${edit ? 'Chạm vào nút để sửa, dùng ‹ › để đổi vị trí.' : 'Chạm 1 lần là trừ ngay và ghi vào lịch sử.'}</p>${grid('out')}
  ${edit ? `<button class="btn" onclick="_qt='out';qEdit()">+ Thêm nút trừ tiền</button>` : ''}
  <div class="sec"><b>💰 Cộng tiền nhanh</b></div><div class="grid">${S.quick.filter(q => q.t === 'in').map(tile).join('')}</div>
  ${edit ? `<button class="btn" onclick="_qt='in';qEdit()">+ Thêm nút cộng tiền</button>` : ''}`;
}
const fl = (k, v) => { F[k] = v; $('#hl').innerHTML = hl(); };
function hl() {
  const now = Date.now(), mk = mkey(now), q = F.q.toLowerCase();
  const L = [...S.tx].sort((a, b) => b.ts - a.ts).filter(t => (!F.type || t.type === F.type) && (!F.cat || t.cat === F.cat) &&
    (!q || ((t.name || '') + t.cat + (t.note || '')).toLowerCase().includes(q)) &&
    (F.r === 'all' || (F.r === '7' ? now - t.ts < 7 * 864e5 : F.r === '30' ? now - t.ts < 30 * 864e5 : mkey(t.ts) === mk)));
  if (!L.length) return '<p class="empty">Không có giao dịch</p>';
  let h = '', k = '';
  L.forEach(t => {
    const dk = dkey(t.ts);
    if (dk !== k) { k = dk; const o = L.filter(x => dkey(x.ts) === dk && x.type === 'out').reduce((a, x) => a + x.amt, 0); h += `<div class="dh"><b>${dayLabel(t.ts)}</b><small>Chi ${fmt(o)}</small></div>`; }
    h += row(t);
  });
  return h;
}
function vHist() {
  return `<header><h1>Lịch sử</h1></header>
  <input class="search" placeholder="🔍 Tìm kiếm…" value="${esc(F.q)}" oninput="F.q=this.value;$('#hl').innerHTML=hl()">
  <div class="filters"><select onchange="fl('type',this.value)">${opt('', 'Thu & chi', F.type)}${opt('out', 'Chi', F.type)}${opt('in', 'Thu', F.type)}</select>
  <select onchange="fl('cat',this.value)">${opt('', 'Mọi danh mục', F.cat)}${S.cats.map(c => opt(c[1], c[1], F.cat)).join('')}</select>
  <select onchange="fl('r',this.value)">${opt('all', 'Tất cả', F.r)}${opt('7', '7 ngày', F.r)}${opt('30', '30 ngày', F.r)}${opt('m', 'Tháng này', F.r)}</select></div>
  <div class="card list" id="hl">${hl()}</div>`;
}
function vStats() {
  const a = mstat(), b = mstat(1), ent = Object.entries(a.bc).sort((x, y) => y[1] - x[1]), col = ['#6c5ce7','#e17055','#00b894','#fdcb6e','#0984e3','#fd79a8','#636e72'];
  let acc = 0; const grad = ent.map(([, v], i) => { const s = acc / a.o * 100; acc += v; return `${col[i % 7]} ${s}% ${acc / a.o * 100}%`; }).join(',');
  const days = [...Array(7)].map((_, i) => { const d = Date.now() - (6 - i) * 864e5; return {l:new Date(d).toLocaleDateString('vi-VN', {weekday:'short'}), v:S.tx.filter(t => t.type === 'out' && dkey(t.ts) === dkey(d)).reduce((s, t) => s + t.amt, 0)}; });
  const mx = Math.max(1, ...days.map(d => d.v)), diff = b.o ? Math.round((a.o - b.o) / b.o * 100) : null;
  return `<header><h1>Thống kê</h1></header>
  <div class="card"><small>Chi tháng này</small><div class="big2">${fmt(a.o)}</div><small>Tháng trước: ${fmt(b.o)}${diff === null ? '' : ` · <b class="${diff > 0 ? 'out' : 'in'}">${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}%</b>`}</small></div>
  <div class="card"><b>Theo danh mục</b>${ent.length ? `<div class="donut" style="background:conic-gradient(${grad})"></div>${ent.map(([k, v], i) => `<div class="srow"><span><i class="dot" style="background:${col[i % 7]}"></i>${ce(k)} ${esc(k)}</span><b>${fmt(v)} · ${Math.round(v / a.o * 100)}%</b></div>`).join('')}` : '<p class="empty">Chưa có chi tiêu tháng này</p>'}</div>
  <div class="card"><b>Chi 7 ngày gần nhất</b><div class="bars">${days.map(d => `<div title="${fmt(d.v)}"><i style="height:${d.v / mx * 100}%"></i><small>${d.l}</small></div>`).join('')}</div></div>`;
}
function vSet() {
  const s = S.set, days = Math.floor((Date.now() - s.bk) / 864e5);
  return `<header><h1>Cài đặt</h1></header>
  <div class="card"><div class="srow" onclick="setBal()"><span>💰 Điều chỉnh số dư</span><b>${fmt(bal())}</b></div>
  <div class="srow" onclick="setBud()"><span>🎯 Ngân sách tháng</span><b>${S.budget ? fmt(S.budget) : 'Chưa đặt'}</b></div>
  <div class="srow" onclick="cats()"><span>🏷️ Danh mục</span><b>${S.cats.length}</b></div></div>
  <div class="card"><label class="srow"><span>🎨 Giao diện</span><select onchange="S.set.theme=this.value;save();theme()">${opt('auto', 'Theo hệ thống', s.theme)}${opt('light', 'Sáng', s.theme)}${opt('dark', 'Tối', s.theme)}</select></label>
  <label class="srow"><span>❓ Xác nhận trước khi trừ</span><input type="checkbox" ${s.confirm ? 'checked' : ''} onchange="S.set.confirm=this.checked;save()"></label>
  <label class="srow"><span>📳 Rung khi bấm</span><input type="checkbox" ${s.vib ? 'checked' : ''} onchange="S.set.vib=this.checked;save()"></label>
  <div class="srow" onclick="pin()"><span>🔒 Khóa bằng PIN</span><b>${s.pin ? 'Đang bật' : 'Tắt'}</b></div></div>
  <div class="card"><div class="srow" onclick="expJ()"><span>📤 Xuất sao lưu (JSON)</span><b>›</b></div>
  <label class="srow"><span>📥 Nhập sao lưu</span><b>›</b><input type="file" accept=".json,application/json" hidden onchange="imp(this.files[0])"></label>
  <div class="srow" onclick="expC()"><span>📊 Xuất CSV</span><b>›</b></div>
  <small>Sao lưu gần nhất: ${days} ngày trước. Dữ liệu chỉ nằm trong máy này, hãy sao lưu định kỳ!</small></div>
  <div class="card"><div class="srow red" onclick="wipe()"><span>🗑️ Xóa toàn bộ dữ liệu</span></div></div>`;
}
function setBal() { const v = prompt('Số dư thực tế hiện tại (đồng):', bal()); if (v === null) return; S.b0 += num(v) - bal(); save(); render(); }
function setBud() { const v = prompt('Hạn mức chi mỗi tháng (đồng, nhập 0 để tắt):', S.budget); if (v === null) return; S.budget = num(v); save(); render(); }
function cats() {
  sh(`<h3>Danh mục</h3>${S.cats.map((c, i) => `<div class="srow"><span>${c[0]} ${esc(c[1])}</span><b class="red" onclick="catDel(${i})">Xóa</b></div>`).join('')}
  <div class="two2" style="margin-top:12px"><input id="c-e" placeholder="😀" style="width:70px;text-align:center"><input id="c-n" placeholder="Tên danh mục"></div><button class="btn" onclick="catAdd()">Thêm</button>`);
}
function catAdd() { const n = $('#c-n').value.trim(); if (!n) return; S.cats.push([$('#c-e').value || '🏷️', n]); save(); cats(); }
function catDel(i) { if (S.cats.length > 1) { S.cats.splice(i, 1); save(); cats(); } }

/* ====== Sao lưu / khôi phục ====== */
function dl(name, txt, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], {type})); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1e3); }
function expJ() { S.set.bk = Date.now(); save(); dl('quan-ly-tien-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(S), 'application/json'); render(); }
function expC() {
  const q = x => '"' + String(x).replace(/"/g, '""') + '"';
  dl('giao-dich.csv', '\ufeffNgày,Loại,Số tiền,Danh mục,Tên,Ghi chú\n' + [...S.tx].sort((a, b) => a.ts - b.ts).map(t => [new Date(t.ts).toLocaleString('vi-VN'), t.type === 'in' ? 'Thu' : 'Chi', t.amt, t.cat, t.name || '', t.note || ''].map(q).join(',')).join('\n'), 'text/csv');
}
function imp(f) {
  if (!f) return;
  f.text().then(x => { try { const d = JSON.parse(x); if (!Array.isArray(d.tx)) throw 0; if (!confirm('Thay toàn bộ dữ liệu hiện tại bằng bản sao lưu?')) return; S = load(d); S.init = true; save(); theme(); render(); toast('Đã nhập dữ liệu'); } catch (e) { toast('File không hợp lệ'); } });
}
function wipe() { if (confirm('Xóa TOÀN BỘ dữ liệu?') && prompt('Gõ XOA để xác nhận') === 'XOA') { S = load(); localStorage.removeItem(K); theme(); render(); welcome(); } }

/* ====== PIN ====== */
function pin() {
  if (S.set.pin) { if (prompt('Nhập PIN hiện tại để tắt') === S.set.pin) { S.set.pin = ''; save(); render(); } else toast('Sai PIN'); }
  else { const p = prompt('Đặt mã PIN 4 số'); if (/^\d{4}$/.test(p || '')) { S.set.pin = p; save(); render(); } else if (p !== null) toast('PIN phải đủ 4 số'); }
}
function lock() {
  if (!S.set.pin) return; let v = ''; const L = $('#lock'); L.className = 'on';
  const draw = () => {
    L.innerHTML = `<h2>🔒 Nhập mã PIN</h2><div class="dots">${[0, 1, 2, 3].map(i => `<i class="${i < v.length ? 'f' : ''}"></i>`).join('')}</div><div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>`;
    L.querySelectorAll('button').forEach(b => b.onclick = () => {
      const k = b.dataset.k; if (k === '⌫') v = v.slice(0, -1); else if (k !== '' && v.length < 4) v += k;
      if (v.length === 4) { if (v === S.set.pin) { L.className = ''; return; } v = ''; vib(); L.classList.add('shake'); setTimeout(() => L.classList.remove('shake'), 400); }
      draw();
    });
  };
  draw();
}
let hid = 0; document.addEventListener('visibilitychange', () => { if (document.hidden) hid = Date.now(); else if (S.set.pin && hid && Date.now() - hid > 3e4) lock(); });

/* ====== Điều hướng & hiển thị ====== */
const TABS = [['home','🏠','Tổng quan'],['quick','⚡','Trừ nhanh'],['hist','🧾','Lịch sử'],['stats','📊','Thống kê'],['set','⚙️','Cài đặt']];
function anim() { // số dư "nhảy" mượt khi thay đổi
  const el = $('#bal'), to = bal(); if (!el || S.hide) { shown = to; return; }
  const from = shown == null ? to : shown, t0 = performance.now();
  const f = t => { const k = Math.min((t - t0) / 500, 1); el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(f); else shown = to; };
  requestAnimationFrame(f);
}
function render() {
  $('#app').innerHTML = ({home:vHome, quick:vQuick, hist:vHist, stats:vStats, set:vSet})[view]();
  $('#nav').innerHTML = TABS.map(t => `<button class="${t[0] === view ? 'on' : ''}" onclick="go('${t[0]}')"><span>${t[1]}</span>${t[2]}</button>`).join('');
  $('#fab').style.display = view === 'quick' || view === 'set' ? 'none' : ''; anim();
}
function go(v) { view = v; edit = false; render(); const a = $('#app'); a.classList.remove('fx'); void a.offsetWidth; a.classList.add('fx'); scrollTo(0, 0); }
function welcome() {
  sh(`<h3>👋 Chào mừng bạn!</h3><p style="margin-bottom:12px;color:var(--mu)">Dữ liệu được lưu ngay trong máy, không gửi đi đâu cả. Nhập số tiền bạn đang có:</p>
  <input id="w-a" class="big" inputmode="numeric" placeholder="0" oninput="fa(this)"><button class="btn" onclick="S.b0=num($('#w-a').value);S.init=true;S.set.bk=Date.now();save();cl();render()">Bắt đầu</button>`);
}

/* ====== Khởi động ====== */
theme(); lock(); render();
if (!S.init) welcome();
else if (S.tx.length && Date.now() - S.set.bk > 7 * 864e5) toast('Đã hơn 7 ngày chưa sao lưu. Vào Cài đặt để xuất file.');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
