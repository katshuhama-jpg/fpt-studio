// @ts-nocheck
/* eslint-disable */
/* Nhân sự số Quy trình - builder dạng node (prototype). Port từ prototype Claude Design. */
import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

var CSS = `
.qt-root button{font-family:inherit;cursor:pointer}
.qt-root button:focus-visible,.qt-root input:focus-visible,.qt-root select:focus-visible,.qt-root textarea:focus-visible{outline:2px solid #203BDC;outline-offset:2px}
.qt-btn{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:10px;border:1px solid #e5e5e5;background:#fff;color:#0f172a;font-size:14px;font-weight:500;white-space:nowrap}
.qt-btn:hover{background:#f1f5f9}
.qt-btn-primary{background:#203BDC;border-color:#203BDC;color:#fff}
.qt-btn-primary:hover{background:#1a30b8}
.qt-btn-primary:disabled{background:#9aa8ee;border-color:#9aa8ee;cursor:not-allowed}
.qt-ghost{background:transparent;border:0;color:#475569}
.qt-ghost:hover{background:#f1f5f9}
.qt-nav{display:flex;align-items:center;gap:10px;height:34px;padding:0 10px;border-radius:8px;font-size:13px;color:#1e293b;background:transparent;border:0;width:100%;text-align:left}
.qt-nav:hover{background:#f1f5f9}
.qt-nav-on{background:#eef1fd;color:#203BDC;font-weight:500}
.qt-nav-on:hover{background:#eef1fd}
.qt-pill{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:999px;font-size:12px;border:1px solid #e5e5e5;background:#fff;color:#1e293b}
.qt-pill:hover{background:#f1f5f9}
.qt-pill-on{background:#eef1fd;border-color:#eef1fd;color:#203BDC;font-weight:500}
.qt-pill-on:hover{background:#e8ecfc}
.qt-item{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;padding:8px 10px;border:0;border-radius:8px;background:transparent}
.qt-item:hover,.qt-item-on{background:#eef1fd}
.qt-card{border:1px solid #e5e5e5;border-radius:10px;background:#fff;padding:16px;text-align:left;font:inherit;color:inherit;width:100%}
.qt-card:hover{border-color:#d4d4d8;box-shadow:0 2px 10px hsl(240 10% 8% / .06)}
.qt-plus{width:22px;height:22px;border-radius:999px;border:1px solid #203BDC;background:#fff;color:#203BDC;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 1px 3px hsl(240 10% 8% / .15)}
.qt-plus:hover{background:#203BDC;color:#fff}
.qt-grp{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:10px;border:0;font-size:13px;font-weight:500}
.qt-grp:hover{filter:brightness(.96)}
.qt-field{width:100%;height:34px;border:1px solid #e5e5e5;border-radius:8px;padding:0 10px;font:inherit;font-size:13px;color:#0f172a;background:#fff}
.qt-field[readonly]{background:#f8fafc}
.qt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.qt-seg{flex:1;height:32px;border:0;border-radius:6px;background:transparent;font-size:12px;color:#475569}
.qt-seg-on{background:#fff;color:#020817;font-weight:600;box-shadow:0 1px 2px hsl(240 10% 8% / .12)}
@keyframes qtpulse{0%{box-shadow:0 0 0 0 hsl(231 75% 49% / .45)}100%{box-shadow:0 0 0 10px hsl(231 75% 49% / 0)}}
.qt-running{animation:qtpulse 1s ease-out infinite}
@media (prefers-reduced-motion: reduce){.qt-running{animation:none}}
.qt-tbtn{width:34px;height:34px;border-radius:7px;border:0;background:transparent;color:#334155;display:flex;align-items:center;justify-content:center;padding:0}
.qt-tbtn:hover{background:#f1f5f9;color:#203BDC}
.qt-tbtn:disabled{color:#cbd5e1;cursor:default;background:transparent}
.qt-eplus{position:absolute;width:18px;height:18px;border-radius:999px;border:1px solid #cbd5e1;background:#fff;color:#64748b;display:flex;align-items:center;justify-content:center;padding:0;opacity:.7}
.qt-eplus:hover{opacity:1;border-color:#203BDC;background:#203BDC;color:#fff}
.qt-plus-err{border-color:#ea580c;color:#ea580c}
.qt-plus-err:hover{background:#ea580c;color:#fff}
.qt-sec{font-size:11px;font-weight:600;letter-spacing:.05em;color:#475569;margin-top:16px}
.qt-lbl{display:block;font-size:12px;font-weight:500;color:#334155;margin:12px 0 4px}
.qt-link{height:28px;padding:0 6px;border-radius:6px;font-size:12.5px;font-weight:500;color:#203BDC;margin-top:6px}
.qt-btn:disabled{opacity:.6;cursor:not-allowed}
@keyframes qtwaitp{0%{box-shadow:0 0 0 0 rgba(234,88,12,.45)}100%{box-shadow:0 0 0 10px rgba(234,88,12,0)}}
.qt-waiting{animation:qtwaitp 1.4s ease-out infinite}
@media (prefers-reduced-motion: reduce){.qt-waiting{animation:none}}
.qt-pal{display:flex;align-items:center;gap:8px;width:100%;height:32px;padding:0 6px;border:0;border-radius:7px;background:transparent;font-size:12.5px;color:#0f172a;text-align:left}
.qt-pal:hover{background:#f1f5f9}
.qt-acard{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;padding:10px;border:1px solid #e5e5e5;border-radius:10px;background:#fff}
.qt-acard:hover,.qt-acard-on{border-color:#a5b4fc;background:#f5f7ff}
.qt-root{font-family:"Inter Variable",Inter,ui-sans-serif,system-ui,sans-serif;color:#020817;-webkit-font-smoothing:antialiased}
.qt-root *{box-sizing:border-box}
.qt-root select.qt-field{appearance:auto}
`;
var _sc = {};
function S(css) {
  if (_sc[css]) return _sc[css];
  var o = {};
  css.split(';').forEach(function (d) { var i = d.indexOf(':'); if (i < 0) return; var k = d.slice(0, i).trim(); if (!k) return; o[k.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); })] = d.slice(i + 1).trim(); });
  if (Object.keys(_sc).length > 4000) _sc = {};
  _sc[css] = o; return o;
}
function Q(c) { return String(c || '').split(/\s+/).filter(Boolean).map(function (x) { return 'qt-' + x; }).join(' '); }
var ICON = {
  play: 'M8 5v14l11-7z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  bot: 'M5 8h14v11H5z M12 4v4 M9 13h.01 M15 13h.01',
  tag: 'M3 12V4h8l10 10-8 8z M7.5 7.5h.01',
  scan: 'M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4 M7 12h10',
  approve: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M16 11l2 2 4-4',
  tool: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4z',
  fx: 'M9 20c2 0 3-1 3.5-3l2-10C15 5 16 4 18 4 M7 10h9 M14 14l6 6 M20 14l-6 6',
  vars: 'M8 4c-2 0-3 1-3 3v2c0 1.5-1 2.5-2 3 1 .5 2 1.5 2 3v2c0 2 1 3 3 3 M16 4c2 0 3 1 3 3v2c0 1.5 1 2.5 2 3-1 .5-2 1.5-2 3v2c0 2-1 3-3 3',
  branch: 'M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a9 9 0 0 1-9 9',
  switch: 'M4 6h6l4 6-4 6H4 M14 12h6 M17 9l3 3-3 3',
  loop: 'M17 2l4 4-4 4 M3 11V9a3 3 0 0 1 3-3h15 M7 22l-4-4 4-4 M21 13v2a3 3 0 0 1-3 3H3',
  flow: 'M3 5h6v5H3z M15 14h6v5h-6z M9 7.5h3a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2',
  end: 'M6 6h12v12H6z',
  reply: 'M9 14L4 9l5-5 M4 9h11a5 5 0 0 1 5 5v6',
  note: 'M5 3h10l4 4v14H5z M14 3v5h5',
  http: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  data: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6'
};
// màu: [chữ/icon, nền]
var COL = { start: ['#15803D', '#dcfce7'], agent: ['#203BDC', '#e0e7ff'], ai: ['#4F46E5', '#ede9fe'], human: ['#9333EA', '#f3e8ff'], integ: ['#7C3AED', '#ede9fe'], fx: ['#0369A1', '#e0f2fe'], var: ['#0369A1', '#e0f2fe'], logic: ['#C2410C', '#ffedd5'], end: ['#B91C1C', '#fee2e2'], note: ['#A16207', '#fef9c3'] };
var TYPES = {
  start: { c: 'start', name: 'Bắt đầu', icon: ICON.bolt },
  agent: { c: 'agent', name: 'Nhân sự số', desc: 'Giao việc cần phán đoán cho một Nhân sự số', icon: ICON.bot, kw: 'agent ai nang suat', err: 1, ai: 1 },
  classify: { c: 'ai', name: 'Phân loại', desc: 'AI xếp dữ liệu vào nhóm, mỗi nhóm một nhánh', icon: ICON.tag, kw: 'classify phan loai nhom', ai: 1 },
  extract: { c: 'ai', name: 'Trích xuất', desc: 'Lấy các trường từ tài liệu, hoá đơn, giấy tờ', icon: ICON.scan, kw: 'extract trich xuat doc tai lieu hoa don cccd', ai: 1 },
  human: { c: 'human', name: 'Người duyệt', desc: 'Gửi cho người duyệt hoặc nhập thêm thông tin rồi chờ', icon: ICON.approve, kw: 'human review duyet nguoi xac nhan' },
  tool: { c: 'integ', name: 'Tool', desc: 'Dùng tool đã kết nối trong Space', icon: ICON.tool, kw: 'tool connector tich hop', err: 1, act: 1 },
  func: { c: 'fx', name: 'Hàm', desc: 'HTTP, xử lý dữ liệu, ngày giờ, chờ', icon: ICON.fx, kw: 'function ham http json', err: 1 },
  variable: { c: 'var', name: 'Biến', desc: 'Khai báo hoặc gán giá trị biến', icon: ICON.vars, kw: 'variable bien gan' },
  condition: { c: 'logic', name: 'Nếu / Không', desc: 'Rẽ nhánh theo điều kiện', icon: ICON.branch, kw: 'if else neu dieu kien re nhanh' },
  switch: { c: 'logic', name: 'Chọn theo giá trị', desc: 'Mỗi giá trị của một biến đi một nhánh', icon: ICON.switch, kw: 'switch case gia tri' },
  loop: { c: 'logic', name: 'Lặp', desc: 'Chạy các bước bên trong cho từng phần tử', icon: ICON.loop, kw: 'loop lap for each' },
  subflow: { c: 'integ', name: 'Quy trình con', desc: 'Chạy một Quy trình khác đã publish', icon: ICON.flow, kw: 'child workflow quy trinh con', err: 1 },
  end: { c: 'end', name: 'Kết thúc', desc: 'Dừng Quy trình với trạng thái thành công hoặc thất bại', icon: ICON.end, kw: 'end ket thuc dung' },
  respond: { c: 'agent', name: 'Trả kết quả cho Nhân sự số', desc: 'Gửi dữ liệu trả về cho Nhân sự số đã gọi Quy trình', icon: ICON.reply, kw: 'respond tra ket qua agent' },
  note: { c: 'note', name: 'Ghi chú', desc: 'Giải thích cho người xem sau', icon: ICON.note, kw: 'note ghi chu' }
};
var TRIGGERS = [
  { id: 'manual', name: 'Thủ công', desc: 'Chạy khi bấm nút hoặc gọi trực tiếp' },
  { id: 'schedule', name: 'Theo lịch', desc: 'Chạy định kỳ theo giờ, ngày, tuần' },
  { id: 'app', name: 'Sự kiện từ ứng dụng', desc: 'Chạy khi có sự kiện ở ứng dụng đã kết nối' },
  { id: 'http', name: 'Khi nhận HTTP request', desc: 'Hệ thống bên ngoài gửi dữ liệu tới một địa chỉ riêng' },
  { id: 'agent', name: 'Khi Nhân sự số gọi', desc: 'Nhân sự số dùng Quy trình này như một tool' }
];
var INTYPES = ['Văn bản', 'Số', 'Có / Không', 'Ngày', 'Email', 'Tệp'];
var FUNCS = [
  { g: 'HTTP', id: 'http', name: 'Gửi HTTP request', desc: 'Gọi API của hệ thống nội bộ', icon: ICON.http, out: ['status', 'body'] },
  { g: 'Xử lý dữ liệu', id: 'compose', name: 'Soạn dữ liệu', desc: 'Ghép nhiều giá trị thành một', icon: ICON.data, out: ['ket_qua'] },
  { g: 'Xử lý dữ liệu', id: 'parse', name: 'Đọc JSON', desc: 'Tách JSON thành các trường', icon: ICON.data, out: ['du_lieu'] },
  { g: 'Xử lý dữ liệu', id: 'filter', name: 'Lọc danh sách', desc: 'Giữ phần tử thoả điều kiện', icon: ICON.data, out: ['danh_sach'] },
  { g: 'Xử lý dữ liệu', id: 'join', name: 'Nối chuỗi', desc: 'Nối danh sách thành một chuỗi', icon: ICON.data, out: ['chuoi'] },
  { g: 'Ngày giờ', id: 'now', name: 'Lấy giờ hiện tại', desc: 'Theo múi giờ chọn', icon: ICON.clock, out: ['thoi_gian'] },
  { g: 'Ngày giờ', id: 'addtime', name: 'Cộng thời gian', desc: 'VD: hạn xử lý = hôm nay + 3 ngày', icon: ICON.clock, out: ['thoi_gian'] },
  { g: 'Lịch', id: 'delay', name: 'Chờ một khoảng', desc: 'Tạm dừng rồi chạy tiếp', icon: ICON.clock, out: [] }
];
function fnOf(c) { return FUNCS.filter(function (f) { return f.id === c.fn; })[0] || FUNCS[0]; }
var TOOLS = [
  { name: 'SAP ERP · Tạo đơn mua hàng', desc: 'Tạo PO từ nhà cung cấp, số tiền', out: ['ma_po'] },
  { name: 'SAP ERP · Ghi nhận công nợ', desc: 'Ghi công nợ phải trả theo hoá đơn', out: ['ma_but_toan'] },
  { name: 'Gmail · Gửi email', desc: 'Gửi email từ hộp thư đã kết nối', out: ['ma_thu'] },
  { name: 'SharePoint · Lấy tệp', desc: 'Đọc tệp trong thư viện tài liệu', out: ['tep'] },
  { name: 'DataSuite · Truy vấn bảng', desc: 'Lấy dữ liệu từ bảng đã kết nối', out: ['ket_qua'] }
];
var FLOWS = [{ name: 'Kiểm tra nhà cung cấp', ver: 'v3' }, { name: 'Gửi thông báo đa kênh', ver: 'v1' }];
var AGENTS = ['Trợ lý nội bộ công chức', 'Hỗ trợ thủ tục hành chính', 'Tư vấn khoản vay'];
var KBS = ['Quy định mua sắm 2026', 'Chính sách tín dụng bán lẻ', 'Danh mục nhà cung cấp'];
var DOCS = [
  { id: 'invoice', label: 'Hoá đơn VAT', out: ['so_hd', 'so_tien', 'ma_so_thue', 'nha_cung_cap', 'ngay_hd'] },
  { id: 'quote', label: 'Báo giá, đề nghị mua', out: ['nha_cung_cap', 'danh_muc', 'tong_tien'] },
  { id: 'cccd', label: 'CCCD', out: ['so_cccd', 'ho_ten', 'ngay_sinh', 'ngay_het_han'] },
  { id: 'statement', label: 'Sao kê ngân hàng', out: ['thu_nhap_tb', 'so_thang'] },
  { id: 'contract', label: 'Hợp đồng', out: ['ben_a', 'ben_b', 'gia_tri', 'ngay_hieu_luc'] }
];
var PAL = ['agent', 'classify', 'extract', 'human', 'tool', 'func', 'variable', 'condition', 'loop', 'note'];
var W = 240, LOOPW = 400, LOOPH = 180, HEAD = 56, PILL = 36;

function roundPath(pts, r) {
  var d = 'M' + pts[0][0] + ' ' + pts[0][1];
  for (var i = 1; i < pts.length - 1; i++) {
    var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    var l1 = Math.abs(p1[0] - p0[0]) + Math.abs(p1[1] - p0[1]), l2 = Math.abs(p2[0] - p1[0]) + Math.abs(p2[1] - p1[1]);
    var rr = Math.min(r, l1 / 2, l2 / 2);
    if (rr < 0.5) { d += ' L' + p1[0] + ' ' + p1[1]; continue; }
    var ax = p1[0] - Math.sign(p1[0] - p0[0]) * rr, ay = p1[1] - Math.sign(p1[1] - p0[1]) * rr;
    var bx = p1[0] + Math.sign(p2[0] - p1[0]) * rr, by = p1[1] + Math.sign(p2[1] - p1[1]) * rr;
    d += ' L' + ax + ' ' + ay + ' Q' + p1[0] + ' ' + p1[1] + ' ' + bx + ' ' + by;
  }
  var last = pts[pts.length - 1];
  return d + ' L' + last[0] + ' ' + last[1];
}
function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd'); }
function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[0-9_]+/, ''); }
function colOf(type) { return COL[TYPES[type].c]; }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function trigOf(c) { return TRIGGERS.filter(function (t) { return t.id === c.trigger; })[0] || TRIGGERS[0]; }

