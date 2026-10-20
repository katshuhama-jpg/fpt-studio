/* eslint-disable */
// @ts-nocheck
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
  form: 'M5 4h14v16H5z M8 9h8 M8 13h8 M8 17h5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  hook: 'M10 14a4 4 0 1 1 4-6 M14 10l3 6a3 3 0 1 1-2 3 M7 15l-3 3',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  scan: 'M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4 M7 12h10',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 19V5 M8 7h7',
  tag: 'M3 12V4h8l10 10-8 8z M7.5 7.5h.01',
  bot: 'M5 8h14v11H5z M12 4v4 M9 13h.01 M15 13h.01',
  branch: 'M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a9 9 0 0 1-9 9',
  loop: 'M17 2l4 4-4 4 M3 11V9a3 3 0 0 1 3-3h15 M7 22l-4-4 4-4 M21 13v2a3 3 0 0 1-3 3H3',
  merge: 'M6 4v6a4 4 0 0 0 4 4h8 M6 20v-6 M15 11l3 3-3 3',
  approve: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M16 11l2 2 4-4',
  code: 'M8 7l-5 5 5 5 M16 7l5 5-5 5',
  tpl: 'M4 4h16v6H4z M4 14h7v6H4z M15 14h5 M15 18h5',
  set: 'M4 9h6 M4 15h6 M14 6l6 12 M20 6l-6 12',
  http: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18',
  tool: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4z',
  flow: 'M3 5h6v5H3z M15 14h6v5h-6z M9 7.5h3a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2',
  out: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  note: 'M5 3h10l4 4v14H5z M14 3v5h5',
  warn: 'M12 9v4 M12 17h.01 M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'
};
var GC = { start: '#203BDC', ai: '#4F46E5', logic: '#0891B2', human: '#15803D', data: '#E0701A', integ: '#9333EA', output: '#EA580C', note: '#A16207' };
var GL = { ai: 'AI', logic: 'Logic', human: 'Con người', data: 'Dữ liệu', integ: 'Tích hợp', output: 'Kết thúc' };
var TYPES = {
  start_pending: { g: 'start', name: 'Bắt đầu', icon: ICON.play },
  start_form: { g: 'start', name: 'Form đầu vào', desc: 'Nhận dữ liệu khi người dùng, Nhân sự số hoặc hệ thống khác gọi tới', icon: ICON.form },
  start_schedule: { g: 'start', name: 'Lịch chạy', desc: 'Tự chạy theo giờ, theo ngày hoặc theo tuần', icon: ICON.clock },
  start_webhook: { g: 'start', name: 'Webhook', desc: 'Chạy khi hệ thống bên ngoài gửi dữ liệu tới một địa chỉ riêng', icon: ICON.hook },
  llm: { g: 'ai', name: 'LLM', desc: 'Gọi mô hình AI để soạn, tóm tắt hoặc lấy dữ liệu có cấu trúc', icon: ICON.spark, kw: 'ai model prompt tom tat trich xuat soan doc', err: 1, ai: 1 },
  readdoc: { g: 'ai', name: 'Đọc tài liệu', desc: 'Đọc hoá đơn, CCCD, sao kê, hợp đồng thành các trường có sẵn', icon: ICON.scan, kw: 'ocr dla doc tai lieu hoa don cccd pdf scan giay to', err: 1, ai: 1 },
  knowledge: { g: 'ai', name: 'Tra cứu tri thức', desc: 'Tìm đoạn liên quan trong kho tri thức của Space', icon: ICON.book, kw: 'rag knowledge tim kiem tai lieu', ai: 1 },
  classify: { g: 'ai', name: 'Phân loại', desc: 'AI gán nhãn, mỗi nhãn đi một nhánh riêng', icon: ICON.tag, kw: 'classify nhan loai', ai: 1 },
  agent: { g: 'ai', name: 'Gọi Nhân sự số', desc: 'Giao việc cần phán đoán cho một Nhân sự số Năng suất', icon: ICON.bot, kw: 'agent nhan su so nang suat', err: 1, ai: 1 },
  condition: { g: 'logic', name: 'Điều kiện', desc: 'Rẽ nhánh theo dữ liệu: NẾU, NẾU KHÔNG THÌ NẾU, CÒN LẠI', icon: ICON.branch, kw: 'if else neu re nhanh dieu kien' },
  loop: { g: 'logic', name: 'Lặp danh sách', desc: 'Chạy các bước bên trong cho từng phần tử của danh sách', icon: ICON.loop, kw: 'loop lap iteration for each vong' },
  merge: { g: 'logic', name: 'Gộp nhánh', desc: 'Gom giá trị từ các nhánh đã rẽ về một biến', icon: ICON.merge, kw: 'merge gop aggregate nhap' },
  approval: { g: 'human', name: 'Người duyệt', desc: 'Chờ người duyệt hoặc nhập thêm thông tin, mỗi nút một nhánh', icon: ICON.approve, kw: 'approve duyet human nguoi nhap lieu xac nhan' },
  code: { g: 'data', name: 'Code', desc: 'Chạy Python hoặc JavaScript cho phép tính phức tạp', icon: ICON.code, kw: 'python javascript script tinh', err: 1 },
  template: { g: 'data', name: 'Mẫu văn bản', desc: 'Ghép biến vào mẫu email, thông báo', icon: ICON.tpl, kw: 'template mau van ban email' },
  assign: { g: 'data', name: 'Gán biến', desc: 'Đặt hoặc đổi giá trị của một biến', icon: ICON.set, kw: 'set variable bien gan' },
  http: { g: 'integ', name: 'HTTP Request', desc: 'Gọi API của hệ thống nội bộ', icon: ICON.http, kw: 'api http rest curl', err: 1, act: 1 },
  tool: { g: 'integ', name: 'Tool', desc: 'Dùng tool đã kết nối trong Space', icon: ICON.tool, kw: 'tool tich hop connector', err: 1, act: 1 },
  subflow: { g: 'integ', name: 'Quy trình con', desc: 'Gọi một Quy trình khác đã publish', icon: ICON.flow, kw: 'subflow quy trinh con goi', err: 1 },
  output: { g: 'output', name: 'Kết thúc', desc: 'Khai báo dữ liệu trả về cho bên gọi Quy trình', icon: ICON.out, kw: 'end output ket thuc tra ve' },
  note: { g: 'note', name: 'Ghi chú', desc: 'Giải thích cho người xem sau', icon: ICON.note, kw: 'note' }
};
var SEL_GROUPS = [['ai', ['llm', 'knowledge', 'classify', 'agent']], ['logic', ['condition', 'loop', 'merge']], ['human', ['approval']], ['data', ['code', 'template', 'assign']], ['integ', ['http', 'subflow']], ['output', ['output']]];
var TOOLS = [
  { name: 'SAP ERP · Tạo đơn mua hàng', desc: 'Tạo PO từ nhà cung cấp, số tiền, phòng ban', app: 'SAP ERP', act: 'Tạo đơn mua hàng (PO)', out: ['ma_po'] },
  { name: 'SAP ERP · Ghi nhận công nợ', desc: 'Ghi công nợ phải trả theo hoá đơn', app: 'SAP ERP', act: 'Ghi nhận công nợ', out: ['ma_but_toan'] },
  { name: 'Gmail · Gửi email', desc: 'Gửi email từ hộp thư đã kết nối', app: 'Gmail', act: 'Gửi email', out: ['ma_thu'] },
  { name: 'SharePoint · Lấy tệp', desc: 'Đọc tệp trong thư viện tài liệu', app: 'SharePoint', act: 'Lấy tệp', out: ['tep'] },
  { name: 'DataSuite · Truy vấn bảng', desc: 'Lấy dữ liệu từ bảng đã kết nối', app: 'DataSuite', act: 'Truy vấn bảng', out: ['ket_qua'] }
];
var FLOWS = [{ name: 'Kiểm tra nhà cung cấp', ver: 'v3' }, { name: 'Gửi thông báo đa kênh', ver: 'v1' }];
var AGENTS = ['Trợ lý nội bộ công chức', 'Hỗ trợ thủ tục hành chính', 'Tư vấn khoản vay'];
var KBS = ['Quy định mua sắm 2026', 'Chính sách tín dụng bán lẻ', 'Danh mục nhà cung cấp'];
var DOCTYPES = [
  { id: 'invoice', label: 'Hoá đơn VAT', hint: 'Đọc theo mẫu hoá đơn điện tử, kể cả bản scan.', out: ['so_hd', 'so_tien', 'ma_so_thue', 'nha_cung_cap', 'ngay_hd'] },
  { id: 'quote', label: 'Báo giá, đề nghị mua', hint: 'Lấy nhà cung cấp, danh mục hàng và tổng tiền.', out: ['nha_cung_cap', 'danh_muc', 'tong_tien'] },
  { id: 'cccd', label: 'CCCD', hint: 'Đọc mặt trước và mặt sau, kiểm tra còn hạn.', out: ['so_cccd', 'ho_ten', 'ngay_sinh', 'ngay_het_han'] },
  { id: 'statement', label: 'Sao kê ngân hàng', hint: 'Đọc bảng giao dịch, tính thu nhập trung bình.', out: ['thu_nhap_tb', 'so_thang', 'ngan_hang'] },
  { id: 'contract', label: 'Hợp đồng', hint: 'Lấy các bên, giá trị và thời hạn.', out: ['ben_a', 'ben_b', 'gia_tri', 'ngay_hieu_luc'] },
  { id: 'custom', label: 'Tài liệu khác', hint: 'Tự khai báo các trường cần lấy ở mục Đầu ra.', out: [] }
];
function docOf(c) { return DOCTYPES.filter(function (d) { return d.id === c.doc; })[0] || DOCTYPES[0]; }
var NW = 280, HEAD = 44, ROWTOP = 44, PITCH = 28;