function defaultCfg(type) {
  switch (type) {
    case 'start': return { trigger: 'manual', inputs: [], freq: 'week', time: '08:00', app: 'Gmail · Khi có email mới' };
    case 'agent': return { agent: 'new', instructions: '', model: 'DeepSeek V4 Flash', tools: '', kb: '', askHuman: false, output: 'text', outVars: [], retry: false, err: 'stop' };
    case 'classify': return { input: '', model: 'DeepSeek V4 Flash', cats: [{ name: 'Nhóm 1', desc: '' }, { name: 'Nhóm 2', desc: '' }] };
    case 'extract': return { doc: '', fields: [] };
    case 'human': return { assignee: '', title: '', message: '', fields: [{ name: 'quyet_dinh', desc: 'Duyệt / Từ chối' }, { name: 'y_kien', desc: 'Ý kiến' }], timeout: '3' };
    case 'tool': return { tool: '', acc: '', params: '', retry: false, err: 'stop' };
    case 'func': return { fn: 'http', method: 'POST', url: '', body: '', input: '', amount: '3', unit: 'ngày', retry: true, err: 'stop' };
    case 'variable': return { vars: [{ name: '', value: '' }] };
    case 'condition': return { cases: [{ name: 'Nếu', logic: 'VÀ', rows: [{ v: '', op: 'Bằng', val: '' }] }] };
    case 'switch': return { on: '', vals: [{ name: 'Giá trị 1', desc: '' }] };
    case 'loop': return { mode: 'each', list: '', until: '', par: false, inner: [] };
    case 'subflow': return { flow: '', retry: false, err: 'stop' };
    case 'end': return { status: 'ok', message: '' };
    case 'respond': return { outs: [{ name: 'ket_qua', desc: '' }] };
    case 'note': return { text: 'Ghi lại lý do của đoạn này cho người xem sau.' };
  }
  return {};
}
function outsOf(n) {
  var c = n.cfg;
  switch (n.type) {
    case 'end': case 'respond': case 'note': return [];
    case 'condition': return c.cases.map(function (cs) { return cs.name || 'Nhánh'; }).concat(['Còn lại']);
    case 'classify': return c.cats.map(function (x) { return x.name || 'Nhóm'; }).concat(['Khác']);
    case 'switch': return c.vals.map(function (x) { return x.name || 'Giá trị'; }).concat(['Mặc định']);
  }
  var o = [''];
  if (TYPES[n.type].err && c.err === 'branch') o.push('Lỗi');
  return o;
}
function isBranchy(n) { return outsOf(n).length > 1; }
function sizeOf(n) {
  if (n.type === 'note') return { w: 220, h: 100 };
  if (n.type === 'loop') return { w: LOOPW, h: LOOPH };
  var o = outsOf(n);
  return { w: W, h: o.length > 1 ? HEAD + o.length * PILL + 4 : HEAD };
}
function outY(n, i) {
  if (n.type === 'loop') return LOOPH / 2;
  var o = outsOf(n);
  if (o.length > 1) return HEAD + i * PILL + 15;
  return HEAD / 2;
}
function inY(n) { return n.type === 'loop' ? LOOPH / 2 : HEAD / 2; }
function outputsOf(n) {
  var c = n.cfg;
  switch (n.type) {
    case 'start': return c.inputs.map(function (f) { return f.name; }).filter(Boolean).concat(c.trigger === 'schedule' ? ['thoi_diem_chay'] : []).concat(c.trigger === 'app' ? ['su_kien'] : []);
    case 'agent': return c.output === 'json' ? c.outVars : ['tra_loi'];
    case 'classify': return ['nhom'];
    case 'extract': return c.fields.map(function (f) { return f.name; }).filter(Boolean);
    case 'human': return c.fields.map(function (f) { return f.name; }).filter(Boolean).concat(['nguoi_duyet']);
    case 'tool': var t = TOOLS.filter(function (x) { return x.name === c.tool; })[0]; return t ? t.out : [];
    case 'func': return fnOf(c).out;
    case 'variable': return c.vars.map(function (v) { return v.name; }).filter(Boolean);
    case 'loop': return ['ket_qua_lap'];
    case 'subflow': return ['ket_qua'];
  }
  return [];
}
function subOf(n) {
  var c = n.cfg;
  switch (n.type) {
    case 'start': return trigOf(c).name;
    case 'tool': return c.tool;
    case 'func': return fnOf(c).name;
    case 'agent': return c.agent === 'new' ? '' : c.agent;
    case 'subflow': return c.flow;
  }
  return '';
}
function issuesOf(n, s) {
  var c = n.cfg, m = [];
  switch (n.type) {
    case 'start':
      if (c.trigger === 'agent') c.inputs.forEach(function (f) { if (f.name && !f.desc) m.push('Đầu vào ' + f.name + ' cần mô tả để Nhân sự số biết truyền gì'); });
      c.inputs.forEach(function (f) { if (!f.name) m.push('Có đầu vào chưa đặt tên'); });
      break;
    case 'agent': if (c.agent === 'new' && !c.instructions.trim()) m.push('Cần viết hướng dẫn cho Nhân sự số'); break;
    case 'classify': if (!c.input) m.push('Cần chọn dữ liệu cần phân loại'); if (c.cats.some(function (x) { return !x.desc.trim(); })) m.push('Mỗi nhóm cần mô tả để AI biết xếp vào đâu'); break;
    case 'extract': if (!c.doc) m.push('Cần chọn tài liệu để trích xuất'); if (!c.fields.length) m.push('Cần ít nhất một trường cần lấy'); break;
    case 'human': if (!c.assignee) m.push('Cần chọn người nhận'); if (!c.title.trim()) m.push('Cần tiêu đề'); if (!c.message.trim()) m.push('Cần nội dung'); if (!c.fields.length) m.push('Cần ít nhất một trường để người duyệt trả lời'); break;
    case 'tool': if (!c.tool) m.push('Cần chọn tool'); if (!c.acc) m.push('Cần chọn tài khoản chạy tool'); break;
    case 'func':
      if (c.fn === 'http' && !c.url.trim()) m.push('Cần nhập URL');
      if ((c.fn === 'compose' || c.fn === 'parse' || c.fn === 'filter' || c.fn === 'join') && !c.input) m.push('Cần chọn dữ liệu đầu vào');
      break;
    case 'variable': if (c.vars.some(function (v) { return !v.name.trim(); })) m.push('Cần đặt tên cho mỗi biến'); break;
    case 'condition': if (c.cases.some(function (cs) { return !cs.rows.length || cs.rows.some(function (r) { return !r.v || (r.op !== 'Rỗng' && !String(r.val).trim()); }); })) m.push('Nhánh còn thiếu biến hoặc giá trị so sánh'); break;
    case 'switch': if (!c.on) m.push('Cần chọn biến để so giá trị'); break;
    case 'loop': if (c.mode === 'each' && !c.list) m.push('Cần chọn danh sách để lặp'); if (c.mode === 'until' && !c.until.trim()) m.push('Cần điều kiện dừng'); if (!c.inner.length) m.push('Thêm ít nhất một bước vào vòng lặp'); break;
    case 'subflow': if (!c.flow) m.push('Cần chọn Quy trình con'); break;
    case 'respond': if (c.outs.some(function (o) { return !o.name.trim(); })) m.push('Cần đặt tên cho mỗi dữ liệu trả về'); break;
  }
  if (n.type !== 'start' && n.type !== 'note' && !s.edges.some(function (e) { return e.to === n.id; })) m.push('Bước này chưa được nối vào luồng');
  return m;
}
function upstreamOf(id, s) {
  var seen = {}, stack = [id], res = [];
  while (stack.length) { var cur = stack.pop(); s.edges.forEach(function (e) { if (e.to === cur && !seen[e.from]) { seen[e.from] = 1; stack.push(e.from); } }); }
  s.nodes.forEach(function (n) { if (seen[n.id]) outputsOf(n).forEach(function (v) { res.push({ v: v, l: v + ' · ' + n.title }); }); });
  return res;
}
function reachable(id, edges) {
  var seen = {}, stack = [id]; seen[id] = 1;
  while (stack.length) { var cur = stack.pop(); edges.forEach(function (e) { if (e.from === cur && !seen[e.to]) { seen[e.to] = 1; stack.push(e.to); } }); }
  return seen;
}
function layoutFlow(f) {
  var byId = {}; f.nodes.forEach(function (n) { byId[n.id] = n; });
  var colBottom = {}, colX = {}, placed = {}, GAPX = 80, GAPY = 40;
  var colW = function (col) { return colX[col] === undefined ? 0 : colX[col]; };
  // tính bề rộng cột lớn nhất trước
  var depth = {}, q = [];
  var st = f.nodes.filter(function (n) { return n.type === 'start'; })[0];
  if (st) { depth[st.id] = 0; q.push(st.id); }
  while (q.length) { var id = q.shift(); f.edges.filter(function (e) { return e.from === id; }).forEach(function (e) { if (depth[e.to] === undefined) { depth[e.to] = depth[id] + 1; q.push(e.to); } }); }
  var maxW = {}; f.nodes.forEach(function (n) { if (depth[n.id] !== undefined) maxW[depth[n.id]] = Math.max(maxW[depth[n.id]] || 0, sizeOf(n).w); });
  var x = 0, xs = {}; for (var d = 0; maxW[d] !== undefined; d++) { xs[d] = x; x += maxW[d] + GAPX; }
  function place(n, col, wantY) {
    if (placed[n.id]) return;
    col = depth[n.id] !== undefined ? depth[n.id] : col;
    var y = Math.max(wantY, colBottom[col] === undefined ? -1e9 : colBottom[col] + GAPY);
    y = Math.round(y / 4) * 4;
    n.x = xs[col] || 0; n.y = y; placed[n.id] = true;
    colBottom[col] = y + sizeOf(n).h;
    f.edges.filter(function (e) { return e.from === n.id; }).sort(function (a, b) { return a.out - b.out; })
      .forEach(function (e) { var ch = byId[e.to]; if (ch) place(ch, col + 1, y + outY(n, e.out) - inY(ch)); });
  }
  if (st) place(st, 0, 0);
  var maxY = 0; f.nodes.forEach(function (n) { if (placed[n.id]) maxY = Math.max(maxY, n.y + sizeOf(n).h); });
  f.nodes.forEach(function (n) { if (!placed[n.id]) { n.x = 0; n.y = maxY + 60; maxY += sizeOf(n).h + 30; } });
  return f;
}

var SUGGEST = [
  { key: 'buy', label: 'Duyệt đề nghị mua sắm', name: 'Duyệt đề nghị mua sắm', text: 'Nhân sự số gửi đề nghị mua sắm kèm chứng từ. Trích xuất chứng từ, nếu vượt 50 triệu thì giám đốc duyệt, không thì tự duyệt. Duyệt xong tạo PO trên SAP ERP, từ chối thì soạn thư báo lại.' },
  { key: 'invoice', label: 'Đối chiếu hoá đơn với PO', name: 'Đối chiếu hoá đơn với PO', text: 'Khi hệ thống kế toán gửi hoá đơn VAT qua HTTP, trích xuất số tiền, lấy PO tương ứng từ ERP để so khớp. Khớp thì ghi nhận công nợ, lệch thì chuyển kế toán xem lại.' },
  { key: 'loan', label: 'Tiếp nhận hồ sơ vay', name: 'Tiếp nhận hồ sơ vay', text: 'Nhận hồ sơ vay gồm CCCD và sao kê lương. Trích xuất CCCD, phân loại sản phẩm vay, Nhân sự số chấm điều kiện theo chính sách tín dụng rồi chuyển chuyên viên thẩm định. Đạt thì tạo hồ sơ trên LOS.' }
];
function N(id, type, title, cfg) { return { id: id, type: type, title: title, x: 0, y: 0, cfg: Object.assign(defaultCfg(type), cfg || {}) }; }
function E(list) { return list.map(function (a) { return { from: a[0], out: a[1], to: a[2] }; }); }
function I(name, t, desc) { return { name: name, t: t, desc: desc }; }
function F(names) { return names.map(function (x) { return { name: x, desc: '' }; }); }
function C(name, v, op, val) { return { name: name, logic: 'VÀ', rows: [{ v: v, op: op, val: val }] }; }
function draftFlow(key) {
  var f;
  if (key === 'invoice') f = {
    nodes: [
      N('n1', 'start', 'Bắt đầu', { trigger: 'http', inputs: [I('ma_po', 'Văn bản', 'Mã đơn mua hàng'), I('tep_hoa_don', 'Tệp', 'Hoá đơn PDF hoặc XML')] }),
      N('n2', 'extract', 'Trích xuất hoá đơn', { doc: 'tep_hoa_don', fields: F(['so_tien', 'ma_so_thue', 'ngay_hd']) }),
      N('n3', 'func', 'Lấy PO từ ERP', { fn: 'http', method: 'GET', url: 'https://erp.noibo.vn/api/po/{{ma_po}}', err: 'branch' }),
      N('n4', 'condition', 'Khớp với PO?', { cases: [C('Khớp', 'so_tien', 'Bằng', '{{body.tong_tien}}')] }),
      N('n5', 'tool', 'Ghi nhận công nợ', { tool: 'SAP ERP · Ghi nhận công nợ', acc: 'space' }),
      N('n6', 'human', 'Kế toán xem lại', { assignee: 'Nhóm Kế toán công nợ', title: 'Hoá đơn lệch PO', message: 'Hoá đơn {{ma_po}} lệch với PO. Số tiền: {{so_tien}}.', fields: [{ name: 'quyet_dinh', desc: 'Chấp nhận / Trả lại' }, { name: 'y_kien', desc: 'Ý kiến' }] }),
      N('n7', 'switch', 'Kế toán chọn gì?', { on: 'quyet_dinh', vals: [{ name: 'Chấp nhận', desc: '' }, { name: 'Trả lại', desc: '' }] }),
      N('n8', 'tool', 'Báo nhà cung cấp', { tool: 'Gmail · Gửi email', acc: '' }),
      N('n9', 'variable', 'Đánh dấu xử lý tay', { vars: [{ name: 'trang_thai', value: 'Cần xử lý tay' }] }),
      N('n10', 'end', 'Kết thúc', {})
    ],
    edges: E([['n1', 0, 'n2'], ['n2', 0, 'n3'], ['n3', 0, 'n4'], ['n3', 1, 'n9'], ['n4', 0, 'n5'], ['n4', 1, 'n6'], ['n6', 0, 'n7'], ['n7', 0, 'n5'], ['n7', 1, 'n8'], ['n5', 0, 'n10'], ['n8', 0, 'n10'], ['n9', 0, 'n10']])
  };
  else if (key === 'loan') f = {
    nodes: [
      N('n1', 'start', 'Bắt đầu', { trigger: 'manual', inputs: [I('cccd', 'Tệp', 'Ảnh hai mặt CCCD'), I('sao_ke', 'Tệp', 'Sao kê 3 tháng'), I('so_tien_vay', 'Số', 'Đơn vị đồng')] }),
      N('n2', 'extract', 'Trích xuất CCCD', { doc: 'cccd', fields: F(['so_cccd', 'ho_ten', 'ngay_sinh']) }),
      N('n3', 'classify', 'Phân loại sản phẩm vay', { input: 'so_tien_vay', cats: [{ name: 'Vay tiêu dùng', desc: 'Dưới 100 triệu, không tài sản đảm bảo' }, { name: 'Vay mua xe', desc: 'Khách nêu mua ô tô, xe máy' }] }),
      N('n4', 'agent', 'Chấm điều kiện', { instructions: 'Đối chiếu sao kê {{sao_ke}} và số tiền {{so_tien_vay}} với chính sách tín dụng. Trả về dat (true/false) và ly_do.', kb: 'Chính sách tín dụng bán lẻ', output: 'json', outVars: ['dat', 'ly_do'] }),
      N('n5', 'condition', 'Đạt điều kiện?', { cases: [C('Đạt', 'dat', 'Bằng', 'true')] }),
      N('n6', 'human', 'Chuyên viên thẩm định', { assignee: 'Nhóm Thẩm định bán lẻ', title: 'Thẩm định hồ sơ vay', message: 'Hồ sơ {{ho_ten}}, vay {{so_tien_vay}}. AI chấm: {{ly_do}}.' }),
      N('n7', 'func', 'Tạo hồ sơ trên LOS', { fn: 'http', method: 'POST', url: '' }),
      N('n8', 'agent', 'Tư vấn viên AI', { agent: 'Tư vấn khoản vay' }),
      N('n9', 'end', 'Kết thúc', {})
    ],
    edges: E([['n1', 0, 'n2'], ['n2', 0, 'n3'], ['n3', 0, 'n4'], ['n3', 1, 'n4'], ['n3', 2, 'n8'], ['n4', 0, 'n5'], ['n5', 0, 'n6'], ['n5', 1, 'n9'], ['n6', 0, 'n7'], ['n7', 0, 'n9'], ['n8', 0, 'n9']])
  };
  else f = {
    nodes: [
      N('n1', 'start', 'Bắt đầu', { trigger: 'agent', inputs: [I('chung_tu', 'Tệp', 'Báo giá hoặc đề nghị đã ký'), I('nguoi_de_nghi', 'Email', 'Email công ty của người đề nghị'), I('so_tien', 'Số', 'Tổng tiền đề nghị, đơn vị đồng')] }),
      N('n2', 'extract', 'Trích xuất chứng từ', { doc: 'chung_tu', fields: F(['nha_cung_cap', 'danh_muc']) }),
      N('n3', 'condition', 'Vượt hạn mức?', { cases: [C('Trên 50 triệu', 'so_tien', 'Lớn hơn', '50000000')] }),
      N('n4', 'human', 'Giám đốc duyệt', { assignee: 'Giám đốc khối của người đề nghị', title: 'Duyệt đề nghị mua sắm', message: '{{nguoi_de_nghi}} đề nghị mua {{danh_muc}} của {{nha_cung_cap}}, số tiền {{so_tien}}.' }),
      N('n5', 'condition', 'Được duyệt?', { cases: [C('Đồng ý', 'quyet_dinh', 'Bằng', 'Duyệt')] }),
      N('n6', 'tool', 'Tạo PO trên SAP ERP', { tool: 'SAP ERP · Tạo đơn mua hàng', acc: '' }),
      N('n7', 'agent', 'Soạn thư từ chối', { instructions: 'Soạn email lịch sự báo {{nguoi_de_nghi}} đề nghị chưa được duyệt, nêu ý kiến {{y_kien}}.' }),
      N('n8', 'respond', 'Trả kết quả cho Nhân sự số', { outs: [{ name: 'ma_po', desc: '{{ma_po}}' }, { name: 'trang_thai', desc: '{{quyet_dinh}}' }] })
    ],
    edges: E([['n1', 0, 'n2'], ['n2', 0, 'n3'], ['n3', 0, 'n4'], ['n3', 1, 'n6'], ['n4', 0, 'n5'], ['n5', 0, 'n6'], ['n5', 1, 'n7'], ['n6', 0, 'n8'], ['n7', 0, 'n8']])
  };
  return layoutFlow(f);
}
function pickKey(text) { var t = norm(text); if (t.indexOf('hoa don') >= 0) return 'invoice'; if (t.indexOf('vay') >= 0 || t.indexOf('ho so') >= 0) return 'loan'; return 'buy'; }
var MOCK = { nha_cung_cap: 'Công ty TNHH Phong Vũ', danh_muc: '20 laptop Dell Latitude', ma_so_thue: '0101234567', ngay_hd: '2026-10-18', so_cccd: '001090012345', ho_ten: 'Nguyễn Văn An', ngay_sinh: '1990-05-12', dat: 'true', ly_do: 'Thu nhập trung bình 32 triệu/tháng, đủ điều kiện', tra_loi: 'Đã xử lý xong', ma_po: 'PO-2026-0481', so_tien: '75000000', ma_but_toan: 'BT-77120', status: '200' };
function mockOf(k) { return MOCK[k] !== undefined ? MOCK[k] : 'Mẫu ' + k; }
function sampleOf(f) { if (MOCK[f.name] !== undefined) return MOCK[f.name]; var m = { 'Số': '75000000', 'Ngày': '2026-10-20', 'Tệp': f.name + '.pdf', 'Có / Không': 'true', 'Email': 'lan.nt@fpt.com' }; return m[f.t] || 'Mẫu ' + f.name; }
function msOf(type, seed) { var base = { agent: 2400, classify: 900, extract: 1300, tool: 540, func: 260, subflow: 1800 }; return (base[type] || 6) + (seed * 37) % (base[type] ? 400 : 9); }
function fill(t, vars) { return String(t || '').replace(/\{\{([^}]*)\}\}/g, function (m, k) { var v = vars[k.trim()]; return v !== undefined ? v : m; }); }

class ProcessBuilderInner extends React.Component<any, any> {
  constructor(props) {
    super(props);
    this.seq = 30;
    this.state = {
      screen: 'list', view: 'table', createOpen: false, ckind: 'chat', prompt: '', draftName: '', drafting: false, aiBanner: false, kind: 'all',
      name: '', nodes: [], edges: [], sel: null, tab: 'cfg', hist: [], top: 'build',
      add: null, palOpen: true, picking: null, drag: null, z: 1, px: 80, py: 80,
      checkOpen: false, pubOpen: false, status: 'draft', last: {},
      run: null, runOpen: false,
      guard: { safety: true, pii: true, scope: false, noDelete: true, maskOut: true, rate: false },
      toast: null
    };
    var self = this;
    this.canvasRef = function (el) { self.canvasEl = el; };
  }
  componentWillUnmount() { clearTimeout(this.timer); clearTimeout(this.toastT); }
  showToast(text, tone) { clearTimeout(this.toastT); this.setState({ toast: { text: text, tone: tone || 'dark' } }); var self = this; this.toastT = setTimeout(function () { self.setState({ toast: null }); }, 4200); }
  snap() { var s = this.state; return { hist: s.hist.concat([{ nodes: clone(s.nodes), edges: clone(s.edges) }]).slice(-40) }; }
  undo() { var h = this.state.hist; if (!h.length) return; var p = h[h.length - 1]; this.setState({ nodes: p.nodes, edges: p.edges, hist: h.slice(0, -1), sel: null, add: null }); }

  openBuilder(key, name, fromAi) {
    clearTimeout(this.timer);
    var f = key ? draftFlow(key) : { nodes: [N('n1', 'start', 'Bắt đầu', {})], edges: [] };
    this.setState({ screen: 'builder', createOpen: false, drafting: false, aiBanner: !!fromAi, name: name || 'Quy trình chưa đặt tên', nodes: f.nodes, edges: f.edges,
      sel: key ? null : 'n1', tab: 'cfg', hist: [], add: null, checkOpen: false, pubOpen: false, status: 'draft', last: {}, run: null, runOpen: false, top: 'build', picking: null });
    var self = this; setTimeout(function () { self.fit(); }, 40);
  }
  canvasSize() { var el = this.canvasEl; return { w: el ? el.clientWidth : 1060, h: el ? el.clientHeight : 850 }; }
  fit() {
    var nodes = this.state.nodes; if (!nodes.length) return;
    var cs = this.canvasSize(), minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (n) { var z = sizeOf(n); minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + z.w); maxY = Math.max(maxY, n.y + z.h); });
    var w = maxX - minX, h = maxY - minY, left = this.state.palOpen ? 230 : 40;
    var z = Math.min(1, (cs.w - left - 60) / w, (cs.h - 120) / h); z = Math.floor(z * 20) / 20;
    var px = left + (cs.w - left - 40 - w * z) / 2 - minX * z;
    if (z < 0.7) { z = 0.7; px = left + 24 - minX * z; }
    var py = (cs.h - h * z) / 2 - minY * z;
    if (nodes.length === 1) { z = 1; px = left + 80 - minX; py = cs.h * 0.38 - minY; }
    this.setState({ z: z, px: px, py: py });
  }
  locked() { var r = this.state.run; return !!(r && (r.status === 'running' || r.status === 'paused')); }
  byId(id) { return this.state.nodes.filter(function (n) { return n.id === id; })[0]; }

  // điểm chèn mặc định khi bấm bảng bên trái: cổng trống đầu tiên của bước đang chọn, rồi tới bước cuối có cổng trống
  autoFrom() {
    var s = this.state, self = this, free = function (n) { var o = outsOf(n); for (var i = 0; i < o.length; i++) if (!s.edges.some(function (e) { return e.from === n.id && e.out === i; })) return i; return -1; };
    var sn = this.byId(s.sel);
    if (sn) { var fi = free(sn); if (fi >= 0) return { id: sn.id, out: fi }; var e0 = s.edges.filter(function (e) { return e.from === sn.id; })[0]; if (e0) return { edge: e0 }; }
    for (var i = s.nodes.length - 1; i >= 0; i--) { var n = s.nodes[i]; if (n.type === 'note') continue; var f = free(n); if (f >= 0) return { id: n.id, out: f }; }
    return null;
  }
  openAdd(opts) {
    if (this.locked()) { this.showToast('Đang chạy thử. Dừng chạy thử để sửa Quy trình.'); return; }
    this.setState({ add: Object.assign({ tab: 'featured', level: 'root', q: '', idx: 0 }, opts || {}), checkOpen: false, pubOpen: false });
  }
  palPick(type) {
    if (this.locked()) { this.showToast('Đang chạy thử. Dừng chạy thử để sửa Quy trình.'); return; }
    var s = this.state, sn = this.byId(s.sel);
    if (type === 'tool') { var a = this.autoFrom(); this.openAdd(Object.assign({ tab: 'tool' }, a && a.edge ? { edge: a.edge } : { from: a })); return; }
    if (type === 'func') { var b = this.autoFrom(); this.openAdd(Object.assign({ level: 'func' }, b && b.edge ? { edge: b.edge } : { from: b })); return; }
    if (sn && sn.type === 'loop' && type !== 'note') { this.addInner(sn.id, TYPES[type].name); return; }
    if (type === 'note') { this.addNode('note', null); return; }
    var at = this.autoFrom();
    if (at && at.edge) this.insertOnEdge(type, at.edge); else this.addNode(type, at);
  }
  addInner(loopId, name) {
    var s = this.state;
    this.setState(Object.assign(this.snap(), { nodes: s.nodes.map(function (n) { return n.id === loopId ? Object.assign({}, n, { cfg: Object.assign({}, n.cfg, { inner: n.cfg.inner.concat([name]) }) }) : n; }), add: null, sel: loopId }));
  }
  addItems() {
    var a = this.state.add; if (!a) return [];
    var st = this.state, q = norm(a.q).trim(), res = [], match = function (t) { return !q || norm(t).indexOf(q) >= 0; };
    var T = function (k, g, extra) { var t = TYPES[k], c = COL[t.c]; return Object.assign({ g: g, type: k, name: t.name, desc: '', icon: t.icon, tile: c[0], tileBg: c[1] }, extra || {}); };
    var start = st.nodes.filter(function (n) { return n.type === 'start'; })[0];
    if (a.mode === 'inner') {
      ['agent', 'classify', 'extract', 'human', 'tool', 'func', 'variable', 'condition'].forEach(function (k) { if (match(TYPES[k].name + ' ' + TYPES[k].kw)) res.push(T(k, 'Bước trong vòng lặp')); });
      return res;
    }
    if (a.level === 'func' || q) {
      FUNCS.forEach(function (f) { if (match(f.name + ' ' + f.desc + ' ' + f.g + ' ham')) res.push({ g: q ? 'Hàm' : f.g, type: 'func', preset: { fn: f.id }, title: f.name, name: f.name, desc: f.desc, icon: f.icon, tile: COL.fx[0], tileBg: COL.fx[1] }); });
      if (a.level === 'func') return res;
    }
    if (a.tab === 'tool' || q) TOOLS.forEach(function (t) { if (match(t.name + ' ' + t.desc + ' tool')) res.push({ g: 'Tool đã kết nối', type: 'tool', preset: { tool: t.name, acc: 'space' }, title: t.name.split(' · ')[1], name: t.name, desc: t.desc, icon: ICON.tool, tile: COL.integ[0], tileBg: COL.integ[1], tag: 'Đã kết nối' }); });
    if (a.tab === 'flow' || q) FLOWS.forEach(function (f) { if (match(f.name + ' quy trinh con')) res.push({ g: 'Quy trình đã publish', type: 'subflow', preset: { flow: f.name + ' · ' + f.ver }, title: f.name, name: f.name, desc: 'Chạy như một bước, nhận lại kết quả', icon: ICON.flow, tile: COL.integ[0], tileBg: COL.integ[1], tag: f.ver }); });
    if (a.tab === 'featured' || q) {
      if (!q) {
        res.push(T('variable', 'Hay dùng'));
        res.push(Object.assign(T('tool', 'Hay dùng'), { more: true, goTab: 'tool' }));
        res.push(Object.assign(T('func', 'Hay dùng'), { more: true, goLevel: 'func' }));
      }
      ['agent', 'classify', 'extract', 'human', 'subflow', 'condition', 'switch', 'loop', 'end', 'note'].forEach(function (k) {
        if (q && (k === 'tool' || k === 'func')) return;
        if (match(TYPES[k].name + ' ' + TYPES[k].kw + ' ' + TYPES[k].desc)) res.push(Object.assign(T(k, 'Hành động', { desc: q ? TYPES[k].desc : '' }), k === 'subflow' ? { more: true, goTab: 'flow' } : {}));
      });
      if (q && match('bien variable')) res.push(T('variable', 'Hành động', { desc: TYPES.variable.desc }));
      if (start && start.cfg.trigger === 'agent' && match(TYPES.respond.name + ' ' + TYPES.respond.kw)) res.push(T('respond', 'Nhân sự số'));
    }
    if (a.from && a.tab === 'featured') {
      var anc = {}, stack = [a.from.id]; anc[a.from.id] = 1;
      while (stack.length) { var cur = stack.pop(); st.edges.forEach(function (e) { if (e.to === cur && !anc[e.from]) { anc[e.from] = 1; stack.push(e.from); } }); }
      st.nodes.forEach(function (n) { if (anc[n.id] || n.type === 'start' || n.type === 'note') return; if (match(n.title + ' noi co san')) { var c = colOf(n.type); res.push({ g: 'Nối tới bước có sẵn', connect: n.id, name: n.title, desc: '', icon: TYPES[n.type].icon, tile: c[0], tileBg: c[1] }); } });
    }
    return res;
  }
  pickAdd(it) {
    var a = this.state.add; if (!a) return;
    if (it.goTab) { this.setState({ add: Object.assign({}, a, { tab: it.goTab, idx: 0 }) }); return; }
    if (it.goLevel) { this.setState({ add: Object.assign({}, a, { level: it.goLevel, idx: 0 }) }); return; }
    if (a.mode === 'inner') { this.addInner(a.loopId, it.title || it.name); return; }
    if (it.connect) {
      var edges = this.state.edges.filter(function (e) { return !(e.from === a.from.id && e.out === a.from.out); }).concat([{ from: a.from.id, out: a.from.out, to: it.connect }]);
      this.setState(Object.assign(this.snap(), { edges: edges, add: null })); return;
    }
    if (it.type === 'note') { this.addNode('note', null); return; }
    if (a.edge) this.insertOnEdge(it.type, a.edge, it.preset, it.title); else this.addNode(it.type, a.from || null, it.preset, it.title);
  }
  makeNode(type, preset, title) { this.seq += 1; return { id: 'n' + this.seq, type: type, title: title || TYPES[type].name, x: 0, y: 0, cfg: Object.assign(defaultCfg(type), preset || {}) }; }
  addNode(type, from, preset, title) {
    var s = this.state, node = this.makeNode(type, preset, title), src = from ? this.byId(from.id) : null, x, y;
    if (src) { x = src.x + sizeOf(src).w + 80; y = src.y + outY(src, from.out) - inY(node); }
    else { var cs = this.canvasSize(); x = Math.round(((cs.w / 2 - s.px) / s.z - 110) / 20) * 20; y = Math.round(((cs.h / 2 - s.py) / s.z - 40) / 20) * 20; }
    var sz = sizeOf(node), g = 0;
    while (s.nodes.some(function (o) { var oz = sizeOf(o); return x < o.x + oz.w + 20 && o.x < x + sz.w + 20 && y < o.y + oz.h + 20 && o.y < y + sz.h + 20; }) && g < 60) { y += 20; g++; }
    node.x = x; node.y = y;
    var edges = s.edges.slice(); if (src && type !== 'note') edges.push({ from: src.id, out: from.out, to: node.id });
    this.setState(Object.assign(this.snap(), { nodes: s.nodes.concat([node]), edges: edges, sel: node.id, tab: 'cfg', add: null, runOpen: false, aiBanner: false, picking: null }));
  }
  insertOnEdge(type, e, preset, title) {
    var s = this.state, a = this.byId(e.from), b = this.byId(e.to), node = this.makeNode(type, preset, title);
    node.x = b.x; node.y = a.y + outY(a, e.out) - inY(node);
    var shift = reachable(b.id, s.edges), dx = sizeOf(node).w + 80;
    var nodes = s.nodes.map(function (n) { return shift[n.id] ? Object.assign({}, n, { x: n.x + dx }) : n; });
    var edges = s.edges.filter(function (x) { return !(x.from === e.from && x.out === e.out && x.to === e.to); });
    edges.push({ from: e.from, out: e.out, to: node.id }); edges.push({ from: node.id, out: 0, to: e.to });
    this.setState(Object.assign(this.snap(), { nodes: nodes.concat([node]), edges: edges, sel: node.id, tab: 'cfg', add: null, runOpen: false, picking: null }));
  }
  updateSel(patch) { var id = this.state.sel; this.setState({ nodes: this.state.nodes.map(function (n) { return n.id === id ? Object.assign({}, n, patch) : n; }) }); }
  updateCfg(patch) { var id = this.state.sel; this.setState({ nodes: this.state.nodes.map(function (n) { return n.id === id ? Object.assign({}, n, { cfg: Object.assign({}, n.cfg, patch) }) : n; }) }); }
  dropPort(id, i) { return this.state.edges.filter(function (e) { return !(e.from === id && e.out === i); }).map(function (e) { return e.from === id && e.out > i ? Object.assign({}, e, { out: e.out - 1 }) : e; }); }
  addPort(id, i) { return this.state.edges.map(function (e) { return e.from === id && e.out >= i ? Object.assign({}, e, { out: e.out + 1 }) : e; }); }
  setTrigger(t) {
    var s = this.state, id = this.state.sel, st = this.byId(id), nodes = s.nodes.map(function (n) { return n.id === id ? Object.assign({}, n, { cfg: Object.assign({}, n.cfg, { trigger: t }) }) : n; }), edges = s.edges;
    if (t === 'agent' && !s.nodes.some(function (n) { return n.type === 'respond'; })) {
      // giống Copilot: chọn "Khi Nhân sự số gọi" thì tự thêm bước trả kết quả ở cuối
      this.seq += 1;
      var r = { id: 'n' + this.seq, type: 'respond', title: TYPES.respond.name, x: 0, y: 0, cfg: defaultCfg('respond') };
      var maxX = 0; nodes.forEach(function (n) { maxX = Math.max(maxX, n.x + sizeOf(n).w); });
      r.x = maxX + 80; r.y = st.y;
      if (!edges.some(function (e) { return e.from === id; }) && nodes.length === 1) edges = edges.concat([{ from: id, out: 0, to: r.id }]);
      nodes = nodes.concat([r]);
      this.showToast('Đã thêm bước "Trả kết quả cho Nhân sự số" ở cuối Quy trình.');
    }
    this.setState(Object.assign(this.snap(), { nodes: nodes, edges: edges }));
  }
  allIssues() {
    var s = this.state, list = [];
    s.nodes.forEach(function (n) { var m = issuesOf(n, s); if (m.length) list.push({ id: n.id, title: n.title, type: n.type, msgs: m }); });
    var st = s.nodes.filter(function (n) { return n.type === 'start'; })[0];
    if (st && st.cfg.trigger === 'agent' && !s.nodes.some(function (n) { return n.type === 'respond'; })) list.push({ id: st.id, title: 'Quy trình', type: 'respond', msgs: ['Nhân sự số gọi Quy trình này nhưng chưa có bước Trả kết quả'] });
    return list;
  }

  openRun() {
    var s = this.state, st = s.nodes.filter(function (n) { return n.type === 'start'; })[0], inputs = {};
    st.cfg.inputs.forEach(function (f) { if (f.name) inputs[f.name] = sampleOf(f); });
    this.setState({ runOpen: true, sel: null, add: null, checkOpen: false, pubOpen: false, run: s.run && s.run.status !== 'idle' ? s.run : { status: 'idle', tab: 'input', inputs: inputs, log: [], ran: [], redges: [] } });
  }
  startRun() {
    var self = this, st = this.state.nodes.filter(function (n) { return n.type === 'start'; })[0], inputs = this.state.run.inputs;
    this.setState({ run: { status: 'running', tab: 'trace', inputs: inputs, log: [], ran: [], redges: [], cur: st.id, vars: Object.assign({}, inputs) }, aiBanner: false });
    clearTimeout(this.timer); this.timer = setTimeout(function () { self.step(); }, 500);
  }
  finish(ok, text, output) { this.setState(function (st) { return { run: Object.assign({}, st.run, { status: 'done', tab: 'result', cur: null, ok: ok, text: text, output: output || '' }) }; }); }
  evalCase(cs, vars) {
    var res = cs.rows.map(function (r) {
      var a = vars[r.v], b = fill(r.val, vars); if (a === undefined) return false;
      var na = parseFloat(a), nb = parseFloat(b);
      switch (r.op) { case 'Bằng': return String(a) === b; case 'Khác': return String(a) !== b; case 'Lớn hơn': return na > nb; case 'Nhỏ hơn': return na < nb; case 'Chứa': return String(a).indexOf(b) >= 0; case 'Rỗng': return !a; }
      return false;
    });
    return cs.logic === 'VÀ' ? res.every(Boolean) : res.some(Boolean);
  }
  step(answer) {
    var self = this, s = this.state, r = s.run;
    if (!r || (r.status !== 'running' && r.status !== 'paused')) return;
    var n = this.byId(r.cur); if (!n) return;
    var c = n.cfg, vars = Object.assign({}, r.vars), note = '', out = 0, st = 'Thành công', stop = null, seed = parseInt(n.id.slice(1), 10) || 1, ms = msOf(n.type, seed);
    var issues = issuesOf(n, s).filter(function (m) { return m !== 'Bước này chưa được nối vào luồng' && m.indexOf('cần mô tả') < 0 && m.indexOf('Mỗi nhóm') < 0; });
    if (answer !== undefined) {
      vars[c.fields[0] ? c.fields[0].name : 'quyet_dinh'] = answer; vars.nguoi_duyet = 'Bạn (chạy thử)'; ms = 8010; note = 'Bạn trả lời "' + answer + '" thay ' + (c.assignee || 'người duyệt');
    } else if (n.type === 'human') {
      if (issues.length) stop = issues[0];
      else { this.setState({ run: Object.assign({}, r, { status: 'paused', tab: 'result', waitId: n.id }) }); return; }
    } else if (n.type === 'start') {
      note = c.inputs.length ? 'Nhận ' + c.inputs.length + ' dữ liệu đầu vào' : trigOf(c).name;
    } else if (issues.length && TYPES[n.type].err && c.err !== 'stop') {
      st = c.retry ? 'Lỗi sau 3 lần thử' : 'Lỗi'; ms += c.retry ? 3000 : 0;
      if (c.err === 'branch') { out = outsOf(n).length - 1; note = issues[0] + '. Đi nhánh Lỗi.'; } else note = issues[0] + '. Dùng giá trị mặc định.';
    } else if (issues.length) {
      stop = issues[0] + (TYPES[n.type].err && c.retry ? ' (đã thử lại 3 lần)' : '');
    } else {
      switch (n.type) {
        case 'condition': out = c.cases.length; for (var i = 0; i < c.cases.length; i++) if (self.evalCase(c.cases[i], vars)) { out = i; break; } note = out < c.cases.length ? 'Đi nhánh "' + c.cases[out].name + '"' : 'Không nhánh nào đúng, đi Còn lại'; break;
        case 'switch': out = c.vals.length; for (var j = 0; j < c.vals.length; j++) if (String(vars[c.on]) === c.vals[j].name) { out = j; break; } note = c.on + ' = ' + vars[c.on] + (out < c.vals.length ? '' : ', đi Mặc định'); break;
        case 'classify': out = 0; vars.nhom = c.cats[0].name; note = 'AI xếp vào "' + c.cats[0].name + '" (độ tin cậy 0,91)'; break;
        case 'extract': c.fields.forEach(function (f) { if (f.name && vars[f.name] === undefined) vars[f.name] = mockOf(f.name); }); note = 'Lấy ' + c.fields.length + ' trường từ ' + c.doc; break;
        case 'agent': outputsOf(n).forEach(function (v) { if (vars[v] === undefined) vars[v] = mockOf(v); }); note = (c.agent === 'new' ? 'Nhân sự số của bước này' : c.agent) + ' đã trả lời'; break;
        case 'tool': outputsOf(n).forEach(function (v) { vars[v] = mockOf(v); }); note = c.tool + ' chạy xong'; break;
        case 'func': fnOf(c).out.forEach(function (v) { vars[v] = mockOf(v); }); note = fnOf(c).name + (c.fn === 'http' ? ': ' + c.method + ' ' + fill(c.url, vars) + ' → 200' : ''); break;
        case 'variable': c.vars.forEach(function (v) { vars[v.name] = fill(v.value, vars); }); note = c.vars.map(function (v) { return v.name + ' = ' + fill(v.value, vars); }).join(', '); break;
        case 'loop': note = 'Lặp 3 phần tử, mỗi lần chạy ' + c.inner.length + ' bước'; break;
        case 'subflow': note = c.flow + ' trả kết quả'; break;
        default: note = 'Xong';
      }
    }
    var log = r.log.concat([{ id: n.id, title: n.title, type: n.type, st: stop ? 'Lỗi' : st, note: stop || note, ms: ms }]);
    var last = Object.assign({}, s.last); last[n.id] = { st: stop ? 'Lỗi' : st, ms: ms, note: stop || note, out: JSON.stringify(outputsOf(n).reduce(function (o, k) { o[k] = vars[k] !== undefined ? vars[k] : null; return o; }, {}), null, 2) };
    var ran = r.ran.concat([n.id]);
    if (stop) { this.setState({ last: last, run: Object.assign({}, r, { log: log, ran: ran, failId: n.id, vars: vars }) }); this.finish(false, 'Dừng ở bước "' + n.title + '": ' + stop + '.'); return; }
    if (n.type === 'end' || n.type === 'respond') {
      var o = {}; if (n.type === 'respond') c.outs.forEach(function (x) { o[x.name] = x.desc ? fill(x.desc, vars) : mockOf(x.name); });
      this.setState({ last: last, run: Object.assign({}, r, { log: log, ran: ran, vars: vars }) });
      if (n.type === 'end') this.finish(c.status === 'ok', c.status === 'ok' ? 'Chạy xong qua ' + ran.length + ' bước, kết thúc thành công.' : 'Kết thúc với trạng thái thất bại' + (c.message ? ': ' + c.message : '.'));
      else this.finish(true, 'Chạy xong qua ' + ran.length + ' bước. Dữ liệu dưới đây được trả cho Nhân sự số đã gọi.', JSON.stringify(o, null, 2));
      return;
    }
    var e = s.edges.filter(function (x) { return x.from === n.id && x.out === out; })[0];
    if (!e) { this.setState({ last: last, run: Object.assign({}, r, { log: log, ran: ran, vars: vars }) }); var lb = outsOf(n)[out]; this.finish(true, 'Chạy xong qua ' + ran.length + ' bước. Quy trình dừng sau "' + n.title + '"' + (lb ? ' (nhánh ' + lb + ')' : '') + ' vì chưa có bước tiếp theo.'); return; }
    this.setState({ last: last, run: Object.assign({}, r, { status: 'running', waitId: null, log: log, ran: ran, redges: r.redges.concat([n.id + ':' + out]), cur: e.to, vars: vars }) });
    clearTimeout(this.timer); this.timer = setTimeout(function () { self.step(); }, 650);
  }
  runOne() {
    var s = this.state, n = this.byId(s.sel); if (!n) return;
    var issues = issuesOf(n, s).filter(function (m) { return m !== 'Bước này chưa được nối vào luồng'; });
    var last = Object.assign({}, s.last), seed = parseInt(n.id.slice(1), 10) || 1, out = outputsOf(n).reduce(function (o, k) { o[k] = mockOf(k); return o; }, {});
    last[n.id] = issues.length ? { st: 'Lỗi', ms: msOf(n.type, seed), note: issues[0] + '.', out: '{}' } : { st: 'Thành công', ms: msOf(n.type, seed), note: 'Chạy với dữ liệu mẫu từ các bước trước.', out: JSON.stringify(out, null, 2) };
    this.setState({ last: last });
  }

  renderVals() {
    var s = this.state, self = this;
    // ---------- list ----------
    var KB = { chat: ['Năng suất', '#f1f5f9', '#334155'], process: ['Quy trình', '#eef1fd', '#203BDC'] };
    var STT = { live: ['Đang hoạt động', '#bbf7d0', '#f0fdf4', '#15803d'], draft: ['Bản nháp', '#e5e5e5', '#fafafa', '#475569'] };
    var allCards = [
      { k: 'chat', st: 'live', name: 'Trợ lý nội bộ công chức', ver: 'v1.0.0', updated: 'Cập nhật 6 ngày trước', desc: 'Tra cứu số liệu phường, văn bản và trả lời kiến nghị cử tri.', meta: 'DeepSeek V4 Flash', icon: ICON.bot, act: '214 hội thoại' },
      { k: 'chat', st: 'live', name: 'Hỗ trợ thủ tục hành chính', ver: 'v1.2.0', updated: 'Cập nhật 2 ngày trước', desc: 'Hướng dẫn hồ sơ, lệ phí và thời hạn giải quyết thủ tục.', meta: 'DeepSeek V4 Flash', icon: ICON.bot, act: '260 hội thoại' },
      { k: 'process', st: 'draft', name: 'Đối chiếu hoá đơn với PO', ver: 'v0.1.0', updated: 'Cập nhật 1 giờ trước', desc: 'Nhận hoá đơn qua HTTP, so khớp với PO trên ERP, lệch thì chuyển kế toán xem lại.', meta: '10 bước · HTTP', icon: ICON.flow, tpl: 'invoice', act: 'Chưa publish' },
      { k: 'chat', st: 'live', name: 'Tư vấn khoản vay', ver: 'v0.3.0', updated: 'Cập nhật 3 ngày trước', desc: 'Tư vấn sản phẩm vay, hỏi nhu cầu và thu nhập của khách.', meta: 'DeepSeek V4 Flash', icon: ICON.bot, act: '0 hội thoại' }
    ];
    var tabs = [{ id: 'all', label: 'Tất cả' }, { id: 'live', label: 'Đã xuất bản' }, { id: 'draft', label: 'Bản nháp' }, { id: 'shared', label: 'Được chia sẻ' }];
    var kindFilters = tabs.map(function (t) { var n = allCards.filter(function (c) { return t.id === 'all' || c.st === t.id; }).length; return { label: t.label, count: n, cls: 'pill' + (s.kind === t.id ? ' pill-on' : ''), pick: function () { self.setState({ kind: t.id }); } }; });
    var cards = allCards.filter(function (c) { return s.kind === 'all' || s.kind === c.st; }).map(function (c) {
      var isP = c.k === 'process';
      return { verText: c.st === 'live' ? c.ver : 'Chưa có', verColor: c.st === 'live' ? '#0f172a' : '#64748b', model: isP ? 'Theo từng bước' : c.meta, activity: c.act, updatedShort: c.updated.replace('Cập nhật ', ''), name: c.name, ver: c.ver, updated: c.updated, desc: c.desc, meta: c.meta, icon: c.icon, avBg: isP ? '#eef1fd' : '#f1f5f9', avFg: isP ? '#203BDC' : '#334155', kind: KB[c.k][0], kindBg: KB[c.k][1], kindFg: KB[c.k][2],
        status: STT[c.st][0], stBorder: STT[c.st][1], stBg: STT[c.st][2], stFg: STT[c.st][3],
        open: function () { if (c.tpl) self.openBuilder(c.tpl, c.name, false); else self.showToast('Nhân sự số Năng suất mở như bản hiện tại. Prototype này chỉ dựng phần Quy trình.'); } };
    });
    var isChat = s.ckind === 'chat';
    var kindTabs = [{ id: 'chat', label: 'Năng suất', icon: ICON.bot }, { id: 'process', label: 'Quy trình', icon: ICON.flow }].map(function (k) { var on = s.ckind === k.id; return { label: k.label, icon: k.icon, on: on, cls: 'seg' + (on ? ' seg-on' : ''), pick: function () { self.setState({ ckind: k.id, prompt: '', draftName: '' }); } }; });
    var suggestions = (isChat ? [{ label: 'Hỗ trợ khách hàng', text: 'Trợ lý hỗ trợ khách hàng ngân hàng, trả lời thắc mắc về thẻ tín dụng, giọng trang trọng, tiếng Việt.' }, { label: 'Tra cứu nội bộ', text: 'Trợ lý tra cứu quy định nhân sự và hướng dẫn IT cho nhân viên.' }, { label: 'Tư vấn bán hàng', text: 'Trợ lý tư vấn gói dịch vụ, hỏi nhu cầu và chấm điểm khách tiềm năng.' }] : SUGGEST).map(function (g) { return { label: g.label, pick: function () { self.setState({ prompt: g.text, draftName: g.name || '' }); } }; });
    var promptOk = s.prompt.trim().length >= 20;

    // ---------- builder ----------
    var run = s.run, locked = this.locked(), byId = {}; s.nodes.forEach(function (n) { byId[n.id] = n; });
    var issues = this.allIssues(), issueBy = {}, issueCount = 0;
    issues.forEach(function (g) { issueCount += g.msgs.length; if (g.type !== 'respond' || g.title !== 'Quy trình') issueBy[g.id] = g.msgs; });
    var selNode = byId[s.sel] || null, showRun = s.runOpen && !!run, building = s.top === 'build';
    var startNode = s.nodes.filter(function (n) { return n.type === 'start'; })[0];

    var viewNodes = s.nodes.map(function (n) {
      var t = TYPES[n.type], z = sizeOf(n), col = colOf(n.type), isSel = s.sel === n.id && !showRun;
      var ran = run && run.ran.indexOf(n.id) >= 0, cur = run && run.cur === n.id && run.status === 'running', wait = run && run.status === 'paused' && run.waitId === n.id, fail = run && run.failId === n.id;
      var need = !!issueBy[n.id], ring = '';
      if (isSel || cur) ring = '#203BDC'; if (ran && !fail) ring = '#16a34a'; if (wait) ring = '#ea580c'; if (fail) ring = '#dc2626';
      var badge = '', bfg = '', bbg = '', bl = '';
      if (need) { badge = '⚠ Cần cấu hình'; bfg = '#b45309'; bbg = '#fffbeb'; bl = '#fde68a'; }
      if (ran) { badge = '✓ ' + (s.last[n.id] ? s.last[n.id].ms.toLocaleString('vi-VN') + ' ms' : 'Đã chạy'); bfg = '#15803d'; bbg = '#f0fdf4'; bl = '#bbf7d0'; }
      if (wait) { badge = 'Đang chờ trả lời'; bfg = '#c2410c'; bbg = '#fff7ed'; bl = '#fed7aa'; }
      if (fail) { badge = 'Lỗi'; bfg = '#b91c1c'; bbg = '#fef2f2'; bl = '#fecaca'; }
      var o = outsOf(n), branchy = o.length > 1 && n.type !== 'loop', sub = subOf(n);
      var outs = o.map(function (lbl, i) {
        var linked = s.edges.some(function (e) { return e.from === n.id && e.out === i; }), oy = outY(n, i), isErr = lbl === 'Lỗi';
        return { free: !linked, linked: linked, top: oy - 12, dotTop: oy - 4.5, dot: isErr ? '#ea580c' : '#0f172a', cls: 'plus' + (isErr ? ' plus-err' : ''), aria: 'Thêm bước sau ' + n.title + (lbl ? ' - nhánh ' + lbl : ''),
          plus: function (e) { e.stopPropagation(); self.setState({ sel: n.id, tab: 'cfg', runOpen: false }); self.openAdd({ from: { id: n.id, out: i } }); } };
      });
      return { x: n.x, y: n.y, w: z.w, h: z.h, title: n.title, icon: t.icon, tile: col[0], tileBg: col[1],
        isNote: n.type === 'note', isCard: n.type !== 'note', noteText: n.cfg.text || '', isLoop: n.type === 'loop', inner: n.type === 'loop' ? n.cfg.inner : [],
        addInner: function (e) { e.stopPropagation(); self.setState({ sel: n.id }); self.openAdd({ mode: 'inner', loopId: n.id }); },
        pills: branchy ? o.map(function (l) { return { label: l, bg: l === 'Lỗi' ? '#fff7ed' : (l === 'Còn lại' || l === 'Khác' || l === 'Mặc định' ? '#f1f5f9' : '#eef2f7'), fg: l === 'Lỗi' ? '#c2410c' : '#334155' }; }) : [],
        hasSub: !badge && !!sub, sub: sub,
        bg: n.type === 'note' ? '#fefce8' : (n.type === 'loop' ? 'rgba(248,250,252,.7)' : '#fff'),
        border: n.type === 'loop' ? '1.5px dashed ' + (ring || '#94a3b8') : '1px solid ' + (ring || (n.type === 'note' ? '#fde68a' : '#e2e8f0')),
        radius: branchy || n.type === 'loop' || n.type === 'note' ? 14 : 28,
        shadow: ring && n.type !== 'loop' ? '0 0 0 1px ' + ring + (isSel ? ', 0 0 0 5px rgba(32,59,220,.12)' : '') : (n.type === 'loop' ? 'none' : '0 1px 3px rgba(15,23,42,.06), 0 4px 12px rgba(15,23,42,.04)'),
        cls: cur ? 'running' : (wait ? 'waiting' : ''), badge: !!badge, badgeText: badge, badgeFg: bfg, badgeBg: bbg, badgeLine: bl,
        hasIn: n.type !== 'start' && n.type !== 'note', inTop: inY(n) - 4.5, outs: outs,
        down: function (e) { self.startDrag(e, n.id); },
        select: function () { self.setState({ sel: n.id, tab: 'cfg', runOpen: false, add: null }); } };
    });

    var d = '', dh = '', ed = '', eh = '', rd = '', rh = '', edgePlus = [];
    s.edges.forEach(function (e) {
      var a = byId[e.from], b = byId[e.to]; if (!a || !b) return;
      var za = sizeOf(a), x1 = a.x + za.w + 5, y1 = a.y + outY(a, e.out), x2 = b.x - 5, y2 = b.y + inY(b), pts;
      if (Math.abs(y1 - y2) < 1 && x2 > x1) pts = [[x1, y1], [x2 - 7, y2]];
      else if (x2 - x1 >= 40) { var mx = Math.min(x1 + Math.max(20, Math.min(40, (x2 - x1) / 2)) + e.out * 10, x2 - 16); pts = [[x1, y1], [mx, y1], [mx, y2], [x2 - 7, y2]]; }
      else { var lane = Math.max(a.y + za.h, b.y + sizeOf(b).h) + 28 + e.out * 12; pts = [[x1, y1], [x1 + 20 + e.out * 12, y1], [x1 + 20 + e.out * 12, lane], [x2 - 36, lane], [x2 - 36, y2], [x2 - 7, y2]]; }
      var seg = roundPath(pts, 8) + ' ', head = 'M' + (x2 - 8) + ' ' + (y2 - 4) + ' L' + x2 + ' ' + y2 + ' L' + (x2 - 8) + ' ' + (y2 + 4) + ' Z ';
      var lbl = outsOf(a)[e.out];
      if (run && run.redges.indexOf(e.from + ':' + e.out) >= 0) { rd += seg; rh += head; } else if (lbl === 'Lỗi') { ed += seg; eh += head; } else { d += seg; dh += head; }
      if (!locked && building) {
        var p = pts.length === 2 ? [(x1 + x2) / 2, y1] : (pts.length === 4 ? [(pts[2][0] + x2) / 2, y2] : [(pts[3][0] + pts[2][0]) / 2, pts[2][1]]);
        edgePlus.push({ x: p[0] - 9, y: p[1] - 9, aria: 'Chèn bước giữa ' + a.title + ' và ' + b.title, pick: function (ev) { ev.stopPropagation(); self.openAdd({ edge: e }); } });
      }
    });

    // hộp thoại Thêm bước
    var ad = s.add, addSections = [], flat = [];
    if (ad) {
      flat = this.addItems();
      var last0 = null;
      flat.forEach(function (it, i) {
        if (it.g !== last0) { addSections.push({ label: it.g, items: [] }); last0 = it.g; }
        addSections[addSections.length - 1].items.push({ name: it.name, desc: it.desc || '', hasDesc: !!it.desc, icon: it.icon, tile: it.tile, tileBg: it.tileBg, more: !!it.more, tag: it.tag || '', hasTag: !!it.tag,
          cls: 'acard' + (i === ad.idx ? ' acard-on' : ''), pick: function () { self.pickAdd(it); },
          hover: function () { if (self.state.add && self.state.add.idx !== i) self.setState({ add: Object.assign({}, self.state.add, { idx: i }) }); } });
      });
    }
    var addFrom = '';
    if (ad && ad.from && byId[ad.from.id]) { var fl = outsOf(byId[ad.from.id])[ad.from.out]; addFrom = 'Sau "' + byId[ad.from.id].title + '"' + (fl ? ' · nhánh ' + fl : ''); }
    if (ad && ad.edge && byId[ad.edge.from]) addFrom = 'Chèn giữa "' + byId[ad.edge.from].title + '" và "' + byId[ad.edge.to].title + '"';
    if (ad && ad.mode === 'inner') addFrom = 'Thêm vào trong vòng lặp';

    // panel
    var pmNode = building && !showRun && !!selNode, pmProcess = building && !showRun && !selNode, pmOther = !building;
    var sel = { title: '', icon: '', tile: '#203BDC', tileBg: '#eef1fd' }, pf = [], editors = [], cases = [], outVars = [], varOpts = [{ v: '', l: 'Chọn biến' }];
    if (pmNode) {
      var n = selNode, c = n.cfg, t = TYPES[n.type], col = colOf(n.type);
      var up = upstreamOf(n.id, s); varOpts = varOpts.concat(up);
      var ups = [{ v: '', l: 'Chọn biến' }].concat(up), firstVar = up.length ? up[0].v : 'bien';
      var opt = function (arr) { return arr.map(function (x) { return typeof x === 'string' ? { v: x, l: x || 'Chưa chọn' } : x; }); };
      var P = function (key, label, kind, extra) {
        return Object.assign({ id: 'f-' + key, label: label, isInput: kind === 'input', isSelect: kind === 'select', isText: kind === 'text', isToggle: kind === 'toggle', value: c[key], checked: !!c[key], ph: '', options: [], ro: false, font: 'inherit', canVar: false, hint: '',
          onChange: function (ev) { var p = {}; p[key] = ev.target.value; self.updateCfg(p); },
          onToggle: function () { var p = {}; p[key] = !self.byId(n.id).cfg[key]; self.updateCfg(p); },
          insertVar: function () { var p = {}; p[key] = (self.byId(n.id).cfg[key] || '') + '{{' + firstVar + '}}'; self.updateCfg(p); } }, extra || {});
      };
      // bộ sửa danh sách: key là mảng trong cfg, mỗi phần tử {name, desc}
      var LE = function (key, title, opts) {
        var arr = c[key], o = opts || {};
        return { title: title, hasB: o.hasB !== false, addLabel: o.addLabel || '+ Thêm', hasNote: !!o.note, note: o.note || '', hasExtra: !!o.extraLabel, extraLabel: o.extraLabel || '', extra: o.extra || function () {}, picking: !!o.picking, types: o.types || [],
          items: arr.map(function (it, i) {
            var set = function (p) { var a2 = arr.slice(); a2[i] = Object.assign({}, it, p); var pp = {}; pp[key] = a2; self.updateCfg(pp); };
            return { a: it[o.aKey || 'name'], b: it[o.bKey || 'desc'], aPh: o.aPh || 'ten_bien', bPh: o.bPh || 'Mô tả', aAria: (o.aPh || 'Tên') + ' ' + (i + 1), bAria: (o.bPh || 'Mô tả') + ' ' + (i + 1), aFont: o.mono === false ? 'inherit' : 'ui-monospace, SFMono-Regular, Menlo, monospace',
              hasTag: !!it.t, tag: it.t || '', lock: (o.min || 0) >= arr.length,
              onA: function (ev) { var p = {}; p[o.aKey || 'name'] = o.mono === false ? ev.target.value : ev.target.value.replace(/\s+/g, '_'); set(p); },
              onB: function (ev) { var p = {}; p[o.bKey || 'desc'] = ev.target.value; set(p); },
              remove: function () { if (o.ports) self.setState({ edges: self.dropPort(n.id, i) }); var pp = {}; pp[key] = arr.filter(function (_, j) { return j !== i; }); self.updateCfg(pp); } };
          }),
          add: o.add || function () { if (o.ports) self.setState({ edges: self.addPort(n.id, arr.length) }); var pp = {}; pp[key] = arr.concat([o.blank ? o.blank(arr.length) : { name: '', desc: '' }]); self.updateCfg(pp); } };
      };
      var MODELS = opt(['DeepSeek V4 Flash', 'GPT-OSS 120B', 'Qwen3 32B']), help = '';
      switch (n.type) {
        case 'start':
          pf.push(P('trigger', 'Kiểu kích hoạt', 'select', { options: TRIGGERS.map(function (x) { return { v: x.id, l: x.name }; }), hint: trigOf(c).desc + '.', onChange: function (ev) { self.setTrigger(ev.target.value); } }));
          if (c.trigger === 'schedule') { pf.push(P('freq', 'Tần suất', 'select', { options: [{ v: 'day', l: 'Hằng ngày' }, { v: 'week', l: 'Thứ Hai hằng tuần' }, { v: 'month', l: 'Ngày 1 hằng tháng' }] })); pf.push(P('time', 'Giờ chạy', 'input', { hint: 'Giờ Việt Nam (GMT+7).' })); }
          if (c.trigger === 'app') pf.push(P('app', 'Sự kiện', 'select', { options: opt(['Gmail · Khi có email mới', 'SharePoint · Khi có tệp mới', 'DataSuite · Khi có dòng mới']) }));
          if (c.trigger === 'http') pf.push(P('url', 'Địa chỉ nhận', 'input', { value: 'https://eos.fpt.ai/hooks/qt-8f21', ro: true, hint: 'Gửi POST kèm JSON và API key của Space.' }));
          if (c.trigger !== 'schedule' && c.trigger !== 'app') editors.push(LE('inputs', 'ĐẦU VÀO', { aPh: 'ten_dau_vao', bPh: c.trigger === 'agent' ? 'Mô tả cho Nhân sự số' : 'Mô tả', addLabel: '+ Thêm đầu vào', picking: s.picking === n.id,
            note: c.trigger === 'agent' ? 'Nhân sự số đọc tên và mô tả để biết cần truyền gì khi gọi Quy trình này.' : '',
            types: INTYPES.map(function (ty) { return { label: ty, pick: function () { self.updateCfg({ inputs: c.inputs.concat([{ name: '', t: ty, desc: '' }]) }); self.setState({ picking: null }); } }; }),
            add: function () { self.setState({ picking: s.picking === n.id ? null : n.id }); } }));
          break;
        case 'agent':
          pf.push(P('agent', 'Nhân sự số', 'select', { options: [{ v: 'new', l: 'Nhân sự số mới cho bước này' }].concat(AGENTS.map(function (a) { return { v: a, l: a }; })), hint: c.agent === 'new' ? 'Chỉ dùng trong Quy trình này.' : 'Nhân sự số Năng suất đã publish trong Space.' }));
          if (c.agent === 'new') {
            pf.push(P('model', 'Model', 'select', { options: MODELS }));
            pf.push(P('instructions', 'Hướng dẫn', 'text', { ph: 'Mô tả việc Nhân sự số cần làm. VD: Đối chiếu sao kê với chính sách tín dụng và kết luận đạt hay không.', canVar: true }));
            pf.push(P('tools', 'Tool', 'select', { options: opt([''].concat(TOOLS.map(function (x) { return x.name; }))), hint: 'Kết nối Nhân sự số với hệ thống khác.' }));
            pf.push(P('kb', 'Tri thức', 'select', { options: opt([''].concat(KBS)), hint: 'Nguồn tin cậy để Nhân sự số dựa vào.' }));
            pf.push(P('askHuman', 'Nhờ người hỗ trợ', 'toggle', { ph: 'Khi Nhân sự số chưa chắc cách xử lý, gửi câu hỏi cho chủ Quy trình qua Omni Inbox.' }));
          }
          pf.push(P('output', 'Đầu ra', 'select', { options: [{ v: 'text', l: 'Văn bản' }, { v: 'json', l: 'Có cấu trúc (các trường)' }] }));
          if (c.output === 'json') editors.push({ title: 'TRƯỜNG ĐẦU RA', hasB: false, addLabel: '+ Thêm trường', hasNote: false, note: '', hasExtra: false, extraLabel: '', extra: function () {}, picking: false, types: [],
            items: c.outVars.map(function (v, i) { return { a: v, aPh: 'ten_truong', aAria: 'Trường ' + (i + 1), aFont: 'ui-monospace, monospace', hasTag: false, lock: false, onA: function (ev) { var a2 = c.outVars.slice(); a2[i] = ev.target.value.replace(/\s+/g, '_'); self.updateCfg({ outVars: a2 }); }, remove: function () { self.updateCfg({ outVars: c.outVars.filter(function (_, j) { return j !== i; }) }); } }; }),
            add: function () { self.updateCfg({ outVars: c.outVars.concat(['']) }); } });
          break;
        case 'classify':
          pf.push(P('input', 'Dữ liệu cần phân loại', 'select', { options: ups }));
          pf.push(P('model', 'Model', 'select', { options: MODELS }));
          editors.push(LE('cats', 'NHÓM', { aPh: 'Tên nhóm', bPh: 'Thuộc nhóm này khi...', mono: false, addLabel: '+ Thêm nhóm', ports: true, min: 1, note: 'Mỗi nhóm một nhánh. AI không xếp được thì đi nhánh Khác.', blank: function (k) { return { name: 'Nhóm ' + (k + 1), desc: '' }; } }));
          break;
        case 'extract':
          var files = up.filter(function (o) { return startNode && startNode.cfg.inputs.some(function (f) { return f.name === o.v && f.t === 'Tệp'; }); });
          pf.push(P('doc', 'Tài liệu', 'select', { options: [{ v: '', l: files.length ? 'Chọn tài liệu' : 'Chưa có đầu vào kiểu Tệp' }].concat(files), hint: 'Hoá đơn, giấy tờ, hợp đồng... dạng PDF hoặc ảnh.' }));
          editors.push(LE('fields', 'TRƯỜNG CẦN LẤY', { aPh: 'ten_truong', bPh: 'Mô tả (không bắt buộc)', addLabel: '+ Thêm tay',
            extraLabel: 'Dùng mẫu có sẵn', extra: function () { self.setState({ picking: s.picking === n.id ? null : n.id }); }, picking: s.picking === n.id,
            types: DOCS.map(function (dd) { return { label: dd.label, pick: function () { self.updateCfg({ fields: F(dd.out) }); self.setState({ picking: null }); } }; }),
            note: 'Chọn mẫu như Hoá đơn VAT, CCCD để có sẵn các trường hay dùng.' }));
          break;
        case 'human':
          help = 'Quy trình tạm dừng tới khi người nhận trả lời. Khi chạy thử, bạn trả lời thay họ. Dùng bước Nếu / Không sau đó để rẽ theo câu trả lời.';
          pf.push(P('assignee', 'Gửi cho', 'select', { options: opt(['', 'Trưởng phòng của người đề nghị', 'Giám đốc khối của người đề nghị', 'Nhóm Kế toán công nợ', 'Nhóm Thẩm định bán lẻ']), hint: 'Người nhận thấy yêu cầu trong Omni Inbox và email.' }));
          pf.push(P('title', 'Tiêu đề', 'input', { ph: 'VD: Duyệt đề nghị mua sắm' }));
          pf.push(P('message', 'Nội dung', 'text', { ph: 'VD: {{nguoi_de_nghi}} đề nghị mua hàng, số tiền {{so_tien}}.', canVar: true }));
          pf.push(P('timeout', 'Hết hạn sau', 'select', { options: [{ v: '1', l: '1 ngày' }, { v: '3', l: '3 ngày' }, { v: '7', l: '7 ngày' }] }));
          editors.push(LE('fields', 'TRƯỜNG NGƯỜI NHẬN TRẢ LỜI', { aPh: 'ten_truong', bPh: 'Gợi ý, VD: Duyệt / Từ chối', addLabel: '+ Thêm trường' }));
          break;
        case 'tool':
          pf.push(P('tool', 'Tool', 'select', { options: opt([''].concat(TOOLS.map(function (x) { return x.name; }))) }));
          pf.push(P('acc', 'Chạy bằng tài khoản', 'select', { options: [{ v: '', l: 'Chưa chọn' }, { v: 'space', l: 'Tài khoản chung của Space' }, { v: 'user', l: 'Tài khoản của người chạy' }] }));
          pf.push(P('params', 'Truyền vào', 'input', { ph: 'VD: {{nha_cung_cap}}, {{so_tien}}' }));
          break;
        case 'func':
          pf.push(P('fn', 'Hàm', 'select', { options: FUNCS.map(function (f) { return { v: f.id, l: f.g + ' · ' + f.name }; }) }));
          if (c.fn === 'http') {
            pf.push(P('method', 'Phương thức', 'select', { options: opt(['GET', 'POST', 'PUT', 'PATCH']) }));
            pf.push(P('url', 'URL', 'input', { ph: 'https://erp.noibo.vn/api/...', hint: 'Dán cả lệnh cURL cũng được, hệ thống tự tách URL, header và body.' }));
            pf.push(P('body', 'Body (JSON)', 'text', { ph: '{ "ma_po": "{{ma_po}}" }', font: 'ui-monospace, SFMono-Regular, Menlo, monospace', canVar: true }));
          } else if (c.fn === 'delay') {
            pf.push(P('amount', 'Chờ', 'input', {})); pf.push(P('unit', 'Đơn vị', 'select', { options: opt(['phút', 'giờ', 'ngày']) }));
          } else if (c.fn === 'now') {
            pf.push(P('unit', 'Múi giờ', 'select', { options: opt(['GMT+7 Việt Nam', 'UTC']) }));
          } else {
            pf.push(P('input', c.fn === 'addtime' ? 'Thời điểm gốc' : 'Dữ liệu đầu vào', 'select', { options: ups }));
            if (c.fn === 'addtime') pf.push(P('amount', 'Cộng thêm (ngày)', 'input', {}));
            if (c.fn === 'filter') pf.push(P('body', 'Giữ phần tử khi', 'input', { ph: 'VD: so_tien > 1000000' }));
            if (c.fn === 'join') pf.push(P('body', 'Ký tự nối', 'input', { ph: ', ' }));
          }
          break;
        case 'variable':
          editors.push(LE('vars', 'BIẾN', { aPh: 'ten_bien', bPh: 'Giá trị', bKey: 'value', addLabel: '+ Thêm biến', min: 1, blank: function () { return { name: '', value: '' }; }, note: 'Bấm {x} trong ô giá trị ở bước khác để chèn biến này.' }));
          break;
        case 'switch':
          pf.push(P('on', 'So giá trị của', 'select', { options: ups }));
          editors.push(LE('vals', 'GIÁ TRỊ', { aPh: 'Giá trị', hasB: false, mono: false, addLabel: '+ Thêm giá trị', ports: true, min: 1, note: 'Mỗi giá trị một nhánh. Không khớp giá trị nào thì đi Mặc định.', blank: function (k) { return { name: 'Giá trị ' + (k + 1), desc: '' }; } }));
          break;
        case 'loop':
          pf.push(P('mode', 'Kiểu lặp', 'select', { options: [{ v: 'each', l: 'Với từng phần tử' }, { v: 'until', l: 'Lặp đến khi' }] }));
          if (c.mode === 'each') pf.push(P('list', 'Danh sách', 'select', { options: ups, hint: 'Các bước bên trong đọc phần tử hiện tại qua biến phan_tu.' }));
          else pf.push(P('until', 'Dừng khi', 'input', { ph: 'VD: trang_thai = "Xong"' }));
          pf.push(P('par', 'Chạy song song', 'toggle', { ph: 'Mặc định chạy lần lượt. Bật để chạy tối đa 5 phần tử cùng lúc.' }));
          help = 'Thêm bước vào vòng lặp bằng nút + trong khung, hoặc chọn khung rồi bấm bảng Thêm bước bên trái.';
          break;
        case 'subflow':
          pf.push(P('flow', 'Quy trình con', 'select', { options: opt([''].concat(FLOWS.map(function (f) { return f.name + ' · ' + f.ver; }))), hint: 'Chỉ chọn được Quy trình đã publish.' }));
          break;
        case 'end':
          pf.push(P('status', 'Trạng thái', 'select', { options: [{ v: 'ok', l: 'Thành công' }, { v: 'fail', l: 'Thất bại' }] }));
          pf.push(P('message', 'Ghi chú (không bắt buộc)', 'input', { ph: 'VD: Hồ sơ thiếu giấy tờ' }));
          break;
        case 'respond':
          help = 'Nhân sự số đã gọi Quy trình nhận lại các dữ liệu này.';
          editors.push(LE('outs', 'DỮ LIỆU TRẢ VỀ', { aPh: 'ten_du_lieu', bPh: 'Giá trị, VD: {{ma_po}}', addLabel: '+ Thêm dữ liệu', min: 1 }));
          break;
        case 'note':
          pf.push(P('text', 'Nội dung', 'text', {}));
          break;
      }
      pf.forEach(function (f) { f.hasHint = !!f.hint; });
      if (n.type === 'condition') {
        help = 'Xét từ trên xuống, mỗi lần chạy chỉ đi một nhánh.';
        cases = c.cases.map(function (cs, ci) {
          var setCase = function (ncs) { var arr = c.cases.slice(); arr[ci] = ncs; self.updateCfg({ cases: arr }); };
          return { id: 'case-' + ci, name: cs.name, logic: cs.logic, canRemove: c.cases.length > 1,
            onName: function (ev) { setCase(Object.assign({}, cs, { name: ev.target.value })); },
            toggleLogic: function () { setCase(Object.assign({}, cs, { logic: cs.logic === 'VÀ' ? 'HOẶC' : 'VÀ' })); },
            remove: function () { self.setState({ edges: self.dropPort(n.id, ci) }); self.updateCfg({ cases: c.cases.filter(function (_, j) { return j !== ci; }) }); },
            addRow: function () { setCase(Object.assign({}, cs, { rows: cs.rows.concat([{ v: '', op: 'Bằng', val: '' }]) })); },
            rows: cs.rows.map(function (r, ri) {
              var setRow = function (p) { var rows = cs.rows.slice(); rows[ri] = Object.assign({}, r, p); setCase(Object.assign({}, cs, { rows: rows })); };
              return { v: r.v, op: r.op, val: r.val, onV: function (ev) { setRow({ v: ev.target.value }); }, onOp: function (ev) { setRow({ op: ev.target.value }); }, onVal: function (ev) { setRow({ val: ev.target.value }); },
                remove: function () { setCase(Object.assign({}, cs, { rows: cs.rows.filter(function (_, j) { return j !== ri; }) })); } };
            }) };
        });
      }
      outVars = outputsOf(n);
      var nIss = issueBy[n.id] || [];
      sel = { title: n.title, icon: t.icon, tile: col[0], tileBg: col[1], help: help, hasHelp: !!help, hasIssue: nIss.length > 0, issueText: nIss.join(' · '),
        isCond: n.type === 'condition', hasOutVars: outVars.length > 0 && ['start', 'variable'].indexOf(n.type) < 0, hasErr: !!t.err,
        canDelete: n.type !== 'start', hasTabs: n.type !== 'note' && n.type !== 'start' };
    }
    var errNode = selNode && TYPES[selNode.type].err ? selNode.cfg : { retry: false, err: 'stop' };
    var last = selNode ? s.last[selNode.id] : null;

    // chạy thử
    var runInputs = [], runLog = [], waitNode = null;
    if (run) {
      runInputs = startNode.cfg.inputs.filter(function (f) { return f.name; }).map(function (f) { return { k: f.name, t: f.t, value: run.inputs[f.name] || '', onChange: function (ev) { var inp = Object.assign({}, self.state.run.inputs); inp[f.name] = ev.target.value; self.setState({ run: Object.assign({}, self.state.run, { inputs: inp }) }); } }; });
      runLog = run.log.map(function (l) { var cc = colOf(l.type); return { title: l.title, note: l.note, st: l.st + ' · ' + l.ms.toLocaleString('vi-VN') + ' ms', stColor: l.st === 'Thành công' ? '#15803d' : '#b91c1c', tile: cc[0], tileBg: cc[1], icon: TYPES[l.type].icon }; });
      if (run.status === 'running' && byId[run.cur]) { var cn = byId[run.cur], c2 = colOf(cn.type); runLog.push({ title: cn.title, note: 'Đang chạy...', st: '', stColor: '#64748b', tile: c2[0], tileBg: c2[1], icon: TYPES[cn.type].icon }); }
      if (run.status === 'paused') { waitNode = byId[run.waitId]; if (waitNode) runLog.push({ title: waitNode.title, note: 'Đang chờ trả lời', st: 'Tạm dừng', stColor: '#c2410c', tile: COL.human[0], tileBg: COL.human[1], icon: ICON.approve }); }
    }
    var RST = { idle: ['Chưa chạy', '#64748b'], running: ['Đang chạy', '#203BDC'], paused: ['Tạm dừng', '#c2410c'], done: [run && run.ok ? 'Thành công' : 'Dừng', run && run.ok ? '#15803d' : '#b91c1c'] };
    var rs = run ? RST[run.status] : RST.idle, waitActions = [];
    if (waitNode) {
      var hint = waitNode.cfg.fields[0] ? waitNode.cfg.fields[0].desc : '', opts = hint.indexOf('/') > 0 ? hint.split('/').map(function (x) { return x.trim(); }) : ['Duyệt', 'Từ chối'];
      waitActions = opts.map(function (a, i) { return { label: a, cls: i === 0 ? 'btn btn-primary' : 'btn', pick: function () { self.step(a); } }; });
    }
    var statusMap = { draft: ['Bản nháp', '#f59e0b', ''], pending: ['Chờ duyệt publish', '#f59e0b', 'v1'] };
    var g0 = s.guard, guardList = function (arr) { return arr.map(function (x) { return { label: x[1], on: !!g0[x[0]], toggle: function () { var ng = Object.assign({}, self.state.guard); ng[x[0]] = !ng[x[0]]; self.setState({ guard: ng }); } }; }); };
    var asTool = startNode && startNode.cfg.trigger === 'agent';

    return {
      isList: s.screen === 'list', isBuilder: s.screen === 'builder',
      isTable: s.view === 'table', isGrid: s.view === 'grid', tableBg: s.view === 'table' ? '#f1f5f9' : '#fff', gridBg: s.view === 'grid' ? '#f1f5f9' : '#fff',
      viewTable: function () { self.setState({ view: 'table' }); }, viewGrid: function () { self.setState({ view: 'grid' }); },
      kindFilters: kindFilters, cards: cards, kindTabs: kindTabs, isChatKind: isChat, suggestions: suggestions, prompt: s.prompt, drafting: s.drafting,
      kindHint: isChat ? 'Dựng bằng prompt, hỗ trợ việc hằng ngày' : 'Làm đúng theo quy trình, từng bước cố định',
      promptPh: isChat ? 'Trợ lý hỗ trợ khách hàng ngân hàng, trả lời thắc mắc về thẻ tín dụng, giọng trang trọng, tiếng Việt.' : 'VD: Nhận hoá đơn, trích xuất số tiền, so với PO trên ERP, lệch thì chuyển kế toán xem lại.',
      promptHelp: isChat ? 'Mô tả càng cụ thể, bản nháp càng sát - Tối thiểu 20 ký tự.' : 'Nêu các bước, ai duyệt, dùng hệ thống nào - Tối thiểu 20 ký tự.',
      draftDisabled: !promptOk, blankLabel: 'Tự dựng từ đầu',
      onPrompt: function (e) { self.setState({ prompt: e.target.value }); },
      createDraft: function () { if (isChat) { self.showToast('Luồng Năng suất giữ nguyên như hiện tại. Prototype này chỉ dựng phần Quy trình.'); return; } var key = pickKey(s.prompt), nm = s.draftName || SUGGEST.filter(function (x) { return x.key === key; })[0].name; self.setState({ drafting: true, createOpen: false }); setTimeout(function () { self.openBuilder(key, nm, true); }, 1400); },
      createBlank: function () { self.setState({ createOpen: false }); if (isChat) { self.showToast('Luồng Năng suất giữ nguyên như hiện tại. Prototype này chỉ dựng phần Quy trình.'); return; } self.openBuilder(null, 'Quy trình chưa đặt tên', false); },
      useTemplate: function () { self.showToast('Mẫu Năng suất giữ nguyên như hiện tại.'); },
      createOpen: s.createOpen, openCreate: function () { self.setState({ createOpen: true, prompt: '', draftName: '' }); }, closeCreate: function () { self.setState({ createOpen: false }); },

      aiBanner: s.aiBanner && s.screen === 'builder' && !showRun && building, draftSteps: s.nodes.filter(function (n) { return n.type !== 'note'; }).length, dismissBanner: function () { self.setState({ aiBanner: false }); },
      backToList: function () { clearTimeout(self.timer); self.setState({ screen: 'list', run: null, runOpen: false }); },
      name: s.name, statusLabel: statusMap[s.status][0], statusDot: statusMap[s.status][1], statusSub: s.status === 'pending' ? 'v1' : 'chưa có phiên bản',
      topTabs: [
        { id: 'build', label: 'Dựng nhân sự số', icon: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z' },
        { id: 'test', label: 'Kiểm thử', icon: 'M9 3h6 M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3 M7 15h10' },
        { id: 'deploy', label: 'Kênh triển khai', icon: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M9 6h6 M9 18h6' },
        { id: 'analytics', label: 'Phân tích', icon: 'M4 4v16h16 M8 16v-4 M12 16V8 M16 16v-6' }
      ].map(function (x) { var on = s.top === x.id; return { label: x.label, icon: x.icon, on: on, bg: on ? '#eef1fd' : 'transparent', fg: on ? '#203BDC' : '#475569', pick: function () { self.setState({ top: x.id, add: null, checkOpen: false, pubOpen: false }); } }; }),
      building: building, notBuilding: !building,
      otherIcon: { test: 'M9 3h6 M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3', deploy: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M9 6h6', analytics: 'M4 4v16h16 M8 16v-4 M12 16V8 M16 16v-6' }[s.top] || '',
      otherTitle: { test: 'Kiểm thử', deploy: 'Kênh triển khai', analytics: 'Phân tích' }[s.top] || '',
      otherText: { test: 'Bộ test case cho Quy trình: mỗi test case là một bộ dữ liệu đầu vào và kết quả mong đợi, chạy lại hàng loạt trước mỗi lần publish. Prototype chưa dựng phần này.', deploy: 'Quy trình chạy theo kiểu kích hoạt ở bước Bắt đầu. Publish xong có thể gắn làm tool cho Nhân sự số, gọi qua API hoặc webhook. Prototype chưa dựng phần này.', analytics: 'Lịch sử từng lần chạy, số lần chạy, tỉ lệ lỗi và thời gian chờ người duyệt theo ngày. Prototype chưa dựng phần này.' }[s.top] || '',
      panelTabs: [{ id: 'cfg', label: 'Cấu hình' }, { id: 'run', label: 'Chạy thử' }].map(function (x) { var on = x.id === 'run' ? showRun : !showRun; return { label: x.label, on: on, bg: on ? '#f1f5f9' : 'transparent', fg: on ? '#0f172a' : '#64748b', pick: function () { if (x.id === 'run') self.openRun(); else self.setState({ runOpen: false }); } }; }),
      panelCanClose: showRun || !!selNode,
      panelClose: function () { if (self.state.runOpen) { clearTimeout(self.timer); var r = self.state.run; self.setState({ runOpen: false, run: r && (r.status === 'running' || r.status === 'paused') ? null : r }); } else self.setState({ sel: null, picking: null }); },
      undo: function () { self.undo(); }, canUndoNot: !s.hist.length,
      issueGroups: issues.map(function (g) { var cc = colOf(g.type); return { title: g.title, count: g.msgs.length, msgs: g.msgs, tile: cc[0], icon: TYPES[g.type].icon, go: function () { self.setState({ sel: g.id, tab: 'cfg', checkOpen: false, runOpen: false, top: 'build' }); } }; }),
      issueCount: issueCount, hasIssues: issueCount > 0, noIssues: !issueCount, issueColor: issueCount ? '#b91c1c' : '#020817',
      checkOpen: s.checkOpen, checkAria: 'Kiểm tra, ' + issueCount + ' lỗi', toggleCheck: function () { self.setState({ checkOpen: !s.checkOpen, pubOpen: false, add: null }); },
      pubOpen: s.pubOpen, togglePub: function () { self.setState({ pubOpen: !s.pubOpen, checkOpen: false, add: null }); },
      pubState: s.status === 'pending' ? 'v1 đang chờ Admin duyệt' : 'Chưa publish lần nào · Đã tự lưu',
      publishDisabled: issueCount > 0 || s.status === 'pending', publishLabel: s.status === 'pending' ? 'Đã gửi duyệt' : 'Publish v1',
      publish: function () { self.setState({ status: 'pending', pubOpen: false }); self.showToast('Đã gửi yêu cầu publish v1. Admin duyệt xong thì Quy trình mới chạy thật.', 'good'); },
      toolHint: asTool ? 'Kích hoạt "Khi Nhân sự số gọi": publish xong, Nhân sự số thêm được Quy trình này vào mục Tool.' : 'Muốn Nhân sự số gọi Quy trình này như một tool, đổi kiểu kích hoạt ở bước Bắt đầu thành "Khi Nhân sự số gọi".',
      toolHintColor: asTool ? '#15803d' : '#64748b',
      openRun: function () { self.setState({ top: 'build' }); self.openRun(); },

      canvasRef: this.canvasRef, canvasCursor: s.drag ? 'grabbing' : 'default',
      worldTransform: 'translate(' + s.px + 'px, ' + s.py + 'px) scale(' + s.z + ')',
      onBgDown: function (e) { if (e.target.closest && e.target.closest('[data-node],[data-ui]')) return; self.setState({ drag: { pan: true, sx: e.clientX, sy: e.clientY, ox: s.px, oy: s.py }, sel: null, add: null, checkOpen: false, pubOpen: false, picking: null }); },
      onMove: function (e) { self.onMove(e); },
      onUp: function () { var dr = self.state.drag; if (!dr) return; var moved = !dr.pan && self.state.nodes.some(function (n) { return n.id === dr.id && (n.x !== dr.ox || n.y !== dr.oy); }); self.setState(moved ? { drag: null, hist: self.state.dragPre } : { drag: null }); },
      edgesD: d, edgesH: dh, errD: ed, errH: eh, ranD: rd, ranH: rh, edgePlus: edgePlus, viewNodes: viewNodes,
      palOpen: s.palOpen && building, palClosed: !s.palOpen && building, togglePal: function () { self.setState({ palOpen: !self.state.palOpen }); },
      palItems: PAL.map(function (k) { var t = TYPES[k], cc = COL[t.c]; return { name: t.name, desc: t.desc, icon: t.icon, tile: cc[0], tileBg: cc[1], more: k === 'tool' || k === 'func', pick: function () { self.palPick(k); } }; }),
      palHint: selNode && selNode.type === 'loop' ? 'Đang chọn vòng lặp: bước mới vào trong vòng lặp.' : (selNode ? 'Bước mới thêm ngay sau "' + selNode.title + '".' : 'Chọn một bước để thêm ngay sau nó.'),
      fit: function () { self.fit(); },
      autoLayout: function () { var f = layoutFlow({ nodes: clone(self.state.nodes), edges: self.state.edges }); self.setState(Object.assign(self.snap(), { nodes: f.nodes })); setTimeout(function () { self.fit(); }, 20); },
      zoomPct: Math.round(s.z * 100), zoomIn: function () { self.setState({ z: Math.min(1.5, Math.round((s.z + 0.1) * 10) / 10) }); }, zoomOut: function () { self.setState({ z: Math.max(0.4, Math.round((s.z - 0.1) * 10) / 10) }); },
      runLocked: locked, runBar: run && run.status === 'paused' ? 'Đang chờ trả lời - xem bảng Chạy thử bên phải' : 'Đang chạy thử - canvas tạm khoá',

      addOpen: !!ad, addQ: ad ? ad.q : '', addSections: addSections, addEmpty: !!ad && !flat.length, addHasFrom: !!addFrom, addFrom: addFrom,
      addHasCrumb: !!ad && (ad.level === 'func' || ad.mode === 'inner'), addCrumb: ad && ad.mode === 'inner' ? 'Vòng lặp' : 'Hàm', addShowTabs: !!ad && ad.level !== 'func' && ad.mode !== 'inner' && !ad.q,
      addTabs: [{ id: 'featured', label: 'Nổi bật' }, { id: 'tool', label: 'Tool' }, { id: 'flow', label: 'Quy trình' }].map(function (x) { var on = ad && ad.tab === x.id; return { label: x.label, on: !!on, bg: on ? '#eef1fd' : '#fff', fg: on ? '#203BDC' : '#475569', line: on ? '#c7d2fe' : '#e5e5e5', pick: function () { self.setState({ add: Object.assign({}, self.state.add, { tab: x.id, idx: 0 }) }); } }; }),
      addRoot: function () { self.setState({ add: Object.assign({}, self.state.add, { level: 'root', tab: 'featured', idx: 0 }) }); },
      closeAdd: function () { self.setState({ add: null }); },
      onAddQ: function (e) { self.setState({ add: Object.assign({}, self.state.add, { q: e.target.value, idx: 0 }) }); },
      onAddKey: function (e) {
        var cur = self.state.add; if (!cur) return; var items = self.addItems();
        if (e.key === 'ArrowDown') { e.preventDefault(); self.setState({ add: Object.assign({}, cur, { idx: Math.min(items.length - 1, cur.idx + 1) }) }); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); self.setState({ add: Object.assign({}, cur, { idx: Math.max(0, cur.idx - 1) }) }); }
        else if (e.key === 'Enter') { e.preventDefault(); if (items[cur.idx]) self.pickAdd(items[cur.idx]); }
        else if (e.key === 'Escape') { e.preventDefault(); self.setState({ add: null }); }
      },

      pmRun: showRun && building, pmNode: pmNode, pmProcess: pmProcess, pmOther: pmOther,
      sel: sel, pf: pf, editors: editors, cases: cases, varOpts: varOpts, opOpts: ['Bằng', 'Khác', 'Lớn hơn', 'Nhỏ hơn', 'Chứa', 'Rỗng'], outVars: outVars,
      addCase: function () { var n = byId[s.sel]; self.setState({ edges: self.addPort(n.id, n.cfg.cases.length) }); self.updateCfg({ cases: n.cfg.cases.concat([{ name: 'Nhánh ' + (n.cfg.cases.length + 1), logic: 'VÀ', rows: [{ v: '', op: 'Bằng', val: '' }] }]) }); },
      errRetry: !!errNode.retry, errMode: errNode.err,
      toggleRetry: function () { self.updateCfg({ retry: !byId[s.sel].cfg.retry }); },
      onErrMode: function (e) { var n = byId[s.sel], v = e.target.value, edges = self.state.edges; if (n.cfg.err === 'branch' && v !== 'branch') edges = edges.filter(function (x) { return !(x.from === n.id && x.out === 1); }); self.setState({ edges: edges }); self.updateCfg({ err: v }); },
      nodeTabs: [{ id: 'cfg', label: 'Cấu hình' }, { id: 'last', label: 'Chạy bước' }].map(function (x) { var on = s.tab === x.id; return { label: x.label, on: on, bg: on ? '#eef1fd' : '#fff', fg: on ? '#203BDC' : '#475569', line: on ? '#c7d2fe' : '#e5e5e5', pick: function () { self.setState({ tab: x.id }); } }; }),
      tabCfg: s.tab === 'cfg' || !(selNode && selNode.type !== 'note' && selNode.type !== 'start'), tabLast: s.tab === 'last' && !!selNode && selNode.type !== 'note' && selNode.type !== 'start', lastHas: !!last,
      last: last ? { st: last.st, ms: last.ms.toLocaleString('vi-VN') + ' ms', note: last.note, out: last.out, stColor: last.st === 'Thành công' ? '#15803d' : '#b91c1c' } : { st: '', ms: '', note: '', out: '', stColor: '#000' },
      runStep: function () { self.runOne(); },
      onTitle: function (e) { self.updateSel({ title: e.target.value }); },
      deselect: function () { self.setState({ sel: null, picking: null }); },
      deleteSel: function () { var id = self.state.sel; self.setState(Object.assign(self.snap(), { nodes: self.state.nodes.filter(function (n) { return n.id !== id; }), edges: self.state.edges.filter(function (e) { return e.from !== id && e.to !== id; }), sel: null })); self.showToast('Đã xoá bước. Bấm Hoàn tác nếu xoá nhầm.'); },

      aiCount: s.nodes.filter(function (n) { return TYPES[n.type].ai; }).length, actCount: s.nodes.filter(function (n) { return TYPES[n.type].act || (n.type === 'func' && n.cfg.fn === 'http'); }).length,
      guards: guardList([['safety', 'Chặn nội dung độc hại, xúc phạm'], ['pii', 'Che CCCD, số tài khoản, số điện thoại trong kết quả'], ['scope', 'Chặn yêu cầu ngoài phạm vi Quy trình']]),
      actGuards: guardList([['noDelete', 'Chặn thao tác xoá dữ liệu trên hệ thống khác'], ['maskOut', 'Che thông tin cá nhân trước khi gửi ra ngoài'], ['rate', 'Giới hạn 100 lần gọi mỗi giờ']]),
      stepCount: s.nodes.filter(function (n) { return n.type !== 'note'; }).length,

      runTabs: (run && run.status !== 'idle' ? [{ id: 'input', label: 'Dữ liệu vào' }, { id: 'result', label: 'Kết quả' }, { id: 'trace', label: 'Từng bước' }] : [{ id: 'input', label: 'Dữ liệu vào' }]).map(function (x) { var on = run && run.tab === x.id; return { label: x.label, on: !!on, bg: on ? '#eef1fd' : 'transparent', fg: on ? '#203BDC' : '#475569', pick: function () { self.setState({ run: Object.assign({}, self.state.run, { tab: x.id }) }); } }; }),
      runShowInput: !!run && run.tab === 'input', runShowResult: !!run && run.tab === 'result', runShowTrace: !!run && run.tab === 'trace',
      runInputTitle: startNode ? 'Dữ liệu chạy thử · ' + trigOf(startNode.cfg).name : 'Dữ liệu chạy thử',
      runStatusText: rs[0], runStatusColor: rs[1], runInputs: runInputs, noRunInputs: !runInputs.length, runLog: runLog,
      startRun: function () { self.startRun(); },
      rerun: function () { self.setState({ run: Object.assign({}, self.state.run, { status: 'idle', tab: 'input', log: [], ran: [], redges: [], failId: null, cur: null }) }); },
      closeRun: function () { clearTimeout(self.timer); var r = self.state.run; self.setState({ runOpen: false, run: r && (r.status === 'running' || r.status === 'paused') ? null : r }); },
      runPaused: !!run && run.status === 'paused', runRunning: !!run && run.status === 'running', runDone: !!run && run.status === 'done',
      waitTitle: waitNode ? 'Đang chờ: ' + waitNode.title : '', waitBody: waitNode ? (waitNode.cfg.title ? waitNode.cfg.title + ' - ' : '') + fill(waitNode.cfg.message, run.vars || {}) : '',
      waitWho: waitNode ? (waitNode.cfg.assignee || 'người duyệt') : '', waitActions: waitActions, waitExpire: waitNode ? waitNode.cfg.timeout + ' ngày' : '',
      runResText: run && run.text ? run.text : '', runResBorder: run && run.ok ? '#bbf7d0' : '#fecaca', runResBg: run && run.ok ? '#f0fdf4' : '#fef2f2',
      runHasOutput: !!(run && run.output), runOutput: run && run.output ? run.output : '',
      toast: !!s.toast, toastText: s.toast ? s.toast.text : '', toastBg: s.toast ? (s.toast.tone === 'bad' ? '#b91c1c' : (s.toast.tone === 'good' ? '#15803d' : '#0f172a')) : '#0f172a'
    };
  }

  startDrag(e, id) {
    if (e.target.closest && e.target.closest('[data-plus],[data-ui]')) return;
    e.stopPropagation(); if (this.locked()) return;
    var n = this.byId(id);
    this.setState({ dragPre: this.snap().hist, sel: id, add: null, runOpen: false, top: 'build', tab: id === this.state.sel ? this.state.tab : 'cfg', picking: null, drag: { id: id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y } });
  }
  onMove(e) {
    var dr = this.state.drag; if (!dr) return;
    var dx = e.clientX - dr.sx, dy = e.clientY - dr.sy;
    if (dr.pan) { this.setState({ px: dr.ox + dx, py: dr.oy + dy }); return; }
    var z = this.state.z;
    this.setState({ nodes: this.state.nodes.map(function (n) { return n.id === dr.id ? Object.assign({}, n, { x: Math.round((dr.ox + dx / z) / 20) * 20, y: Math.round((dr.oy + dy / z) / 20) * 20 }) : n; }) });
  }

  componentDidMount() {
    var self = this, p = this.props;
    if (p.prompt) { this.setState({ drafting: true }); this.timer = setTimeout(function () { self.openBuilder(pickKey(p.prompt), p.name || SUGGEST.filter(function (g) { return g.key === pickKey(p.prompt); })[0].name, true); }, 1300); }
    else this.openBuilder(p.draft || null, p.name || (p.draft ? (SUGGEST.filter(function (g) { return g.key === p.draft; })[0] || {}).name : ''), false);
  }
  render() {
    var self = this;
    if (this.state.screen !== 'builder') {
      return (
        <div className="qt-root" style={S('height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc')}>
          <style>{CSS}</style>
          <div role="status" style={S('display: flex; flex-direction: column; align-items: center; gap: 12px; color: #334155; font-size: 14px')}>
            <span className="qt-running" style={S('width: 40px; height: 40px; border-radius: 12px; background: #203BDC; color: #fff; display: flex; align-items: center; justify-content: center')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON.spark}></path></svg></span>
            AI đang dựng Quy trình từ mô tả của bạn...
          </div>
        </div>
      );
    }
    var v = this.renderVals();
    var { actCount, actGuards, addCase, addCrumb, addEmpty, addFrom, addHasCrumb, addHasFrom, addOpen, addQ, addRoot, addSections, addShowTabs, addTabs, aiBanner, aiCount, autoLayout, backToList, building, canUndoNot, canvasCursor, canvasRef, cases, checkAria, checkOpen, closeAdd, deleteSel, dismissBanner, draftSteps, edgePlus, edgesD, edgesH, editors, errD, errH, errMode, errRetry, fit, guards, hasIssues, issueColor, issueCount, issueGroups, last, lastHas, name, noIssues, noRunInputs, nodeTabs, notBuilding, onAddKey, onAddQ, onBgDown, onErrMode, onMove, onTitle, onUp, opOpts, otherIcon, otherText, otherTitle, outVars, palClosed, palHint, palItems, palOpen, panelCanClose, panelClose, panelTabs, pf, pmNode, pmProcess, pmRun, pubOpen, pubState, publish, publishDisabled, publishLabel, ranD, ranH, rerun, runBar, runDone, runHasOutput, runInputTitle, runInputs, runLocked, runLog, runOutput, runPaused, runResBg, runResBorder, runResText, runRunning, runShowInput, runShowResult, runShowTrace, runStatusColor, runStatusText, runStep, runTabs, sel, startRun, statusDot, statusLabel, statusSub, stepCount, tabCfg, tabLast, toast, toastBg, toastText, toggleCheck, togglePal, togglePub, toggleRetry, toolHint, toolHintColor, topTabs, undo, varOpts, viewNodes, waitActions, waitBody, waitExpire, waitTitle, waitWho, worldTransform, zoomIn, zoomOut, zoomPct } = v;
    backToList = function () { clearTimeout(self.timer); self.props.onBack(); };
    return (
      <div className="qt-root" style={S('height: 100vh; min-height: 640px; display: flex; flex-direction: column; overflow: hidden; position: relative; background: #fff')}>
        <style>{CSS}</style>

<div style={S('height: 48px; flex-shrink: 0; border-bottom: 1px solid #e5e5e5; display: flex; align-items: center; padding: 0 12px; gap: 10px; position: relative; z-index: 30; background: #fff')}>
  <button type="button" className={Q('ghost')} aria-label="Quay lại danh sách nhân sự số" onClick={backToList} style={S('width: 32px; height: 32px; border-radius: 7px; display: flex; align-items: center; justify-content: center')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg></button>
  <span style={S('width: 26px; height: 26px; border-radius: 7px; background: #eef1fd; color: #203BDC; display: flex; align-items: center; justify-content: center')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5h6v5H3z M15 14h6v5h-6z M9 7.5h3a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2"></path></svg></span>
  <span style={S('font-size: 14px; font-weight: 600; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap')}>{name}</span>
  <span style={S('display: inline-flex; align-items: center; gap: 6px; font-size: 12px; border-radius: 999px; padding: 3px 10px; background: #f1f5f9; color: #0f172a')}><span style={S(`width: 6px; height: 6px; border-radius: 999px; background: ${statusDot}`)}></span>{statusLabel}<span style={S('color: #64748b')}>{statusSub}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg></span>
  <span style={S('font-size: 11px; font-weight: 600; background: #eef1fd; color: #203BDC; border-radius: 6px; padding: 3px 8px')}>Quy trình</span>
  <div style={S('flex: 1; display: flex; justify-content: center; gap: 4px')}>
    {(topTabs || []).map((t, _it) => (<React.Fragment key={_it}>
      <button type="button" onClick={t.pick} aria-pressed={t.on} style={S(`display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 12px; border: 0; border-radius: 8px; font-size: 13px; font-weight: 500; background: ${t.bg}; color: ${t.fg}`)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon}></path></svg>{t.label}</button>
    </React.Fragment>))}
  </div>
  <button type="button" className={Q('tbtn')} aria-label="Hoàn tác" title="Hoàn tác" onClick={undo} disabled={canUndoNot}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3"></path></svg></button>
  <span style={S('font-size: 11.5px; color: #64748b')}>Đã tự lưu</span>
  <div style={S('position: relative')}>
    <button type="button" className={Q('btn')} aria-expanded={checkOpen} onClick={toggleCheck} aria-label={checkAria}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8 M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"></path></svg>Kiểm tra
      {(hasIssues) && (<><span style={S('min-width: 18px; height: 18px; border-radius: 999px; background: #dc2626; color: #fff; font-size: 10.5px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; padding: 0 5px')}>{issueCount}</span></>)}
    </button>
    {(checkOpen) && (<>
      <div role="dialog" aria-label="Lỗi cần sửa" style={S('position: absolute; right: 0; top: 44px; width: 360px; max-height: 460px; overflow-y: auto; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; box-shadow: 0 12px 28px rgba(15,23,42,.14); padding: 14px')}>
        <div style={S('display: flex; align-items: center; gap: 8px')}><b style={S('font-size: 14px; font-weight: 600')}>Lỗi cần sửa</b><span style={S('font-size: 11px; color: #b91c1c; background: #fef2f2; border-radius: 999px; padding: 1px 8px')}>{issueCount} lỗi</span></div>
        <p style={S('font-size: 12px; color: #64748b; margin: 2px 0 0')}>Sửa hết thì mới publish được.</p>
        {(noIssues) && (<><p style={S('font-size: 12.5px; color: #15803d; margin: 10px 0 0')}>Không còn lỗi nào.</p></>)}
        {(issueGroups || []).map((g, _ig) => (<React.Fragment key={_ig}>
          <button type="button" onClick={g.go} style={S('display: block; width: 100%; text-align: left; border: 0; background: transparent; padding: 10px 6px 6px; border-radius: 8px; font: inherit; cursor: pointer')}>
            <span style={S('display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600')}><span style={S(`width: 20px; height: 20px; border-radius: 5px; background: ${g.tile}; color: #fff; display: inline-flex; align-items: center; justify-content: center`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={g.icon}></path></svg></span>{g.title} ({g.count})</span>
            {(g.msgs || []).map((m, _im) => (<React.Fragment key={_im}><span style={S('display: block; font-size: 12px; color: #475569; padding: 2px 0 0 28px')}>{m}</span></React.Fragment>))}
          </button>
        </React.Fragment>))}
      </div>
    </>)}
  </div>
  <div style={S('position: relative')}>
    <button type="button" className={Q('btn btn-primary')} aria-expanded={pubOpen} onClick={togglePub}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9-.8-.8-2.1-.8-2.9-.1z M12 15l-3-3c1.4-3.6 4.3-7.6 11-8-.4 6.7-4.4 9.6-8 11z M9 12H5l2-4h4 M12 15v4l4-2v-4"></path></svg>Publish</button>
    {(pubOpen) && (<>
      <div role="dialog" aria-label="Publish" style={S('position: absolute; right: 0; top: 44px; width: 300px; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; box-shadow: 0 12px 28px rgba(15,23,42,.14); padding: 14px')}>
        <div style={S('font-size: 12px; color: #64748b')}>● {pubState}</div>
        <button type="button" className={Q('btn btn-primary')} onClick={publish} disabled={publishDisabled} style={S('width: 100%; justify-content: center; margin-top: 10px')}>{publishLabel}</button>
        {(hasIssues) && (<><p style={S('font-size: 11.5px; color: #b91c1c; margin: 6px 0 0')}>Còn {issueCount} lỗi. Bấm Kiểm tra để xem.</p></>)}
        <p style={S(`font-size: 12px; color: ${toolHintColor}; margin: 12px 0 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 10px`)}>{toolHint}</p>
      </div>
    </>)}
  </div>
</div>

{(notBuilding) && (<>
  <div style={S('flex: 1; display: flex; align-items: center; justify-content: center; background: #fafafa')}>
    <div style={S('max-width: 460px; text-align: center; padding: 24px')}>
      <span style={S('width: 44px; height: 44px; border-radius: 12px; background: #eef1fd; color: #203BDC; display: inline-flex; align-items: center; justify-content: center')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={otherIcon}></path></svg></span>
      <h2 style={S('margin: 12px 0 0; font-size: 16px; font-weight: 600')}>{otherTitle}</h2>
      <p style={S('margin: 6px 0 0; font-size: 13px; color: #475569; line-height: 1.55')}>{otherText}</p>
    </div>
  </div>
</>)}
{(building) && (<>
<div style={S('flex: 1; min-height: 0; display: flex')}>
  <div ref={canvasRef} onMouseDown={onBgDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} style={S(`flex: 1; min-width: 0; position: relative; overflow: hidden; background-color: #fafafa; background-image: radial-gradient(#d4d4d8 1px, transparent 1px); background-size: 18px 18px; cursor: ${canvasCursor}`)}>

    <div style={S(`position: absolute; left: 0; top: 0; width: 0; height: 0; transform: ${worldTransform}; transform-origin: 0 0`)}>
      <svg width="4000" height="2400" style={S('position: absolute; left: -800px; top: -800px; overflow: visible; pointer-events: none')} aria-hidden="true">
        <g transform="translate(800 800)">
          <path d={edgesD} fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"></path>
          <path d={edgesH} fill="#0f172a" stroke="#0f172a" strokeWidth="1" strokeLinejoin="round"></path>
          <path d={errD} fill="none" stroke="#ea580c" strokeWidth="1.5" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round"></path>
          <path d={errH} fill="#ea580c" stroke="#ea580c" strokeWidth="1" strokeLinejoin="round"></path>
          <path d={ranD} fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"></path>
          <path d={ranH} fill="#16a34a" stroke="#16a34a" strokeWidth="1" strokeLinejoin="round"></path>
        </g>
      </svg>

      {(edgePlus || []).map((p, _ip) => (<React.Fragment key={_ip}>
        <button type="button" data-ui="1" className={Q('eplus')} aria-label={p.aria} onClick={p.pick} style={S(`left: ${p.x}px; top: ${p.y}px`)}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14 M5 12h14"></path></svg></button>
      </React.Fragment>))}

      {(viewNodes || []).map((n, _in) => (<React.Fragment key={_in}>
        <div data-node="1" onMouseDown={n.down} className={Q(n.cls)} style={S(`position: absolute; left: ${n.x}px; top: ${n.y}px; width: ${n.w}px; height: ${n.h}px; box-sizing: border-box; background: ${n.bg}; border: ${n.border}; border-radius: ${n.radius}px; box-shadow: ${n.shadow}; cursor: grab; user-select: none`)}>
          <button type="button" className={Q('sr')} onClick={n.select}>Chọn bước {n.title}</button>
          {(n.isNote) && (<>
            <div style={S('padding: 10px 12px; font-size: 12.5px; line-height: 1.5; color: #713f12')}>{n.noteText}</div>
          </>)}
          {(n.isCard) && (<>
            <div style={S('height: 56px; display: flex; align-items: center; gap: 10px; padding: 0 12px')}>
              <span style={S(`width: 30px; height: 30px; border-radius: 8px; background: ${n.tileBg}; color: ${n.tile}; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={n.icon}></path></svg>
              </span>
              <span style={S('flex: 1; min-width: 0')}>
                <span style={S('display: block; font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>{n.title}</span>
                {(n.badge) && (<><span style={S(`display: inline-flex; align-items: center; gap: 4px; margin-top: 3px; font-size: 10.5px; font-weight: 500; color: ${n.badgeFg}; background: ${n.badgeBg}; border: 1px solid ${n.badgeLine}; border-radius: 999px; padding: 0 7px; line-height: 16px; white-space: nowrap`)}>{n.badgeText}</span></>)}
                {(n.hasSub) && (<><span style={S('display: block; margin-top: 2px; font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>{n.sub}</span></>)}
              </span>
            </div>
            {(n.pills || []).map((b, _ib) => (<React.Fragment key={_ib}>
              <div style={S(`margin: 0 10px 6px; height: 30px; border-radius: 8px; background: ${b.bg}; color: ${b.fg}; font-size: 12px; font-weight: 500; display: flex; align-items: center; justify-content: center; padding: 0 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`)}>{b.label}</div>
            </React.Fragment>))}
            {(n.isLoop) && (<>
              <div style={S('position: absolute; left: 14px; right: 14px; top: 64px; bottom: 14px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; align-content: center; justify-content: center')}>
                {(n.inner || []).map((c, _ic) => (<React.Fragment key={_ic}>
                  <span style={S('font-size: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,.04)')}>{c}</span>
                </React.Fragment>))}
                <button type="button" data-ui="1" className={Q('plus')} aria-label="Thêm bước vào vòng lặp" onClick={n.addInner}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14 M5 12h14"></path></svg></button>
              </div>
            </>)}
          </>)}
          {(n.hasIn) && (<>
            <span style={S(`position: absolute; left: -5px; top: ${n.inTop}px; width: 9px; height: 9px; box-sizing: border-box; border-radius: 999px; background: #0f172a`)}></span>
          </>)}
          {(n.outs || []).map((o, _io) => (<React.Fragment key={_io}>
            {(o.free) && (<>
              <button type="button" data-plus="1" className={Q(o.cls)} aria-label={o.aria} onClick={o.plus} style={S(`position: absolute; right: -12px; top: ${o.top}px`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14 M5 12h14"></path></svg></button>
            </>)}
            {(o.linked) && (<>
              <span style={S(`position: absolute; right: -5px; top: ${o.dotTop}px; width: 9px; height: 9px; border-radius: 999px; background: ${o.dot}`)}></span>
            </>)}
          </React.Fragment>))}
        </div>
      </React.Fragment>))}
    </div>

    {/* Bảng Thêm bước bên trái */}
    {(palOpen) && (<>
      <div data-ui="1" style={S('position: absolute; left: 12px; top: 12px; width: 196px; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; box-shadow: 0 4px 14px rgba(15,23,42,.08); padding: 8px; z-index: 6')}>
        <div style={S('display: flex; align-items: center; padding: 2px 4px 6px')}><b style={S('flex: 1; font-size: 12.5px; font-weight: 600')}>Thêm bước</b><button type="button" className={Q('ghost')} aria-label="Thu gọn bảng thêm bước" onClick={togglePal} style={S('width: 24px; height: 24px; border-radius: 6px')}>«</button></div>
        {(palItems || []).map((it, _iit) => (<React.Fragment key={_iit}>
          <button type="button" className={Q('pal')} onClick={it.pick} title={it.desc}>
            <span style={S(`width: 22px; height: 22px; border-radius: 6px; background: ${it.tileBg}; color: ${it.tile}; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={it.icon}></path></svg></span>
            <span style={S('flex: 1')}>{it.name}</span>
            {(it.more) && (<><span style={S('color: #94a3b8')}>›</span></>)}
          </button>
        </React.Fragment>))}
        <p style={S('font-size: 11px; color: #64748b; margin: 6px 4px 2px; line-height: 1.45')}>{palHint}</p>
      </div>
    </>)}
    {(palClosed) && (<>
      <button type="button" data-ui="1" className={Q('btn')} onClick={togglePal} style={S('position: absolute; left: 12px; top: 12px; z-index: 6; height: 32px; font-size: 12.5px')}>+ Thêm bước</button>
    </>)}

    <div data-ui="1" style={S('position: absolute; left: 12px; bottom: 12px; display: flex; align-items: center; gap: 2px; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; padding: 3px; box-shadow: 0 1px 3px rgba(0,0,0,.08)')}>
      <button type="button" className={Q('tbtn')} aria-label="Thu nhỏ" onClick={zoomOut} style={S('width: 30px; height: 30px')}>−</button>
      <span style={S('font-size: 12px; width: 40px; text-align: center; color: #475569')}>{zoomPct}%</span>
      <button type="button" className={Q('tbtn')} aria-label="Phóng to" onClick={zoomIn} style={S('width: 30px; height: 30px')}>+</button>
      <button type="button" className={Q('tbtn')} aria-label="Vừa khung" title="Vừa khung" onClick={fit} style={S('width: 30px; height: 30px')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5"></path></svg></button>
      <button type="button" className={Q('tbtn')} aria-label="Tự sắp xếp" title="Tự sắp xếp" onClick={autoLayout} style={S('width: 30px; height: 30px')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h6v6H3z M15 4h6v6h-6z M15 14h6v6h-6z M9 7h6 M12 7v10h3"></path></svg></button>
    </div>

    {(aiBanner) && (<>
      <div data-ui="1" role="status" style={S('position: absolute; left: 50%; top: 14px; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; background: #f3f5fe; border: 1px solid #c7d2fe; border-radius: 10px; padding: 7px 8px 7px 12px; font-size: 12.5px; color: #1e3a8a; max-width: 560px; z-index: 5')}>
        <span>AI dựng {draftSteps} bước từ mô tả của bạn. Bấm Kiểm tra để xem chỗ còn thiếu.</span>
        <button type="button" className={Q('ghost')} onClick={dismissBanner} style={S('height: 28px; padding: 0 8px; border-radius: 6px; font-size: 12px; color: #1e3a8a; font-weight: 500')}>Đã hiểu</button>
      </div>
    </>)}
    {(runLocked) && (<>
      <div data-ui="1" style={S('position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); background: #0f172a; color: #fff; font-size: 12px; border-radius: 999px; padding: 6px 12px; z-index: 5')}>{runBar}</div>
    </>)}

    {/* Hộp thoại Thêm bước */}
    {(addOpen) && (<>
      <div data-ui="1" onMouseDown={closeAdd} style={S('position: absolute; inset: 0; z-index: 20; background: rgba(15,23,42,.18)')}></div>
      <div data-ui="1" role="dialog" aria-label="Thêm bước" style={S('position: absolute; left: 50%; top: 40px; transform: translateX(-50%); width: 620px; max-width: calc(100% - 32px); max-height: calc(100% - 80px); display: flex; flex-direction: column; background: #fff; border-radius: 14px; box-shadow: 0 24px 60px rgba(15,23,42,.25); z-index: 21; overflow: hidden')}>
        <div style={S('display: flex; align-items: center; gap: 6px; padding: 14px 16px 0')}>
          <button type="button" className={Q('ghost')} onClick={addRoot} style={S('font-size: 16px; font-weight: 600; color: #0f172a; padding: 0; border-radius: 4px')}>Thêm bước</button>
          {(addHasCrumb) && (<><span style={S('font-size: 16px; color: #94a3b8')}>›</span><span style={S('font-size: 16px; font-weight: 600')}>{addCrumb}</span></>)}
          <span style={S('flex: 1')}></span>
          <button type="button" className={Q('ghost')} aria-label="Đóng" onClick={closeAdd} style={S('width: 30px; height: 30px; border-radius: 7px')}>✕</button>
        </div>
        {(addHasFrom) && (<><div style={S('font-size: 12px; color: #64748b; padding: 2px 16px 0')}>{addFrom}</div></>)}
        <div style={S('padding: 10px 16px 0; position: relative')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={S('position: absolute; left: 27px; top: 20px')}><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-4.3-4.3"></path></svg>
          <label className={Q('sr')} htmlFor="addq">Tìm bước</label>
          <input id="addq" className={Q('field')} style={S('padding-left: 32px; height: 36px')} placeholder="Tìm bước, tool, hàm..." value={addQ} onChange={onAddQ} onKeyDown={onAddKey} autoFocus={true} />
        </div>
        {(addShowTabs) && (<>
          <div role="tablist" style={S('display: flex; gap: 4px; padding: 10px 16px 0')}>
            {(addTabs || []).map((t, _it) => (<React.Fragment key={_it}>
              <button type="button" role="tab" aria-selected={t.on} onClick={t.pick} style={S(`height: 28px; padding: 0 10px; border-radius: 7px; border: 1px solid ${t.line}; font-size: 12.5px; font-weight: 500; background: ${t.bg}; color: ${t.fg}`)}>{t.label}</button>
            </React.Fragment>))}
          </div>
        </>)}
        <div style={S('flex: 1; min-height: 0; overflow-y: auto; padding: 6px 16px 16px')}>
          {(addSections || []).map((sec, _isec) => (<React.Fragment key={_isec}>
            <div style={S('font-size: 12px; font-weight: 600; color: #334155; margin: 12px 0 6px')}>{sec.label}</div>
            <div style={S('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px')}>
              {(sec.items || []).map((it, _iit) => (<React.Fragment key={_iit}>
                <button type="button" className={Q(it.cls)} onClick={it.pick} onMouseEnter={it.hover}>
                  <span style={S(`width: 26px; height: 26px; border-radius: 7px; background: ${it.tileBg}; color: ${it.tile}; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={it.icon}></path></svg></span>
                  <span style={S('flex: 1; min-width: 0')}><span style={S('display: block; font-size: 13px; font-weight: 500; color: #0f172a')}>{it.name}</span>{(it.hasDesc) && (<><span style={S('display: block; font-size: 11.5px; color: #64748b; margin-top: 1px; line-height: 1.35')}>{it.desc}</span></>)}</span>
                  {(it.more) && (<><span style={S('color: #94a3b8; align-self: center')}>›</span></>)}
                  {(it.hasTag) && (<><span style={S('font-size: 10.5px; color: #475569; background: #f1f5f9; border-radius: 4px; padding: 1px 6px; align-self: center; white-space: nowrap')}>{it.tag}</span></>)}
                </button>
              </React.Fragment>))}
            </div>
          </React.Fragment>))}
          {(addEmpty) && (<><p style={S('font-size: 12.5px; color: #475569; margin: 14px 0 0')}>Không có kết quả. Thử gõ "duyệt", "http", "lặp" hoặc tên tool.</p></>)}
        </div>
      </div>
    </>)}
  </div>

  {/* PANEL PHẢI */}
  <aside style={S('width: 380px; flex-shrink: 0; border-left: 1px solid #e5e5e5; overflow-y: auto; background: #fff')}>
    <div style={S('position: sticky; top: 0; z-index: 2; background: #fff; display: flex; align-items: center; gap: 2px; padding: 6px 8px; border-bottom: 1px solid #f1f5f9')}>
      {(panelTabs || []).map((t, _it) => (<React.Fragment key={_it}>
        <button type="button" role="tab" aria-selected={t.on} onClick={t.pick} style={S(`height: 26px; padding: 0 9px; border: 0; border-radius: 6px; font-size: 12px; font-weight: 500; background: ${t.bg}; color: ${t.fg}`)}>{t.label}</button>
      </React.Fragment>))}
      <span style={S('flex: 1')}></span>
      {(panelCanClose) && (<><button type="button" className={Q('ghost')} aria-label="Đóng" onClick={panelClose} style={S('width: 26px; height: 26px; border-radius: 6px')}>✕</button></>)}
    </div>

    {(pmRun) && (<>
      <div style={S('padding: 14px 16px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 8px')}>
        <h2 style={S('margin: 0; font-size: 15px; font-weight: 600; flex: 1')}>Chạy thử <span style={S(`font-weight: 400; color: ${runStatusColor}`)}>· {runStatusText}</span></h2>
      </div>
      <div role="tablist" style={S('display: flex; gap: 4px; padding: 8px 12px 0')}>
        {(runTabs || []).map((t, _it) => (<React.Fragment key={_it}>
          <button type="button" role="tab" aria-selected={t.on} onClick={t.pick} style={S(`height: 28px; padding: 0 10px; border-radius: 7px; border: 0; font-size: 12.5px; font-weight: 500; background: ${t.bg}; color: ${t.fg}`)}>{t.label}</button>
        </React.Fragment>))}
      </div>
      <div style={S('padding: 12px 16px 20px')}>
        {(runShowInput) && (<>
          <div style={S('font-size: 12px; font-weight: 600')}>{runInputTitle}</div>
          {(noRunInputs) && (<><p style={S('font-size: 12px; color: #475569; margin: 6px 0 0')}>Bước Bắt đầu không nhận dữ liệu nào.</p></>)}
          {(runInputs || []).map((f, _if) => (<React.Fragment key={_if}>
            <label style={S('display: block; font-size: 12px; color: #334155; margin-top: 10px')}>{f.k} <span style={S('color: #64748b')}>· {f.t}</span>
              <input className={Q('field')} value={f.value} onChange={f.onChange} style={S('margin-top: 4px')} />
            </label>
          </React.Fragment>))}
          <button type="button" className={Q('btn btn-primary')} onClick={startRun} style={S('width: 100%; justify-content: center; margin-top: 14px')}><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>Bắt đầu chạy</button>
          <p style={S('font-size: 11.5px; color: #64748b; margin: 8px 0 0; line-height: 1.5')}>Chạy thử được cả khi còn lỗi. Publish thì phải sửa hết.</p>
        </>)}
        {(runShowResult) && (<>
          {(runPaused) && (<>
            <div style={S('border: 1px solid #fed7aa; background: #fff7ed; border-radius: 10px; padding: 12px')}>
              <div style={S('display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600')}><span style={S('width: 8px; height: 8px; border-radius: 999px; background: #ea580c')}></span>{waitTitle}</div>
              <p style={S('font-size: 12.5px; color: #334155; margin: 8px 0 0; line-height: 1.5')}>{waitBody}</p>
              <p style={S('font-size: 11.5px; color: #64748b; margin: 8px 0 0')}>Bạn đang đóng vai {waitWho}. Chọn câu trả lời để Quy trình chạy tiếp.</p>
              <div style={S('display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px')}>
                {(waitActions || []).map((a, _ia) => (<React.Fragment key={_ia}><button type="button" className={Q(a.cls)} onClick={a.pick}>{a.label}</button></React.Fragment>))}
              </div>
              <p style={S('font-size: 11.5px; color: #9a3412; margin: 10px 0 0')}>Hết hạn sau {waitExpire}.</p>
            </div>
          </>)}
          {(runDone) && (<>
            <div style={S(`border: 1px solid ${runResBorder}; background: ${runResBg}; border-radius: 10px; padding: 12px; font-size: 12.5px; line-height: 1.5`)}>{runResText}</div>
            {(runHasOutput) && (<>
              <div style={S('font-size: 12px; font-weight: 600; margin-top: 14px')}>Dữ liệu trả về</div>
              <pre style={S('margin: 6px 0 0; background: #0f172a; color: #e2e8f0; font-size: 11.5px; border-radius: 8px; padding: 10px; white-space: pre-wrap')}>{runOutput}</pre>
            </>)}
            <button type="button" className={Q('btn')} onClick={rerun} style={S('margin-top: 14px')}>Chạy lại</button>
          </>)}
          {(runRunning) && (<><p style={S('font-size: 12.5px; color: #475569; margin: 0')}>Đang chạy... Xem tab Từng bước.</p></>)}
        </>)}
        {(runShowTrace) && (<>
          <ol style={S('list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px')}>
            {(runLog || []).map((r, _ir) => (<React.Fragment key={_ir}>
              <li style={S('display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 8px 10px')}>
                <span style={S(`width: 20px; height: 20px; border-radius: 5px; background: ${r.tileBg}; color: ${r.tile}; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={r.icon}></path></svg></span>
                <span style={S('flex: 1; min-width: 0')}><span style={S('display: flex; justify-content: space-between; gap: 6px')}><b style={S('font-weight: 500')}>{r.title}</b><span style={S(`color: ${r.stColor}; white-space: nowrap; font-size: 11.5px`)}>{r.st}</span></span><span style={S('display: block; font-size: 11.5px; color: #64748b; margin-top: 2px')}>{r.note}</span></span>
              </li>
            </React.Fragment>))}
          </ol>
        </>)}
      </div>
    </>)}

    {(pmNode) && (<>
      <div style={S('padding: 14px 16px 0')}>
        <div style={S('display: flex; align-items: center; gap: 8px')}>
          <span style={S(`width: 28px; height: 28px; border-radius: 7px; background: ${sel.tileBg}; color: ${sel.tile}; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={sel.icon}></path></svg></span>
          <label className={Q('sr')} htmlFor="ntitle">Tên bước</label>
          <input id="ntitle" value={sel.title} onChange={onTitle} style={S('flex: 1; min-width: 0; border: 1px solid transparent; border-radius: 6px; font: inherit; font-size: 15px; font-weight: 600; padding: 3px 6px; background: transparent')} />
        </div>
        {(sel.hasTabs) && (<>
          <div role="tablist" style={S('display: flex; gap: 4px; margin-top: 10px')}>
            {(nodeTabs || []).map((t, _it) => (<React.Fragment key={_it}>
              <button type="button" role="tab" aria-selected={t.on} onClick={t.pick} style={S(`height: 28px; padding: 0 12px; border-radius: 7px; border: 1px solid ${t.line}; font-size: 12.5px; font-weight: 500; background: ${t.bg}; color: ${t.fg}`)}>{t.label}</button>
            </React.Fragment>))}
          </div>
        </>)}
      </div>

      {(tabLast) && (<>
        <div style={S('padding: 14px 16px')}>
          <p style={S('font-size: 12.5px; color: #475569; margin: 0; line-height: 1.5')}>Chạy riêng bước này với dữ liệu mẫu từ các bước trước, không cần chạy cả Quy trình.</p>
          <button type="button" className={Q('btn')} onClick={runStep} style={S('margin-top: 10px')}><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>Chạy bước</button>
          {(lastHas) && (<>
            <div style={S('display: flex; gap: 8px; font-size: 12.5px; margin-top: 16px')}><span style={S(`color: ${last.stColor}; font-weight: 600`)}>{last.st}</span><span style={S('color: #64748b')}>{last.ms}</span></div>
            <p style={S('font-size: 12.5px; color: #334155; margin: 6px 0 0; line-height: 1.5')}>{last.note}</p>
            <div style={S('font-size: 12px; font-weight: 600; margin-top: 12px')}>Đầu ra</div>
            <pre style={S('margin: 6px 0 0; background: #f8fafc; border: 1px solid #e5e5e5; font-size: 11.5px; border-radius: 8px; padding: 10px; white-space: pre-wrap')}>{last.out}</pre>
          </>)}
        </div>
      </>)}

      {(tabCfg) && (<>
        <div style={S('padding: 4px 16px 24px')}>
          {(sel.hasIssue) && (<><div style={S('margin-top: 10px; border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; border-radius: 8px; padding: 8px 10px; font-size: 12px; line-height: 1.5')}>{sel.issueText}</div></>)}
          {(sel.hasHelp) && (<><p style={S('font-size: 12px; color: #475569; margin: 10px 0 0; line-height: 1.5')}>{sel.help}</p></>)}

          {(pf || []).map((f, _if) => (<React.Fragment key={_if}>
            <div>
              <label className={Q('lbl')} htmlFor={f.id}>{f.label}</label>
              {(f.isInput) && (<><input id={f.id} className={Q('field')} value={f.value} placeholder={f.ph} onChange={f.onChange} readOnly={f.ro} style={S(`font-family: ${f.font}`)} /></>)}
              {(f.isSelect) && (<><select id={f.id} className={Q('field')} value={f.value} onChange={f.onChange}>{(f.options || []).map((o, _io) => (<React.Fragment key={_io}><option value={o.v}>{o.l}</option></React.Fragment>))}</select></>)}
              {(f.isText) && (<>
                <div style={S('position: relative')}><textarea id={f.id} className={Q('field')} rows="4" value={f.value} placeholder={f.ph} onChange={f.onChange} style={S(`height: auto; padding: 8px 10px; resize: vertical; font-family: ${f.font}`)}></textarea>
                {(f.canVar) && (<><button type="button" className={Q('ghost')} onClick={f.insertVar} style={S('position: absolute; right: 6px; bottom: 8px; height: 24px; padding: 0 6px; border-radius: 5px; font-size: 11px; color: #1d4ed8; background: #eff6ff')}>{'{'}x{'}'} chèn biến</button></>)}</div>
              </>)}
              {(f.isToggle) && (<>
                <label style={S('display: flex; gap: 10px; align-items: flex-start; border: 1px solid #e5e5e5; border-radius: 8px; padding: 8px 10px; cursor: pointer')}><input id={f.id} type="checkbox" checked={f.checked} onChange={f.onToggle} style={S('margin-top: 2px; accent-color: #203BDC')} /><span style={S('font-size: 12px; color: #475569; line-height: 1.45')}>{f.ph}</span></label>
              </>)}
              {(f.hasHint) && (<><p style={S('font-size: 11.5px; color: #64748b; margin: 4px 0 0; line-height: 1.45')}>{f.hint}</p></>)}
            </div>
          </React.Fragment>))}

          {/* Nhánh của Nếu/Không */}
          {(sel.isCond) && (<>
            {(cases || []).map((c, _ic) => (<React.Fragment key={_ic}>
              <div style={S('margin-top: 12px; border: 1px solid #e5e5e5; border-radius: 10px; padding: 10px; background: #fafafa')}>
                <div style={S('display: flex; align-items: center; gap: 6px')}>
                  <label className={Q('sr')} htmlFor={c.id}>Tên nhánh</label>
                  <input id={c.id} className={Q('field')} value={c.name} onChange={c.onName} style={S('height: 30px; font-weight: 600')} />
                  {(c.canRemove) && (<><button type="button" className={Q('ghost')} aria-label="Xoá nhánh" onClick={c.remove} style={S('width: 26px; height: 26px; border-radius: 6px')}>✕</button></>)}
                </div>
                <div style={S('display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12px; color: #475569')}>Điều kiện<button type="button" className={Q('ghost')} onClick={c.toggleLogic} style={S('height: 22px; padding: 0 8px; border-radius: 5px; font-size: 11px; font-weight: 600; border: 1px solid #e5e5e5; background: #fff')}>{c.logic} ▾</button></div>
                {(c.rows || []).map((r, _ir) => (<React.Fragment key={_ir}>
                  <div style={S('display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr) 24px; gap: 6px; margin-top: 6px; align-items: center')}>
                    <select className={Q('field')} aria-label="Biến" value={r.v} onChange={r.onV} style={S('font-size: 12px')}>{(varOpts || []).map((o, _io) => (<React.Fragment key={_io}><option value={o.v}>{o.l}</option></React.Fragment>))}</select>
                    <select className={Q('field')} aria-label="Phép so sánh" value={r.op} onChange={r.onOp} style={S('font-size: 12px')}>{(opOpts || []).map((o, _io) => (<React.Fragment key={_io}><option value={o}>{o}</option></React.Fragment>))}</select>
                    <input className={Q('field')} aria-label="Giá trị" value={r.val} onChange={r.onVal} style={S('font-size: 12px')} />
                    <button type="button" className={Q('ghost')} aria-label="Xoá điều kiện" onClick={r.remove} style={S('width: 24px; height: 24px; border-radius: 5px')}>✕</button>
                  </div>
                </React.Fragment>))}
                <button type="button" className={Q('ghost link')} onClick={c.addRow}>+ Thêm dòng</button>
              </div>
            </React.Fragment>))}
            <button type="button" className={Q('btn')} onClick={addCase} style={S('width: 100%; justify-content: center; margin-top: 10px; height: 32px; font-size: 12.5px')}>+ Thêm nhánh</button>
            <p style={S('font-size: 11.5px; color: #64748b; margin: 8px 0 0; line-height: 1.5')}>Nhánh "Còn lại" tự có, dùng khi không nhánh nào đúng. Xét từ trên xuống, mỗi lần chạy chỉ đi một nhánh.</p>
          </>)}

          {/* Bộ sửa danh sách dùng chung */}
          {(editors || []).map((ed, _ied) => (<React.Fragment key={_ied}>
            <div className={Q('sec')}>{ed.title}</div>
            {(ed.items || []).map((li, _ili) => (<React.Fragment key={_ili}>
              <div style={S('display: flex; gap: 6px; margin-top: 6px; align-items: center')}>
                {(li.hasTag) && (<><span style={S('font-size: 10.5px; background: #f1f5f9; border-radius: 5px; padding: 3px 6px; white-space: nowrap; color: #334155')}>{li.tag}</span></>)}
                <input className={Q('field')} aria-label={li.aAria} value={li.a} placeholder={li.aPh} onChange={li.onA} style={S(`font-family: ${li.aFont}; font-size: 12.5px`)} />
                {(ed.hasB) && (<><input className={Q('field')} aria-label={li.bAria} value={li.b} placeholder={li.bPh} onChange={li.onB} style={S('font-size: 12.5px')} /></>)}
                <button type="button" className={Q('ghost')} aria-label="Xoá" onClick={li.remove} disabled={li.lock} style={S('width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0')}>✕</button>
              </div>
            </React.Fragment>))}
            {(ed.picking) && (<>
              <div style={S('margin-top: 8px; border: 1px solid #e5e5e5; border-radius: 10px; padding: 10px')}>
                <div style={S('font-size: 12px; color: #475569')}>Chọn kiểu dữ liệu</div>
                <div style={S('display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px')}>
                  {(ed.types || []).map((ty, _ity) => (<React.Fragment key={_ity}><button type="button" className={Q('pill')} onClick={ty.pick}>{ty.label}</button></React.Fragment>))}
                </div>
              </div>
            </>)}
            <div style={S('display: flex; gap: 4px; flex-wrap: wrap')}>
              <button type="button" className={Q('ghost link')} onClick={ed.add}>{ed.addLabel}</button>
              {(ed.hasExtra) && (<><button type="button" className={Q('ghost link')} onClick={ed.extra}>{ed.extraLabel}</button></>)}
            </div>
            {(ed.hasNote) && (<><p style={S('font-size: 11.5px; color: #64748b; margin: 4px 0 0; line-height: 1.5')}>{ed.note}</p></>)}
          </React.Fragment>))}

          {/* Biến đầu ra */}
          {(sel.hasOutVars) && (<>
            <div className={Q('sec')}>ĐẦU RA</div>
            <div style={S('display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px')}>
              {(outVars || []).map((v, _iv) => (<React.Fragment key={_iv}><span style={S('font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: #1d4ed8; background: #eff6ff; border-radius: 5px; padding: 3px 7px')}>{v}</span></React.Fragment>))}
            </div>
            <p style={S('font-size: 11.5px; color: #64748b; margin: 6px 0 0')}>Các bước sau chèn các biến này bằng nút {'{'}x{'}'}.</p>
          </>)}

          {/* Khi bước lỗi */}
          {(sel.hasErr) && (<>
            <div className={Q('sec')}>KHI BƯỚC NÀY LỖI</div>
            <label style={S('display: flex; align-items: center; gap: 8px; font-size: 12.5px; margin-top: 8px; cursor: pointer')}><input type="checkbox" checked={errRetry} onChange={toggleRetry} style={S('accent-color: #203BDC')} />Thử lại tối đa 3 lần</label>
            <label className={Q('lbl')} htmlFor="errmode">Nếu vẫn lỗi</label>
            <select id="errmode" className={Q('field')} value={errMode} onChange={onErrMode}>
              <option value="stop">Dừng Quy trình</option>
              <option value="default">Dùng giá trị mặc định rồi chạy tiếp</option>
              <option value="branch">Đi nhánh Lỗi</option>
            </select>
          </>)}

          {(sel.canDelete) && (<>
            <button type="button" className={Q('btn')} onClick={deleteSel} style={S('margin-top: 22px; color: #b91c1c; border-color: #fecaca')}>Xoá bước</button>
          </>)}
        </div>
      </>)}
    </>)}

    {(pmProcess) && (<>
      <div style={S('padding: 18px')}>
        <h2 style={S('margin: 0; font-size: 15px; font-weight: 600')}>Cài đặt Quy trình</h2>
        <p style={S('margin: 4px 0 0; font-size: 12.5px; color: #475569')}>Chọn một bước trên canvas để cấu hình bước đó.</p>
        <div style={S('margin-top: 14px; border: 1px solid #e5e5e5; border-radius: 10px; padding: 12px')}>
          <div style={S('display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>Guardrails cho mọi bước</div>
          <div style={S('font-size: 11px; font-weight: 600; letter-spacing: .04em; color: #475569; margin-top: 10px')}>NỘI DUNG <span style={S('font-weight: 400; letter-spacing: 0; color: #64748b')}>· {aiCount} bước AI</span></div>
          {(guards || []).map((g, _ig) => (<React.Fragment key={_ig}><label style={S('display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; padding: 4px 0; cursor: pointer')}><input type="checkbox" checked={g.on} onChange={g.toggle} style={S('margin-top: 2px; accent-color: #203BDC')} /><span>{g.label}</span></label></React.Fragment>))}
          <div style={S('font-size: 11px; font-weight: 600; letter-spacing: .04em; color: #475569; margin-top: 10px')}>HÀNH ĐỘNG <span style={S('font-weight: 400; letter-spacing: 0; color: #64748b')}>· {actCount} bước Tool, HTTP</span></div>
          {(actGuards || []).map((g, _ig) => (<React.Fragment key={_ig}><label style={S('display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; padding: 4px 0; cursor: pointer')}><input type="checkbox" checked={g.on} onChange={g.toggle} style={S('margin-top: 2px; accent-color: #203BDC')} /><span>{g.label}</span></label></React.Fragment>))}
          <p style={S('font-size: 11.5px; color: #64748b; margin: 8px 0 0')}>Guardrails của Space luôn áp dụng trước và không tắt được ở đây.</p>
        </div>
        <div style={S('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px')}>
          <div style={S('background: #f8fafc; border-radius: 8px; padding: 10px')}><div style={S('font-size: 20px; font-weight: 600')}>{stepCount}</div><div style={S('font-size: 11.5px; color: #475569')}>bước</div></div>
          <div style={S('background: #f8fafc; border-radius: 8px; padding: 10px')}><div style={S(`font-size: 20px; font-weight: 600; color: ${issueColor}`)}>{issueCount}</div><div style={S('font-size: 11.5px; color: #475569')}>lỗi cần sửa</div></div>
        </div>
      </div>
    </>)}

  </aside>
</div>
</>)}

{(toast) && (<>
  <div role="status" style={S(`position: absolute; left: 50%; bottom: 84px; transform: translateX(-50%); background: ${toastBg}; color: #fff; font-size: 13px; border-radius: 10px; padding: 10px 16px; box-shadow: 0 8px 24px hsl(240 10% 8% / .25); z-index: 60; max-width: 520px; text-align: center; line-height: 1.45`)}>{toastText}</div>
</>)}


      </div>
    );
  }
}

export default function ProcessBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const draft = id && id !== "new" ? id : sp.get("draft") || null;
  return <ProcessBuilderInner key={(id || "") + sp.toString()} draft={draft} prompt={sp.get("prompt") || ""} name={sp.get("name") || ""} onBack={() => navigate("/agents")} />;
}