function roundPath(pts, r) {
  var d = 'M' + pts[0][0] + ' ' + pts[0][1];
  for (var i = 1; i < pts.length - 1; i++) {
    var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    var l1 = Math.abs(p1[0] - p0[0]) + Math.abs(p1[1] - p0[1]);
    var l2 = Math.abs(p2[0] - p1[0]) + Math.abs(p2[1] - p1[1]);
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
function tileOf(type) { return GC[TYPES[type].g]; }
function isStart(n) { return n.type.indexOf('start') === 0; }
function clone(o) { return JSON.parse(JSON.stringify(o)); }

function defaultCfg(type) {
  switch (type) {
    case 'start_form': return { fields: [] };
    case 'start_webhook': return { fields: [] };
    case 'start_schedule': return { freq: 'week', time: '08:00' };
    case 'llm': return { model: 'DeepSeek V4 Flash', system: '', prompt: '', outVars: ['text'], retry: false, err: 'stop' };
    case 'readdoc': return { file: '', doc: 'invoice', outVars: [], retry: false, err: 'stop' };
    case 'knowledge': return { kb: '', query: '', topK: '5' };
    case 'classify': return { input: '', model: 'DeepSeek V4 Flash', labels: ['Nhãn 1', 'Nhãn 2'] };
    case 'agent': return { agent: '', task: '', retry: false, err: 'stop' };
    case 'condition': return { cases: [{ logic: 'VÀ', rows: [{ v: '', op: 'Bằng', val: '' }] }] };
    case 'loop': return { list: '', mode: 'seq', inner: [] };
    case 'merge': return { vars: '', target: 'ket_qua' };
    case 'approval': return { via: 'both', approver: '', content: '', timeout: '3', actions: ['Duyệt', 'Từ chối'] };
    case 'code': return { lang: 'Python 3', code: 'def main(so_tien):\n    return {"vat": so_tien * 0.1}', outVars: ['vat'], retry: false, err: 'stop' };
    case 'template': return { tpl: '' };
    case 'assign': return { name: '', value: '' };
    case 'http': return { method: 'POST', url: '', auth: 'none', body: '', retry: true, err: 'stop' };
    case 'tool': return { tool: '', acc: '', params: '', retry: false, err: 'stop' };
    case 'subflow': return { flow: '', retry: false, err: 'stop' };
    case 'output': return { outVars: [], asTool: true };
    case 'note': return { text: 'Ghi lại lý do của đoạn này cho người xem sau.' };
  }
  return {};
}
function outsOf(n) {
  var c = n.cfg || {};
  switch (n.type) {
    case 'start_pending': case 'output': case 'note': return [];
    case 'condition': return c.cases.map(function (_, i) { return i === 0 ? 'NẾU' : 'HOẶC NẾU'; }).concat(['CÒN LẠI']);
    case 'classify': return c.labels.concat(['Khác']);
    case 'approval': return c.actions.concat(['Quá hạn']);
  }
  var o = [''];
  if (TYPES[n.type].err && c.err === 'branch') o.push('Lỗi');
  return o;
}
var OPSYM = { 'Bằng': '=', 'Khác': '≠', 'Lớn hơn': '>', 'Nhỏ hơn': '<', 'Chứa': 'chứa', 'Rỗng': 'rỗng' };
function caseText(cs) {
  var parts = cs.rows.filter(function (r) { return r.v; }).map(function (r) { return r.v + ' ' + OPSYM[r.op] + (r.op === 'Rỗng' ? '' : ' ' + (r.val || '?')); });
  return parts.length ? parts.join(cs.logic === 'VÀ' ? ' và ' : ' hoặc ') : '';
}
function outputsOf(n) {
  var c = n.cfg || {};
  switch (n.type) {
    case 'start_form': case 'start_webhook': return c.fields.map(function (f) { return f.k; });
    case 'start_schedule': return ['thoi_diem_chay'];
    case 'llm': case 'code': return c.outVars;
    case 'readdoc': return c.doc === 'custom' ? c.outVars : docOf(c).out;
    case 'knowledge': return ['ket_qua'];
    case 'classify': return ['nhan'];
    case 'agent': return ['tra_loi'];
    case 'loop': return ['ket_qua_lap'];
    case 'merge': return c.target ? [c.target] : [];
    case 'approval': return ['hanh_dong', 'nguoi_duyet', 'y_kien'];
    case 'template': return ['van_ban'];
    case 'assign': return c.name ? [c.name] : [];
    case 'http': return ['status', 'body'];
    case 'tool': var t = TOOLS.filter(function (x) { return x.name === c.tool; })[0]; return t ? t.out : ['ket_qua'];
    case 'subflow': return ['ket_qua'];
  }
  return [];
}
var FREQ = { day: 'Hằng ngày', week: 'Thứ Hai hằng tuần', month: 'Ngày 1 hằng tháng' };
var VIA = { both: 'Omni Inbox và Email', inbox: 'Omni Inbox', email: 'Email' };
function errRows(n, R) {
  var c = n.cfg, rows = [];
  if (!TYPES[n.type].err) return rows;
  if (c.retry) rows.push(R('Thử lại', null, '3 lần khi lỗi', null, '#475569'));
  if (c.err === 'default') rows.push(R('Khi lỗi', null, 'Dùng giá trị mặc định', null, '#475569'));
  if (c.err === 'branch') rows.push(R('Lỗi', null, 'Đi nhánh lỗi', outsOf(n).length - 1, '#c2410c', '#fff7ed'));
  return rows;
}
function rowsOf(n) {
  var c = n.cfg || {};
  var R = function (label, chips, text, port, color, bg) { return { label: label, chips: chips || [], text: text || '', port: port === undefined ? null : port, color: color, bg: bg }; };
  var AMB = '#b45309';
  switch (n.type) {
    case 'start_pending': case 'note': return [];
    case 'start_form': return [c.fields.length ? R('Đầu vào', c.fields.map(function (f) { return f.k; })) : R('Đầu vào', null, 'Chưa có trường nào', null, '#64748b')];
    case 'start_webhook': return [R('Địa chỉ', null, '/hooks/qt-8f21'), c.fields.length ? R('Dữ liệu', c.fields.map(function (f) { return f.k; })) : R('Dữ liệu', null, 'Chưa khai báo', null, '#64748b')];
    case 'start_schedule': return [R('Lịch', null, FREQ[c.freq] + ' · ' + c.time)];
    case 'llm': return [R('Model', null, c.model), c.prompt ? R('Đầu ra', c.outVars) : R('Yêu cầu', null, 'Chưa viết', null, AMB)].concat(errRows(n, R));
    case 'readdoc': var dd = outputsOf(n); return [R('Đọc tệp', c.file ? [c.file] : null, c.file ? '' : 'Chưa chọn tệp', null, AMB), R('Loại', null, docOf(c).label), dd.length ? R('Đầu ra', dd) : R('Đầu ra', null, 'Chưa khai báo', null, AMB)].concat(errRows(n, R));
    case 'knowledge': return [R('Kho', null, c.kb || 'Chưa chọn', null, c.kb ? undefined : AMB), R('Câu hỏi', c.query ? [c.query] : null, c.query ? '' : 'Chưa chọn', null, AMB)];
    case 'classify': return [R('Đầu vào', c.input ? [c.input] : null, c.input ? '' : 'Chưa chọn', null, AMB)].concat(c.labels.map(function (l, i) { return R('', null, l, i); })).concat([R('', null, 'Khác', c.labels.length, '#64748b')]);
    case 'agent': return [R('Giao cho', null, c.agent || 'Chưa chọn', null, c.agent ? undefined : AMB), R('Đầu ra', ['tra_loi'])].concat(errRows(n, R));
    case 'condition': return c.cases.map(function (cs, i) { var t = caseText(cs); return R(i === 0 ? 'NẾU' : 'HOẶC NẾU', null, t || 'Chưa đặt điều kiện', i, t ? undefined : AMB); }).concat([R('CÒN LẠI', null, '', c.cases.length)]);
    case 'loop': return [R('Lặp qua', c.list ? [c.list] : null, c.list ? '' : 'Chưa chọn danh sách', null, AMB), R('Cách chạy', null, c.mode === 'par' ? 'Song song, tối đa 5' : 'Lần lượt từng phần tử')];
    case 'merge': return [R('Lấy từ', c.vars ? c.vars.split(/,\s*/) : null, c.vars ? '' : 'Chưa chọn', null, AMB), R('Thành', c.target ? [c.target] : null)];
    case 'approval': return [R('Gửi qua', null, VIA[c.via]), R('Người duyệt', null, c.approver || 'Chưa chọn', null, c.approver ? undefined : AMB)].concat(c.actions.map(function (a, i) { return R('', null, a, i); })).concat([R('', null, 'Quá hạn sau ' + c.timeout + ' ngày', c.actions.length, '#c2410c', '#fff7ed')]);
    case 'code': return [R('Ngôn ngữ', null, c.lang), R('Đầu ra', c.outVars)].concat(errRows(n, R));
    case 'template': return [R('Mẫu', null, c.tpl ? c.tpl.replace(/\s+/g, ' ') : 'Chưa viết', null, c.tpl ? '#475569' : AMB), R('Đầu ra', ['van_ban'])];
    case 'assign': return [R('Gán', null, c.name ? c.name + ' = ' + (c.value || '""') : 'Chưa chọn biến', null, c.name ? undefined : AMB)];
    case 'http': return [R('Gọi', null, c.url ? c.method + ' ' + c.url.replace(/^https?:\/\/[^/]+/, '') : 'Chưa nhập URL', null, c.url ? undefined : AMB)].concat(errRows(n, R));
    case 'tool': return [R('Tool', null, c.tool || 'Chưa chọn', null, c.tool ? undefined : AMB), R('Chạy bằng', null, c.acc === 'space' ? 'Tài khoản chung của Space' : (c.acc === 'user' ? 'Tài khoản người chạy' : 'Chưa chọn'), null, c.acc ? undefined : AMB)].concat(errRows(n, R));
    case 'subflow': return [R('Quy trình', null, c.flow || 'Chưa chọn', null, c.flow ? undefined : AMB)].concat(errRows(n, R));
    case 'output': return [c.outVars.length ? R('Trả về', c.outVars) : R('Trả về', null, 'Chưa khai báo', null, AMB), R('Dùng làm tool', null, c.asTool ? 'Bật' : 'Tắt', null, c.asTool ? '#15803d' : '#64748b')];
  }
  return [];
}
function nodeH(n) {
  if (n.type === 'start_pending') return 84;
  if (n.type === 'note') return HEAD + Math.max(2, Math.ceil(((n.cfg && n.cfg.text) || '').length / 38)) * 19 + 12;
  var r = rowsOf(n).length;
  return HEAD + r * PITCH + 6 + (n.type === 'loop' ? 90 : 0);
}
function outY(n, i) {
  var rows = rowsOf(n);
  for (var k = 0; k < rows.length; k++) if (rows[k].port === i) return ROWTOP + k * PITCH + 12;
  return HEAD / 2;
}
function issuesOf(n, s) {
  var c = n.cfg || {}, m = [];
  switch (n.type) {
    case 'start_pending': m.push('Chưa chọn cách bắt đầu'); break;
    case 'start_form': case 'start_webhook':
      var out = s.nodes.filter(function (x) { return x.type === 'output'; })[0];
      if (out && out.cfg.asTool) c.fields.forEach(function (f) { if (!f.desc) m.push('Trường ' + f.k + ' chưa có mô tả cho Nhân sự số'); });
      break;
    case 'llm': if (!c.prompt.trim()) m.push('Chưa viết yêu cầu cho AI'); break;
    case 'readdoc': if (!c.file) m.push('Chưa chọn tệp cần đọc'); if (c.doc === 'custom' && !c.outVars.length) m.push('Chưa khai báo trường cần lấy'); break;
    case 'knowledge': if (!c.kb) m.push('Chưa chọn kho tri thức'); if (!c.query) m.push('Chưa chọn biến làm câu hỏi'); break;
    case 'classify': if (!c.input) m.push('Chưa chọn dữ liệu cần phân loại'); break;
    case 'agent': if (!c.agent) m.push('Chưa chọn Nhân sự số nhận việc'); if (!c.task.trim()) m.push('Chưa mô tả việc giao'); break;
    case 'condition': if (c.cases.some(function (cs) { return cs.rows.some(function (r) { return !r.v || (r.op !== 'Rỗng' && !String(r.val).trim()); }) || !cs.rows.length; })) m.push('Điều kiện còn thiếu biến hoặc giá trị'); break;
    case 'loop': if (!c.list) m.push('Chưa chọn danh sách để lặp'); if (!c.inner.length) m.push('Vòng lặp chưa có bước nào bên trong'); break;
    case 'merge': if (!c.vars) m.push('Chưa chọn biến cần gộp'); if (!c.target) m.push('Chưa đặt tên biến sau khi gộp'); break;
    case 'approval': if (!c.approver) m.push('Chưa chọn người duyệt'); if (c.actions.some(function (a) { return !a.trim(); })) m.push('Có nút hành động chưa đặt tên'); break;
    case 'template': if (!c.tpl.trim()) m.push('Mẫu văn bản đang trống'); break;
    case 'assign': if (!c.name) m.push('Chưa chọn biến cần gán'); break;
    case 'http': if (!c.url.trim()) m.push('Chưa nhập URL'); break;
    case 'tool': if (!c.tool) m.push('Chưa chọn tool'); if (!c.acc) m.push('Chưa chọn tài khoản chạy tool'); break;
    case 'subflow': if (!c.flow) m.push('Chưa chọn Quy trình con'); break;
    case 'output': if (!c.outVars.length) m.push('Chưa khai báo biến trả về'); break;
  }
  if (!isStart(n) && n.type !== 'note' && !s.edges.some(function (e) { return e.to === n.id; })) m.push('Bước này chưa được nối vào luồng');
  return m;
}
function upstreamOf(id, s) {
  var seen = {}, stack = [id], res = [];
  while (stack.length) {
    var cur = stack.pop();
    s.edges.forEach(function (e) { if (e.to === cur && !seen[e.from]) { seen[e.from] = 1; stack.push(e.from); } });
  }
  s.nodes.forEach(function (n) { if (seen[n.id]) outputsOf(n).forEach(function (v) { res.push({ v: v, l: v + ' · ' + n.title }); }); });
  return res;
}
function reachable(id, edges) {
  var seen = {}, stack = [id];
  seen[id] = 1;
  while (stack.length) { var cur = stack.pop(); edges.forEach(function (e) { if (e.from === cur && !seen[e.to]) { seen[e.to] = 1; stack.push(e.to); } }); }
  return seen;
}
function layoutFlow(f) {
  var byId = {}; f.nodes.forEach(function (n) { byId[n.id] = n; });
  var colBottom = {}, placed = {}, GAPX = 80, GAPY = 36;
  function place(n, col, wantY) {
    if (placed[n.id]) return;
    var y = Math.max(wantY, (colBottom[col] === undefined ? -1e9 : colBottom[col] + GAPY));
    y = Math.round(y / 4) * 4;
    n.x = col * (NW + GAPX); n.y = y; placed[n.id] = true;
    colBottom[col] = y + nodeH(n);
    f.edges.filter(function (e) { return e.from === n.id; }).sort(function (a, b) { return a.out - b.out; })
      .forEach(function (e) { var ch = byId[e.to]; if (ch) place(ch, col + 1, y + outY(n, e.out) - HEAD / 2); });
  }
  var st = f.nodes.filter(isStart)[0];
  if (st) place(st, 0, 0);
  var maxY = 0; f.nodes.forEach(function (n) { if (placed[n.id]) maxY = Math.max(maxY, n.y + nodeH(n)); });
  f.nodes.forEach(function (n) { if (!placed[n.id]) { n.x = 0; n.y = maxY + 60; maxY += nodeH(n) + 30; } });
  return f;
}

// ---------- Bản nháp AI ----------
var SUGGEST = [
  { key: 'buy', label: 'Duyệt đề nghị mua sắm', name: 'Duyệt đề nghị mua sắm', text: 'Nhận đề nghị mua sắm kèm chứng từ. Đọc chứng từ, nếu vượt 50 triệu thì giám đốc duyệt, không thì tự duyệt. Duyệt xong tạo PO trên SAP ERP, từ chối thì soạn thư báo lại người đề nghị.' },
  { key: 'invoice', label: 'Đối chiếu hoá đơn với PO', name: 'Đối chiếu hoá đơn với PO', text: 'Khi hệ thống kế toán gửi hoá đơn VAT qua webhook, đọc số tiền, lấy PO tương ứng từ ERP để so khớp. Khớp thì ghi nhận công nợ, lệch thì chuyển kế toán xem lại.' },
  { key: 'loan', label: 'Tiếp nhận hồ sơ vay', name: 'Tiếp nhận hồ sơ vay', text: 'Nhận hồ sơ vay gồm CCCD và sao kê lương. Phân loại sản phẩm vay, tra chính sách tín dụng, chấm điều kiện cơ bản rồi chuyển chuyên viên thẩm định. Đạt thì tạo hồ sơ trên LOS, không đạt thì soạn thư từ chối.' }
];
function N(id, type, title, cfg) { return { id: id, type: type, title: title, desc: '', x: 0, y: 0, cfg: Object.assign(defaultCfg(type), cfg || {}) }; }
function E(list) { return list.map(function (a) { return { from: a[0], out: a[1], to: a[2] }; }); }
function F(k, label, t, req, desc) { return { k: k, label: label, t: t, req: req, desc: desc }; }
function draftFlow(key) {
  var f;
  if (key === 'invoice') f = {
    nodes: [
      N('n1', 'start_webhook', 'Nhận hoá đơn', { fields: [F('ma_po', 'Mã PO', 'Văn bản', true, 'Mã đơn mua hàng ghi trên hoá đơn'), F('tep_hoa_don', 'Hoá đơn VAT', 'Tệp', true, 'Tệp PDF hoặc XML của hoá đơn điện tử')] }),
      N('n2', 'llm', 'Đọc hoá đơn VAT', { prompt: 'Đọc {{tep_hoa_don}} và lấy tổng tiền, mã số thuế, ngày hoá đơn.', outVars: ['so_tien', 'ma_so_thue', 'ngay_hd'] }),
      N('n3', 'http', 'Lấy PO từ ERP', { method: 'GET', url: 'https://erp.noibo.vn/api/po/{{ma_po}}', err: 'branch' }),
      N('n4', 'condition', 'Khớp với PO?', { cases: [{ logic: 'VÀ', rows: [{ v: 'so_tien', op: 'Bằng', val: '{{body.tong_tien}}' }] }] }),
      N('n5', 'tool', 'Ghi nhận công nợ', { tool: 'SAP ERP · Ghi nhận công nợ', acc: 'space' }),
      N('n6', 'approval', 'Kế toán xem lại', { approver: 'Nhóm Kế toán công nợ', content: 'Hoá đơn {{ma_po}} lệch với PO. Số tiền hoá đơn: {{so_tien}}.', actions: ['Chấp nhận chênh lệch', 'Trả lại nhà cung cấp'] }),
      N('n7', 'tool', 'Báo nhà cung cấp', { tool: 'Gmail · Gửi email', acc: '' }),
      N('n8', 'assign', 'Đánh dấu xử lý tay', { name: 'trang_thai', value: 'Cần xử lý tay' }),
      N('n9', 'output', 'Trả kết quả', { outVars: ['trang_thai', 'ma_but_toan'] })
    ],
    edges: E([['n1', 0, 'n2'], ['n2', 0, 'n3'], ['n3', 0, 'n4'], ['n3', 1, 'n8'], ['n4', 0, 'n5'], ['n4', 1, 'n6'], ['n5', 0, 'n9'], ['n6', 0, 'n5'], ['n6', 1, 'n7'], ['n7', 0, 'n9'], ['n8', 0, 'n9']])
  };
  else if (key === 'loan') f = {
    nodes: [
      N('n1', 'start_form', 'Nhận hồ sơ vay', { fields: [F('cccd', 'Ảnh CCCD', 'Tệp', true, 'Ảnh hai mặt căn cước công dân'), F('sao_ke', 'Sao kê lương', 'Tệp', true, 'Sao kê 3 tháng gần nhất'), F('so_tien_vay', 'Số tiền muốn vay', 'Số', true, 'Đơn vị đồng')] }),
      N('n2', 'classify', 'Phân loại sản phẩm vay', { input: 'so_tien_vay', labels: ['Vay tiêu dùng', 'Vay mua xe'] }),
      N('n3', 'knowledge', 'Tra chính sách tín dụng', { kb: 'Chính sách tín dụng bán lẻ', query: 'nhan' }),
      N('n4', 'llm', 'Chấm điều kiện cơ bản', { prompt: 'Dựa trên {{ket_qua}}, đối chiếu {{sao_ke}} và {{so_tien_vay}}. Trả về dat (true/false) và ly_do.', outVars: ['dat', 'ly_do'] }),
      N('n5', 'condition', 'Đạt điều kiện?', { cases: [{ logic: 'VÀ', rows: [{ v: 'dat', op: 'Bằng', val: 'true' }] }] }),
      N('n6', 'approval', 'Chuyên viên thẩm định', { approver: 'Nhóm Thẩm định bán lẻ', content: 'Hồ sơ vay {{so_tien_vay}}. Lý do AI chấm: {{ly_do}}.' }),
      N('n7', 'http', 'Tạo hồ sơ trên LOS', { method: 'POST', url: '' }),
      N('n8', 'template', 'Soạn thư từ chối', { tpl: 'Kính gửi Quý khách,\nHồ sơ vay chưa đáp ứng điều kiện vì: {{ly_do}}.' }),
      N('n9', 'agent', 'Chuyển tư vấn viên AI', { agent: 'Tư vấn khoản vay', task: 'Tư vấn sản phẩm vay phù hợp cho khách có nhu cầu {{so_tien_vay}}.' }),
      N('n10', 'output', 'Trả kết quả', { outVars: ['trang_thai', 'ly_do'] })
    ],
    edges: E([['n1', 0, 'n2'], ['n2', 0, 'n3'], ['n2', 1, 'n3'], ['n2', 2, 'n9'], ['n3', 0, 'n4'], ['n4', 0, 'n5'], ['n5', 0, 'n6'], ['n5', 1, 'n8'], ['n6', 0, 'n7'], ['n6', 1, 'n8'], ['n7', 0, 'n10'], ['n8', 0, 'n10'], ['n9', 0, 'n10']])
  };
  else f = {
    nodes: [
      N('n1', 'start_form', 'Nhận đề nghị', { fields: [F('chung_tu', 'Chứng từ mua sắm', 'Tệp', true, 'Báo giá hoặc đề nghị đã ký'), F('nguoi_de_nghi', 'Người đề nghị', 'Văn bản', true, 'Email công ty của người đề nghị'), F('so_tien', 'Số tiền', 'Số', true, 'Tổng tiền đề nghị, đơn vị đồng')] }),
      N('n2', 'llm', 'Đọc chứng từ', { prompt: 'Đọc {{chung_tu}} và lấy nhà cung cấp, danh mục hàng.', outVars: ['nha_cung_cap', 'danh_muc'] }),
      N('n3', 'condition', 'Vượt hạn mức?', { cases: [{ logic: 'VÀ', rows: [{ v: 'so_tien', op: 'Lớn hơn', val: '50000000' }] }] }),
      N('n4', 'approval', 'Giám đốc duyệt', { approver: 'Giám đốc khối của người đề nghị', content: '{{nguoi_de_nghi}} đề nghị mua {{danh_muc}} của {{nha_cung_cap}}, số tiền {{so_tien}}.' }),
      N('n5', 'assign', 'Tự duyệt', { name: 'hanh_dong', value: 'Duyệt' }),
      N('n6', 'merge', 'Gộp kết quả duyệt', { vars: 'hanh_dong', target: 'ket_qua_duyet' }),
      N('n7', 'tool', 'Tạo PO trên SAP ERP', { tool: 'SAP ERP · Tạo đơn mua hàng', acc: '' }),
      N('n8', 'template', 'Soạn thư từ chối', { tpl: 'Chào {{nguoi_de_nghi}},\nĐề nghị mua {{danh_muc}} chưa được duyệt. Ý kiến: {{y_kien}}.' }),
      N('n9', 'output', 'Trả kết quả', { outVars: ['ma_po', 'ket_qua_duyet'] })
    ],
    edges: E([['n1', 0, 'n2'], ['n2', 0, 'n3'], ['n3', 0, 'n4'], ['n3', 1, 'n5'], ['n4', 0, 'n6'], ['n4', 1, 'n8'], ['n5', 0, 'n6'], ['n6', 0, 'n7'], ['n7', 0, 'n9'], ['n8', 0, 'n9']])
  };
  return layoutFlow(f);
}
function pickKey(text) {
  var t = norm(text);
  if (t.indexOf('hoa don') >= 0) return 'invoice';
  if (t.indexOf('vay') >= 0 || t.indexOf('ho so') >= 0) return 'loan';
  return 'buy';
}
function sampleOf(f) { var m = { 'Số': '75000000', 'Ngày': '2026-10-20', 'Tệp': f.k + '.pdf', 'Có / Không': 'true', 'Danh sách': '["A","B"]' }; return m[f.t] || (f.k === 'nguoi_de_nghi' ? 'lan.nt@fpt.com' : 'Mẫu ' + f.k); }
var MOCK = { nha_cung_cap: 'Công ty TNHH Phong Vũ', danh_muc: '20 laptop Dell Latitude', ma_so_thue: '0101234567', ngay_hd: '2026-10-18', dat: 'true', ly_do: 'Thu nhập trung bình 32 triệu/tháng, đủ điều kiện', tra_loi: 'Đã tư vấn gói vay tiêu dùng 24 tháng', ma_po: 'PO-2026-0481', ma_but_toan: 'BT-77120' };
function mockOf(k) { return MOCK[k] !== undefined ? MOCK[k] : 'Mẫu ' + k; }
function msOf(type, seed) { var base = { llm: 1400, knowledge: 380, classify: 900, agent: 3200, http: 260, tool: 540, subflow: 1800, code: 40 }; return (base[type] || 6) + (seed * 37) % (base[type] ? 400 : 9); }

class ProcessBuilderInner extends React.Component<any, any> {
  constructor(props) {
    super(props);
    this.seq = 30;
    this.state = {
      screen: 'list', createOpen: false, ckind: 'chat', prompt: '', draftName: '', drafting: false, aiBanner: false, kind: 'all',
      name: '', nodes: [], edges: [], sel: null, tab: 'cfg', hist: [],
      selp: null, drag: null, z: 1, px: 80, py: 80,
      checkOpen: false, pubOpen: false, status: 'draft',
      ff: null, newVar: '', last: {},
      run: null, runOpen: false,
      guard: { safety: true, pii: true, scope: false, noDelete: true, maskOut: true, rate: false },
      toast: null
    };
    var self = this;
    this.canvasRef = function (el) { self.canvasEl = el; };
  }
  componentWillUnmount() { clearTimeout(this.timer); clearTimeout(this.toastT); }

  showToast(text, tone) {
    clearTimeout(this.toastT);
    this.setState({ toast: { text: text, tone: tone || 'dark' } });
    var self = this;
    this.toastT = setTimeout(function () { self.setState({ toast: null }); }, 4200);
  }
  snap() { var s = this.state; return { hist: s.hist.concat([{ nodes: clone(s.nodes), edges: clone(s.edges) }]).slice(-40) }; }
  undo() {
    var h = this.state.hist; if (!h.length) { this.showToast('Không còn thao tác nào để hoàn tác.'); return; }
    var p = h[h.length - 1];
    this.setState({ nodes: p.nodes, edges: p.edges, hist: h.slice(0, -1), sel: null, selp: null, ff: null });
  }

  openBuilder(draftKey, name, fromAi) {
    clearTimeout(this.timer);
    var flow = draftKey ? draftFlow(draftKey) : { nodes: [{ id: 'n1', type: 'start_pending', title: 'Bắt đầu', desc: '', x: 0, y: 0, cfg: {} }], edges: [] };
    this.setState({ screen: 'builder', createOpen: false, drafting: false, aiBanner: !!fromAi, name: name || 'Quy trình chưa đặt tên', nodes: flow.nodes, edges: flow.edges,
      sel: draftKey ? null : 'n1', tab: 'cfg', hist: [], selp: null, checkOpen: false, pubOpen: false, status: 'draft', ff: null, last: {}, run: null, runOpen: false });
    var self = this;
    setTimeout(function () { self.fit(); }, 40);
  }
  fit() {
    var nodes = this.state.nodes;
    if (!nodes.length) return;
    var el = this.canvasEl;
    var cw = el ? el.clientWidth : 1080, ch = el ? el.clientHeight : 850;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (n) { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + NW); maxY = Math.max(maxY, n.y + nodeH(n)); });
    var w = maxX - minX, h = maxY - minY;
    var z = Math.min(1, (cw - 140) / w, (ch - 140) / h);
    z = Math.max(0.45, Math.floor(z * 20) / 20);
    var px = (cw - w * z) / 2 - minX * z + 20;
    if (nodes.length === 1) { z = 1; px = 120 - minX; }
    var py = (ch - h * z) / 2 - minY * z;
    if (nodes.length === 1) py = Math.max(80, ch * 0.3) - minY;
    this.setState({ z: z, px: px, py: py });
  }
  canvasSize() { var el = this.canvasEl; return { w: el ? el.clientWidth : 1080, h: el ? el.clientHeight : 850 }; }
  locked() { var r = this.state.run; return !!(r && (r.status === 'running' || r.status === 'paused')); }

  openSel(mode, opts) {
    if (this.locked()) { this.showToast('Đang chạy thử. Dừng chạy thử để sửa Quy trình.'); return; }
    var s = this.state, cs = this.canvasSize(), x = 70, y = 90;
    if (opts && opts.wx !== undefined) { x = s.px + opts.wx * s.z + 16; y = s.py + opts.wy * s.z - 40; }
    if (mode === 'next') { x = cs.w - 340; y = 70; }
    x = Math.max(12, Math.min(x, cs.w - 332)); y = Math.max(12, Math.min(y, cs.h - 470));
    this.setState({ selp: Object.assign({ mode: mode, tab: 'node', q: '', idx: 0, x: x, y: y }, opts || {}), checkOpen: false, pubOpen: false });
  }
  selItems() {
    var sp = this.state.selp; if (!sp) return [];
    var q = norm(sp.q).trim(), res = [];
    var match = function (txt) { return !q || norm(txt).indexOf(q) >= 0; };
    if (sp.tab === 'node') {
      SEL_GROUPS.forEach(function (g) {
        var items = g[1].filter(function (k) {
          if (sp.mode === 'inner' && (k === 'output' || k === 'loop')) return false;
          var t = TYPES[k]; return match(t.name + ' ' + GL[g[0]] + ' ' + t.desc + ' ' + (t.kw || ''));
        }).map(function (k) { return { g: GL[g[0]], type: k, name: TYPES[k].name, desc: TYPES[k].desc, icon: TYPES[k].icon, tile: GC[g[0]] }; });
        res = res.concat(items);
      });
    } else {
      TOOLS.forEach(function (t) { if (match(t.name + ' ' + t.desc + ' tool')) res.push({ g: 'Tool đã kết nối', type: 'tool', preset: { tool: t.name }, name: t.name, desc: t.desc, icon: ICON.tool, tile: GC.integ, tag: 'Đã kết nối' }); });
      FLOWS.forEach(function (f) { if (match(f.name + ' quy trinh con')) res.push({ g: 'Quy trình đã publish', type: 'subflow', preset: { flow: f.name + ' · ' + f.ver }, name: f.name, desc: 'Gọi như một bước, nhận lại kết quả', icon: ICON.flow, tile: GC.integ, tag: f.ver }); });
    }
    if (sp.tab === 'node' && sp.from) {
      var st = this.state, anc = {}, stack = [sp.from.id];
      anc[sp.from.id] = 1;
      while (stack.length) { var cur = stack.pop(); st.edges.forEach(function (e) { if (e.to === cur && !anc[e.from]) { anc[e.from] = 1; stack.push(e.from); } }); }
      st.nodes.forEach(function (n) {
        if (anc[n.id] || isStart(n) || n.type === 'note') return;
        if (!match(n.title + ' noi co san')) return;
        var nIn = st.edges.filter(function (e) { return e.to === n.id; }).length;
        res.push({ g: 'Nối tới bước có sẵn', connect: n.id, name: n.title, desc: nIn ? 'Đã có ' + nIn + ' nhánh đi vào' : 'Chưa có dây nào đi vào', icon: TYPES[n.type].icon, tile: tileOf(n.type) });
      });
    }
    return res;
  }
  pickItem(it) {
    var sp = this.state.selp; if (!sp) return;
    if (sp.mode === 'inner') {
      var s = this.state, self = this;
      this.setState(Object.assign(this.snap(), { nodes: s.nodes.map(function (n) { return n.id === sp.loopId ? Object.assign({}, n, { cfg: Object.assign({}, n.cfg, { inner: n.cfg.inner.concat([it.name]) }) }) : n; }), selp: null, sel: sp.loopId, tab: 'cfg' }));
      return;
    }
    if (it.connect) {
      var s2 = this.state;
      var edges = s2.edges.filter(function (e) { return !(e.from === sp.from.id && e.out === sp.from.out); }).concat([{ from: sp.from.id, out: sp.from.out, to: it.connect }]);
      this.setState(Object.assign(this.snap(), { edges: edges, selp: null }));
      return;
    }
    if (sp.edge) this.insertOnEdge(it.type, sp.edge, it.preset, it.name);
    else this.addNode(it.type, sp.from || null, it.preset, it.name);
  }
  makeNode(type, preset, title) {
    this.seq += 1;
    var n = { id: 'n' + this.seq, type: type, title: title && type !== 'tool' && type !== 'subflow' ? title : (preset && preset.tool ? preset.tool.split(' · ')[1] : (preset && preset.flow ? preset.flow.split(' · ')[0] : TYPES[type].name)), desc: '', x: 0, y: 0, cfg: Object.assign(defaultCfg(type), preset || {}) };
    if (type === 'tool' && preset) n.cfg.acc = 'space';
    return n;
  }
  addNode(type, from, preset, title) {
    var s = this.state;
    var node = this.makeNode(type, preset, title);
    var src = from ? s.nodes.filter(function (n) { return n.id === from.id; })[0] : null;
    var x, y;
    if (src) { x = src.x + NW + 80; y = src.y + outY(src, from.out) - HEAD / 2; }
    else { var cs = this.canvasSize(); x = Math.round(((cs.w / 2 - s.px) / s.z - NW / 2) / 20) * 20; y = Math.round(((cs.h / 2 - s.py) / s.z - 60) / 20) * 20; }
    var h = nodeH(node), g = 0;
    while (s.nodes.some(function (o) { return Math.abs(o.x - x) < NW + 20 && y < o.y + nodeH(o) + 24 && o.y < y + h + 24; }) && g < 40) { y += 24; g++; }
    node.x = x; node.y = y;
    var edges = s.edges.slice();
    if (src && type !== 'note') edges.push({ from: src.id, out: from.out, to: node.id });
    this.setState(Object.assign(this.snap(), { nodes: s.nodes.concat([node]), edges: edges, sel: node.id, tab: 'cfg', selp: null, ff: null, runOpen: false, aiBanner: false }));
  }
  insertOnEdge(type, e, preset, title) {
    var s = this.state;
    var a = s.nodes.filter(function (n) { return n.id === e.from; })[0], b = s.nodes.filter(function (n) { return n.id === e.to; })[0];
    var node = this.makeNode(type, preset, title);
    node.x = b.x; node.y = a.y + outY(a, e.out) - HEAD / 2;
    var shift = reachable(b.id, s.edges), dx = NW + 80;
    var nodes = s.nodes.map(function (n) { return shift[n.id] ? Object.assign({}, n, { x: n.x + dx }) : n; });
    var edges = s.edges.filter(function (x) { return !(x.from === e.from && x.out === e.out && x.to === e.to); });
    edges.push({ from: e.from, out: e.out, to: node.id }); edges.push({ from: node.id, out: 0, to: e.to });
    this.setState(Object.assign(this.snap(), { nodes: nodes.concat([node]), edges: edges, sel: node.id, tab: 'cfg', selp: null, ff: null, runOpen: false }));
  }
  chooseStart(type) {
    var s = this.state, self = this;
    var cfg = defaultCfg(type);
    var nodes = s.nodes.map(function (n) { return n.type === 'start_pending' ? Object.assign({}, n, { type: type, title: TYPES[type].name, cfg: cfg }) : n; });
    var st = nodes.filter(isStart)[0];
    this.setState(Object.assign(this.snap(), { nodes: nodes, sel: st.id, tab: 'cfg' }));
    setTimeout(function () { var n = self.state.nodes.filter(isStart)[0]; self.openSel('port', { from: { id: n.id, out: 0 }, wx: n.x + NW, wy: n.y + HEAD / 2 }); }, 30);
  }
  updateSel(patch) {
    var id = this.state.sel;
    this.setState({ nodes: this.state.nodes.map(function (n) { return n.id === id ? Object.assign({}, n, patch) : n; }) });
  }
  updateCfg(patch) {
    var id = this.state.sel;
    this.setState({ nodes: this.state.nodes.map(function (n) { return n.id === id ? Object.assign({}, n, { cfg: Object.assign({}, n.cfg, patch) }) : n; }) });
  }
  // xoá phần tử thứ i của danh sách tạo cổng: xoá dây cổng i, dịch các cổng sau lên
  dropPort(id, i) {
    return this.state.edges.filter(function (e) { return !(e.from === id && e.out === i); }).map(function (e) { return e.from === id && e.out > i ? Object.assign({}, e, { out: e.out - 1 }) : e; });
  }
  // thêm một cổng ở vị trí i (trước cổng cuối cố định): dịch cổng >= i xuống
  addPort(id, i) {
    return this.state.edges.map(function (e) { return e.from === id && e.out >= i ? Object.assign({}, e, { out: e.out + 1 }) : e; });
  }
  allIssues() {
    var s = this.state, list = [];
    s.nodes.forEach(function (n) { issuesOf(n, s).forEach(function (m) { list.push({ id: n.id, title: n.title, type: n.type, msg: m }); }); });
    if (!s.nodes.some(function (n) { return n.type === 'output'; }) && !s.nodes.some(function (n) { return n.type === 'start_pending'; })) list.push({ id: null, title: 'Quy trình', type: 'output', msg: 'Chưa có bước Kết thúc để trả dữ liệu cho bên gọi' });
    return list;
  }

  // ---------- Chạy thử ----------
  openRun() {
    var s = this.state;
    var st = s.nodes.filter(isStart)[0];
    var inputs = {};
    if (st && st.cfg.fields) st.cfg.fields.forEach(function (f) { inputs[f.k] = sampleOf(f); });
    this.setState({ runOpen: true, sel: null, selp: null, checkOpen: false, pubOpen: false, run: s.run && s.run.status !== 'idle' ? s.run : { status: 'idle', tab: 'input', inputs: inputs, log: [], ran: [], redges: [] } });
  }
  startRun() {
    var s = this.state, self = this;
    var st = s.nodes.filter(isStart)[0];
    if (!st || st.type === 'start_pending') { this.showToast('Chọn cách bắt đầu trước khi chạy thử.', 'bad'); return; }
    var inputs = s.run.inputs;
    this.setState({ run: { status: 'running', tab: 'trace', inputs: inputs, log: [], ran: [], redges: [], cur: st.id, vars: Object.assign({}, inputs) }, aiBanner: false });
    clearTimeout(this.timer);
    this.timer = setTimeout(function () { self.step(); }, 500);
  }
  finish(ok, text, output) {
    this.setState(function (st) { return { run: Object.assign({}, st.run, { status: 'done', tab: 'result', cur: null, ok: ok, text: text, output: output || '' }) }; });
  }
  evalCase(cs, vars) {
    var res = cs.rows.map(function (r) {
      var a = vars[r.v], b = String(r.val || '').replace(/\{\{[^}]*\}\}/g, function () { return a; });
      if (a === undefined) return false;
      var na = parseFloat(a), nb = parseFloat(b);
      switch (r.op) {
        case 'Bằng': return String(a) === b;
        case 'Khác': return String(a) !== b;
        case 'Lớn hơn': return na > nb;
        case 'Nhỏ hơn': return na < nb;
        case 'Chứa': return String(a).indexOf(b) >= 0;
        case 'Rỗng': return !a;
      }
      return false;
    });
    return cs.logic === 'VÀ' ? res.every(Boolean) : res.some(Boolean);
  }
  step(forceOut) {
    var self = this, s = this.state, r = s.run;
    if (!r || (r.status !== 'running' && r.status !== 'paused')) return;
    var n = s.nodes.filter(function (x) { return x.id === r.cur; })[0];
    if (!n) return;
    var c = n.cfg, vars = Object.assign({}, r.vars), note = '', out = 0, st = 'Thành công', stop = null;
    var seed = parseInt(n.id.slice(1), 10) || 1, ms = msOf(n.type, seed);
    var issues = issuesOf(n, s).filter(function (m) { return m !== 'Bước này chưa được nối vào luồng' && m.indexOf('chưa có mô tả') < 0; });
    if (forceOut !== undefined) {
      out = forceOut; note = forceOut === c.actions.length ? 'Không ai xử lý trước hạn, đi nhánh Quá hạn' : 'Bạn bấm "' + c.actions[forceOut] + '" thay người duyệt';
      vars.hanh_dong = c.actions[forceOut] || 'Quá hạn'; vars.nguoi_duyet = 'Bạn (chạy thử)'; ms = 8010;
    } else if (n.type === 'approval') {
      if (issues.length) { stop = issues[0]; }
      else {
        this.setState({ run: Object.assign({}, r, { status: 'paused', tab: 'result', waitId: n.id }) });
        return;
      }
    } else if (isStart(n)) {
      var miss = (c.fields || []).filter(function (f) { return f.req && !String(r.inputs[f.k] || '').trim(); });
      if (miss.length) stop = 'Thiếu giá trị bắt buộc: ' + miss.map(function (f) { return f.k; }).join(', ');
      else note = (c.fields && c.fields.length ? 'Nhận ' + c.fields.length + ' trường dữ liệu' : (n.type === 'start_schedule' ? 'Giả lập lượt chạy theo lịch' : 'Không có dữ liệu đầu vào'));
    } else if (issues.length && TYPES[n.type].err && c.err !== 'stop') {
      st = c.retry ? 'Lỗi sau 3 lần thử' : 'Lỗi'; ms += c.retry ? 3000 : 0;
      if (c.err === 'branch') { out = outsOf(n).length - 1; note = issues[0] + '. Đi nhánh Lỗi.'; }
      else { note = issues[0] + '. Dùng giá trị mặc định và chạy tiếp.'; }
    } else if (issues.length) {
      stop = issues[0] + (TYPES[n.type].err && c.retry ? ' (đã thử lại 3 lần)' : '');
    } else {
      switch (n.type) {
        case 'condition':
          out = c.cases.length;
          for (var i = 0; i < c.cases.length; i++) if (self.evalCase(c.cases[i], vars)) { out = i; break; }
          note = out < c.cases.length ? 'Đúng: ' + caseText(c.cases[out]) : 'Không nhánh nào đúng, đi CÒN LẠI';
          break;
        case 'classify': out = 0; vars.nhan = c.labels[0]; note = 'AI gán nhãn "' + c.labels[0] + '" (độ tin cậy 0,91)'; break;
        case 'loop': note = 'Lặp 3 phần tử, mỗi phần tử chạy ' + c.inner.length + ' bước'; break;
        case 'llm': c.outVars.forEach(function (v) { vars[v] = vars[v] !== undefined ? vars[v] : mockOf(v); }); note = 'Trả về ' + c.outVars.join(', ') + ' · 812 token'; break;
        case 'readdoc': outputsOf(n).forEach(function (v) { vars[v] = vars[v] !== undefined ? vars[v] : mockOf(v); }); note = 'Đọc ' + docOf(c).label + ' từ ' + c.file + ', độ tin cậy 0,96'; break;
        case 'knowledge': vars.ket_qua = '3 đoạn từ ' + c.kb; note = 'Tìm thấy 3 đoạn liên quan trong ' + c.kb; break;
        case 'agent': vars.tra_loi = mockOf('tra_loi'); note = c.agent + ' đã trả lời'; break;
        case 'http': vars.status = 200; note = c.method + ' ' + c.url + ' → 200'; break;
        case 'tool': note = c.tool + ' chạy thành công'; outputsOf(n).forEach(function (v) { vars[v] = mockOf(v); }); break;
        case 'merge': vars[c.target] = vars[c.vars.split(/,\s*/)[0]] || 'Duyệt'; note = c.target + ' = ' + vars[c.target]; break;
        case 'assign': vars[c.name] = c.value; note = c.name + ' = "' + c.value + '"'; break;
        case 'template': vars.van_ban = c.tpl; note = 'Ghép xong mẫu văn bản'; break;
        case 'code': c.outVars.forEach(function (v) { vars[v] = 7500000; }); note = 'Chạy xong ' + c.lang; break;
        case 'subflow': note = c.flow + ' trả kết quả'; break;
        default: note = 'Xong';
      }
    }
    var log = r.log.concat([{ id: n.id, title: n.title, type: n.type, st: stop ? 'Lỗi' : st, note: stop || note, ms: ms }]);
    var last = Object.assign({}, s.last); last[n.id] = { st: stop ? 'Lỗi' : st, ms: ms, note: stop || note, out: JSON.stringify(outputsOf(n).reduce(function (o, k) { o[k] = vars[k] !== undefined ? vars[k] : null; return o; }, {}), null, 2) };
    var ran = r.ran.concat([n.id]);
    if (stop) {
      this.setState({ last: last, run: Object.assign({}, r, { log: log, ran: ran, failId: n.id, vars: vars }) });
      this.finish(false, 'Dừng ở bước "' + n.title + '": ' + stop + '.');
      return;
    }
    if (n.type === 'output') {
      var o = {}; c.outVars.forEach(function (k) { o[k] = vars[k] !== undefined ? vars[k] : mockOf(k); });
      this.setState({ last: last, run: Object.assign({}, r, { log: log, ran: ran, vars: vars }) });
      this.finish(true, 'Chạy xong qua ' + ran.length + ' bước, kết thúc ở "' + n.title + '".', JSON.stringify(o, null, 2));
      return;
    }
    var e = s.edges.filter(function (x) { return x.from === n.id && x.out === out; })[0];
    if (!e) {
      this.setState({ last: last, run: Object.assign({}, r, { log: log, ran: ran, vars: vars }) });
      var lbl = outsOf(n)[out];
      this.finish(false, 'Nhánh ' + (lbl ? '"' + lbl + '" ' : '') + 'của bước "' + n.title + '" chưa nối tới bước nào, Quy trình dừng ở đây mà chưa trả dữ liệu.');
      return;
    }
    this.setState({ last: last, run: Object.assign({}, r, { status: 'running', waitId: null, log: log, ran: ran, redges: r.redges.concat([n.id + ':' + out]), cur: e.to, vars: vars }) });
    clearTimeout(this.timer);
    this.timer = setTimeout(function () { self.step(); }, 650);
  }
  runOne() {
    var s = this.state, n = s.nodes.filter(function (x) { return x.id === s.sel; })[0];
    if (!n) return;
    var issues = issuesOf(n, s).filter(function (m) { return m !== 'Bước này chưa được nối vào luồng' && m.indexOf('chưa có mô tả') < 0; });
    var last = Object.assign({}, s.last), seed = parseInt(n.id.slice(1), 10) || 1;
    var out = outputsOf(n).reduce(function (o, k) { o[k] = mockOf(k); return o; }, {});
    last[n.id] = issues.length ? { st: 'Lỗi', ms: msOf(n.type, seed), note: issues[0] + '.', out: '{}' } : { st: 'Thành công', ms: msOf(n.type, seed), note: 'Chạy riêng bước này với dữ liệu mẫu từ các bước trước.' + (n.type === 'approval' ? ' Giả lập người duyệt bấm "' + n.cfg.actions[0] + '".' : ''), out: JSON.stringify(out, null, 2) };
    this.setState({ last: last, tab: 'last' });
  }

  renderVals() {
    var s = this.state, self = this;
    // ---------- list screen ----------
    var KB = { chat: ['Năng suất', '#f1f5f9', '#334155'], process: ['Quy trình', '#eef1fd', '#203BDC'] };
    var ST = { live: ['Đang hoạt động', '#bbf7d0', '#f0fdf4', '#15803d'], draft: ['Bản nháp', '#e5e5e5', '#fafafa', '#475569'] };
    var allCards = [
      { k: 'chat', st: 'live', name: 'Trợ lý nội bộ công chức', ver: 'v1.0.0', updated: 'Cập nhật 6 ngày trước', desc: 'Tra cứu số liệu phường, văn bản và trả lời kiến nghị cử tri.', meta: 'DeepSeek V4 Flash', icon: ICON.bot },
      { k: 'chat', st: 'live', name: 'Hỗ trợ thủ tục hành chính', ver: 'v1.2.0', updated: 'Cập nhật 2 ngày trước', desc: 'Hướng dẫn hồ sơ, lệ phí và thời hạn giải quyết thủ tục.', meta: 'DeepSeek V4 Flash', icon: ICON.bot },
      { k: 'process', st: 'draft', name: 'Đối chiếu hoá đơn với PO', ver: 'v0.1.0', updated: 'Cập nhật 1 giờ trước', desc: 'Nhận hoá đơn qua webhook, so khớp với PO trên ERP, lệch thì chuyển kế toán xem lại.', meta: '9 bước · Webhook', icon: ICON.flow, tpl: 'invoice' },
      { k: 'chat', st: 'live', name: 'Tư vấn khoản vay', ver: 'v0.3.0', updated: 'Cập nhật 3 ngày trước', desc: 'Tư vấn sản phẩm vay, hỏi nhu cầu và thu nhập của khách.', meta: 'DeepSeek V4 Flash', icon: ICON.bot }
    ];
    var tabs = [{ id: 'all', label: 'Tất cả' }, { id: 'live', label: 'Đã xuất bản' }, { id: 'draft', label: 'Bản nháp' }, { id: 'shared', label: 'Được chia sẻ' }];
    var kindFilters = tabs.map(function (t) {
      var n = allCards.filter(function (c) { return t.id === 'all' || c.st === t.id; }).length;
      return { label: t.label, count: n, cls: 'pill' + (s.kind === t.id ? ' pill-on' : ''), pick: function () { self.setState({ kind: t.id }); } };
    });
    var cards = allCards.filter(function (c) { return s.kind === 'all' || s.kind === c.st; }).map(function (c) {
      var isP = c.k === 'process';
      return { name: c.name, ver: c.ver, updated: c.updated, desc: c.desc, meta: c.meta, icon: c.icon,
        avBg: isP ? '#eef1fd' : '#f1f5f9', avFg: isP ? '#203BDC' : '#334155',
        kind: KB[c.k][0], kindBg: KB[c.k][1], kindFg: KB[c.k][2],
        status: ST[c.st][0], stBorder: ST[c.st][1], stBg: ST[c.st][2], stFg: ST[c.st][3],
        open: function () { if (c.tpl) self.openBuilder(c.tpl, c.name, false); else self.showToast('Nhân sự số Năng suất mở như bản hiện tại. Prototype này chỉ dựng phần Quy trình.'); } };
    });
    var isChat = s.ckind === 'chat';
    var kindTabs = [{ id: 'chat', label: 'Năng suất', icon: ICON.spark }, { id: 'process', label: 'Quy trình', icon: ICON.flow }].map(function (k) {
      var on = s.ckind === k.id;
      return { label: k.label, icon: k.icon, on: on, cls: 'seg' + (on ? ' seg-on' : ''), pick: function () { self.setState({ ckind: k.id, prompt: '', draftName: '' }); } };
    });
    var suggestions = (isChat ? [
      { label: 'Hỗ trợ khách hàng', text: 'Trợ lý hỗ trợ khách hàng ngân hàng, trả lời thắc mắc về thẻ tín dụng, giọng trang trọng, tiếng Việt.' },
      { label: 'Tra cứu nội bộ', text: 'Trợ lý tra cứu quy định nhân sự và hướng dẫn IT cho nhân viên.' },
      { label: 'Tư vấn bán hàng', text: 'Trợ lý tư vấn gói dịch vụ, hỏi nhu cầu và chấm điểm khách tiềm năng.' }
    ] : SUGGEST).map(function (g) { return { label: g.label, pick: function () { self.setState({ prompt: g.text, draftName: g.name || '' }); } }; });
    var promptOk = s.prompt.trim().length >= 20;

    // ---------- builder ----------
    var run = s.run, locked = this.locked();
    var byId = {}; s.nodes.forEach(function (n) { byId[n.id] = n; });
    var issues = this.allIssues();
    var issueBy = {}; issues.forEach(function (i) { if (i.id) (issueBy[i.id] = issueBy[i.id] || []).push(i.msg); });
    var selNode = byId[s.sel] || null;
    var showRun = s.runOpen && !!run;

    var viewNodes = s.nodes.map(function (n) {
      var t = TYPES[n.type], h = nodeH(n);
      var isSel = s.sel === n.id && !showRun;
      var ran = run && run.ran.indexOf(n.id) >= 0, cur = run && run.cur === n.id && run.status === 'running', wait = run && run.status === 'paused' && run.waitId === n.id, fail = run && run.failId === n.id;
      var need = !!issueBy[n.id] && n.type !== 'start_pending';
      var ring = '';
      if (isSel || cur) ring = '#203BDC';
      if (ran && !fail) ring = '#16a34a';
      if (wait) ring = '#ea580c';
      if (fail) ring = '#dc2626';
      var rows = rowsOf(n).map(function (r) {
        var isPort = r.port !== null;
        return { label: r.label, chips: r.chips, text: r.text, hasText: !!r.text, textColor: r.color || '#334155', bg: r.bg || (isPort ? '#f8fafc' : 'transparent'),
          labelColor: isPort ? (r.color === '#c2410c' ? '#c2410c' : '#0e7490') : '#64748b', labelOrder: isPort ? 2 : 0, labelMl: isPort ? 'auto' : '0' };
      });
      var outs = outsOf(n).map(function (lbl, i) {
        var linked = s.edges.some(function (e) { return e.from === n.id && e.out === i; });
        var oy = outY(n, i), isErr = lbl === 'Lỗi' || lbl === 'Quá hạn';
        return { free: !linked, linked: linked, top: oy - 12, dotTop: oy - 4.5, dot: isErr ? '#ea580c' : '#0f172a', cls: 'plus' + (isErr ? ' plus-err' : ''),
          aria: 'Thêm bước sau ' + n.title + (lbl ? ' - nhánh ' + lbl : ''),
          plus: function (e) { e.stopPropagation(); self.setState({ sel: n.id, tab: 'cfg', runOpen: false }); self.openSel('port', { from: { id: n.id, out: i }, wx: n.x + NW, wy: n.y + oy }); } };
      });
      var badge = '', bfg = '', bbg = '';
      if (need) { badge = 'Cần cấu hình'; bfg = '#b45309'; bbg = '#fffbeb'; }
      if (ran) { badge = '✓ ' + (s.last[n.id] ? s.last[n.id].ms.toLocaleString('vi-VN') + ' ms' : 'Đã chạy'); bfg = '#15803d'; bbg = '#f0fdf4'; }
      if (wait) { badge = 'Đang chờ duyệt'; bfg = '#c2410c'; bbg = '#fff7ed'; }
      if (fail) { badge = 'Lỗi'; bfg = '#b91c1c'; bbg = '#fef2f2'; }
      var isPending = n.type === 'start_pending';
      return {
        x: n.x, y: n.y, h: h, title: n.title, icon: t.icon, tile: tileOf(n.type),
        isStartPending: isPending, isCard: !isPending, isNote: n.type === 'note', noteText: (n.cfg && n.cfg.text) || '', rows: rows,
        isLoop: n.type === 'loop', inner: n.type === 'loop' ? n.cfg.inner : [],
        addInner: function (e) { e.stopPropagation(); self.setState({ sel: n.id }); self.openSel('inner', { loopId: n.id, wx: n.x + 20, wy: n.y + h }); },
        bg: n.type === 'note' ? '#fefce8' : '#fff',
        border: isPending ? '1.5px dashed ' + (isSel ? '#203BDC' : '#94a3b8') : '1px solid ' + (ring || (n.type === 'note' ? '#fde68a' : 'rgba(6,7,9,.15)')),
        shadow: ring && !isPending ? ('0 0 0 1px ' + ring + (isSel ? ', 0 0 0 5px rgba(32,59,220,.12)' : '')) : '0 2px 6px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.02)',
        cls: cur ? 'running' : (wait ? 'waiting' : ''),
        badge: !!badge, badgeText: badge, badgeFg: bfg, badgeBg: bbg,
        hasIn: !isStart(n) && n.type !== 'note', outs: outs,
        down: function (e) { self.startDrag(e, n.id); },
        select: function () { self.setState({ sel: n.id, tab: 'cfg', ff: null, runOpen: false, selp: null }); }
      };
    });

    // dây nối
    var d = '', dh = '', ed = '', eh = '', rd = '', rh = '', edgePlus = [];
    s.edges.forEach(function (e) {
      var a = byId[e.from], b = byId[e.to];
      if (!a || !b) return;
      var x1 = a.x + NW + 5, y1 = a.y + outY(a, e.out), x2 = b.x - 5, y2 = b.y + HEAD / 2, pts;
      if (Math.abs(y1 - y2) < 1 && x2 > x1) pts = [[x1, y1], [x2 - 7, y2]];
      else if (x2 - x1 >= 40) { var mx = Math.min(x1 + Math.max(20, Math.min(40, (x2 - x1) / 2)) + e.out * 10, x2 - 16); pts = [[x1, y1], [mx, y1], [mx, y2], [x2 - 7, y2]]; }
      else { var lane = Math.max(a.y + nodeH(a), b.y + nodeH(b)) + 28 + e.out * 12; pts = [[x1, y1], [x1 + 20 + e.out * 12, y1], [x1 + 20 + e.out * 12, lane], [x2 - 36, lane], [x2 - 36, y2], [x2 - 7, y2]]; }
      var seg = roundPath(pts, 8) + ' ', head = 'M' + (x2 - 8) + ' ' + (y2 - 4) + ' L' + x2 + ' ' + y2 + ' L' + (x2 - 8) + ' ' + (y2 + 4) + ' Z ';
      var lbl = outsOf(a)[e.out];
      if (run && run.redges.indexOf(e.from + ':' + e.out) >= 0) { rd += seg; rh += head; }
      else if (lbl === 'Lỗi' || lbl === 'Quá hạn') { ed += seg; eh += head; }
      else { d += seg; dh += head; }
      if (!locked) {
        var p = pts.length === 2 ? [(x1 + x2) / 2, y1] : (pts.length === 4 ? [pts[1][0], (y1 + y2) / 2] : [(pts[3][0] + pts[2][0]) / 2, pts[2][1]]);
        if (pts.length === 4 && Math.abs(y1 - y2) < 24) p = [(pts[2][0] + x2) / 2, y2];
        edgePlus.push({ x: p[0] - 9, y: p[1] - 9, aria: 'Chèn bước giữa ' + a.title + ' và ' + b.title, pick: function (ev) { ev.stopPropagation(); self.openSel('edge', { edge: e, wx: p[0], wy: p[1] }); } });
      }
    });

    // bảng chọn bước
    var sp = s.selp, selGroups = [], flat = [];
    if (sp) {
      flat = this.selItems();
      var gi = -1, last = null;
      flat.forEach(function (it, i) {
        if (it.g !== last) { selGroups.push({ label: it.g, hasLabel: true, items: [] }); last = it.g; gi++; }
        var on = i === sp.idx;
        selGroups[gi].items.push({ name: it.name, desc: it.desc, icon: it.icon, tile: it.tile, tag: it.tag || '', hasTag: !!it.tag, cls: 'item' + (on ? ' item-on' : ''),
          pick: function () { self.pickItem(it); }, hover: function () { if (self.state.selp && self.state.selp.idx !== i) self.setState({ selp: Object.assign({}, self.state.selp, { idx: i }) }); } });
      });
    }
    var selFrom = '';
    if (sp && sp.from && byId[sp.from.id]) { var fl = outsOf(byId[sp.from.id])[sp.from.out]; selFrom = 'Sau "' + byId[sp.from.id].title + '"' + (fl ? ' · nhánh ' + fl : ''); }
    if (sp && sp.edge && byId[sp.edge.from]) selFrom = 'Chèn giữa "' + byId[sp.edge.from].title + '" và "' + byId[sp.edge.to].title + '"';
    if (sp && sp.mode === 'inner') selFrom = 'Thêm bước bên trong vòng lặp';
    if (sp && (sp.mode === 'toolbar' || sp.mode === 'cmd')) selFrom = 'Bước mới chưa nối với bước nào. Để nối, mở bước phía trước rồi chọn Bước tiếp theo.';

    // panel
    var pmPick = !showRun && !!selNode && selNode.type === 'start_pending';
    var pmNode = !showRun && !!selNode && !pmPick;
    var pmProcess = !showRun && !selNode;
    var sel = { title: '', desc: '', icon: '', tile: '#203BDC' };
    var pf = [], fields = [], cases = [], listItems = [], outVars = [], nextRows = [], varOpts = [{ v: '', l: 'Chọn biến' }];
    var listTitle = '', listAdd = '', listNote = '', outTitle = 'ĐẦU RA', outEditable = false;
    if (selNode && pmNode) {
      var n = selNode, c = n.cfg, t = TYPES[n.type];
      var up = upstreamOf(n.id, s); varOpts = varOpts.concat(up);
      var ups = [{ v: '', l: 'Chọn biến' }].concat(up);
      var firstVar = up.length ? up[0].v : 'bien';
      var opt = function (arr) { return arr.map(function (x) { return typeof x === 'string' ? { v: x, l: x || 'Chưa chọn' } : x; }); };
      var P = function (key, label, kind, extra) {
        var e = extra || {};
        return Object.assign({ id: 'f-' + key, label: label, isInput: kind === 'input', isSelect: kind === 'select', isText: kind === 'text', value: c[key], ph: '', options: [], ro: false, font: 'inherit', canVar: false, hint: '', hasHint: !!e.hint,
          onChange: function (ev) { var p = {}; p[key] = ev.target.value; self.updateCfg(p); },
          insertVar: function () { var p = {}; p[key] = (self.state.nodes.filter(function (x) { return x.id === n.id; })[0].cfg[key] || '') + '{{' + firstVar + '}}'; self.updateCfg(p); } }, e);
      };
      var MODELS = opt(['DeepSeek V4 Flash', 'GPT-OSS 120B', 'Qwen3 32B']);
      var help = '';
      switch (n.type) {
        case 'start_form': help = 'Quy trình chạy khi người dùng điền form, một Nhân sự số gọi tới, hoặc một Quy trình khác gọi như Quy trình con.'; break;
        case 'start_webhook':
          help = 'Hệ thống bên ngoài gửi JSON tới địa chỉ này. Khai báo các trường cần dùng ở bên dưới.';
          pf.push(P('url', 'Địa chỉ webhook', 'input', { value: 'https://eos.fpt.ai/hooks/qt-8f21', ro: true, hint: 'Gửi bằng POST, kèm API key của Space trong header.' }));
          break;
        case 'start_schedule':
          pf.push(P('freq', 'Tần suất', 'select', { options: [{ v: 'day', l: 'Hằng ngày' }, { v: 'week', l: 'Thứ Hai hằng tuần' }, { v: 'month', l: 'Ngày 1 hằng tháng' }] }));
          pf.push(P('time', 'Giờ chạy', 'input', { hint: 'Giờ Việt Nam (GMT+7).' }));
          break;
        case 'llm':
          pf.push(P('model', 'Model', 'select', { options: MODELS }));
          pf.push(P('system', 'Vai trò (không bắt buộc)', 'text', { ph: 'VD: Bạn là chuyên viên kế toán, trả lời ngắn gọn.' }));
          pf.push(P('prompt', 'Yêu cầu', 'text', { ph: 'VD: Đọc {{chung_tu}} và lấy nhà cung cấp, số tiền.', canVar: true, hint: 'Bấm {x} để chèn biến từ các bước phía trước.' }));
          outTitle = 'ĐẦU RA CÓ CẤU TRÚC'; outEditable = true;
          break;
        case 'readdoc':
          var files = up.filter(function (o) { var src = s.nodes.filter(function (x) { return isStart(x) && x.cfg.fields; })[0]; return src && src.cfg.fields.some(function (f) { return f.k === o.v && f.t === 'Tệp'; }); });
          pf.push(P('file', 'Tệp cần đọc', 'select', { options: [{ v: '', l: files.length ? 'Chọn biến kiểu Tệp' : 'Chưa có trường Tệp ở bước Bắt đầu' }].concat(files), hint: 'Chọn trường kiểu Tệp mà người dùng tải lên ở bước Bắt đầu.' }));
          pf.push(P('doc', 'Loại giấy tờ', 'select', { options: DOCTYPES.map(function (d) { return { v: d.id, l: d.label }; }), hint: docOf(c).hint }));
          outEditable = c.doc === 'custom';
          help = 'Không cần viết prompt. Chọn loại giấy tờ, hệ thống tự trả ra các trường có tên sẵn cho các bước sau dùng.';
          break;
        case 'knowledge':
          pf.push(P('kb', 'Kho tri thức', 'select', { options: opt([''].concat(KBS)) }));
          pf.push(P('query', 'Câu hỏi lấy từ biến', 'select', { options: ups }));
          pf.push(P('topK', 'Số đoạn lấy về', 'select', { options: opt(['3', '5', '10']) }));
          break;
        case 'classify':
          pf.push(P('input', 'Dữ liệu cần phân loại', 'select', { options: ups }));
          pf.push(P('model', 'Model', 'select', { options: MODELS }));
          listTitle = 'NHÃN PHÂN LOẠI'; listAdd = '+ Thêm nhãn'; listNote = 'Mỗi nhãn một cổng ra. AI không chắc chắn thì đi cổng Khác.';
          break;
        case 'agent':
          help = 'Dùng khi một bước cần phán đoán. Quy trình chờ Nhân sự số trả lời rồi mới chạy tiếp.';
          pf.push(P('agent', 'Nhân sự số nhận việc', 'select', { options: opt([''].concat(AGENTS)), hint: 'Chỉ hiện Nhân sự số Năng suất đã publish trong Space.' }));
          pf.push(P('task', 'Việc giao', 'text', { ph: 'VD: Tư vấn sản phẩm vay phù hợp cho khách.', canVar: true }));
          break;
        case 'condition': help = 'Xét từ trên xuống. Mỗi lần chạy chỉ đi đúng một nhánh.'; break;
        case 'loop':
          pf.push(P('list', 'Danh sách cần lặp', 'select', { options: ups }));
          pf.push(P('mode', 'Cách chạy', 'select', { options: [{ v: 'seq', l: 'Lần lượt từng phần tử' }, { v: 'par', l: 'Song song, tối đa 5 phần tử' }], hint: 'Các bước bên trong đọc phần tử hiện tại qua biến phan_tu.' }));
          break;
        case 'merge':
          help = 'Dùng sau khi các nhánh nhập lại. Chỉ nhánh đã chạy có giá trị, nên bước sau không cần biết đã đi nhánh nào.';
          pf.push(P('vars', 'Các biến cần gộp', 'input', { ph: 'VD: ma_po, thu_tu_choi' }));
          pf.push(P('target', 'Tên biến sau khi gộp', 'input', { font: 'ui-monospace, monospace' }));
          break;
        case 'approval':
          help = 'Quy trình tạm dừng tới khi có người bấm nút. Khi chạy thử, bạn tự bấm thay người duyệt.';
          pf.push(P('approver', 'Người duyệt', 'select', { options: opt(['', 'Trưởng phòng của người đề nghị', 'Giám đốc khối của người đề nghị', 'Nhóm Kế toán công nợ', 'Nhóm Thẩm định bán lẻ', 'Theo biến cap_duyet']) }));
          pf.push(P('via', 'Gửi qua', 'select', { options: [{ v: 'both', l: 'Omni Inbox và Email' }, { v: 'inbox', l: 'Chỉ Omni Inbox' }, { v: 'email', l: 'Chỉ Email' }], hint: 'Teams, Zalo sẽ có sau.' }));
          pf.push(P('content', 'Nội dung người duyệt thấy', 'text', { ph: 'VD: {{nguoi_de_nghi}} đề nghị mua hàng, số tiền {{so_tien}}.', canVar: true }));
          pf.push(P('timeout', 'Hết hạn sau', 'select', { options: [{ v: '1', l: '1 ngày' }, { v: '3', l: '3 ngày' }, { v: '7', l: '7 ngày' }] }));
          listTitle = 'NÚT HÀNH ĐỘNG'; listAdd = '+ Thêm nút'; listNote = 'Mỗi nút một cổng ra. Hết hạn mà chưa ai bấm thì đi cổng Quá hạn.';
          break;
        case 'code':
          help = 'Chỉ thành viên có vai trò Developer trong Space mới sửa được bước này.';
          pf.push(P('lang', 'Ngôn ngữ', 'select', { options: opt(['Python 3', 'JavaScript']) }));
          pf.push(P('code', 'Code', 'text', { font: 'ui-monospace, SFMono-Regular, Menlo, monospace' }));
          outEditable = true;
          break;
        case 'template':
          pf.push(P('tpl', 'Mẫu', 'text', { ph: 'VD: Chào {{nguoi_de_nghi}}, đề nghị của bạn đã được duyệt.', canVar: true }));
          break;
        case 'assign':
          pf.push(P('name', 'Biến cần gán', 'select', { options: [{ v: '', l: 'Chọn biến' }, { v: 'trang_thai', l: 'trang_thai · biến mới' }].concat(up) }));
          pf.push(P('value', 'Giá trị mới', 'input', { ph: 'VD: Đã duyệt' }));
          break;
        case 'http':
          pf.push(P('method', 'Phương thức', 'select', { options: opt(['GET', 'POST', 'PUT', 'PATCH']) }));
          pf.push(P('url', 'URL', 'input', { ph: 'https://erp.noibo.vn/api/...', hint: 'Dán cả lệnh cURL vào đây cũng được, hệ thống tự tách URL, header và body.' }));
          pf.push(P('auth', 'Xác thực', 'select', { options: [{ v: 'none', l: 'Không' }, { v: 'key', l: 'API key lưu trong Space' }, { v: 'bearer', l: 'Bearer token lưu trong Space' }] }));
          pf.push(P('body', 'Body (JSON)', 'text', { ph: '{ "ma_po": "{{ma_po}}" }', font: 'ui-monospace, SFMono-Regular, Menlo, monospace', canVar: true }));
          break;
        case 'tool':
          pf.push(P('tool', 'Tool', 'select', { options: opt([''].concat(TOOLS.map(function (x) { return x.name; }))) }));
          pf.push(P('acc', 'Chạy bằng tài khoản', 'select', { options: [{ v: '', l: 'Chưa chọn' }, { v: 'space', l: 'Tài khoản chung của Space' }, { v: 'user', l: 'Tài khoản của người chạy' }] }));
          pf.push(P('params', 'Truyền vào', 'input', { ph: 'VD: {{nha_cung_cap}}, {{so_tien}}' }));
          break;
        case 'subflow':
          pf.push(P('flow', 'Quy trình con', 'select', { options: opt([''].concat(FLOWS.map(function (f) { return f.name + ' · ' + f.ver; }))), hint: 'Chỉ chọn được Quy trình đã publish. Bản nháp không gọi được.' }));
          break;
        case 'output':
          help = 'Bước cuối của một nhánh. Bên gọi Quy trình nhận lại các biến khai báo ở đây.';
          outTitle = 'BIẾN TRẢ VỀ'; outEditable = true;
          break;
        case 'note':
          pf.push(P('text', 'Nội dung ghi chú', 'text', {}));
          break;
      }
      pf.forEach(function (f) { f.hasHint = !!f.hint; });
      // trường đầu vào
      if (n.type === 'start_form' || n.type === 'start_webhook') {
        fields = c.fields.map(function (f, i) {
          return { k: f.k, t: f.t, req: !!f.req, sub: f.label + ' · ' + (f.desc || 'Chưa có mô tả'), aria: 'Xoá trường ' + f.k, editAria: 'Sửa trường ' + f.k,
            edit: function () { self.setState({ ff: Object.assign({ idx: i, keyEdited: true, touched: true, desc: '' }, f) }); },
            remove: function () { self.updateCfg({ fields: c.fields.filter(function (_, j) { return j !== i; }) }); } };
        });
      }
      if (n.type === 'condition') {
        cases = c.cases.map(function (cs, ci) {
          var setCase = function (ncs) { var arr = c.cases.slice(); arr[ci] = ncs; self.updateCfg({ cases: arr }); };
          return { head: ci === 0 ? 'NẾU' : 'NẾU KHÔNG THÌ NẾU', multi: cs.rows.length > 1, logic: cs.logic, canRemove: c.cases.length > 1,
            toggleLogic: function () { setCase(Object.assign({}, cs, { logic: cs.logic === 'VÀ' ? 'HOẶC' : 'VÀ' })); },
            remove: function () { var ne = self.dropPort(n.id, ci); self.setState({ edges: ne }); self.updateCfg({ cases: c.cases.filter(function (_, j) { return j !== ci; }) }); },
            addRow: function () { setCase(Object.assign({}, cs, { rows: cs.rows.concat([{ v: '', op: 'Bằng', val: '' }]) })); },
            rows: cs.rows.map(function (r, ri) {
              var setRow = function (p) { var rows = cs.rows.slice(); rows[ri] = Object.assign({}, r, p); setCase(Object.assign({}, cs, { rows: rows })); };
              return { v: r.v, op: r.op, val: r.val,
                onV: function (e) { setRow({ v: e.target.value }); }, onOp: function (e) { setRow({ op: e.target.value }); }, onVal: function (e) { setRow({ val: e.target.value }); },
                remove: function () { setCase(Object.assign({}, cs, { rows: cs.rows.filter(function (_, j) { return j !== ri; }) })); } };
            }) };
        });
      }
      if (n.type === 'classify' || n.type === 'approval') {
        var key = n.type === 'classify' ? 'labels' : 'actions';
        listItems = c[key].map(function (v, i) {
          return { value: v, aria: (n.type === 'classify' ? 'Nhãn ' : 'Nút ') + (i + 1), lock: c[key].length <= 1,
            onChange: function (e) { var a = c[key].slice(); a[i] = e.target.value; var p = {}; p[key] = a; self.updateCfg(p); },
            remove: function () { var ne = self.dropPort(n.id, i); self.setState({ edges: ne }); var p = {}; p[key] = c[key].filter(function (_, j) { return j !== i; }); self.updateCfg(p); } };
        });
      }
      var fixedOut = (n.type === 'readdoc' && c.doc !== 'custom') || ['knowledge', 'classify', 'agent', 'loop', 'approval', 'template', 'http', 'tool', 'subflow'].indexOf(n.type) >= 0;
      if (outEditable || fixedOut) {
        var ov = outEditable ? c.outVars : outputsOf(n);
        outVars = ov.map(function (k, i) { return { k: k, canRemove: outEditable, aria: 'Xoá biến ' + k, remove: function () { self.updateCfg({ outVars: c.outVars.filter(function (_, j) { return j !== i; }) }); } }; });
      }
      // bước tiếp theo
      var oo = outsOf(n);
      nextRows = oo.map(function (lbl, i) {
        var e = s.edges.filter(function (x) { return x.from === n.id && x.out === i; })[0];
        var to = e ? byId[e.to] : null;
        return { hasLabel: !!lbl, label: lbl, labelColor: lbl === 'Lỗi' || lbl === 'Quá hạn' ? '#c2410c' : '#0e7490', linked: !!to, free: !to,
          title: to ? to.title : '', tile: to ? tileOf(to.type) : '#fff', icon: to ? TYPES[to.type].icon : '',
          go: function () { if (to) self.setState({ sel: to.id, tab: 'cfg', ff: null }); },
          add: function () { self.openSel('next', { from: { id: n.id, out: i } }); } };
      });
      var nIss = issueBy[n.id] || [];
      sel = { title: n.title, desc: n.desc, icon: t.icon, tile: tileOf(n.type), help: help, hasHelp: !!help,
        hasIssue: nIss.length > 0, issueText: nIss.join(' · '),
        isForm: n.type === 'start_form' || n.type === 'start_webhook', isCond: n.type === 'condition', hasList: n.type === 'classify' || n.type === 'approval',
        hasOutVars: outEditable || fixedOut, isOutput: n.type === 'output', hasErr: !!t.err, isAi: !!t.ai,
        hasNext: oo.length > 0, canDelete: !isStart(n), canRunStep: !isStart(n) && n.type !== 'note' && n.type !== 'output' };
    }
    var ff = s.ff || { k: '', label: '', t: 'Văn bản', desc: '', req: true };
    var curFields = selNode && selNode.cfg && selNode.cfg.fields ? selNode.cfg.fields : [];
    var ffKeyErr = !ff.k ? 'Cần có tên biến' : (!/^[a-z][a-z0-9_]*$/.test(ff.k) ? 'Chỉ dùng chữ thường không dấu, số và dấu _' : (curFields.some(function (f, i) { return f.k === ff.k && i !== ff.idx; }) ? 'Tên biến đã có' : ''));
    var errNode = selNode && TYPES[selNode.type] && TYPES[selNode.type].err ? selNode.cfg : { retry: false, err: 'stop' };
    var last = selNode ? s.last[selNode.id] : null;

    // chạy thử
    var runInputs = [], runLog = [], waitNode = null;
    if (run) {
      var stn = s.nodes.filter(isStart)[0];
      runInputs = (stn && stn.cfg.fields ? stn.cfg.fields : []).map(function (f) {
        return { k: f.k, label: f.label + (f.req ? ' *' : ''), value: run.inputs[f.k] || '', onChange: function (e) { var inp = Object.assign({}, self.state.run.inputs); inp[f.k] = e.target.value; self.setState({ run: Object.assign({}, self.state.run, { inputs: inp }) }); } };
      });
      runLog = run.log.map(function (l) { return { title: l.title, note: l.note, st: l.st + ' · ' + l.ms.toLocaleString('vi-VN') + ' ms', stColor: l.st === 'Thành công' ? '#15803d' : '#b91c1c', tile: tileOf(l.type), icon: TYPES[l.type].icon }; });
      if (run.status === 'running' && byId[run.cur]) runLog.push({ title: byId[run.cur].title, note: 'Đang chạy...', st: '', stColor: '#64748b', tile: tileOf(byId[run.cur].type), icon: TYPES[byId[run.cur].type].icon });
      if (run.status === 'paused') { waitNode = byId[run.waitId]; if (waitNode) runLog.push({ title: waitNode.title, note: 'Đang chờ người duyệt', st: 'Tạm dừng', stColor: '#c2410c', tile: tileOf('approval'), icon: ICON.approve }); }
    }
    var RST = { idle: ['Chưa chạy', '#64748b'], running: ['Đang chạy', '#203BDC'], paused: ['Tạm dừng', '#c2410c'], done: [run && run.ok ? 'Thành công' : 'Dừng', run && run.ok ? '#15803d' : '#b91c1c'] };
    var rs = run ? RST[run.status] : RST.idle;
    var waitActions = [];
    if (waitNode) {
      waitActions = waitNode.cfg.actions.map(function (a, i) { return { label: a, cls: i === 0 ? 'btn btn-primary' : 'btn', pick: function () { self.step(i); } }; });
      waitActions.push({ label: 'Giả lập quá hạn', cls: 'btn', pick: function () { self.step(waitNode.cfg.actions.length); } });
    }
    var waitBody = waitNode ? (waitNode.cfg.content || 'Không có nội dung.').replace(/\{\{([^}]*)\}\}/g, function (m, k) { var v = run.vars ? run.vars[k.trim()] : undefined; return v !== undefined ? v : m; }) : '';

    var statusMap = { draft: ['Bản nháp', '#fafafa', '#475569'], pending: ['Chờ duyệt publish', '#fffbeb', '#b45309'] };
    var outNode = s.nodes.filter(function (n) { return n.type === 'output'; })[0];
    var toastBg = s.toast ? (s.toast.tone === 'bad' ? '#b91c1c' : (s.toast.tone === 'good' ? '#15803d' : '#0f172a')) : '#0f172a';
    var g = s.guard;
    var guardList = function (arr) { return arr.map(function (x) { return { label: x[1], on: !!g[x[0]], toggle: function () { var ng = Object.assign({}, self.state.guard); ng[x[0]] = !ng[x[0]]; self.setState({ guard: ng }); } }; }); };

    return {
      isList: s.screen === 'list', isBuilder: s.screen === 'builder',
      kindFilters: kindFilters, cards: cards,
      kindTabs: kindTabs, isChatKind: isChat, suggestions: suggestions, prompt: s.prompt, drafting: s.drafting,
      kindHint: isChat ? 'Dựng bằng prompt, hỗ trợ việc hằng ngày' : 'Làm đúng theo quy trình, từng bước cố định',
      promptPh: isChat ? 'Trợ lý hỗ trợ khách hàng ngân hàng, trả lời thắc mắc về thẻ tín dụng, giọng trang trọng, tiếng Việt.' : 'VD: Nhận hoá đơn, đọc số tiền, so với PO trên ERP, lệch thì chuyển kế toán xem lại.',
      promptHelp: isChat ? 'Mô tả càng cụ thể, bản nháp càng sát - Tối thiểu 20 ký tự.' : 'Nêu các bước, ai duyệt, dùng hệ thống nào - Tối thiểu 20 ký tự.',
      draftDisabled: !promptOk, blankLabel: 'Tự dựng từ đầu',
      onPrompt: function (e) { self.setState({ prompt: e.target.value }); },
      createDraft: function () {
        if (isChat) { self.showToast('Luồng Năng suất giữ nguyên như hiện tại. Prototype này chỉ dựng phần Quy trình.'); return; }
        var key = pickKey(s.prompt);
        var nm = s.draftName || SUGGEST.filter(function (x) { return x.key === key; })[0].name;
        self.setState({ drafting: true, createOpen: false });
        setTimeout(function () { self.openBuilder(key, nm, true); }, 1400);
      },
      createBlank: function () {
        self.setState({ createOpen: false });
        if (isChat) { self.showToast('Luồng Năng suất giữ nguyên như hiện tại. Prototype này chỉ dựng phần Quy trình.'); return; }
        self.openBuilder(null, 'Quy trình chưa đặt tên', false);
      },
      useTemplate: function () { self.showToast('Mẫu Năng suất giữ nguyên như hiện tại.'); },
      createOpen: s.createOpen,
      openCreate: function () { self.setState({ createOpen: true, prompt: '', draftName: '' }); },
      closeCreate: function () { self.setState({ createOpen: false }); },

      aiBanner: s.aiBanner && s.screen === 'builder' && !showRun, draftSteps: s.nodes.filter(function (n) { return n.type !== 'note'; }).length,
      dismissBanner: function () { self.setState({ aiBanner: false }); },
      backToList: function () { clearTimeout(self.timer); self.setState({ screen: 'list', run: null, runOpen: false }); },
      name: s.name,
      statusLabel: statusMap[s.status][0], statusBg: statusMap[s.status][1], statusFg: statusMap[s.status][2],

      issues: issues.map(function (it) { return { title: it.title, msg: it.msg, tile: tileOf(it.type), icon: TYPES[it.type].icon, canGo: !!it.id,
        go: function () { self.setState({ sel: it.id, tab: 'cfg', checkOpen: false, runOpen: false, ff: null }); } }; }),
      issueCount: issues.length, hasIssues: issues.length > 0, noIssues: !issues.length, issueColor: issues.length ? '#b45309' : '#020817',
      checkOpen: s.checkOpen, checkAria: 'Danh sách cần sửa, ' + issues.length + ' mục',
      toggleCheck: function () { self.setState({ checkOpen: !s.checkOpen, pubOpen: false, selp: null }); },
      pubOpen: s.pubOpen, togglePub: function () { self.setState({ pubOpen: !s.pubOpen, checkOpen: false, selp: null }); },
      pubState: s.status === 'pending' ? 'v1 đang chờ Admin duyệt' : 'Chưa publish lần nào · Đã tự lưu',
      publishDisabled: issues.length > 0 || s.status === 'pending',
      publishLabel: s.status === 'pending' ? 'Đã gửi duyệt' : 'Publish v1',
      publish: function () { self.setState({ status: 'pending', pubOpen: false }); self.showToast('Đã gửi yêu cầu publish v1. Admin duyệt xong thì Quy trình mới chạy thật.', 'good'); },
      toolHint: outNode ? (outNode.cfg.asTool ? 'Đang bật ở bước Kết thúc. Publish xong, Nhân sự số thêm được Quy trình này vào mục Tool.' : 'Đang tắt. Bật ở bước Kết thúc để Nhân sự số gọi được.') : 'Cần có bước Kết thúc trước.',
      toolHintColor: outNode && outNode.cfg.asTool ? '#15803d' : '#64748b',
      versionHint: s.status === 'pending' ? 'v1 · chờ duyệt · khôi phục được bất kỳ lúc nào' : 'Chưa có phiên bản. Mỗi lần publish tạo một bản khôi phục được.',
      openRun: function () { self.openRun(); },

      canvasRef: this.canvasRef,
      canvasCursor: s.drag ? 'grabbing' : 'default',
      worldTransform: 'translate(' + s.px + 'px, ' + s.py + 'px) scale(' + s.z + ')',
      onBgDown: function (e) {
        if (e.target.closest && e.target.closest('[data-node],[data-ui]')) return;
        self.setState({ drag: { pan: true, sx: e.clientX, sy: e.clientY, ox: s.px, oy: s.py }, sel: null, selp: null, checkOpen: false, pubOpen: false, ff: null });
      },
      onMove: function (e) { self.onMove(e); },
      onUp: function () {
        var dr = self.state.drag; if (!dr) return;
        var moved = !dr.pan && self.state.nodes.some(function (n) { return n.id === dr.id && (n.x !== dr.ox || n.y !== dr.oy); });
        self.setState(moved ? { drag: null, hist: self.state.dragPre } : { drag: null });
      },
      edgesD: d, edgesH: dh, errD: ed, errH: eh, ranD: rd, ranH: rh, edgePlus: edgePlus, viewNodes: viewNodes,
      openSelToolbar: function () { self.openSel('toolbar'); },
      openSelCmd: function () { self.openSel('cmd'); },
      addNote: function () { self.addNode('note', null); },
      undo: function () { self.undo(); }, canUndo: s.hist.length > 0, canUndoNot: !s.hist.length,
      autoLayout: function () { var f = layoutFlow({ nodes: clone(self.state.nodes), edges: self.state.edges }); self.setState(Object.assign(self.snap(), { nodes: f.nodes })); setTimeout(function () { self.fit(); }, 20); },
      fit: function () { self.fit(); },
      zoomPct: Math.round(s.z * 100),
      zoomIn: function () { self.setState({ z: Math.min(1.5, Math.round((s.z + 0.1) * 10) / 10) }); },
      zoomOut: function () { self.setState({ z: Math.max(0.4, Math.round((s.z - 0.1) * 10) / 10) }); },
      runLocked: locked, runBar: run && run.status === 'paused' ? 'Đang chờ người duyệt - bấm nút trong bảng Chạy thử' : 'Đang chạy thử - canvas tạm khoá',

      selOpen: !!sp, selX: sp ? sp.x : 0, selY: sp ? sp.y : 0, selQ: sp ? sp.q : '', selHasFrom: !!selFrom, selFrom: selFrom,
      selBackdrop: 'transparent', selGroups: selGroups, selEmpty: !!sp && !flat.length,
      selPh: sp && sp.tab === 'tool' ? 'Tìm tool hoặc Quy trình đã publish' : 'Tìm bước, VD: duyệt, http, lặp',
      selTabs: [{ id: 'node', label: 'Bước' }, { id: 'tool', label: 'Tool & tích hợp' }].filter(function (x) { return !(sp && sp.mode === 'inner' && x.id === 'tool'); }).map(function (x) {
        var on = sp && sp.tab === x.id;
        return { label: x.label, on: !!on, bg: on ? '#eef1fd' : 'transparent', fg: on ? '#203BDC' : '#475569', pick: function () { self.setState({ selp: Object.assign({}, self.state.selp, { tab: x.id, idx: 0 }) }); } };
      }),
      closeSel: function () { self.setState({ selp: null }); },
      onSelQ: function (e) { self.setState({ selp: Object.assign({}, self.state.selp, { q: e.target.value, idx: 0 }) }); },
      onSelKey: function (e) {
        var cur = self.state.selp; if (!cur) return;
        var items = self.selItems();
        if (e.key === 'ArrowDown') { e.preventDefault(); self.setState({ selp: Object.assign({}, cur, { idx: Math.min(items.length - 1, cur.idx + 1) }) }); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); self.setState({ selp: Object.assign({}, cur, { idx: Math.max(0, cur.idx - 1) }) }); }
        else if (e.key === 'Enter') { e.preventDefault(); if (items[cur.idx]) self.pickItem(items[cur.idx]); }
        else if (e.key === 'Escape') { e.preventDefault(); self.setState({ selp: null }); }
      },

      pmPick: pmPick, pmRun: showRun, pmNode: pmNode, pmProcess: pmProcess,
      startOpts: [['start_form', 'Phổ biến nhất', 'Người dùng điền form, hoặc một Nhân sự số gọi Quy trình như một tool.'], ['start_schedule', '', 'Tự chạy theo giờ, ví dụ 8:00 sáng thứ Hai hằng tuần.'], ['start_webhook', '', 'Hệ thống bên ngoài như ERP, CRM gửi dữ liệu tới một địa chỉ riêng.']].map(function (o) {
        return { name: TYPES[o[0]].name, common: !!o[1], desc: o[2], icon: TYPES[o[0]].icon, pick: function () { self.chooseStart(o[0]); } };
      }),

      sel: sel, pf: pf, fields: fields, cases: cases, varOpts: varOpts, opOpts: ['Bằng', 'Khác', 'Lớn hơn', 'Nhỏ hơn', 'Chứa', 'Rỗng'],
      listItems: listItems, listTitle: listTitle, listAdd: listAdd, listNote: listNote,
      addListItem: function () {
        var n = byId[s.sel]; if (!n) return;
        var key = n.type === 'classify' ? 'labels' : 'actions', arr = n.cfg[key];
        self.setState({ edges: self.addPort(n.id, arr.length) });
        var p = {}; p[key] = arr.concat([n.type === 'classify' ? 'Nhãn ' + (arr.length + 1) : 'Nút ' + (arr.length + 1)]); self.updateCfg(p);
      },
      addCase: function () { var n = byId[s.sel]; self.setState({ edges: self.addPort(n.id, n.cfg.cases.length) }); self.updateCfg({ cases: n.cfg.cases.concat([{ logic: 'VÀ', rows: [{ v: '', op: 'Bằng', val: '' }] }]) }); },
      outVars: outVars, outTitle: outTitle, outEditable: outEditable, newVar: s.newVar,
      onNewVar: function (e) { self.setState({ newVar: e.target.value }); },
      onNewVarKey: function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        var v = norm(self.state.newVar).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        var n = byId[self.state.sel];
        if (!v || !n || n.cfg.outVars.indexOf(v) >= 0) { self.setState({ newVar: '' }); return; }
        self.updateCfg({ outVars: n.cfg.outVars.concat([v]) }); self.setState({ newVar: '' });
      },
      asTool: !!(selNode && selNode.cfg && selNode.cfg.asTool), toggleAsTool: function () { self.updateCfg({ asTool: !byId[s.sel].cfg.asTool }); },
      errRetry: !!errNode.retry, errMode: errNode.err,
      toggleRetry: function () { self.updateCfg({ retry: !byId[s.sel].cfg.retry }); },
      onErrMode: function (e) {
        var n = byId[s.sel], v = e.target.value, edges = self.state.edges;
        if (n.cfg.err === 'branch' && v !== 'branch') edges = edges.filter(function (x) { return !(x.from === n.id && x.out === 1); });
        self.setState({ edges: edges }); self.updateCfg({ err: v });
      },
      nextRows: nextRows,
      nodeTabs: [{ id: 'cfg', label: 'CẤU HÌNH' }, { id: 'last', label: 'LẦN CHẠY GẦN NHẤT' }].map(function (x) { var on = s.tab === x.id; return { label: x.label, on: on, line: on ? '#203BDC' : 'transparent', fg: on ? '#203BDC' : '#64748b', pick: function () { self.setState({ tab: x.id }); } }; }),
      tabCfg: s.tab === 'cfg', tabLast: s.tab === 'last', lastNone: !last, lastHas: !!last,
      last: last ? { st: last.st, ms: last.ms.toLocaleString('vi-VN') + ' ms', note: last.note, out: last.out, stColor: last.st === 'Thành công' ? '#15803d' : '#b91c1c' } : { st: '', ms: '', note: '', out: '', stColor: '#000' },
      runStep: function () { self.runOne(); },
      onTitle: function (e) { self.updateSel({ title: e.target.value }); },
      onDesc: function (e) { self.updateSel({ desc: e.target.value }); },
      deselect: function () { self.setState({ sel: null, ff: null }); },
      deleteSel: function () {
        var id = self.state.sel;
        self.setState(Object.assign(self.snap(), { nodes: self.state.nodes.filter(function (n) { return n.id !== id; }), edges: self.state.edges.filter(function (e) { return e.from !== id && e.to !== id; }), sel: null, ff: null }));
        self.showToast('Đã xoá bước. Bấm Hoàn tác trên thanh công cụ nếu xoá nhầm.');
      },

      ffOpen: !!s.ff, ff: ff, canAddField: !s.ff,
      addField: function () { self.setState({ ff: { idx: -1, k: '', label: '', t: 'Văn bản', desc: '', req: true, touched: false } }); },
      fieldTypes: ['Văn bản', 'Số', 'Ngày', 'Có / Không', 'Tệp', 'Danh sách'],
      ffInvalid: !!ffKeyErr || !ff.label.trim(), ffSave: s.ff && s.ff.idx >= 0 ? 'Lưu' : 'Thêm trường',
      ffKeyHint: ffKeyErr && s.ff && (s.ff.k || s.ff.touched) ? ffKeyErr : 'Các bước sau gọi trường này bằng tên biến. Tự tạo từ tên hiển thị, sửa được.',
      ffKeyColor: ffKeyErr && s.ff && (s.ff.k || s.ff.touched) ? '#b91c1c' : '#64748b',
      onFfLabel: function (e) {
        var v = e.target.value, cur = self.state.ff;
        var auto = norm(v).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[0-9_]+/, '');
        self.setState({ ff: Object.assign({}, cur, { label: v, k: cur.keyEdited ? cur.k : auto }) });
      },
      onFfKey: function (e) { self.setState({ ff: Object.assign({}, self.state.ff, { k: e.target.value, keyEdited: true, touched: true }) }); },
      onFfType: function (e) { self.setState({ ff: Object.assign({}, self.state.ff, { t: e.target.value }) }); },
      onFfDesc: function (e) { self.setState({ ff: Object.assign({}, self.state.ff, { desc: e.target.value }) }); },
      onFfReq: function () { self.setState({ ff: Object.assign({}, self.state.ff, { req: !self.state.ff.req }) }); },
      cancelField: function () { self.setState({ ff: null }); },
      saveField: function () {
        var cur = self.state.ff, n = byId[self.state.sel];
        var item = { k: cur.k, label: cur.label.trim(), t: cur.t, req: cur.req, desc: (cur.desc || '').trim() };
        var arr = n.cfg.fields.slice();
        if (cur.idx >= 0) arr[cur.idx] = item; else arr.push(item);
        self.updateCfg({ fields: arr }); self.setState({ ff: null });
      },

      aiCount: s.nodes.filter(function (n) { return TYPES[n.type].ai; }).length,
      actCount: s.nodes.filter(function (n) { return TYPES[n.type].act; }).length,
      guards: guardList([['safety', 'Chặn nội dung độc hại, xúc phạm'], ['pii', 'Che CCCD, số tài khoản, số điện thoại trong kết quả'], ['scope', 'Chặn yêu cầu ngoài phạm vi Quy trình']]),
      actGuards: guardList([['noDelete', 'Chặn thao tác xoá dữ liệu trên hệ thống khác'], ['maskOut', 'Che thông tin cá nhân trước khi gửi ra ngoài'], ['rate', 'Giới hạn 100 lần gọi mỗi giờ']]),
      stepCount: s.nodes.filter(function (n) { return n.type !== 'note'; }).length,

      runTabs: (run && run.status !== 'idle' ? [{ id: 'input', label: 'Dữ liệu vào' }, { id: 'result', label: 'Kết quả' }, { id: 'trace', label: 'Từng bước' }] : [{ id: 'input', label: 'Dữ liệu vào' }]).map(function (x) {
        var on = run && run.tab === x.id; return { label: x.label, on: !!on, bg: on ? '#eef1fd' : 'transparent', fg: on ? '#203BDC' : '#475569', pick: function () { self.setState({ run: Object.assign({}, self.state.run, { tab: x.id }) }); } };
      }),
      runShowInput: !!run && run.tab === 'input', runShowResult: !!run && run.tab === 'result', runShowTrace: !!run && run.tab === 'trace',
      runStatusText: rs[0], runStatusColor: rs[1],
      runInputs: runInputs, noRunInputs: !runInputs.length, runLog: runLog,
      startRun: function () { self.startRun(); },
      rerun: function () { self.setState({ run: Object.assign({}, self.state.run, { status: 'idle', tab: 'input', log: [], ran: [], redges: [], failId: null, cur: null }) }); },
      closeRun: function () { clearTimeout(self.timer); var r = self.state.run; self.setState({ runOpen: false, run: r && (r.status === 'running' || r.status === 'paused') ? null : r }); },
      runPaused: !!run && run.status === 'paused', runRunning: !!run && run.status === 'running', runDone: !!run && run.status === 'done',
      waitTitle: waitNode ? 'Đang chờ: ' + waitNode.title : '', waitBody: waitBody, waitActions: waitActions, waitExpire: waitNode ? waitNode.cfg.timeout + ' ngày' : '',
      runResText: run && run.text ? run.text : '', runResBorder: run && run.ok ? '#bbf7d0' : '#fecaca', runResBg: run && run.ok ? '#f0fdf4' : '#fef2f2',
      runHasOutput: !!(run && run.output), runOutput: run && run.output ? run.output : '',

      toast: !!s.toast, toastText: s.toast ? s.toast.text : '', toastBg: toastBg
    };
  }

  startDrag(e, id) {
    if (e.target.closest && e.target.closest('[data-plus],[data-ui]')) return;
    e.stopPropagation();
    if (this.locked()) return;
    var n = this.state.nodes.filter(function (x) { return x.id === id; })[0];
    this.setState({ dragPre: this.snap().hist, sel: id, ff: id === this.state.sel ? this.state.ff : null, selp: null, runOpen: false, tab: id === this.state.sel ? this.state.tab : 'cfg', drag: { id: id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y } });
  }
  onMove(e) {
    var dr = this.state.drag;
    if (!dr) return;
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
    var { actCount, actGuards, addCase, addField, addListItem, addNote, aiBanner, aiCount, asTool, autoLayout, backToList, canAddField, canUndoNot, cancelField, canvasCursor, canvasRef, cases, checkAria, checkOpen, closeRun, closeSel, deleteSel, deselect, dismissBanner, draftSteps, edgePlus, edgesD, edgesH, errD, errH, errMode, errRetry, ff, ffInvalid, ffKeyColor, ffKeyHint, ffOpen, ffSave, fieldTypes, fields, fit, guards, hasIssues, issueColor, issueCount, issues, last, lastHas, lastNone, listAdd, listItems, listNote, listTitle, name, newVar, nextRows, noIssues, noRunInputs, nodeTabs, onBgDown, onDesc, onErrMode, onFfDesc, onFfKey, onFfLabel, onFfReq, onFfType, onMove, onNewVar, onNewVarKey, onSelKey, onSelQ, onTitle, onUp, opOpts, openRun, openSelCmd, openSelToolbar, outEditable, outTitle, outVars, pf, pmNode, pmPick, pmProcess, pmRun, pubOpen, pubState, publish, publishDisabled, publishLabel, ranD, ranH, rerun, runBar, runDone, runHasOutput, runInputs, runLocked, runLog, runOutput, runPaused, runResBg, runResBorder, runResText, runRunning, runShowInput, runShowResult, runShowTrace, runStatusColor, runStatusText, runStep, runTabs, saveField, sel, selBackdrop, selEmpty, selFrom, selGroups, selHasFrom, selOpen, selPh, selQ, selTabs, selX, selY, startOpts, startRun, statusBg, statusFg, statusLabel, stepCount, tabCfg, tabLast, toast, toastBg, toastText, toggleAsTool, toggleCheck, togglePub, toggleRetry, toolHint, toolHintColor, undo, varOpts, versionHint, viewNodes, waitActions, waitBody, waitExpire, waitTitle, worldTransform, zoomIn, zoomOut, zoomPct } = v;
    backToList = function () { clearTimeout(self.timer); self.props.onBack(); };
    return (
      <div className="qt-root" style={S('height: 100vh; min-height: 640px; display: flex; flex-direction: column; overflow: hidden; position: relative; background: #fff')}>
        <style>{CSS}</style>


<div style={S('height: 48px; flex-shrink: 0; border-bottom: 1px solid #e5e5e5; display: flex; align-items: center; padding: 0 12px; gap: 10px; position: relative; z-index: 30; background: #fff')}>
  <button type="button" className={Q('ghost')} aria-label="Quay lại danh sách nhân sự số" onClick={backToList} style={S('width: 32px; height: 32px; border-radius: 7px; display: flex; align-items: center; justify-content: center')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg></button>
  <span style={S('width: 26px; height: 26px; border-radius: 7px; background: #eef1fd; color: #203BDC; display: flex; align-items: center; justify-content: center')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5h6v5H3z M15 14h6v5h-6z M9 7.5h3a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2"></path></svg></span>
  <span style={S('font-size: 14px; font-weight: 600; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap')}>{name}</span>
  <span style={S(`font-size: 11.5px; border: 1px solid #e5e5e5; border-radius: 7px; padding: 2px 8px; color: ${statusFg}; background: ${statusBg}`)}>● {statusLabel}</span>
  <span style={S('font-size: 11px; font-weight: 600; background: #eef1fd; color: #203BDC; border-radius: 6px; padding: 3px 8px')}>Quy trình</span>
  <div style={S('flex: 1; display: flex; justify-content: center; gap: 4px')}>
    <span style={S('display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 8px; background: #eef1fd; color: #203BDC; font-size: 13px; font-weight: 500')}>Dựng nhân sự số</span>
    <span style={S('display: inline-flex; align-items: center; height: 32px; padding: 0 12px; font-size: 13px; color: #475569')}>Kiểm thử</span>
    <span style={S('display: inline-flex; align-items: center; height: 32px; padding: 0 12px; font-size: 13px; color: #475569')}>Kênh triển khai</span>
    <span style={S('display: inline-flex; align-items: center; height: 32px; padding: 0 12px; font-size: 13px; color: #475569')}>Phân tích</span>
  </div>
  <span style={S('font-size: 11.5px; color: #64748b')}>Đã tự lưu</span>

  <div style={S('position: relative')}>
    <button type="button" className={Q('btn')} aria-label={checkAria} aria-expanded={checkOpen} onClick={toggleCheck} style={S('width: 36px; padding: 0; justify-content: center; position: relative')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6h11 M9 12h11 M9 18h11 M4 6l1 1 2-2 M4 12l1 1 2-2 M4 18l1 1 2-2"></path></svg>
      {(hasIssues) && (<><span style={S('position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; border-radius: 999px; background: #ea580c; color: #fff; font-size: 10.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; padding: 0 4px')}>{issueCount}</span></>)}
    </button>
    {(checkOpen) && (<>
      <div role="dialog" aria-label="Danh sách cần sửa" style={S('position: absolute; right: 0; top: 44px; width: 340px; max-height: 420px; overflow-y: auto; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; box-shadow: 0 10px 15px rgba(0,0,0,.1); padding: 12px')}>
        <div style={S('font-size: 13.5px; font-weight: 600')}>Cần sửa trước khi publish ({issueCount})</div>
        {(noIssues) && (<><p style={S('font-size: 12.5px; color: #15803d; margin: 8px 0 0')}>Không còn lỗi nào. Quy trình sẵn sàng publish.</p></>)}
        {(issues || []).map((it, _iit) => (<React.Fragment key={_iit}>
          <div style={S('border: 1px solid #f1f5f9; background: #fafafa; border-radius: 8px; padding: 8px 10px; margin-top: 8px')}>
            <div style={S('display: flex; align-items: center; gap: 8px')}>
              <span style={S(`width: 20px; height: 20px; border-radius: 5px; background: ${it.tile}; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={it.icon}></path></svg></span>
              <span style={S('flex: 1; font-size: 12.5px; font-weight: 600')}>{it.title}</span>
              {(it.canGo) && (<><button type="button" className={Q('ghost')} onClick={it.go} style={S('height: 26px; padding: 0 8px; border-radius: 6px; font-size: 12px; color: #203BDC; font-weight: 500')}>Đi tới sửa</button></>)}
            </div>
            <div style={S('font-size: 12px; color: #b45309; margin-top: 4px; padding-left: 28px')}>{it.msg}</div>
          </div>
        </React.Fragment>))}
      </div>
    </>)}
  </div>

  <button type="button" className={Q('btn')} onClick={openRun}><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>Chạy thử</button>

  <div style={S('position: relative')}>
    <button type="button" className={Q('btn btn-primary')} aria-expanded={pubOpen} onClick={togglePub}>Publish<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg></button>
    {(pubOpen) && (<>
      <div role="dialog" aria-label="Publish" style={S('position: absolute; right: 0; top: 44px; width: 300px; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; box-shadow: 0 10px 15px rgba(0,0,0,.1); padding: 12px')}>
        <div style={S('font-size: 12px; color: #64748b')}>● {pubState}</div>
        <button type="button" className={Q('btn btn-primary')} onClick={publish} disabled={publishDisabled} style={S('width: 100%; justify-content: center; margin-top: 10px')}>{publishLabel}</button>
        {(hasIssues) && (<><p style={S('font-size: 11.5px; color: #b45309; margin: 6px 0 0')}>Còn {issueCount} mục trong danh sách cần sửa.</p></>)}
        <div style={S('border-top: 1px solid #f1f5f9; margin-top: 12px; padding-top: 10px; display: flex; flex-direction: column; gap: 8px; font-size: 12.5px')}>
          <div style={S('display: flex; gap: 8px; align-items: flex-start')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={S('flex-shrink: 0; margin-top: 1px')}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4z"></path></svg>
            <span><b style={S('font-weight: 500')}>Dùng làm tool cho Nhân sự số</b><span style={S(`display: block; color: ${toolHintColor}; font-size: 11.5px; margin-top: 2px`)}>{toolHint}</span></span>
          </div>
          <div style={S('display: flex; gap: 8px; align-items: flex-start')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={S('flex-shrink: 0; margin-top: 1px')}><path d="M12 21a9 9 0 1 0-9-9 M3 4v5h5 M12 7v5l3 2"></path></svg>
            <span><b style={S('font-weight: 500')}>Lịch sử phiên bản</b><span style={S('display: block; color: #64748b; font-size: 11.5px; margin-top: 2px')}>{versionHint}</span></span>
          </div>
        </div>
      </div>
    </>)}
  </div>
</div>

<div style={S('flex: 1; min-height: 0; display: flex')}>
  {/* CANVAS */}
  <div ref={canvasRef} onMouseDown={onBgDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} style={S(`flex: 1; min-width: 0; position: relative; overflow: hidden; background-color: #f8fafc; background-image: radial-gradient(#d4d4d8 1px, transparent 1px); background-size: 20px 20px; cursor: ${canvasCursor}`)}>

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
        <button type="button" data-ui="1" className={Q('eplus')} aria-label={p.aria} onClick={p.pick} style={S(`left: ${p.x}px; top: ${p.y}px`)}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14 M5 12h14"></path></svg>
        </button>
      </React.Fragment>))}

      {(viewNodes || []).map((n, _in) => (<React.Fragment key={_in}>
        <div data-node="1" onMouseDown={n.down} className={Q(n.cls)} style={S(`position: absolute; left: ${n.x}px; top: ${n.y}px; width: 280px; height: ${n.h}px; box-sizing: border-box; background: ${n.bg}; border: ${n.border}; border-radius: 10px; box-shadow: ${n.shadow}; cursor: grab; user-select: none`)}>
          <button type="button" className={Q('sr')} onClick={n.select}>Chọn bước {n.title}</button>
          {(n.isStartPending) && (<>
            <div style={S('padding: 10px 12px')}>
              <div style={S('font-size: 10.5px; font-weight: 600; letter-spacing: .06em; color: #64748b')}>BẮT ĐẦU</div>
              <div style={S('display: flex; align-items: center; gap: 10px; margin-top: 8px')}>
                <span style={S('width: 28px; height: 28px; border-radius: 8px; border: 1.5px dashed #94a3b8; display: flex; align-items: center; justify-content: center; color: #64748b')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14 M5 12h14"></path></svg></span>
                <span style={S('font-size: 13px; color: #475569; line-height: 1.4')}>Chọn cách bắt đầu ở bảng bên phải</span>
              </div>
            </div>
          </>)}
          {(n.isCard) && (<>
            <div style={S('height: 44px; display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px')}>
              <span style={S(`width: 24px; height: 24px; border-radius: 6px; background: ${n.tile}; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={n.icon}></path></svg>
              </span>
              <span style={S('flex: 1; min-width: 0; font-size: 13.5px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>{n.title}</span>
              {(n.badge) && (<><span style={S(`font-size: 10.5px; font-weight: 600; color: ${n.badgeFg}; background: ${n.badgeBg}; border-radius: 4px; padding: 2px 6px; white-space: nowrap`)}>{n.badgeText}</span></>)}
            </div>
            {(n.isNote) && (<>
              <div style={S('padding: 0 12px 10px; font-size: 12.5px; line-height: 1.5; color: #713f12')}>{n.noteText}</div>
            </>)}
            <div style={S('display: flex; flex-direction: column; gap: 4px; padding: 0 8px')}>
              {(n.rows || []).map((r, _ir) => (<React.Fragment key={_ir}>
                <div style={S(`height: 24px; display: flex; align-items: center; gap: 6px; padding: 0 6px; border-radius: 6px; background: ${r.bg}; overflow: hidden`)}>
                  <span style={S(`font-size: 10.5px; font-weight: 600; letter-spacing: .04em; color: ${r.labelColor}; white-space: nowrap; text-transform: uppercase; order: ${r.labelOrder}; margin-left: ${r.labelMl}`)}>{r.label}</span>
                  <span style={S('flex: 1; min-width: 0; display: flex; gap: 4px; overflow: hidden; white-space: nowrap; align-items: center; order: 1')}>
                    {(r.chips || []).map((c, _ic) => (<React.Fragment key={_ic}>
                      <span style={S('font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; color: #1d4ed8; background: #eff6ff; border-radius: 4px; padding: 0 5px; line-height: 17px')}>{c}</span>
                    </React.Fragment>))}
                    {(r.hasText) && (<><span style={S(`font-size: 11.5px; color: ${r.textColor}; overflow: hidden; text-overflow: ellipsis`)}>{r.text}</span></>)}
                  </span>
                </div>
              </React.Fragment>))}
            </div>
            {(n.isLoop) && (<>
              <div style={S('margin: 6px 8px 0; height: 84px; border: 1px dashed #a5b4fc; background: #f5f7ff; border-radius: 8px; display: flex; align-items: center; gap: 6px; padding: 0 10px; overflow: hidden')}>
                {(n.inner || []).map((c, _ic) => (<React.Fragment key={_ic}>
                  <span style={S('font-size: 11.5px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; white-space: nowrap')}>{c}</span>
                </React.Fragment>))}
                <button type="button" data-ui="1" onClick={n.addInner} style={S('height: 28px; padding: 0 10px; border-radius: 6px; border: 1px solid #c7d2fe; background: #fff; color: #203BDC; font-size: 12px; font-weight: 500; white-space: nowrap')}>+ Thêm bước vào vòng lặp</button>
              </div>
            </>)}
          </>)}
          {(n.hasIn) && (<>
            <span style={S('position: absolute; left: -5.5px; top: 17.5px; width: 9px; height: 9px; box-sizing: border-box; border-radius: 999px; background: #fff; border: 1.5px solid #0f172a')}></span>
          </>)}
          {(n.outs || []).map((o, _io) => (<React.Fragment key={_io}>
            {(o.free) && (<>
              <button type="button" data-plus="1" className={Q(o.cls)} aria-label={o.aria} onClick={o.plus} style={S(`position: absolute; right: -12px; top: ${o.top}px`)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14 M5 12h14"></path></svg>
              </button>
            </>)}
            {(o.linked) && (<>
              <span style={S(`position: absolute; right: -5.5px; top: ${o.dotTop}px; width: 9px; height: 9px; border-radius: 999px; background: ${o.dot}`)}></span>
            </>)}
          </React.Fragment>))}
        </div>
      </React.Fragment>))}
    </div>

    {/* toolbar dọc */}
    <div data-ui="1" style={S('position: absolute; left: 12px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 2px; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; padding: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.08)')}>
      <button type="button" className={Q('tbtn')} aria-label="Thêm bước" title="Thêm bước" onClick={openSelToolbar}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 8v8 M8 12h8"></path></svg></button>
      <button type="button" className={Q('tbtn')} aria-label="Tìm bước" title="Tìm bước" onClick={openSelCmd}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-4.3-4.3"></path></svg></button>
      <button type="button" className={Q('tbtn')} aria-label="Thêm ghi chú" title="Thêm ghi chú" onClick={addNote}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 3h10l4 4v14H5z M14 3v5h5"></path></svg></button>
      <button type="button" className={Q('tbtn')} aria-label="Hoàn tác" title="Hoàn tác" onClick={undo} disabled={canUndoNot}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3"></path></svg></button>
      <span style={S('height: 1px; background: #e5e5e5; margin: 2px 4px')}></span>
      <button type="button" className={Q('tbtn')} aria-label="Tự sắp xếp" title="Tự sắp xếp" onClick={autoLayout}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h6v6H3z M15 4h6v6h-6z M15 14h6v6h-6z M9 7h6 M12 7v10h3"></path></svg></button>
      <button type="button" className={Q('tbtn')} aria-label="Vừa khung" title="Vừa khung" onClick={fit}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5"></path></svg></button>
    </div>
    <div data-ui="1" style={S('position: absolute; right: 12px; bottom: 12px; display: flex; align-items: center; gap: 2px; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; padding: 3px; box-shadow: 0 1px 3px rgba(0,0,0,.08)')}>
      <button type="button" className={Q('ghost')} aria-label="Thu nhỏ" onClick={zoomOut} style={S('width: 30px; height: 30px; border-radius: 7px; font-size: 16px')}>−</button>
      <span style={S('font-size: 12px; width: 42px; text-align: center; color: #475569')}>{zoomPct}%</span>
      <button type="button" className={Q('ghost')} aria-label="Phóng to" onClick={zoomIn} style={S('width: 30px; height: 30px; border-radius: 7px; font-size: 16px')}>+</button>
    </div>

    {(aiBanner) && (<>
      <div data-ui="1" role="status" style={S('position: absolute; left: 50%; top: 14px; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; background: #f3f5fe; border: 1px solid #c7d2fe; border-radius: 10px; padding: 7px 8px 7px 12px; font-size: 12.5px; color: #1e3a8a; max-width: 600px; z-index: 5')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={S('flex-shrink: 0')}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg>
        <span>AI dựng {draftSteps} bước từ mô tả của bạn. Mở danh sách cần sửa để xem chỗ còn thiếu cấu hình.</span>
        <button type="button" className={Q('ghost')} onClick={dismissBanner} style={S('height: 28px; padding: 0 8px; border-radius: 6px; font-size: 12px; color: #1e3a8a; font-weight: 500')}>Đã hiểu</button>
      </div>
    </>)}

    {(runLocked) && (<>
      <div data-ui="1" style={S('position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); background: #0f172a; color: #fff; font-size: 12px; border-radius: 999px; padding: 6px 12px')}>{runBar}</div>
    </>)}

    {/* BẢNG CHỌN BƯỚC DÙNG CHUNG */}
    {(selOpen) && (<>
      <div data-ui="1" onMouseDown={closeSel} style={S(`position: absolute; inset: 0; z-index: 20; background: ${selBackdrop}`)}></div>
      <div data-ui="1" role="dialog" aria-label="Chọn bước" style={S(`position: absolute; left: ${selX}px; top: ${selY}px; width: 320px; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; box-shadow: 0 16px 40px rgba(15,23,42,.18); z-index: 21; overflow: hidden`)}>
        {(selHasFrom) && (<><div style={S('font-size: 11.5px; color: #64748b; padding: 10px 12px 0')}>{selFrom}</div></>)}
        <div role="tablist" style={S('display: flex; gap: 4px; padding: 8px 10px 0')}>
          {(selTabs || []).map((t, _it) => (<React.Fragment key={_it}>
            <button type="button" role="tab" aria-selected={t.on} onClick={t.pick} style={S(`height: 28px; padding: 0 10px; border-radius: 7px; border: 0; font-size: 12.5px; font-weight: 500; background: ${t.bg}; color: ${t.fg}`)}>{t.label}</button>
          </React.Fragment>))}
        </div>
        <div style={S('padding: 8px 10px; position: relative')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={S('position: absolute; left: 20px; top: 18px')}><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-4.3-4.3"></path></svg>
          <label className={Q('sr')} htmlFor="selq">Tìm bước</label>
          <input id="selq" className={Q('field')} style={S('padding-left: 30px')} placeholder={selPh} value={selQ} onChange={onSelQ} onKeyDown={onSelKey} autoFocus={true} />
        </div>
        <div style={S('max-height: 340px; overflow-y: auto; padding: 0 6px 8px')}>
          {(selGroups || []).map((g, _ig) => (<React.Fragment key={_ig}>
            {(g.hasLabel) && (<><div style={S('font-size: 10.5px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: #64748b; padding: 8px 8px 4px')}>{g.label}</div></>)}
            {(g.items || []).map((it, _iit) => (<React.Fragment key={_iit}>
              <button type="button" className={Q(it.cls)} onClick={it.pick} onMouseEnter={it.hover}>
                <span style={S(`width: 26px; height: 26px; border-radius: 7px; background: ${it.tile}; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={it.icon}></path></svg></span>
                <span style={S('flex: 1; min-width: 0')}><span style={S('display: block; font-size: 13px; font-weight: 500; color: #0f172a')}>{it.name}</span><span style={S('display: block; font-size: 11.5px; color: #64748b; margin-top: 1px')}>{it.desc}</span></span>
                {(it.hasTag) && (<><span style={S('font-size: 10.5px; color: #475569; background: #f1f5f9; border-radius: 4px; padding: 1px 6px; align-self: center; white-space: nowrap')}>{it.tag}</span></>)}
              </button>
            </React.Fragment>))}
          </React.Fragment>))}
          {(selEmpty) && (<><p style={S('font-size: 12.5px; color: #475569; padding: 10px 8px; margin: 0; line-height: 1.5')}>Không có bước nào khớp. Thử gõ tên nhóm như "ai", "con nguoi" hoặc chuyển sang tab Tool &amp; tích hợp.</p></>)}
        </div>
        <div style={S('display: flex; gap: 12px; font-size: 11px; color: #64748b; padding: 8px 12px; border-top: 1px solid #f1f5f9; background: #fafafa')}>
          <span>↑ ↓ chọn</span><span>Enter thêm</span><span>Esc đóng</span>
        </div>
      </div>
    </>)}
  </div>

  {/* PANEL PHẢI */}
  <aside style={S('width: 360px; flex-shrink: 0; border-left: 1px solid #e5e5e5; overflow-y: auto; background: #fff')}>

    {/* Chọn cách bắt đầu */}
    {(pmPick) && (<>
      <div style={S('padding: 18px')}>
        <h2 style={S('margin: 0; font-size: 15px; font-weight: 600')}>Chọn cách bắt đầu</h2>
        <p style={S('margin: 4px 0 0; font-size: 12.5px; color: #475569; line-height: 1.5')}>Bước Bắt đầu quyết định Quy trình chạy khi nào và nhận dữ liệu gì.</p>
        <div style={S('display: flex; flex-direction: column; gap: 8px; margin-top: 14px')}>
          {(startOpts || []).map((o, _io) => (<React.Fragment key={_io}>
            <button type="button" className={Q('card')} onClick={o.pick} style={S('padding: 12px; display: flex; gap: 10px; align-items: flex-start')}>
              <span style={S('width: 30px; height: 30px; border-radius: 8px; background: #203BDC; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={o.icon}></path></svg></span>
              <span style={S('flex: 1')}><span style={S('display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600')}>{o.name}{(o.common) && (<><span style={S('font-size: 10px; font-weight: 600; color: #475569; background: #f1f5f9; border-radius: 4px; padding: 1px 6px')}>PHỔ BIẾN NHẤT</span></>)}</span><span style={S('display: block; font-size: 12px; color: #475569; margin-top: 3px; line-height: 1.45')}>{o.desc}</span></span>
            </button>
          </React.Fragment>))}
        </div>
        <p style={S('margin: 14px 0 0; font-size: 11.5px; color: #64748b; line-height: 1.5')}>Muốn Nhân sự số khác gọi Quy trình này như một tool thì chọn Form đầu vào.</p>
      </div>
    </>)}

    {/* Chạy thử */}
    {(pmRun) && (<>
      <div style={S('padding: 14px 16px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 8px')}>
        <h2 style={S('margin: 0; font-size: 15px; font-weight: 600; flex: 1')}>Chạy thử <span style={S(`font-weight: 400; color: ${runStatusColor}`)}>· {runStatusText}</span></h2>
        <button type="button" className={Q('ghost')} aria-label="Đóng chạy thử" onClick={closeRun} style={S('width: 30px; height: 30px; border-radius: 7px')}>✕</button>
      </div>
      <div role="tablist" style={S('display: flex; gap: 4px; padding: 8px 12px 0')}>
        {(runTabs || []).map((t, _it) => (<React.Fragment key={_it}>
          <button type="button" role="tab" aria-selected={t.on} onClick={t.pick} style={S(`height: 28px; padding: 0 10px; border-radius: 7px; border: 0; font-size: 12.5px; font-weight: 500; background: ${t.bg}; color: ${t.fg}`)}>{t.label}</button>
        </React.Fragment>))}
      </div>
      <div style={S('padding: 12px 16px 20px')}>
        {(runShowInput) && (<>
          <div style={S('font-size: 12px; font-weight: 600')}>Dữ liệu chạy thử</div>
          {(noRunInputs) && (<><p style={S('font-size: 12px; color: #475569; margin: 6px 0 0')}>Bước Bắt đầu không nhận dữ liệu nào.</p></>)}
          {(runInputs || []).map((f, _if) => (<React.Fragment key={_if}>
            <label style={S('display: block; font-size: 12px; color: #334155; margin-top: 10px')}>{f.label} <code style={S('font-size: 11px; color: #1d4ed8')}>{f.k}</code>
              <input className={Q('field')} value={f.value} onChange={f.onChange} style={S('margin-top: 4px')} />
            </label>
          </React.Fragment>))}
          <button type="button" className={Q('btn btn-primary')} onClick={startRun} style={S('width: 100%; justify-content: center; margin-top: 14px')}><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>Bắt đầu chạy</button>
          <p style={S('font-size: 11.5px; color: #64748b; margin: 8px 0 0; line-height: 1.5')}>Chạy thử được cả khi còn mục cần sửa. Publish thì phải sửa hết.</p>
        </>)}
        {(runShowResult) && (<>
          {(runPaused) && (<>
            <div style={S('border: 1px solid #fed7aa; background: #fff7ed; border-radius: 10px; padding: 12px')}>
              <div style={S('display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600')}><span style={S('width: 8px; height: 8px; border-radius: 999px; background: #ea580c')}></span>{waitTitle}</div>
              <p style={S('font-size: 12.5px; color: #334155; margin: 8px 0 0; line-height: 1.5')}>{waitBody}</p>
              <p style={S('font-size: 11.5px; color: #64748b; margin: 8px 0 0')}>Bạn đang đóng vai người duyệt. Bấm một nút để Quy trình chạy tiếp.</p>
              <div style={S('display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px')}>
                {(waitActions || []).map((a, _ia) => (<React.Fragment key={_ia}>
                  <button type="button" className={Q(a.cls)} onClick={a.pick}>{a.label}</button>
                </React.Fragment>))}
              </div>
              <p style={S('font-size: 11.5px; color: #9a3412; margin: 10px 0 0')}>Hết hạn sau {waitExpire}. Quá hạn thì đi nhánh Quá hạn.</p>
            </div>
          </>)}
          {(runDone) && (<>
            <div style={S(`border: 1px solid ${runResBorder}; background: ${runResBg}; border-radius: 10px; padding: 12px; font-size: 12.5px; line-height: 1.5; color: #0f172a`)}>{runResText}</div>
            {(runHasOutput) && (<>
              <div style={S('font-size: 12px; font-weight: 600; margin-top: 14px')}>Dữ liệu trả về</div>
              <pre style={S('margin: 6px 0 0; background: #0f172a; color: #e2e8f0; font-size: 11.5px; border-radius: 8px; padding: 10px; white-space: pre-wrap')}>{runOutput}</pre>
            </>)}
            <button type="button" className={Q('btn')} onClick={rerun} style={S('margin-top: 14px')}>Chạy lại</button>
          </>)}
          {(runRunning) && (<><p style={S('font-size: 12.5px; color: #475569; margin: 0')}>Đang chạy... Xem tab Từng bước để theo dõi.</p></>)}
        </>)}
        {(runShowTrace) && (<>
          <ol style={S('list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px')}>
            {(runLog || []).map((r, _ir) => (<React.Fragment key={_ir}>
              <li style={S('display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 8px 10px')}>
                <span style={S(`width: 20px; height: 20px; border-radius: 5px; background: ${r.tile}; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={r.icon}></path></svg></span>
                <span style={S('flex: 1; min-width: 0')}><span style={S('display: flex; justify-content: space-between; gap: 6px')}><b style={S('font-weight: 500')}>{r.title}</b><span style={S(`color: ${r.stColor}; white-space: nowrap; font-size: 11.5px`)}>{r.st}</span></span><span style={S('display: block; font-size: 11.5px; color: #64748b; margin-top: 2px')}>{r.note}</span></span>
              </li>
            </React.Fragment>))}
          </ol>
        </>)}
      </div>
    </>)}

    {/* Cấu hình bước */}
    {(pmNode) && (<>
      <div style={S('padding: 14px 16px 0')}>
        <div style={S('display: flex; align-items: center; gap: 8px')}>
          <span style={S(`width: 28px; height: 28px; border-radius: 7px; background: ${sel.tile}; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={sel.icon}></path></svg></span>
          <label className={Q('sr')} htmlFor="ntitle">Tên bước</label>
          <input id="ntitle" value={sel.title} onChange={onTitle} style={S('flex: 1; min-width: 0; border: 1px solid transparent; border-radius: 6px; font: inherit; font-size: 15px; font-weight: 600; padding: 3px 6px; background: transparent')} />
          {(sel.canRunStep) && (<><button type="button" className={Q('ghost')} aria-label="Chạy riêng bước này" title="Chạy riêng bước này" onClick={runStep} style={S('width: 30px; height: 30px; border-radius: 7px; display: flex; align-items: center; justify-content: center')}><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg></button></>)}
          <button type="button" className={Q('ghost')} aria-label="Đóng bảng cấu hình" onClick={deselect} style={S('width: 30px; height: 30px; border-radius: 7px')}>✕</button>
        </div>
        <label className={Q('sr')} htmlFor="ndesc">Mô tả bước</label>
        <input id="ndesc" placeholder="Thêm mô tả..." value={sel.desc} onChange={onDesc} style={S('width: 100%; border: 0; font: inherit; font-size: 12.5px; color: #475569; padding: 6px 6px 0; background: transparent; outline-offset: 2px')} />
        <div role="tablist" style={S('display: flex; gap: 16px; border-bottom: 1px solid #e5e5e5; margin-top: 10px')}>
          {(nodeTabs || []).map((t, _it) => (<React.Fragment key={_it}>
            <button type="button" role="tab" aria-selected={t.on} onClick={t.pick} style={S(`height: 34px; padding: 0; border: 0; border-bottom: 2px solid ${t.line}; background: transparent; font-size: 12.5px; font-weight: 600; letter-spacing: .02em; color: ${t.fg}`)}>{t.label}</button>
          </React.Fragment>))}
        </div>
      </div>

      {(tabLast) && (<>
        <div style={S('padding: 14px 16px')}>
          {(lastNone) && (<><p style={S('font-size: 12.5px; color: #475569; margin: 0; line-height: 1.5')}>Bước này chưa chạy lần nào. Bấm ▷ ở trên để chạy riêng bước này với dữ liệu đang có, hoặc Chạy thử cả Quy trình.</p></>)}
          {(lastHas) && (<>
            <div style={S('display: flex; gap: 8px; font-size: 12.5px')}><span style={S(`color: ${last.stColor}; font-weight: 600`)}>{last.st}</span><span style={S('color: #64748b')}>{last.ms}</span></div>
            <p style={S('font-size: 12.5px; color: #334155; margin: 8px 0 0; line-height: 1.5')}>{last.note}</p>
            <div style={S('font-size: 12px; font-weight: 600; margin-top: 12px')}>Đầu ra</div>
            <pre style={S('margin: 6px 0 0; background: #f8fafc; border: 1px solid #e5e5e5; font-size: 11.5px; border-radius: 8px; padding: 10px; white-space: pre-wrap')}>{last.out}</pre>
          </>)}
        </div>
      </>)}

      {(tabCfg) && (<>
        <div style={S('padding: 6px 16px 20px')}>
          {(sel.hasIssue) && (<><div style={S('margin-top: 10px; border: 1px solid #fed7aa; background: #fff7ed; color: #9a3412; border-radius: 8px; padding: 8px 10px; font-size: 12px')}>{sel.issueText}</div></>)}
          {(sel.hasHelp) && (<><p style={S('font-size: 12px; color: #475569; margin: 10px 0 0; line-height: 1.5')}>{sel.help}</p></>)}

          {/* Form đầu vào */}
          {(sel.isForm) && (<>
            <div className={Q('sec')}>ĐẦU VÀO</div>
            {(fields || []).map((f, _if) => (<React.Fragment key={_if}>
              <div style={S('display: flex; align-items: center; gap: 8px; margin-top: 6px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 6px 6px 6px 10px')}>
                <button type="button" onClick={f.edit} aria-label={f.editAria} style={S('flex: 1; min-width: 0; text-align: left; border: 0; background: transparent; padding: 0; font: inherit')}>
                  <code style={S('display: block; font-size: 12px; color: #1d4ed8')}>{f.k}</code>
                  <span style={S('display: block; font-size: 11.5px; color: #64748b; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>{f.sub}</span>
                </button>
                {(f.req) && (<><span style={S('font-size: 10.5px; color: #b45309; background: #fffbeb; border-radius: 5px; padding: 2px 6px')}>Bắt buộc</span></>)}
                <span style={S('font-size: 11px; background: #f1f5f9; border-radius: 5px; padding: 2px 6px; white-space: nowrap')}>{f.t}</span>
                <button type="button" className={Q('ghost')} aria-label={f.aria} onClick={f.remove} style={S('width: 26px; height: 26px; border-radius: 6px')}>✕</button>
              </div>
            </React.Fragment>))}
            {(ffOpen) && (<>
              <div style={S('margin-top: 8px; border: 1px solid #203BDC; border-radius: 10px; padding: 12px; background: #fafbff')}>
                <label className={Q('lbl')} htmlFor="ff-label">Tên hiển thị</label>
                <input id="ff-label" className={Q('field')} placeholder="VD: Số tiền đề nghị" value={ff.label} onChange={onFfLabel} autoFocus={true} />
                <label className={Q('lbl')} htmlFor="ff-key">Tên biến</label>
                <input id="ff-key" className={Q('field')} style={S('font-family: ui-monospace, SFMono-Regular, Menlo, monospace')} value={ff.k} onChange={onFfKey} />
                <p style={S(`font-size: 11px; color: ${ffKeyColor}; margin: 4px 0 0`)}>{ffKeyHint}</p>
                <label className={Q('lbl')} htmlFor="ff-type">Kiểu dữ liệu</label>
                <select id="ff-type" className={Q('field')} value={ff.t} onChange={onFfType}>{(fieldTypes || []).map((t, _it) => (<React.Fragment key={_it}><option value={t}>{t}</option></React.Fragment>))}</select>
                <label className={Q('lbl')} htmlFor="ff-desc">Mô tả cho Nhân sự số</label>
                <input id="ff-desc" className={Q('field')} placeholder="VD: Tổng tiền trên đề nghị, đơn vị đồng" value={ff.desc} onChange={onFfDesc} />
                <label style={S('display: flex; align-items: center; gap: 8px; font-size: 12.5px; margin-top: 10px; cursor: pointer')}><input type="checkbox" checked={ff.req} onChange={onFfReq} style={S('accent-color: #203BDC')} />Bắt buộc khi chạy</label>
                <div style={S('display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px')}>
                  <button type="button" className={Q('btn')} onClick={cancelField} style={S('height: 32px; font-size: 13px')}>Huỷ</button>
                  <button type="button" className={Q('btn btn-primary')} onClick={saveField} disabled={ffInvalid} style={S('height: 32px; font-size: 13px')}>{ffSave}</button>
                </div>
              </div>
            </>)}
            {(canAddField) && (<><button type="button" className={Q('ghost link')} onClick={addField}>+ Thêm trường</button></>)}
            <p style={S('font-size: 11.5px; color: #64748b; margin: 8px 0 0; line-height: 1.5')}>Tên và mô tả trường là thứ Nhân sự số đọc để biết cần truyền gì khi gọi Quy trình này.</p>
          </>)}

          {/* Điều kiện */}
          {(sel.isCond) && (<>
            {(cases || []).map((c, _ic) => (<React.Fragment key={_ic}>
              <div style={S('margin-top: 12px; border: 1px solid #e5e5e5; border-radius: 10px; padding: 10px')}>
                <div style={S('display: flex; align-items: center; gap: 8px')}>
                  <span style={S('font-size: 11px; font-weight: 700; letter-spacing: .04em; color: #0e7490')}>{c.head}</span>
                  <span style={S('flex: 1')}></span>
                  {(c.multi) && (<><button type="button" className={Q('ghost')} onClick={c.toggleLogic} style={S('height: 24px; padding: 0 8px; border-radius: 5px; font-size: 11px; font-weight: 600; border: 1px solid #e5e5e5')}>{c.logic}</button></>)}
                  {(c.canRemove) && (<><button type="button" className={Q('ghost')} aria-label="Xoá nhánh" onClick={c.remove} style={S('width: 24px; height: 24px; border-radius: 5px')}>✕</button></>)}
                </div>
                {(c.rows || []).map((r, _ir) => (<React.Fragment key={_ir}>
                  <div style={S('display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr) 24px; gap: 6px; margin-top: 8px; align-items: center')}>
                    <select className={Q('field')} aria-label="Biến" value={r.v} onChange={r.onV} style={S('font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px')}>{(varOpts || []).map((o, _io) => (<React.Fragment key={_io}><option value={o.v}>{o.l}</option></React.Fragment>))}</select>
                    <select className={Q('field')} aria-label="Phép so sánh" value={r.op} onChange={r.onOp} style={S('font-size: 12px')}>{(opOpts || []).map((o, _io) => (<React.Fragment key={_io}><option value={o}>{o}</option></React.Fragment>))}</select>
                    <input className={Q('field')} aria-label="Giá trị" value={r.val} onChange={r.onVal} style={S('font-size: 12px')} />
                    <button type="button" className={Q('ghost')} aria-label="Xoá điều kiện" onClick={r.remove} style={S('width: 24px; height: 24px; border-radius: 5px')}>✕</button>
                  </div>
                </React.Fragment>))}
                <button type="button" className={Q('ghost link')} onClick={c.addRow}>+ Thêm điều kiện</button>
              </div>
            </React.Fragment>))}
            <button type="button" className={Q('btn')} onClick={addCase} style={S('width: 100%; justify-content: center; margin-top: 10px; height: 32px; font-size: 12.5px')}>+ NẾU KHÔNG THÌ NẾU</button>
            <div style={S('margin-top: 10px; border: 1px solid #e5e5e5; border-radius: 10px; padding: 10px')}><span style={S('font-size: 11px; font-weight: 700; letter-spacing: .04em; color: #0e7490')}>CÒN LẠI</span><p style={S('font-size: 12px; color: #475569; margin: 4px 0 0')}>Đi nhánh này khi không nhánh nào ở trên đúng. Mỗi lần chạy chỉ đi đúng một nhánh.</p></div>
          </>)}

          {/* Danh sách có thể sửa: nút hành động / nhãn phân loại */}
          {(sel.hasList) && (<>
            <div className={Q('sec')}>{listTitle}</div>
            {(listItems || []).map((li, _ili) => (<React.Fragment key={_ili}>
              <div style={S('display: flex; gap: 6px; margin-top: 6px; align-items: center')}>
                <input className={Q('field')} aria-label={li.aria} value={li.value} onChange={li.onChange} />
                <button type="button" className={Q('ghost')} aria-label="Xoá" onClick={li.remove} disabled={li.lock} style={S('width: 28px; height: 28px; border-radius: 6px')}>✕</button>
              </div>
            </React.Fragment>))}
            <button type="button" className={Q('ghost link')} onClick={addListItem}>{listAdd}</button>
            <p style={S('font-size: 11.5px; color: #64748b; margin: 6px 0 0; line-height: 1.5')}>{listNote}</p>
          </>)}

          {/* Trường chung */}
          {(pf || []).map((f, _if) => (<React.Fragment key={_if}>
            <div>
              <label className={Q('lbl')} htmlFor={f.id}>{f.label}</label>
              {(f.isInput) && (<><input id={f.id} className={Q('field')} value={f.value} placeholder={f.ph} onChange={f.onChange} readOnly={f.ro} /></>)}
              {(f.isSelect) && (<><select id={f.id} className={Q('field')} value={f.value} onChange={f.onChange}>{(f.options || []).map((o, _io) => (<React.Fragment key={_io}><option value={o.v}>{o.l}</option></React.Fragment>))}</select></>)}
              {(f.isText) && (<>
                <div style={S('position: relative')}><textarea id={f.id} className={Q('field')} rows="4" value={f.value} placeholder={f.ph} onChange={f.onChange} style={S(`height: auto; padding: 8px 10px; resize: vertical; font-family: ${f.font}`)}></textarea>
                {(f.canVar) && (<><button type="button" className={Q('ghost')} onClick={f.insertVar} style={S('position: absolute; right: 6px; bottom: 8px; height: 24px; padding: 0 6px; border-radius: 5px; font-size: 11px; font-family: ui-monospace, monospace; color: #1d4ed8; background: #eff6ff')}>{x} chèn biến</button></>)}</div>
              </>)}
              {(f.hasHint) && (<><p style={S('font-size: 11.5px; color: #64748b; margin: 4px 0 0; line-height: 1.45')}>{f.hint}</p></>)}
            </div>
          </React.Fragment>))}

          {/* Biến đầu ra */}
          {(sel.hasOutVars) && (<>
            <div className={Q('sec')}>{outTitle}</div>
            <div style={S('display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px')}>
              {(outVars || []).map((v, _iv) => (<React.Fragment key={_iv}>
                <span style={S('display: inline-flex; align-items: center; gap: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: #1d4ed8; background: #eff6ff; border-radius: 5px; padding: 3px 4px 3px 7px')}>{v.k}{(v.canRemove) && (<><button type="button" aria-label={v.aria} onClick={v.remove} style={S('border: 0; background: transparent; color: #64748b; padding: 0 3px; font-size: 11px')}>✕</button></>)}</span>
              </React.Fragment>))}
            </div>
            {(outEditable) && (<>
              <label className={Q('sr')} htmlFor="addvar">Thêm biến</label>
              <input id="addvar" className={Q('field')} placeholder="Gõ tên biến rồi Enter" value={newVar} onChange={onNewVar} onKeyDown={onNewVarKey} style={S('margin-top: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px')} />
            </>)}
          </>)}

          {/* Dùng làm tool */}
          {(sel.isOutput) && (<>
            <label style={S('display: flex; gap: 10px; align-items: flex-start; margin-top: 16px; border: 1px solid #e5e5e5; border-radius: 10px; padding: 10px 12px; cursor: pointer')}>
              <input type="checkbox" checked={asTool} onChange={toggleAsTool} style={S('margin-top: 3px; accent-color: #203BDC')} />
              <span><span style={S('display: block; font-size: 13px; font-weight: 500')}>Cho Nhân sự số gọi Quy trình này như một tool</span><span style={S('display: block; font-size: 11.5px; color: #64748b; margin-top: 3px; line-height: 1.45')}>Nhân sự số đọc tên, mô tả các trường ở bước Bắt đầu và nhận lại các biến trả về ở đây.</span></span>
            </label>
          </>)}

          {/* Khi bước lỗi */}
          {(sel.hasErr) && (<>
            <div className={Q('sec')}>KHI BƯỚC NÀY LỖI</div>
            <label style={S('display: flex; align-items: center; gap: 8px; font-size: 12.5px; margin-top: 8px; cursor: pointer')}><input type="checkbox" checked={errRetry} onChange={toggleRetry} style={S('accent-color: #203BDC')} />Thử lại tối đa 3 lần, cách nhau 1 giây</label>
            <label className={Q('lbl')} htmlFor="errmode">Nếu vẫn lỗi</label>
            <select id="errmode" className={Q('field')} value={errMode} onChange={onErrMode}>
              <option value="stop">Dừng Quy trình</option>
              <option value="default">Dùng giá trị mặc định rồi chạy tiếp</option>
              <option value="branch">Đi nhánh lỗi (thêm cổng Lỗi)</option>
            </select>
          </>)}

          {/* Guardrails bước AI */}
          {(sel.isAi) && (<>
            <div style={S('display: flex; align-items: center; gap: 8px; margin-top: 16px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 8px 10px; font-size: 12.5px')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span style={S('flex: 1')}>Guardrails: <b style={S('font-weight: 500')}>Theo Quy trình</b></span>
              <button type="button" className={Q('ghost')} onClick={deselect} style={S('height: 26px; padding: 0 8px; border-radius: 6px; font-size: 12px; color: #203BDC; font-weight: 500')}>Xem</button>
            </div>
          </>)}

          {/* BƯỚC TIẾP THEO */}
          {(sel.hasNext) && (<>
            <div className={Q('sec')} style={S('margin-top: 20px')}>BƯỚC TIẾP THEO</div>
            <p style={S('font-size: 11.5px; color: #64748b; margin: 2px 0 0')}>Thêm bước ngay từ đây, không cần kéo dây trên canvas.</p>
            <div style={S('display: flex; gap: 8px; margin-top: 8px')}>
              <span style={S(`width: 26px; height: 26px; border-radius: 7px; background: ${sel.tile}; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4px`)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={sel.icon}></path></svg></span>
              <div style={S('flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; border-left: 1.5px solid #e2e8f0; padding-left: 10px')}>
                {(nextRows || []).map((nx, _inx) => (<React.Fragment key={_inx}>
                  <div>
                    {(nx.hasLabel) && (<><div style={S(`font-size: 10.5px; font-weight: 600; letter-spacing: .04em; color: ${nx.labelColor}; text-transform: uppercase; margin-bottom: 3px`)}>{nx.label}</div></>)}
                    {(nx.linked) && (<>
                      <button type="button" onClick={nx.go} style={S('width: 100%; display: flex; align-items: center; gap: 8px; text-align: left; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; padding: 6px 8px; font: inherit; font-size: 12.5px')}>
                        <span style={S(`width: 20px; height: 20px; border-radius: 5px; background: ${nx.tile}; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={nx.icon}></path></svg></span>{nx.title}
                      </button>
                    </>)}
                    {(nx.free) && (<>
                      <button type="button" onClick={nx.add} style={S('width: 100%; text-align: left; border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; padding: 7px 8px; font: inherit; font-size: 12px; font-weight: 500; color: #475569')}>+ Chọn bước tiếp theo</button>
                    </>)}
                  </div>
                </React.Fragment>))}
              </div>
            </div>
          </>)}

          {(sel.canDelete) && (<>
            <button type="button" className={Q('btn')} onClick={deleteSel} style={S('margin-top: 20px; color: #b91c1c; border-color: #fecaca')}>Xoá bước</button>
          </>)}
        </div>
      </>)}
    </>)}

    {/* Cài đặt Quy trình */}
    {(pmProcess) && (<>
      <div style={S('padding: 18px')}>
        <h2 style={S('margin: 0; font-size: 15px; font-weight: 600')}>Cài đặt Quy trình</h2>
        <p style={S('margin: 4px 0 0; font-size: 12.5px; color: #475569')}>Chọn một bước trên canvas để cấu hình riêng bước đó.</p>

        <div style={S('margin-top: 14px; border: 1px solid #e5e5e5; border-radius: 10px; padding: 12px')}>
          <div style={S('font-size: 13px; font-weight: 600')}>Thêm bước</div>
          <ul style={S('margin: 8px 0 0; padding-left: 18px; font-size: 12.5px; color: #334155; line-height: 1.6')}>
            <li>Bấm <b>+</b> ở cổng ra của một bước, hoặc <b>+</b> giữa dây để chèn vào giữa.</li>
            <li>Mở một bước, dùng mục <b>Bước tiếp theo</b> ở cuối bảng cấu hình.</li>
            <li>Bấm <b>⊕</b> hoặc <b>Tìm bước</b> trên thanh công cụ trái.</li>
          </ul>
          <p style={S('font-size: 12px; color: #64748b; margin: 6px 0 0')}>Cả ba cách mở cùng một bảng chọn bước.</p>
        </div>

        <div style={S('margin-top: 12px; border: 1px solid #e5e5e5; border-radius: 10px; padding: 12px')}>
          <div style={S('display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>Guardrails cho mọi bước</div>
          <div style={S('font-size: 11px; font-weight: 600; letter-spacing: .04em; color: #475569; margin-top: 10px')}>NỘI DUNG <span style={S('font-weight: 400; letter-spacing: 0; color: #64748b')}>· {aiCount} bước AI</span></div>
          {(guards || []).map((g, _ig) => (<React.Fragment key={_ig}>
            <label style={S('display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; padding: 4px 0; cursor: pointer')}><input type="checkbox" checked={g.on} onChange={g.toggle} style={S('margin-top: 2px; accent-color: #203BDC')} /><span>{g.label}</span></label>
          </React.Fragment>))}
          <div style={S('font-size: 11px; font-weight: 600; letter-spacing: .04em; color: #475569; margin-top: 10px')}>HÀNH ĐỘNG <span style={S('font-weight: 400; letter-spacing: 0; color: #64748b')}>· {actCount} bước HTTP, Tool</span></div>
          {(actGuards || []).map((g, _ig) => (<React.Fragment key={_ig}>
            <label style={S('display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; padding: 4px 0; cursor: pointer')}><input type="checkbox" checked={g.on} onChange={g.toggle} style={S('margin-top: 2px; accent-color: #203BDC')} /><span>{g.label}</span></label>
          </React.Fragment>))}
          <p style={S('font-size: 11.5px; color: #64748b; margin: 8px 0 0')}>Guardrails của Space luôn áp dụng trước và không tắt được ở đây.</p>
        </div>

        <div style={S('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px')}>
          <div style={S('background: #f8fafc; border-radius: 8px; padding: 10px')}><div style={S('font-size: 20px; font-weight: 600')}>{stepCount}</div><div style={S('font-size: 11.5px; color: #475569')}>bước</div></div>
          <div style={S('background: #f8fafc; border-radius: 8px; padding: 10px')}><div style={S(`font-size: 20px; font-weight: 600; color: ${issueColor}`)}>{issueCount}</div><div style={S('font-size: 11.5px; color: #475569')}>mục cần sửa</div></div>
        </div>
      </div>
    </>)}
  </aside>
</div>


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
