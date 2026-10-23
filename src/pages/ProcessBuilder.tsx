// @ts-nocheck
/* eslint-disable */
/* Nhân sự số Quy trình - builder dạng node (prototype). Port từ prototype Claude Design. */
import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { processStore } from "@/components/process/processStore";

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
.qt-ro-hide{display:none!important}
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
.qt-pal{display:flex;align-items:center;gap:8px;width:100%;height:32px;padding:0 6px;border:0;border-radius:7px;background:transparent;font-size:12.5px;color:#0f172a;text-align:left}
.qt-pal:hover{background:#f1f5f9}
.qt-acard{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;padding:10px;border:1px solid #e5e5e5;border-radius:10px;background:#fff}
.qt-acard:hover,.qt-acard-on{border-color:#a5b4fc;background:#f5f7ff}
.qt-qn .qt-qn-tools{opacity:0;pointer-events:none;transition:opacity .12s}
.qt-qn:hover .qt-qn-tools,.qt-qn-sel .qt-qn-tools{opacity:1;pointer-events:auto}
.qt-qn-del,.qt-qn-run{width:22px;height:22px;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center;padding:0}
.qt-qn-del{border:1px solid #fca5a5;color:#dc2626}.qt-qn-del:hover{background:#fef2f2}
.qt-qn-run{border:1px solid #d4d4d8;color:#3f3f46}.qt-qn-run:hover{background:#f4f4f5}
.qt-port{position:absolute;width:8px;height:8px;border-radius:999px;background:#242424;pointer-events:none}
.qt-oplus{position:absolute;width:22px;height:22px;border-radius:999px;border:1px solid #c9ccd3;background:#fff;color:#52525b;display:flex;align-items:center;justify-content:center;padding:0;opacity:0;cursor:pointer;transition:opacity .12s}
.qt-qn:hover .qt-oplus,.qt-qn-sel .qt-oplus{opacity:1}.qt-oplus:hover{border-color:#203BDC;color:#203BDC}
.qt-oplus-err{border-color:#fcd34d;color:#b45309}
.qt-edel{position:absolute;width:22px;height:22px;border-radius:999px;border:1px solid #fca5a5;background:#fff;color:#dc2626;display:flex;align-items:center;justify-content:center;padding:0;opacity:0;transition:opacity .12s;z-index:2}
.qt-edel:hover,.qt-edel-on{opacity:1}
.qt-cmi{display:flex;width:100%;height:32px;align-items:center;padding:0 10px;border:0;background:transparent;border-radius:6px;font-size:13px;text-align:left}
.qt-cmi:hover{background:#f4f4f5}.qt-cmi:disabled{opacity:.45;cursor:default;background:transparent}
.qt-pal{height:34px;font-size:14px;font-weight:500;gap:10px;padding:0 8px;color:#121216}
.qt-palh{font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#686873;padding:8px 8px 2px}
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
  table: 'M3 5h18v14H3z M3 10h18 M9 5v14',
  par: 'M5 4v16 M19 4v16 M5 12h14 M12 8v8',
  join: 'M5 4l7 8 7-8 M12 12v8',
  wait: 'M7 3h10 M7 21h10 M8 3c0 5 8 5 8 9s-8 4-8 9 M16 3c0 5-8 5-8 9s8 4 8 9',
  code: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16',
  data: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6'
};
// màu: [chữ/icon, nền]
var COL = { start: ['#15803D', '#dcfce7'], agent: ['#203BDC', '#e0e7ff'], ai: ['#4F46E5', '#ede9fe'], human: ['#9333EA', '#f3e8ff'], integ: ['#7C3AED', '#ede9fe'], fx: ['#0369A1', '#e0f2fe'], var: ['#0369A1', '#e0f2fe'], logic: ['#C2410C', '#ffedd5'], end: ['#B91C1C', '#fee2e2'], note: ['#A16207', '#fef9c3'] };
var TYPES = {
  start: { c: 'start', name: 'Start', icon: ICON.bolt },
  agent: { c: 'agent', name: 'Prompt', desc: 'Gọi AI một lần: đọc dữ liệu hoặc tệp, trả ra văn bản hoặc các trường cố định', icon: ICON.bot, kw: 'prompt ai llm doc tep trich xuat phan loai tom tat', err: 1, ai: 1 },
  classify: { gone: 1, c: 'ai', name: 'Phân loại', desc: 'AI xếp dữ liệu vào nhóm, mỗi nhóm một nhánh', icon: ICON.tag, kw: 'classify phan loai nhom', ai: 1 },
  extract: { gone: 1, c: 'ai', name: 'Trích xuất', desc: 'Lấy các trường từ tài liệu, hoá đơn, giấy tờ', icon: ICON.scan, kw: 'extract trich xuat doc tai lieu hoa don cccd', ai: 1 },
  human: { c: 'human', name: 'Human approval', desc: 'Gửi yêu cầu duyệt, chờ người nhận bấm trả lời', icon: ICON.approve, kw: 'human review duyet nguoi xac nhan' },
  tool: { c: 'integ', name: 'Tool', desc: 'Dùng tool đã kết nối trong Space', icon: ICON.tool, kw: 'tool connector tich hop', err: 1, act: 1 },
  func: { gone: 1, c: 'fx', name: 'Hàm', desc: 'HTTP, xử lý dữ liệu, ngày giờ, chờ', icon: ICON.fx, kw: 'function ham http json', err: 1 },
  variable: { c: 'var', name: 'Set variable', desc: 'Khai báo hoặc gán giá trị biến', icon: ICON.vars, kw: 'variable bien gan' },
  condition: { c: 'logic', name: 'Condition', desc: 'Đúng đi nhánh Có, sai đi nhánh Không', icon: ICON.branch, kw: 'if else neu dieu kien re nhanh' },
  switch: { c: 'logic', name: 'Switch', desc: 'Mỗi giá trị của một biến đi một nhánh, không khớp đi Mặc định', icon: ICON.switch, kw: 'switch case gia tri' },
  decision: { gone: 1, c: 'logic', name: 'Decision table', desc: 'Tra bảng quy tắc, ra giá trị cho các bước sau', icon: ICON.table, kw: 'dmn decision table bang quyet dinh quy tac rule tuyen duyet' },
  parallel: { c: 'logic', name: 'Parallel', desc: 'Khối chạy nhiều nhánh cùng lúc, chờ đủ các nhánh rồi đi tiếp', icon: ICON.par, kw: 'parallel song song dong thoi' },
  join: { gone: 1, c: 'logic', name: 'Gộp nhánh', desc: 'Chờ các nhánh song song xong rồi chạy tiếp', icon: ICON.join, kw: 'join merge gop nhanh hoi tu cho du' },
  wait: { c: 'human', name: 'Wait', desc: 'Chờ một khoảng thời gian, hoặc chờ tới một thời điểm', icon: ICON.wait, kw: 'wait event cho su kien webhook callback nhan hang hoa don' },
  code: { gone: 1, c: 'fx', name: 'Code', desc: 'Tính toán, chạy quy tắc bằng Python hoặc JavaScript', icon: ICON.code, kw: 'code python javascript script tinh toan rule', err: 1 },
  loop: { c: 'logic', name: 'Loop', desc: 'Chạy các bước bên trong cho từng phần tử', icon: ICON.loop, kw: 'loop lap for each' },
  subflow: { p2: 1, c: 'integ', name: 'Subflow', desc: 'Chạy một Quy trình khác đã publish', icon: ICON.flow, kw: 'child workflow quy trinh con', err: 1 },
  end: { c: 'end', name: 'End', desc: 'Kết thúc lần chạy: thành công hoặc thất bại', icon: ICON.end, kw: 'end ket thuc dung' },
  respond: { c: 'integ', name: 'Respond to the agent', desc: 'Gửi dữ liệu trả về cho Nhân sự số đã gọi Quy trình', icon: ICON.reply, kw: 'respond tra ket qua agent' },
  note: { c: 'note', name: 'Note', desc: 'Giải thích cho người xem sau', icon: ICON.note, kw: 'note ghi chu' }
};
var TRIGGERS = [
  { id: 'manual', name: 'Thủ công', desc: 'Chạy khi bấm nút hoặc gọi trực tiếp' },
  { id: 'schedule', name: 'Theo lịch', desc: 'Chạy định kỳ theo giờ, ngày, tuần' },
  { id: 'app', name: 'Sự kiện từ ứng dụng', desc: 'Chạy khi có sự kiện ở ứng dụng đã kết nối' },
  { id: 'http', name: 'Khi nhận HTTP request', desc: 'Hệ thống bên ngoài gửi dữ liệu tới một địa chỉ riêng' },
  { id: 'agent', name: 'Khi Nhân sự số gọi', desc: 'Nhân sự số dùng Quy trình này như một tool' }
];
var INTYPES = ['Văn bản', 'Số', 'Có / Không', 'Ngày', 'Email', 'Tệp'];
var OUTTYPES = ['Văn bản', 'Số', 'Có / Không', 'Ngày', 'Danh sách', 'Đối tượng'];
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
  { name: 'Odoo · Tạo đơn mua hàng (PO)', desc: 'Tạo PO trên Odoo của FHO từ hồ sơ đã duyệt', out: ['ma_po'] },
  { name: 'MB Life · Policy Info', desc: 'Hợp đồng, người được bảo hiểm, ngày hiệu lực, phí đã đóng', out: ['hop_dong', 'ngay_hieu_luc'] },
  { name: 'MB Life · Lịch sử bồi thường', desc: 'Các claim trước của người được bảo hiểm', out: ['lich_su', 'so_ngay_da_tra_nam'] },
  { name: 'Bảng tham chiếu · Tra cứu', desc: 'ICD nhóm bệnh, bệnh hiểm nghèo, loại trừ, blacklist', out: ['nhom_benh', 'trong_blacklist'] },
  { name: 'Gmail · Gửi email', desc: 'Gửi email từ hộp thư đã kết nối', out: ['ma_thu'] },
  { name: 'SharePoint · Lấy tệp', desc: 'Đọc tệp trong thư viện tài liệu', out: ['tep'] },
  { name: 'DataSuite · Truy vấn bảng', desc: 'Lấy dữ liệu từ bảng đã kết nối', out: ['ket_qua'] },
  { name: 'ERP nội bộ · Lấy PO', desc: 'API Tool: lấy PO theo mã', out: ['po_tong_tien', 'po_trang_thai'] },
  { name: 'MB Life · Rule engine', desc: 'API Tool: chạy bộ rule chứng từ D, hiệu lực E, thẩm định A', out: ['ket_qua_rule', 'so_warn', 'so_not_evaluated', 'rule_version'] },
  { name: 'LOS · Chấm điều kiện', desc: 'API Tool: chấm điều kiện tín dụng bán lẻ', out: ['ket_qua_cham', 'ly_do'] },
  { name: 'LOS · Tạo hồ sơ vay', desc: 'API Tool: tạo hồ sơ trên hệ thống khởi tạo khoản vay', out: ['ma_ho_so_vay'] }
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
var INNER_OK = ['agent', 'human', 'wait', 'tool', 'variable'];
var PAL_HEAD = { agent: 'AI', human: 'Con người', tool: 'Hành động', condition: 'Điều hướng', end: 'Khác' };
var PAL = ['agent', 'human', 'tool', 'variable', 'respond', 'condition', 'switch', 'parallel', 'loop', 'wait', 'end', 'note'];
var EVENTS = ['Odoo · Phiếu nhập kho được xác nhận', 'Gmail · Email có hoá đơn đính kèm', 'SAP ERP · Hoá đơn được ghi nhận', 'Webhook · Hệ thống ngoài gọi lại'];
var PEOPLE = ['', 'Trưởng phòng của người đề nghị', 'Giám đốc khối của người đề nghị', 'Nhóm IT bảo mật FHO', 'Kế toán trưởng FHO', 'Giám đốc FHO', 'Ban Mua sắm FHO-FPD', 'Kế toán công nợ FHO', 'Nhóm Kế toán công nợ', 'Nhóm Thẩm định bán lẻ'];

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
    case 'start': return { trigger: 'manual', agentMode: 'wait', inputs: [], freq: 'week', time: '08:00', app: 'Gmail · Khi có email mới' };
    case 'agent': return { doc: '', instructions: '', model: 'DeepSeek V4 Flash', output: 'text', outVars: [], retry: false, err: 'stop' };
    case 'classify': return { input: '', model: 'DeepSeek V4 Flash', cats: [{ name: 'Nhóm 1', desc: '' }, { name: 'Nhóm 2', desc: '' }] };
    case 'extract': return { doc: '', fields: [] };
    case 'human': return { assignee: '', title: '', message: '', fields: [{ name: 'quyet_dinh', desc: 'Duyệt / Từ chối' }, { name: 'y_kien', desc: 'Ý kiến' }], timeout: '3', tunit: 'ngày', onTimeout: 'branch', approveMode: 'first' };
    case 'wait': return { mode: 'delay', amount: '1', aunit: 'ngày', at: '' };
    case 'decision': return { hit: 'first', outCols: [{ name: '', desc: '' }], rows: [{ when: '', then: '' }] };
    case 'parallel': return { branches: [{ name: 'Nhánh 1', desc: '', inner: [] }, { name: 'Nhánh 2', desc: '', inner: [] }] };
    case 'join': return { mode: 'all' };
    case 'code': return { lang: 'Python', code: '', outVars: [], retry: false, err: 'stop' };
    case 'tool': return { tool: '', acc: '', params: '', retry: false, err: 'stop' };
    case 'func': return { fn: 'http', method: 'POST', url: '', body: '', input: '', amount: '3', unit: 'ngày', retry: true, err: 'stop' };
    case 'variable': return { vars: [{ name: '', value: '' }] };
    case 'condition': return { cases: [{ name: 'Có', logic: 'VÀ', rows: [{ v: '', op: 'Bằng', val: '' }] }] };
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
  if (n.parent) return [''];
  switch (n.type) {
    case 'end': case 'note': return [];
    case 'respond': return [''];
    case 'condition': return ['Có', 'Không'];
    case 'classify': return c.cats.map(function (x) { return x.name || 'Nhóm'; }).concat(['Khác']);
    case 'switch': return c.vals.map(function (x) { return x.name || 'Giá trị'; }).concat(['Mặc định']);
    case 'parallel': return [''];
    case 'human': return c.onTimeout === 'branch' ? ['Đã trả lời', 'Quá hạn'] : [''];
    case 'wait': return [''];
  }
  var o = [''];
  if (TYPES[n.type].err && c.err === 'branch') o.push('Lỗi');
  return o;
}
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
    case 'wait': return [];
    case 'decision': return c.outCols.map(function (f) { return f.name; }).filter(Boolean);
    case 'code': return c.outVars.filter(Boolean);
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
    case 'agent': return c.output === 'json' ? c.outVars.filter(Boolean).length + ' trường · ' + c.model : c.model;
    case 'subflow': return c.flow;
    case 'wait': return c.mode === 'until' ? 'Tới ' + (c.at || '...') : 'Chờ ' + c.amount + ' ' + c.aunit;
    case 'respond': return c.outs.map(function (o) { return o.name; }).filter(Boolean).join(', ');
    case 'switch': return c.on ? 'Theo ' + c.on : '';
    case 'parallel': return c.branches.length + ' nhánh · chờ đủ rồi đi tiếp';
    case 'end': return c.status === 'ok' ? 'Thành công' : 'Thất bại';
    case 'code': return c.lang;
    case 'decision': return c.rows.length + ' quy tắc · ' + (c.hit === 'collect' ? 'Gom tất cả' : 'Quy tắc đầu tiên');
    case 'join': return c.mode === 'all' ? 'Chờ tất cả nhánh' : 'Nhánh đầu tiên xong';
    case 'human': return (c.assignee ? c.assignee + ' · ' : '') + c.timeout + ' ' + c.tunit + (c.approveMode === 'all' ? ' · tất cả duyệt' : '');
  }
  return '';
}
function hoursOf(c) { var n = parseFloat(c.timeout) || 0, f = { 'phút': 1 / 60, 'giờ': 1, 'ngày': 24, 'tuần': 168 }[c.tunit]; return n * (f || 24); }
function issuesOf(n, s) {
  var c = n.cfg, m = [];
  switch (n.type) {
    case 'start':
      c.inputs.forEach(function (f) { if (f.name && !f.desc && c.trigger === 'agent') m.push('Đầu vào ' + f.name + ' cần mô tả để Nhân sự số biết truyền gì'); });
      c.inputs.forEach(function (f) { if (!f.name) m.push('Có đầu vào chưa đặt tên'); });
      break;
    case 'agent': if (!c.instructions.trim()) m.push('Cần viết prompt'); if (c.output === 'json' && !c.outVars.filter(Boolean).length) m.push('Cần ít nhất một trường đầu ra'); break;
    case 'classify': if (!c.input) m.push('Cần chọn dữ liệu cần phân loại'); if (c.cats.some(function (x) { return !x.desc.trim(); })) m.push('Mỗi nhóm cần mô tả để AI biết xếp vào đâu'); break;
    case 'extract': if (!c.doc) m.push('Cần chọn tài liệu để trích xuất'); if (!c.fields.length) m.push('Cần ít nhất một trường cần lấy'); break;
    case 'human': if (!c.assignee) m.push('Cần chọn người nhận'); if (!c.title.trim()) m.push('Cần tiêu đề'); if (!c.message.trim()) m.push('Cần nội dung'); if (!c.fields.length) m.push('Cần ít nhất một trường để người duyệt trả lời'); var hh = hoursOf(c); if (hh <= 0) m.push('Cần nhập hạn trả lời'); else if (hh > 720) m.push('Hạn trả lời tối đa 30 ngày'); break;
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
    case 'wait': if (c.mode === 'until') { if (!String(c.at || '').trim()) m.push('Cần chọn thời điểm chạy tiếp'); break; } var th = hoursOf({ timeout: c.amount, tunit: c.aunit }); if (th <= 0) m.push('Cần nhập thời gian chờ'); else if (th > 720) m.push('Chờ tối đa 30 ngày'); break;
    case 'decision': if (!c.outCols.some(function (o) { return o.name; })) m.push('Cần ít nhất một cột kết quả'); if (c.rows.some(function (r) { return !r.when.trim() || !r.then.trim(); })) m.push('Mỗi quy tắc cần điều kiện Khi và kết quả Thì'); break;
    case 'parallel': if (c.branches.length < 2) m.push('Cần ít nhất hai nhánh'); if (c.branches.some(function (b) { return !(b.inner || []).length; })) m.push('Mỗi nhánh cần ít nhất một bước'); break;
    case 'join': if (s.edges.filter(function (e) { return e.to === n.id; }).length < 2) m.push('Nối ít nhất hai nhánh vào bước này'); break;
    case 'code': if (!c.code.trim()) m.push('Cần viết code'); if (!c.outVars.filter(Boolean).length) m.push('Cần khai báo ít nhất một kết quả trả ra'); break;
    case 'respond':
      var st0 = startNode0(s);
      if (st0 && st0.cfg.trigger !== 'agent') m.push('Chỉ dùng khi kích hoạt là Khi Nhân sự số gọi - đổi kiểu kích hoạt ở bước Start hoặc xoá bước này');
      else if (st0) { var slow = slowBefore(n.id, s); if (slow.length) m.push(slow.join(', ') + ' phải đặt sau bước này: Nhân sự số chỉ chờ kết quả 100 giây'); }
      if (!c.outs.length) m.push('Cần ít nhất một dữ liệu trả về'); if (c.outs.some(function (o) { return !o.name.trim(); })) m.push('Cần đặt tên cho mỗi dữ liệu trả về'); if (c.outs.some(function (o) { return o.name.trim() && !String(o.desc || '').trim(); })) m.push('Cần điền giá trị cho mỗi dữ liệu trả về'); break;
  }
  if (n.type !== 'start' && n.type !== 'note' && !n.parent && !s.edges.some(function (e) { return e.to === n.id; })) m.push('Bước này chưa được nối vào luồng');
  return m;
}
function slowBefore(id, s) {
  var byId = {}; s.nodes.forEach(function (n) { byId[n.id] = n; });
  var seen = {}, stack = [id], out = [];
  while (stack.length) { var cur = stack.pop(); s.edges.forEach(function (e) { if (e.to === cur && !seen[e.from]) { seen[e.from] = 1; stack.push(e.from); } }); }
  s.nodes.forEach(function (n) { if ((seen[n.id] || (n.parent && seen[n.parent])) && (n.type === 'human' || n.type === 'wait')) out.push('"' + n.title + '"'); });
  return out;
}
function startNode0(s) { return s.nodes.filter(function (n) { return n.type === 'start'; })[0]; }
function upstreamOf(id, s) {
  var seen = {}, stack = [id], res = [];
  while (stack.length) { var cur = stack.pop(); s.edges.forEach(function (e) { if (e.to === cur && !seen[e.from]) { seen[e.from] = 1; stack.push(e.from); } }); }
  s.nodes.forEach(function (n) { if (seen[n.id] || (n.parent && seen[n.parent])) outputsOf(n).forEach(function (v) { res.push({ v: v, l: v + ' · ' + n.title }); }); });
  return res;
}
function reachable(id, edges) {
  var seen = {}, stack = [id]; seen[id] = 1;
  while (stack.length) { var cur = stack.pop(); edges.forEach(function (e) { if (e.from === cur && !seen[e.to]) { seen[e.to] = 1; stack.push(e.to); } }); }
  return seen;
}
var W = 220, H = 56, HEADB = 57, PH = 32, PG = 8, DIR = 'h';
function sizeOf(n) {
  if (n.type === 'note') { var lines = String(n.cfg.text || '').split('\n').reduce(function (a, t) { return a + Math.max(1, Math.ceil(t.length / 24)); }, 0); return { w: 200, h: Math.max(100, 30 + lines * 19) }; }
  if (n.type === 'parallel') { var L = n.cfg.branches.length, kk = Math.max(1, Math.max.apply(null, n.cfg.branches.map(function (b) { return (b.inner || []).length; }).concat([1]))); return DIR === 'h' ? { w: Math.max(320, 150 + kk * W + (kk - 1) * 48), h: 60 + L * (H + 24) } : { w: Math.max(320, 24 + L * (W + 32)), h: 104 + kk * H + (kk - 1) * 40 + 24 }; }
  if (n.type === 'loop') { var k = Math.max(1, n.cfg.inner.length); return DIR === 'h' ? { w: Math.max(320, 64 + k * W + (k - 1) * 48), h: 180 } : { w: W + 80, h: Math.max(180, 64 + k * H + (k - 1) * 40 + 32) }; }
  var o = outsOf(n);
  if (o.length < 2 || n.parent) return { w: W, h: H };
  if (DIR === 'h') return { w: W, h: HEADB + PG + o.length * PH + (o.length - 1) * PG + 10 };
  return { w: Math.max(W, 24 + o.length * 92 + (o.length - 1) * PG), h: HEADB + PG + PH + 10 };
}
function isBox(n) { return n.type === 'loop' || n.type === 'parallel'; }
function branchy(n) { return !n.parent && !isBox(n) && outsOf(n).length > 1; }
function innerArr(P, ch) { return P.type === 'loop' ? P.cfg.inner : (P.cfg.branches[ch && ch.lane ? ch.lane : 0] || P.cfg.branches[0]).inner; }
function allInner(P) { return P.type === 'loop' ? P.cfg.inner : P.cfg.branches.reduce(function (a, b) { return a.concat(b.inner || []); }, []); }
function inPt(n) { var z = sizeOf(n); if (DIR === 'v') return { x: z.w / 2, y: 0 }; if (isBox(n)) return { x: 0, y: z.h / 2 }; return { x: 0, y: branchy(n) ? HEADB + PG + PH / 2 : H / 2 }; }
function outPt(n, i) {
  var z = sizeOf(n), o = outsOf(n);
  if (!branchy(n)) return DIR === 'h' ? { x: z.w, y: isBox(n) ? z.h / 2 : H / 2 } : { x: z.w / 2, y: z.h };
  if (DIR === 'h') return { x: z.w, y: HEADB + PG + i * (PH + PG) + PH / 2 };
  var pw = (z.w - 24 - (o.length - 1) * PG) / o.length; return { x: 12 + i * (pw + PG) + pw / 2, y: z.h };
}
function innerPos(loop, k, lane) {
  if (loop.type === 'parallel') return DIR === 'h' ? { x: 126 + k * (W + 48), y: 56 + (lane || 0) * (H + 24) } : { x: 24 + (lane || 0) * (W + 32), y: 96 + k * (H + 40) };
  var z = sizeOf(loop);
  if (DIR === 'h') return { x: 32 + k * (W + 48), y: 60 + (z.h - 60 - H) / 2 };
  return { x: 40, y: 64 + k * (H + 40) };
}
function placeInner(nodes) {
  var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
  nodes.forEach(function (l) { if (l.type === 'parallel') { l.cfg.branches.forEach(function (b, li) { (b.inner || []).forEach(function (id, k) { var c = byId[id]; if (!c) return; c.lane = li; var p = innerPos(l, k, li); c.x = l.x + p.x; c.y = l.y + p.y; }); }); return; } if (l.type !== 'loop') return; l.cfg.inner.forEach(function (id, k) { var c = byId[id]; if (!c) return; var p = innerPos(l, k); c.x = l.x + p.x; c.y = l.y + p.y; }); });
  return nodes;
}
function bez(a, b) {
  if (DIR === 'h') { var dx = Math.max(36, Math.abs(b.x - a.x) / 2); return { d: 'M' + a.x + ' ' + a.y + ' C' + (a.x + dx) + ' ' + a.y + ' ' + (b.x - dx) + ' ' + b.y + ' ' + b.x + ' ' + b.y + ' ', m: { x: (a.x + 3 * (a.x + dx) + 3 * (b.x - dx) + b.x) / 8, y: (a.y + b.y) / 2 } }; }
  var dy = Math.max(30, Math.abs(b.y - a.y) / 2); return { d: 'M' + a.x + ' ' + a.y + ' C' + a.x + ' ' + (a.y + dy) + ' ' + b.x + ' ' + (b.y - dy) + ' ' + b.x + ' ' + b.y + ' ', m: { x: (a.x + b.x) / 2, y: (a.y + 3 * (a.y + dy) + 3 * (b.y - dy) + b.y) / 8 } };
}
function absPt(n, p) { return { x: n.x + p.x, y: n.y + p.y }; }
// Sắp xếp theo lớp, giống "Tidy up" của Copilot: mỗi bước cách bước trước một cột, bước hội tụ canh giữa các bước cha
function layoutFlow(f) {
  var main = f.nodes.filter(function (n) { return !n.parent && n.type !== 'note'; }), byId = {};
  main.forEach(function (n) { byId[n.id] = n; });
  var ed = f.edges.filter(function (e) { return byId[e.from] && byId[e.to]; });
  var rank = {}, st = main.filter(function (n) { return n.type === 'start'; })[0];
  if (st) rank[st.id] = 0;
  for (var it = 0; it <= main.length; it++) {
    var ch = false;
    ed.forEach(function (e) { if (rank[e.from] === undefined || (st && e.to === st.id)) return; var r = rank[e.from] + 1; if (r <= main.length && (rank[e.to] === undefined || r > rank[e.to])) { rank[e.to] = r; ch = true; } });
    if (!ch) break;
  }
  var maxR = -1; main.forEach(function (n) { if (rank[n.id] !== undefined) maxR = Math.max(maxR, rank[n.id]); });
  var cols = []; for (var r = 0; r <= maxR; r++) cols.push([]);
  main.forEach(function (n) { if (rank[n.id] !== undefined) cols[rank[n.id]].push(n); });
  var MA = DIR === 'h' ? 'x' : 'y', CR = DIR === 'h' ? 'y' : 'x', SM = DIR === 'h' ? 'w' : 'h', SC = DIR === 'h' ? 'h' : 'w';
  var GAPM = DIR === 'h' ? 64 : 56, GAPC = DIR === 'h' ? 28 : 40, pos = 0, order = {};
  cols.forEach(function (col, ri) {
    var span = 0; col.forEach(function (n) { span = Math.max(span, sizeOf(n)[SM]); });
    col.forEach(function (n) {
      var inc = ed.filter(function (e) { return e.to === n.id && rank[e.from] < ri; }), want = 0, key = 0;
      if (inc.length) {
        inc.forEach(function (e) { var p = byId[e.from]; want += p[CR] + outPt(p, e.out)[CR]; });
        want = want / inc.length - inPt(n)[CR];
        key = Math.min.apply(null, inc.map(function (e) { return (order[e.from] || 0) * 100 + e.out; }));
      }
      n._want = want; n._key = key; n[MA] = pos;
    });
    col.sort(function (a, b) { return a._key - b._key || a._want - b._want; });
    var end = -1e9;
    col.forEach(function (n, i) { var c = Math.max(n._want, end + GAPC); n[CR] = Math.round(c); end = c + sizeOf(n)[SC]; order[n.id] = ri * 1000 + i; delete n._want; delete n._key; });
    pos += span + GAPM;
  });
  var maxC = 0, minC = 1e9; main.forEach(function (n) { if (rank[n.id] !== undefined) { maxC = Math.max(maxC, n[CR] + sizeOf(n)[SC]); minC = Math.min(minC, n[CR]); } });
  main.forEach(function (n) { if (rank[n.id] === undefined) { n[MA] = 0; n[CR] = maxC + 60; maxC += sizeOf(n)[SC] + 24; } });
  f.nodes.forEach(function (n) { if (n.type === 'note' && !n.x && !n.y) { n[MA] = 0; n[CR] = maxC + 60; maxC += 124; } });
  placeInner(f.nodes);
  return f;
}

var SUGGEST = [
  { key: 'buy', label: 'Duyệt đề nghị mua sắm', name: 'Duyệt đề nghị mua sắm', text: 'Hệ thống gửi đề nghị mua sắm kèm chứng từ qua HTTP. Đọc chứng từ, nếu vượt 50 triệu thì giám đốc duyệt, không thì tự duyệt. Duyệt xong tạo PO trên SAP ERP, từ chối thì gửi email báo lại.' },
  { key: 'mbl-rules', label: 'Rule bồi thường MB Life', name: 'Rule thẩm định MB Life', text: 'Nhân sự số gửi hồ sơ bồi thường đã đọc OCR và số hợp đồng MB Life. Lấy Policy, lịch sử bồi thường và bảng tham chiếu cùng lúc, chạy rule chứng từ, hiệu lực và thẩm định không dùng LLM, trả về PASS, WARN, NOT_EVALUATED cho từng rule.' },
  { key: 'invoice', label: 'Đối chiếu hoá đơn với PO', name: 'Đối chiếu hoá đơn với PO', text: 'Khi hệ thống kế toán gửi hoá đơn VAT qua HTTP, đọc số tiền, lấy PO tương ứng từ ERP để so khớp. Khớp thì ghi nhận công nợ, lệch thì chuyển kế toán xem lại.' },
  { key: 'loan', label: 'Tiếp nhận hồ sơ vay', name: 'Tiếp nhận hồ sơ vay', text: 'Nhận hồ sơ vay gồm CCCD và sao kê lương. Đọc CCCD và sao kê, chấm điều kiện tín dụng trên LOS. Đạt thì tạo hồ sơ, cần thẩm định thì chuyển chuyên viên.' }
];
function N(id, type, title, cfg) { return { id: id, type: type, title: title, x: 0, y: 0, cfg: Object.assign(defaultCfg(type), cfg || {}) }; }
function E(list) { return list.map(function (a) { return { from: a[0], out: a[1], to: a[2] }; }); }
function I(name, t, desc) { return { name: name, t: t, desc: desc }; }
function F(names) { return names.map(function (x) { return { name: x, desc: '' }; }); }
function C(name, v, op, val) { return { name: name, logic: 'VÀ', rows: [{ v: v, op: op, val: val }] }; }
function O(name, t, desc) { return { name: name, t: t, desc: desc }; }
function lane(name, ids) { return { name: name, desc: '', inner: ids }; }
function kid(n, parent, ln) { n.parent = parent; n.lane = ln || 0; return n; }
function draftFlow(key) {
  var f;
  if (key === 'invoice') f = {
    nodes: [
      N('n1', 'start', 'Start', { trigger: 'http', inputs: [I('ma_po', 'Văn bản', 'Mã đơn mua hàng'), I('tep_hoa_don', 'Tệp', 'Hoá đơn PDF hoặc XML')] }),
      N('n2', 'agent', 'Đọc hoá đơn', { doc: 'tep_hoa_don', instructions: 'Đọc hoá đơn {{tep_hoa_don}}, lấy số hoá đơn, tổng tiền, mã số thuế.', output: 'json', outVars: ['so_hd', 'so_tien', 'ma_so_thue'] }),
      N('n3', 'tool', 'Lấy PO từ ERP', { tool: 'ERP nội bộ · Lấy PO', acc: 'space', params: '{{ma_po}}', err: 'branch' }),
      N('n4', 'condition', 'Khớp với PO?', { cases: [C('Có', 'so_tien', 'Bằng', '{{po_tong_tien}}')] }),
      N('n5', 'tool', 'Ghi nhận công nợ', { tool: 'SAP ERP · Ghi nhận công nợ', acc: 'space', params: '{{ma_po}}, {{so_hd}}, {{so_tien}}' }),
      N('n6', 'human', 'Kế toán xem lại', { assignee: 'Nhóm Kế toán công nợ', title: 'Hoá đơn lệch PO', message: 'Hoá đơn {{so_hd}} lệch với PO {{ma_po}}. Hoá đơn: {{so_tien}}, PO: {{po_tong_tien}}.', fields: [{ name: 'quyet_dinh', desc: 'Chấp nhận / Trả lại' }, { name: 'y_kien', desc: 'Ý kiến' }], timeout: '2', tunit: 'ngày', onTimeout: 'branch' }),
      N('n7', 'condition', 'Kế toán chấp nhận?', { cases: [C('Có', 'quyet_dinh', 'Bằng', 'Chấp nhận')] }),
      N('n8', 'tool', 'Báo nhà cung cấp', { tool: 'Gmail · Gửi email', acc: 'space', params: 'Hoá đơn {{so_hd}} bị trả lại: {{y_kien}}' }),
      N('n10', 'end', 'Đã ghi nhận', { status: 'ok' }),
      N('n11', 'end', 'Trả lại nhà cung cấp', { status: 'ok', message: 'Hoá đơn lệch PO, đã báo nhà cung cấp' }),
      N('n9', 'end', 'Cần xử lý tay', { status: 'fail', message: 'Không lấy được PO từ ERP' })
    ],
    edges: E([['n1', 0, 'n2'], ['n2', 0, 'n3'], ['n3', 0, 'n4'], ['n3', 1, 'n9'], ['n4', 0, 'n5'], ['n4', 1, 'n6'], ['n6', 0, 'n7'], ['n6', 1, 'n8'], ['n7', 0, 'n5'], ['n7', 1, 'n8'], ['n5', 0, 'n10'], ['n8', 0, 'n11']])
  };
  else if (key === 'loan') f = {
    nodes: [
      N('n1', 'start', 'Start', { trigger: 'manual', inputs: [I('cccd', 'Tệp', 'Ảnh hai mặt CCCD'), I('sao_ke', 'Tệp', 'Sao kê 3 tháng'), I('so_tien_vay', 'Số', 'Đơn vị đồng')] }),
      N('n2', 'agent', 'Đọc CCCD', { doc: 'cccd', instructions: 'Đọc CCCD {{cccd}}, lấy số CCCD, họ tên, ngày sinh, ngày hết hạn.', output: 'json', outVars: ['so_cccd', 'ho_ten', 'ngay_sinh', 'ngay_het_han'] }),
      N('n3', 'agent', 'Đọc sao kê', { doc: 'sao_ke', instructions: 'Đọc sao kê {{sao_ke}}, tính thu nhập trung bình mỗi tháng và số tháng có lương.', output: 'json', outVars: ['thu_nhap_tb', 'so_thang'] }),
      N('n4', 'tool', 'Chấm điều kiện tín dụng', { tool: 'LOS · Chấm điều kiện', acc: 'space', params: '{{so_tien_vay}}, {{thu_nhap_tb}}, {{so_thang}}' }),
      N('n5', 'switch', 'Kết quả chấm', { on: 'ket_qua_cham', vals: [{ name: 'Đạt', desc: '' }, { name: 'Cần thẩm định', desc: '' }] }),
      N('n6', 'human', 'Chuyên viên thẩm định', { assignee: 'Nhóm Thẩm định bán lẻ', title: 'Thẩm định hồ sơ vay', message: 'Hồ sơ {{ho_ten}}, vay {{so_tien_vay}}. Thu nhập trung bình {{thu_nhap_tb}}.', fields: [{ name: 'quyet_dinh', desc: 'Duyệt / Từ chối' }, { name: 'y_kien', desc: 'Ý kiến' }], timeout: '2', tunit: 'ngày', onTimeout: 'stop' }),
      N('n7', 'condition', 'Được duyệt?', { cases: [C('Có', 'quyet_dinh', 'Bằng', 'Duyệt')] }),
      N('n8', 'tool', 'Tạo hồ sơ trên LOS', { tool: 'LOS · Tạo hồ sơ vay', acc: 'space', params: '{{so_cccd}}, {{so_tien_vay}}' }),
      N('n9', 'end', 'Đã tạo hồ sơ', { status: 'ok' }),
      N('n10', 'end', 'Không đạt', { status: 'fail', message: 'Hồ sơ không đạt điều kiện' })
    ],
    edges: E([['n1', 0, 'n2'], ['n2', 0, 'n3'], ['n3', 0, 'n4'], ['n4', 0, 'n5'], ['n5', 0, 'n8'], ['n5', 1, 'n6'], ['n5', 2, 'n10'], ['n6', 0, 'n7'], ['n7', 0, 'n8'], ['n7', 1, 'n10'], ['n8', 0, 'n9']])
  };
  else if (key === 'mbl-rules') f = {
    nodes: [
      N('n1', 'start', 'Start', { trigger: 'agent', inputs: [I('ho_so_ocr', 'Văn bản', 'Kết quả đọc hồ sơ từ Doc Agent (JSON)'), I('so_hop_dong', 'Văn bản', 'Số hợp đồng MB Life'), I('claim_type', 'Văn bản', 'Mã claim type, VD: IP-Sur')] }),
      N('n2', 'parallel', 'Lấy dữ liệu đối chiếu', { branches: [lane('Policy', ['n3']), lane('Lịch sử bồi thường', ['n4']), lane('Bảng tham chiếu', ['n5'])] }),
      kid(N('n3', 'tool', 'Tra Policy', { tool: 'MB Life · Policy Info', acc: 'space', params: '{{so_hop_dong}}' }), 'n2', 0),
      kid(N('n4', 'tool', 'Lấy lịch sử bồi thường', { tool: 'MB Life · Lịch sử bồi thường', acc: 'space', params: '{{so_hop_dong}}' }), 'n2', 1),
      kid(N('n5', 'tool', 'Tra bảng tham chiếu', { tool: 'Bảng tham chiếu · Tra cứu', acc: 'space', params: 'ICD trong {{ho_so_ocr}}' }), 'n2', 2),
      N('n6', 'condition', 'Đủ dữ liệu?', { cases: [C('Có', 'hop_dong', 'Khác', 'null')] }),
      N('n7', 'tool', 'Chạy rule D, E, A', { tool: 'MB Life · Rule engine', acc: 'space', params: '{{ho_so_ocr}}, {{hop_dong}}, {{lich_su}}, {{nhom_benh}}, {{claim_type}}' }),
      N('n8', 'variable', 'Tổng hợp kết quả', { vars: [{ name: 'ket_luan', value: '{{so_warn}} WARN, {{so_not_evaluated}} NOT_EVALUATED' }] }),
      N('n9', 'respond', 'Trả kết quả rule', { outs: [{ name: 'ket_qua_rule', desc: '{{ket_qua_rule}}' }, { name: 'so_warn', desc: '{{so_warn}}' }, { name: 'so_not_evaluated', desc: '{{so_not_evaluated}}' }, { name: 'rule_version', desc: '{{rule_version}}' }, { name: 'ket_luan', desc: '{{ket_luan}}' }] }),
      N('n10', 'end', 'Xong', { status: 'ok' }),
      N('n11', 'respond', 'Trả NOT_EVALUATED', { outs: [{ name: 'ket_qua_rule', desc: 'NOT_EVALUATED' }, { name: 'ly_do', desc: 'Không tìm thấy hợp đồng {{so_hop_dong}}' }] }),
      N('n12', 'end', 'Thiếu dữ liệu', { status: 'fail', message: 'Không tìm thấy hợp đồng' }),
      N('n13', 'note', 'Cách dựng', { text: 'Không dùng LLM: rule D, E, A chạy trong API rule engine của MB Life, gọi qua Tool. Ba nguồn dữ liệu lấy cùng lúc trong khối Parallel. Mọi nhánh đều trả kết quả cho Nhân sự số trong 100 giây.' })
    ],
    edges: E([['n1', 0, 'n2'], ['n2', 0, 'n6'], ['n6', 0, 'n7'], ['n6', 1, 'n11'], ['n7', 0, 'n8'], ['n8', 0, 'n9'], ['n9', 0, 'n10'], ['n11', 0, 'n12']])
  };
  else f = {
    nodes: [
      N('n1', 'start', 'Start', { trigger: 'http', inputs: [I('chung_tu', 'Tệp', 'Báo giá hoặc đề nghị đã ký'), I('nguoi_de_nghi', 'Email', 'Email công ty của người đề nghị'), I('so_tien', 'Số', 'Tổng tiền đề nghị, đơn vị đồng')] }),
      N('n2', 'agent', 'Đọc chứng từ', { doc: 'chung_tu', instructions: 'Đọc chứng từ {{chung_tu}}, lấy nhà cung cấp và danh mục hàng.', output: 'json', outVars: ['nha_cung_cap', 'danh_muc'] }),
      N('n3', 'condition', 'Trên 50 triệu?', { cases: [C('Có', 'so_tien', 'Lớn hơn', '50000000')] }),
      N('n4', 'human', 'Giám đốc duyệt', { assignee: 'Giám đốc khối của người đề nghị', title: 'Duyệt đề nghị mua sắm', message: '{{nguoi_de_nghi}} đề nghị mua {{danh_muc}} của {{nha_cung_cap}}, số tiền {{so_tien}}.', fields: [{ name: 'quyet_dinh', desc: 'Duyệt / Từ chối / Cần bổ sung' }, { name: 'y_kien', desc: 'Ý kiến' }], timeout: '3', tunit: 'ngày', onTimeout: 'branch' }),
      N('n5', 'switch', 'Giám đốc quyết định', { on: 'quyet_dinh', vals: [{ name: 'Duyệt', desc: '' }, { name: 'Cần bổ sung', desc: '' }] }),
      N('n6', 'tool', 'Tạo PO trên SAP ERP', { tool: 'SAP ERP · Tạo đơn mua hàng', acc: 'space', params: '{{nha_cung_cap}}, {{so_tien}}' }),
      N('n7', 'tool', 'Báo người đề nghị', { tool: 'Gmail · Gửi email', acc: 'space', params: 'Gửi {{nguoi_de_nghi}}: đề nghị chưa được duyệt. {{y_kien}}' }),
      N('n8', 'end', 'Đã tạo PO', { status: 'ok' }),
      N('n9', 'end', 'Không duyệt', { status: 'fail', message: 'Đề nghị không được duyệt hoặc quá hạn' })
    ],
    edges: E([['n1', 0, 'n2'], ['n2', 0, 'n3'], ['n3', 0, 'n4'], ['n3', 1, 'n6'], ['n4', 0, 'n5'], ['n4', 1, 'n7'], ['n5', 0, 'n6'], ['n5', 1, 'n7'], ['n5', 2, 'n7'], ['n6', 0, 'n8'], ['n7', 0, 'n9']])
  };
  return layoutFlow(f);
}
function pickKey(text) { var t = norm(text); if (t.indexOf('mb life') >= 0 || t.indexOf('boi thuong') >= 0) return 'mbl-rules'; if (t.indexOf('hoa don') >= 0) return 'invoice'; if (t.indexOf('vay') >= 0 || t.indexOf('ho so') >= 0) return 'loan'; return 'buy'; }
var MOCK = { ket_qua_cham: 'Cần thẩm định', hop_dong: 'MBL-0091234', lich_su: '2 lần, 2025', thu_nhap_tb: '32000000', so_thang: '3', po_tong_tien: '75000000', po_trang_thai: 'Đã duyệt', ma_lan_chay: 'QT-2026-0193', san_pham: 'Tiêu dùng', ma_ho_so_vay: 'HSV-2026-118', xu_ly: 'Đã xử lý', ket_qua_rule: 'D1 PASS, D2 PASS, D5 PASS, E1 PASS, E2 PASS, E3 NOT_EVALUATED, A2 WARN', so_warn: '1', so_not_evaluated: '1', rule_version: 'MBL-HSCR3-2026.10', ket_qua_e_a: 'E1 PASS, E2 PASS, E3 NOT_EVALUATED, A2 WARN', so_luong_nhan: '20', so_luong_hd: '20', so_tien_hd: '120000000', chenh_lech: '0', tep_hoa_don: 'HD-55812.pdf', so_hd: 'HD-55812', yeu_cau: '20 license Microsoft 365 E3, 12 tháng', tong_tien: '120000000', loai_hang: 'Phần mềm', ngan_sach_con: '300000000', bang_so_sanh: 'FPT IS 120tr · CMC 128tr · Viettel 131tr', khop: 'true', so_phieu_nhap: 'PNK-1021', so_hoa_don: 'HD-55812', nha_cung_cap: 'Công ty TNHH Phong Vũ', danh_muc: '20 laptop Dell Latitude', ma_so_thue: '0101234567', ngay_hd: '2026-10-18', so_cccd: '001090012345', ho_ten: 'Nguyễn Văn An', ngay_sinh: '1990-05-12', dat: 'true', ly_do: 'Thu nhập trung bình 32 triệu/tháng, đủ điều kiện', tra_loi: 'Đã xử lý xong', ma_po: 'PO-2026-0481', so_tien: '75000000', ma_but_toan: 'BT-77120', status: '200' };
function mockOf(k) { return MOCK[k] !== undefined ? MOCK[k] : 'Mẫu ' + k; }
function sampleOf(f) { if (MOCK[f.name] !== undefined) return MOCK[f.name]; var m = { 'Số': '75000000', 'Ngày': '2026-10-20', 'Tệp': f.name + '.pdf', 'Có / Không': 'true', 'Email': 'lan.nt@fpt.com' }; return m[f.t] || 'Mẫu ' + f.name; }
function msOf(type, seed) { var base = { agent: 2400, classify: 900, extract: 1300, tool: 540, func: 260, subflow: 1800 }; return (base[type] || 6) + (seed * 37) % (base[type] ? 400 : 9); }
function evalClause(cl, vars) {
  var m = cl.trim().match(/^([a-z0-9_]+)\s*(>=|<=|!=|>|<|=|thuộc)\s*(.+)$/i); if (!m) return false;
  var a = vars[m[1]], b = fill(m[3].trim(), vars); if (a === undefined) return false;
  var na = parseFloat(a), nb = parseFloat(b);
  switch (m[2]) { case '>': return na > nb; case '<': return na < nb; case '>=': return na >= nb; case '<=': return na <= nb; case '!=': return String(a) !== b; case '=': return String(a) === b; }
  return b.split(',').map(function (x) { return x.trim(); }).indexOf(String(a)) >= 0;
}
function evalDecision(c, vars) {
  var res = {}, hits = [], setK = {};
  c.outCols.forEach(function (o) { if (o.name) res[o.name] = o.desc; });
  for (var i = 0; i < c.rows.length; i++) {
    var r = c.rows[i], ok = r.when.split(/\s+và\s+/i).every(function (cl) { return cl.trim() === '-' || evalClause(cl, vars); });
    if (!ok) continue; hits.push(i + 1);
    r.then.split(';').forEach(function (kv) { var p = kv.split('='); if (p.length < 2) return; var k = p[0].trim(), v = p.slice(1).join('=').trim(); res[k] = !setK[k] ? v : (v === 'true' || res[k] === 'true' ? 'true' : (res[k] === v ? v : res[k] + ', ' + v)); setK[k] = 1; });
    if (c.hit !== 'collect') break;
  }
  return { vals: res, hits: hits };
}
function fill(t, vars) { return String(t || '').replace(/\{\{([^}]*)\}\}/g, function (m, k) { var v = vars[k.trim()]; return v !== undefined ? v : m; }); }

class ProcessBuilderInner extends React.Component<any, any> {
  constructor(props) {
    super(props);
    this.seq = 30;
    this.state = {
      screen: 'list', view: 'table', createOpen: false, ckind: 'chat', prompt: '', draftName: '', drafting: false, aiBanner: false, kind: 'all',
      name: '', nodes: [], edges: [], sel: null, tab: 'cfg', hist: [], top: 'build',
      add: null, palOpen: true, picking: null, drag: null, z: 1, px: 80, py: 80, dir: 'h', fut: [], link: null, ctx: null, panel: null, expand: false, section: 'flow', sideOpen: true, moreOpen: false,
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
  snap() { var s = this.state; return { hist: s.hist.concat([{ nodes: clone(s.nodes), edges: clone(s.edges) }]).slice(-40), fut: [] }; }
  undo() { if (this.ro()) return; var s = this.state, h = s.hist; if (!h.length) return; var p = h[h.length - 1]; this.setState({ nodes: p.nodes, edges: p.edges, hist: h.slice(0, -1), fut: (s.fut || []).concat([{ nodes: clone(s.nodes), edges: clone(s.edges) }]), sel: null, add: null, ctx: null }); }
  redo() { if (this.ro()) return; var s = this.state, f = s.fut || []; if (!f.length) return; var p = f[f.length - 1]; this.setState({ nodes: p.nodes, edges: p.edges, fut: f.slice(0, -1), hist: s.hist.concat([{ nodes: clone(s.nodes), edges: clone(s.edges) }]), sel: null, add: null, ctx: null }); }
  // Mọi thay đổi cấu trúc đi qua đây: lưu lịch sử, tự sắp xếp lại như Copilot, cuộn tới bước mới
  ro() { return !!(this.props && this.props.readOnly); }
  roStop() { if (!this.ro()) return false; this.showToast('Bạn chỉ xem được Quy trình này.'); return true; }
  commit(nodes, edges, extra, focusId) {
    if (this.ro()) return;
    DIR = this.state.dir;
    var f = layoutFlow({ nodes: clone(nodes), edges: edges });
    this.setState(Object.assign(this.snap(), { nodes: f.nodes, edges: edges, ctx: null }, extra || {}));
    var self = this;
    if (focusId) setTimeout(function () { self.ensureVisible(focusId); }, 0);
  }
  relayoutSoon() {
    var self = this;
    setTimeout(function () { DIR = self.state.dir; var f = layoutFlow({ nodes: clone(self.state.nodes), edges: self.state.edges }); self.setState({ nodes: f.nodes }); }, 0);
  }

  openBuilder(key, name, fromAi) {
    clearTimeout(this.timer);
    DIR = 'h';
    var f = key ? draftFlow(key) : layoutFlow({ nodes: [N('n1', 'start', 'Start', {})], edges: [] });
    this.setState({ outs: f.outs || [], screen: 'builder', createOpen: false, drafting: false, aiBanner: !!fromAi, name: name || 'Quy trình chưa đặt tên', savedName: name || 'Quy trình chưa đặt tên', desc: '', nameErr: false, panelHidden: !!(this.props && this.props.embedded) && f.nodes.length > 2, nodes: f.nodes, edges: f.edges, dir: 'h',
      sel: null, tab: 'cfg', hist: [], fut: [], add: null, checkOpen: false, pubOpen: false, status: 'draft', last: {}, run: null, runOpen: false, top: 'build', picking: null, panel: null, ctx: null, link: null, expand: false, section: 'flow', sideOpen: true, moreOpen: false });
    var self = this; setTimeout(function () { self.fit(1); }, 40);
  }
  canvasSize() { var el = this.canvasEl; return { w: el ? el.clientWidth : 1440, h: el ? el.clientHeight : 850 }; }
  insets() { var s = this.state, panel = (s.sel || s.runOpen || !s.panelHidden) ? (s.expand ? 640 : 476) : 0; return { l: s.palOpen ? 248 : 40, r: panel + 24 }; }
  fit(minZ) {
    var nodes = this.state.nodes; if (!nodes.length) return;
    DIR = this.state.dir;
    var cs = this.canvasSize(), ins = this.insets(), minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (n) { var z = sizeOf(n); minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + z.w); maxY = Math.max(maxY, n.y + z.h); });
    var aw = Math.max(200, cs.w - ins.l - ins.r), w = maxX - minX, h = maxY - minY;
    var z = Math.min(1, (aw - 40) / w, (cs.h - 120) / h); z = Math.floor(z * 20) / 20;
    var lo = minZ || 0.3; if (z < lo) z = lo;
    var px = ins.l + Math.max(20, (aw - w * z) / 2) - minX * z, py = Math.max(70, (cs.h - h * z) / 2) - minY * z;
    if (nodes.length === 1) { z = 1; px = ins.l + 120 - minX; py = cs.h * 0.4 - minY; }
    this.setState({ z: z, px: px, py: py });
  }
  ensureVisible(id) {
    var s = this.state, n = this.byId(id); if (!n) return;
    DIR = s.dir;
    var cs = this.canvasSize(), ins = this.insets(), z = s.z, sz = sizeOf(n);
    var x0 = s.px + n.x * z, y0 = s.py + n.y * z, x1 = x0 + sz.w * z, y1 = y0 + sz.h * z;
    var px = s.px, py = s.py;
    if (x1 > cs.w - ins.r - 24) px -= x1 - (cs.w - ins.r - 80);
    if (x0 < ins.l + 16) px += ins.l + 60 - x0;
    if (y1 > cs.h - 60) py -= y1 - (cs.h - 100);
    if (y0 < 60) py += 100 - y0;
    if (px !== s.px || py !== s.py) this.setState({ px: px, py: py });
  }
  locked() { var r = this.state.run; return !!(r && (r.status === 'running' || r.status === 'paused')); }
  byId(id) { return this.state.nodes.filter(function (n) { return n.id === id; })[0]; }

  autoFrom() {
    var s = this.state, free = function (n) { var o = outsOf(n); for (var i = 0; i < o.length; i++) if (!s.edges.some(function (e) { return e.from === n.id && e.out === i; })) return i; return -1; };
    var sn = this.byId(s.sel);
    if (sn && !sn.parent && sn.type !== 'note') { var fi = free(sn); if (fi >= 0) return { id: sn.id, out: fi }; var e0 = s.edges.filter(function (e) { return e.from === sn.id; })[0]; if (e0) return { edge: e0 }; }
    for (var i = s.nodes.length - 1; i >= 0; i--) { var n = s.nodes[i]; if (n.type === 'note' || n.parent) continue; var f = free(n); if (f >= 0) return { id: n.id, out: f }; }
    return null;
  }
  openAdd(opts) {
    if (this.roStop()) return;
    if (this.locked()) { this.showToast('Đang chạy thử. Dừng chạy thử để sửa Quy trình.'); return; }
    this.setState({ add: Object.assign({ tab: 'featured', level: 'root', q: '', idx: 0 }, opts || {}), checkOpen: false, pubOpen: false, ctx: null });
  }
  palPick(type) {
    if (this.roStop()) return;
    if (this.locked()) { this.showToast('Đang chạy thử. Dừng chạy thử để sửa Quy trình.'); return; }
    var s = this.state, sn = this.byId(s.sel);
    var loopId = sn ? (isBox(sn) ? sn.id : sn.parent) : null;
    if (loopId && type !== 'note') {
      var box = this.byId(loopId), lane = sn.parent ? (sn.lane || 0) : (box.type === 'parallel' ? Math.max(0, box.cfg.branches.findIndex(function (b) { return !(b.inner || []).length; })) : 0);
      var at = sn.parent ? innerArr(box, sn).indexOf(sn.id) + 1 : undefined;
      if (type === 'tool') { this.openAdd({ mode: 'inner', loopId: loopId, lane: lane, at: at, tab: 'tool', level: 'root' }); return; }
      if (INNER_OK.indexOf(type) < 0) { this.showToast(box.type === 'loop' ? 'Trong vòng lặp chỉ thêm được các bước chạy thẳng, không rẽ nhánh.' : 'Trong mỗi nhánh song song chỉ thêm được các bước chạy thẳng, không rẽ nhánh.'); return; }
      this.addInner(loopId, type, null, null, at, lane); return;
    }
    if (type === 'tool') { var a = this.autoFrom(); this.openAdd(Object.assign({ tab: 'tool' }, a && a.edge ? { edge: a.edge } : { from: a })); return; }
    if (type === 'note') { this.addNode('note', null); return; }
    var at2 = this.autoFrom();
    if (at2 && at2.edge) this.insertOnEdge(type, at2.edge); else this.addNode(type, at2);
  }
  addInner(loopId, type, preset, title, at, lane) {
    if (this.roStop() || this.capFull()) return;
    var s = this.state, node = this.makeNode(type, preset, title); node.parent = loopId; node.lane = lane || 0;
    var put = function (arr) { var inner = arr.slice(); if (at === undefined || at > inner.length) inner.push(node.id); else inner.splice(at, 0, node.id); return inner; };
    var nodes = s.nodes.map(function (n) { if (n.id !== loopId) return n; if (n.type === 'parallel') return Object.assign({}, n, { cfg: Object.assign({}, n.cfg, { branches: n.cfg.branches.map(function (b, i) { return i === (lane || 0) ? Object.assign({}, b, { inner: put(b.inner || []) }) : b; }) }) }); return Object.assign({}, n, { cfg: Object.assign({}, n.cfg, { inner: put(n.cfg.inner) }) }); }).concat([node]);
    this.commit(nodes, s.edges, { add: null, sel: node.id, tab: 'cfg', runOpen: false, panel: null }, node.id);
  }
  addItems() {
    var a = this.state.add; if (!a) return [];
    var st = this.state, q = norm(a.q).trim(), res = [], match = function (t) { return !q || norm(t).indexOf(q) >= 0; };
    var T = function (k, g, extra) { var t = TYPES[k], c = COL[t.c]; return Object.assign({ g: g, type: k, name: t.name, desc: '', icon: t.icon, tile: c[0], tileBg: c[1] }, extra || {}); };
    var start = st.nodes.filter(function (n) { return n.type === 'start'; })[0];
    if (a.mode === 'inner') {
      if (a.tab === 'tool') { TOOLS.forEach(function (t) { if (match(t.name)) res.push({ g: 'Tool đã kết nối', type: 'tool', preset: { tool: t.name, acc: 'space' }, title: t.name.split(' · ')[1], name: t.name, desc: t.desc, icon: ICON.tool, tile: COL.integ[0], tileBg: COL.integ[1], tag: 'Đã kết nối' }); }); return res; }
      var boxN = this.byId(a.loopId), gname = boxN && boxN.type === 'parallel' ? 'Bước trong nhánh ' + ((boxN.cfg.branches[a.lane || 0] || {}).name || '') : 'Bước trong vòng lặp';
      INNER_OK.forEach(function (k) { if (match(TYPES[k].name + ' ' + TYPES[k].kw)) res.push(Object.assign(T(k, gname), k === 'tool' ? { more: true, goTab: 'tool' } : {})); });
      return res;
    }
    if (a.tab === 'tool' || q) TOOLS.forEach(function (t) { if (match(t.name + ' ' + t.desc + ' tool')) res.push({ g: 'Tool đã kết nối', type: 'tool', preset: { tool: t.name, acc: 'space' }, title: t.name.split(' · ')[1], name: t.name, desc: t.desc, icon: ICON.tool, tile: COL.integ[0], tileBg: COL.integ[1], tag: 'Đã kết nối' }); });
    if (a.tab === 'featured' || q) {
      if (!q) {
        res.push(Object.assign(T('tool', 'Hay dùng'), { more: true, goTab: 'tool' }));
        res.push(T('human', 'Hay dùng'));
      }
      ['agent', 'human', 'variable', 'respond', 'condition', 'switch', 'parallel', 'loop', 'wait', 'end', 'note'].forEach(function (k) {
        if (!q && k === 'human') return;
        if (match(TYPES[k].name + ' ' + TYPES[k].kw + ' ' + TYPES[k].desc)) res.push(T(k, 'Bước', { desc: q ? TYPES[k].desc : '' }));
      });
    }
    if (a.from && a.tab === 'featured') {
      var anc = {}, stack = [a.from.id]; anc[a.from.id] = 1;
      while (stack.length) { var cur = stack.pop(); st.edges.forEach(function (e) { if (e.to === cur && !anc[e.from]) { anc[e.from] = 1; stack.push(e.from); } }); }
      st.nodes.forEach(function (n) { if (anc[n.id] || n.type === 'start' || n.type === 'note' || n.parent) return; if (match(n.title + ' noi co san')) { var c = colOf(n.type); res.push({ g: 'Nối tới bước có sẵn', connect: n.id, name: n.title, desc: '', icon: TYPES[n.type].icon, tile: c[0], tileBg: c[1] }); } });
    }
    return res;
  }
  pickAdd(it) {
    var a = this.state.add; if (!a) return;
    if (it.goTab) { this.setState({ add: Object.assign({}, a, { tab: it.goTab, idx: 0 }) }); return; }
    if (it.goLevel) { this.setState({ add: Object.assign({}, a, { level: it.goLevel, idx: 0 }) }); return; }
    if (a.mode === 'inner') { this.addInner(a.loopId, it.type, it.preset, it.title, a.at, a.lane); return; }
    if (it.connect) { this.connect(a.from, it.connect); return; }
    if (it.type === 'note') { this.addNode('note', null); return; }
    if (a.edge) this.insertOnEdge(it.type, a.edge, it.preset, it.title); else this.addNode(it.type, a.from || null, it.preset, it.title);
  }
  connect(from, toId) {
    if (this.roStop()) return;
    var edges = this.state.edges.filter(function (e) { return !(e.from === from.id && e.out === from.out); }).concat([{ from: from.id, out: from.out, to: toId }]);
    this.commit(this.state.nodes, edges, { add: null });
  }
  makeNode(type, preset, title) { this.seq += 1; return { id: 'n' + this.seq, type: type, title: title || TYPES[type].name, x: 0, y: 0, cfg: Object.assign(defaultCfg(type), preset || {}) }; }
  capFull() { if (this.state.nodes.length >= 500) { this.showToast('Quy trình đã đủ 500 bước - Tách bớt sang Subflow rồi thêm lại.'); return true; } return false; }
  addNode(type, from, preset, title) {
    if (this.capFull()) return;
    if (this.roStop()) return;
    var s = this.state, node = this.makeNode(type, preset, title), src = from ? this.byId(from.id) : null;
    if (type === 'note') {
      var cs = this.canvasSize(); node.x = Math.round((cs.w / 2 - s.px) / s.z - 100); node.y = Math.round((80 - s.py) / s.z);
      this.setState(Object.assign(this.snap(), { nodes: s.nodes.concat([node]), sel: node.id, tab: 'cfg', add: null, runOpen: false, panel: null })); return;
    }
    var edges = s.edges.slice(); if (src) edges.push({ from: src.id, out: from.out, to: node.id });
    this.commit(s.nodes.concat([node]), edges, { sel: node.id, tab: 'cfg', add: null, runOpen: false, aiBanner: false, picking: null, panel: null }, node.id);
  }
  insertOnEdge(type, e, preset, title) {
    if (this.capFull()) return;
    if (this.roStop()) return;
    var s = this.state, node = this.makeNode(type, preset, title);
    var edges = s.edges.filter(function (x) { return !(x.from === e.from && x.out === e.out && x.to === e.to); });
    edges.push({ from: e.from, out: e.out, to: node.id }); edges.push({ from: node.id, out: 0, to: e.to });
    this.commit(s.nodes.concat([node]), edges, { sel: node.id, tab: 'cfg', add: null, runOpen: false, picking: null, panel: null }, node.id);
  }
  removeNode(id) {
    if (this.roStop()) return;
    var s = this.state, n = this.byId(id); if (!n || n.type === 'start') return;
    var gone = {}; gone[id] = 1; if (isBox(n)) allInner(n).forEach(function (k) { gone[k] = 1; });
    var nodes = s.nodes.filter(function (x) { return !gone[x.id]; }).map(function (x) { if (x.type === 'loop' && x.cfg.inner.indexOf(id) >= 0) return Object.assign({}, x, { cfg: Object.assign({}, x.cfg, { inner: x.cfg.inner.filter(function (k) { return k !== id; }) }) }); if (x.type === 'parallel' && allInner(x).indexOf(id) >= 0) return Object.assign({}, x, { cfg: Object.assign({}, x.cfg, { branches: x.cfg.branches.map(function (b) { return Object.assign({}, b, { inner: (b.inner || []).filter(function (k) { return k !== id; }) }); }) }) }); return x; });
    this.commit(nodes, s.edges.filter(function (e) { return !gone[e.from] && !gone[e.to]; }), { sel: s.sel === id ? null : s.sel, ctx: null });
    this.showToast('Đã xoá bước. Bấm Hoàn tác nếu xoá nhầm.');
  }
  duplicate(id, asPaste) {
    if (this.roStop() || this.capFull()) return;
    var s = this.state, src = asPaste ? this.clip : this.byId(id); if (!src || src.type === 'start') return;
    var node = this.makeNode(src.type, clone(src.cfg), src.title + (asPaste ? '' : ' (bản sao)'));
    if (node.type === 'loop') node.cfg.inner = [];
    if (node.type === 'parallel') node.cfg.branches = node.cfg.branches.map(function (b) { return Object.assign({}, b, { inner: [] }); });
    var nodes = s.nodes.slice();
    if (src.parent && !asPaste) { node.parent = src.parent; node.lane = src.lane || 0; nodes = nodes.map(function (x) { if (x.id !== src.parent) return x; var ins = function (arr) { var inner = arr.slice(); inner.splice(inner.indexOf(src.id) + 1, 0, node.id); return inner; }; if (x.type === 'parallel') return Object.assign({}, x, { cfg: Object.assign({}, x.cfg, { branches: x.cfg.branches.map(function (b, i) { return i === (src.lane || 0) ? Object.assign({}, b, { inner: ins(b.inner || []) }) : b; }) }) }); return Object.assign({}, x, { cfg: Object.assign({}, x.cfg, { inner: ins(x.cfg.inner) }) }); }); }
    if (node.type === 'note') { node.x = src.x + 30; node.y = src.y + 30; }
    this.commit(nodes.concat([node]), s.edges, { sel: node.id, tab: 'cfg', ctx: null }, node.id);
  }
  updateSel(patch) { if (this.ro()) return; var id = this.state.sel; this.setState({ nodes: this.state.nodes.map(function (n) { return n.id === id ? Object.assign({}, n, patch) : n; }) }); }
  updateCfg(patch) { if (this.ro()) return; var id = this.state.sel; this.setState({ nodes: this.state.nodes.map(function (n) { return n.id === id ? Object.assign({}, n, { cfg: Object.assign({}, n.cfg, patch) }) : n; }) }); }
  dropPort(id, i) { this.relayoutSoon(); return this.state.edges.filter(function (e) { return !(e.from === id && e.out === i); }).map(function (e) { return e.from === id && e.out > i ? Object.assign({}, e, { out: e.out - 1 }) : e; }); }
  addPort(id, i) { this.relayoutSoon(); return this.state.edges.map(function (e) { return e.from === id && e.out >= i ? Object.assign({}, e, { out: e.out + 1 }) : e; }); }
  setTrigger(t) {
    if (this.roStop()) return;
    var s = this.state, id = this.state.sel, nodes = s.nodes.map(function (n) { return n.id === id ? Object.assign({}, n, { cfg: Object.assign({}, n.cfg, { trigger: t }) }) : n; }), edges = s.edges;
    this.commit(nodes, edges, {});
  }
  allIssues() {
    var s = this.state, list = [];
    s.nodes.forEach(function (n) { var m = issuesOf(n, s); if (m.length) list.push({ id: n.id, title: n.title, type: n.type, msgs: m }); });
    var st = s.nodes.filter(function (n) { return n.type === 'start'; })[0];
    if (st && st.cfg.trigger === 'agent' && !s.nodes.some(function (n) { return n.type === 'respond'; })) list.push({ id: st.id, title: 'Quy trình', type: 'respond', msgs: ['Quy trình được Nhân sự số gọi cần bước Respond to the agent để trả kết quả'] });
    return list;
  }

  openRun() {
    if (this.roStop()) return;
    var s = this.state, st = s.nodes.filter(function (n) { return n.type === 'start'; })[0], inputs = {};
    st.cfg.inputs.forEach(function (f) { if (f.name) inputs[f.name] = sampleOf(f); });
    this.setState({ panelHidden: false, runOpen: true, sel: null, add: null, checkOpen: false, pubOpen: false, panel: null, ctx: null, run: s.run && s.run.status !== 'idle' ? s.run : { status: 'idle', tab: 'input', inputs: inputs, log: [], ran: [], redges: [] } });
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
    var c = n.cfg, vars = Object.assign({}, r.vars), note = '', out = 0, st = 'Thành công', stop = null, extraLog = [], extraRan = [], failInner = null, seed = parseInt(n.id.slice(1), 10) || 1, ms = msOf(n.type, seed);
    var issues = issuesOf(n, s).filter(function (m) { return m !== 'Bước này chưa được nối vào luồng' && m.indexOf('cần mô tả') < 0 && m.indexOf('Mỗi nhóm') < 0; });
    if (answer === '__timeout') {
      out = 1; ms = 8010; note = 'Quá hạn ' + c.timeout + ' ' + c.tunit + ', đi nhánh Quá hạn'; st = 'Quá hạn';
    } else if (answer !== undefined) {
      vars[c.fields[0] ? c.fields[0].name : 'quyet_dinh'] = answer; vars.nguoi_duyet = 'Bạn (chạy thử)'; ms = 8010; note = 'Bạn trả lời "' + answer + '" thay ' + (c.assignee || 'người duyệt') + (c.approveMode === 'all' ? ' (chạy thử tính như cả nhóm cùng trả lời)' : '');
    } else if (n.type === 'wait') {
      if (issues.length) stop = issues[0]; else { ms = 8010; note = (c.mode === 'until' ? 'Chờ tới ' + fill(c.at, vars) : 'Chờ ' + c.amount + ' ' + c.aunit) + ' rồi chạy tiếp (chạy thử không chờ thật)'; }
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
        case 'respond': var rsp = {}; c.outs.forEach(function (o) { if (o.name) rsp[o.name] = fill(o.desc || '', vars); }); r = Object.assign({}, r, { resp: rsp }); note = 'Gửi cho Nhân sự số: ' + Object.keys(rsp).map(function (k) { return k + ' = ' + rsp[k]; }).join(', '); break;
        case 'tool': outputsOf(n).forEach(function (v) { vars[v] = mockOf(v); }); note = c.tool + ' chạy xong'; break;
        case 'func': fnOf(c).out.forEach(function (v) { vars[v] = mockOf(v); }); note = fnOf(c).name + (c.fn === 'http' ? ': ' + c.method + ' ' + fill(c.url, vars) + ' → 200' : ''); break;
        case 'variable': c.vars.forEach(function (v) { vars[v.name] = fill(v.value, vars); }); note = c.vars.map(function (v) { return v.name + ' = ' + fill(v.value, vars); }).join(', '); break;
        case 'loop':
          note = 'Lặp 3 phần tử, mỗi lần chạy ' + c.inner.length + ' bước';
          c.inner.forEach(function (id) {
            if (stop) return; var cn = self.byId(id); if (!cn) return;
            var iss = issuesOf(cn, s);
            if (iss.length) { stop = 'Bước "' + cn.title + '" trong vòng lặp: ' + iss[0]; failInner = cn.id; return; }
            outputsOf(cn).forEach(function (v) { vars[v] = mockOf(v); });
            extraRan.push(cn.id); extraLog.push({ id: cn.id, title: '↳ ' + cn.title, type: cn.type, st: 'Thành công', note: 'Chạy 3 lần, mỗi phần tử một lần', ms: msOf(cn.type, parseInt(cn.id.slice(1), 10) || 1) * 3 });
          });
          break;
        case 'subflow': note = c.flow + ' trả kết quả'; break;
        case 'decision': var dv = evalDecision(c, vars); Object.keys(dv.vals).forEach(function (k) { vars[k] = dv.vals[k]; }); note = (dv.hits.length ? 'Đúng quy tắc ' + dv.hits.join(', ') : 'Không quy tắc nào đúng, dùng mặc định') + ': ' + Object.keys(dv.vals).map(function (k) { return k + ' = ' + dv.vals[k]; }).join(', '); break;
        case 'code': outputsOf(n).forEach(function (v) { vars[v] = mockOf(v); }); note = c.lang + ' chạy xong: ' + outputsOf(n).map(function (k) { return k + ' = ' + vars[k]; }).join(', '); break;
        case 'parallel': note = 'Mở ' + c.branches.length + ' nhánh chạy cùng lúc: ' + c.branches.map(function (b) { return b.name; }).join(', '); break;
        case 'join': note = 'Đủ nhánh, chạy tiếp'; break;
        default: note = 'Xong';
      }
    }
    var queue = (r.queue || []).slice(), arr = Object.assign({}, r.arr || {});
    if (n.type === 'join' && !stop) {
      var need = s.edges.filter(function (x) { return x.to === n.id; }).length; arr[n.id] = (arr[n.id] || 0) + 1;
      var hold = c.mode === 'all' ? arr[n.id] < need : arr[n.id] > 1;
      if (hold) {
        var nxt = queue.shift(), lg = r.log.concat([{ id: n.id, title: n.title, type: n.type, st: 'Thành công', note: c.mode === 'all' ? 'Đã xong ' + arr[n.id] + '/' + need + ' nhánh, chờ nhánh còn lại' : 'Đã có nhánh khác xong trước, bỏ nhánh này', ms: 4 }]);
        if (!nxt) { this.setState({ run: Object.assign({}, r, { log: lg, vars: vars, arr: arr }) }); this.finish(false, 'Dừng ở "' + n.title + '": còn nhánh chưa tới.'); return; }
        this.setState({ run: Object.assign({}, r, { status: 'running', waitId: null, log: lg, vars: vars, arr: arr, queue: queue, cur: nxt }) });
        clearTimeout(this.timer); this.timer = setTimeout(function () { self.step(); }, 650); return;
      }
    }
    var log = r.log.concat([{ id: n.id, title: n.title, type: n.type, st: stop ? 'Lỗi' : st, note: stop || note, ms: ms }]).concat(extraLog);
    var last = Object.assign({}, s.last); last[n.id] = { st: stop ? 'Lỗi' : st, ms: ms, note: stop || note, out: JSON.stringify(outputsOf(n).reduce(function (o, k) { o[k] = vars[k] !== undefined ? vars[k] : null; return o; }, {}), null, 2) };
    var ran = r.ran.concat([n.id]).concat(extraRan);
    if (stop) { this.setState({ last: last, run: Object.assign({}, r, { log: log, ran: ran, failId: failInner || n.id, vars: vars }) }); this.finish(false, 'Dừng ở bước "' + n.title + '": ' + stop + '.'); return; }
    if (n.type === 'end') {
      this.setState({ last: last, run: Object.assign({}, r, { log: log, ran: ran, vars: vars }) });
      this.finish(c.status === 'ok', (c.status === 'ok' ? 'Chạy xong qua ' + ran.length + ' bước, kết thúc thành công.' : 'Kết thúc với trạng thái thất bại' + (c.message ? ': ' + c.message : '.')) + (r.resp ? ' Nhân sự số nhận dữ liệu dưới đây từ bước Respond to the agent.' : ''), r.resp ? JSON.stringify(r.resp, null, 2) : undefined);
      return;
    }
    // bước trong một nhánh của khối Song song: chạy bước kế trong nhánh, hết nhánh thì chuyển nhánh khác, đủ nhánh thì ra khỏi khối
    if (n.parent && this.byId(n.parent) && this.byId(n.parent).type === 'parallel') {
      var pb = this.byId(n.parent), la = innerArr(pb, n), nx = la[la.indexOf(n.id) + 1];
      if (nx) { this.setState({ last: last, run: Object.assign({}, r, { status: 'running', waitId: null, log: log, ran: ran, vars: vars, arr: arr, queue: queue, cur: nx }) }); clearTimeout(this.timer); this.timer = setTimeout(function () { self.step(); }, 650); return; }
      var pa = Object.assign({ done: 0, need: pb.cfg.branches.length }, arr[pb.id] || {}); pa.done += 1; arr[pb.id] = pa;
      if (pa.done < pa.need && queue.length) { this.setState({ last: last, run: Object.assign({}, r, { status: 'running', waitId: null, log: log, ran: ran, vars: vars, arr: arr, queue: queue.slice(1), cur: queue[0] }) }); clearTimeout(this.timer); this.timer = setTimeout(function () { self.step(); }, 650); return; }
      log = log.concat([{ id: pb.id, title: pb.title, type: 'parallel', st: 'Thành công', note: 'Đủ ' + pa.need + ' nhánh, đi tiếp', ms: 4 }]);
      n = pb; out = 0;
    }
    var e = s.edges.filter(function (x) { return x.from === n.id && x.out === out; })[0], redges = r.redges.concat([n.id + ':' + out]);
    if (n.type === 'parallel' && r.cur === n.id && !stop) {
      var firsts = c.branches.map(function (b) { return (b.inner || [])[0]; }).filter(Boolean);
      if (firsts.length) { arr[n.id] = { done: c.branches.length - firsts.length, need: c.branches.length }; this.setState({ last: last, run: Object.assign({}, r, { status: 'running', waitId: null, log: log, ran: ran, vars: vars, arr: arr, queue: firsts.slice(1).concat(queue), cur: firsts[0] }) }); clearTimeout(this.timer); this.timer = setTimeout(function () { self.step(); }, 650); return; }
    }
    if (!e && queue.length) {
      this.setState({ last: last, run: Object.assign({}, r, { status: 'running', waitId: null, log: log, ran: ran, vars: vars, arr: arr, queue: queue.slice(1), cur: queue[0], redges: redges }) });
      clearTimeout(this.timer); this.timer = setTimeout(function () { self.step(); }, 650); return;
    }
    if (!e) { this.setState({ last: last, run: Object.assign({}, r, { log: log, ran: ran, vars: vars }) }); var lb = outsOf(n)[out]; this.finish(true, 'Chạy xong qua ' + ran.length + ' bước. Quy trình dừng sau "' + n.title + '"' + (lb ? ' (nhánh ' + lb + ')' : '') + ' vì chưa có bước tiếp theo.'); return; }
    this.setState({ last: last, run: Object.assign({}, r, { status: 'running', waitId: null, log: log, ran: ran, redges: redges, cur: e.to, vars: vars, queue: queue, arr: arr }) });
    clearTimeout(this.timer); this.timer = setTimeout(function () { self.step(); }, 650);
  }
  runOne() {
    if (this.roStop()) return;
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
    var run = s.run, ro = this.ro(), locked = this.locked() || ro, byId = {}; s.nodes.forEach(function (n) { byId[n.id] = n; });
    var issues = this.allIssues(), issueBy = {}, issueCount = 0;
    issues.forEach(function (g) { issueCount += g.msgs.length; if (g.title !== 'Quy trình') issueBy[g.id] = g.msgs; });
    var selNode = byId[s.sel] || null, showRun = s.runOpen && !!run, building = s.top === 'build' && s.section === 'flow';
    var startNode = s.nodes.filter(function (n) { return n.type === 'start'; })[0];

    DIR = s.dir || 'h';
    var linkTo = s.link && s.link.moved ? this.hitNode(s.link.mx, s.link.my, s.link.from.id) : null;
    var viewNodes = s.nodes.map(function (n) {
      var t = TYPES[n.type], z = sizeOf(n), col = colOf(n.type), isSel = s.sel === n.id;
      var ran = run && run.ran.indexOf(n.id) >= 0, cur = run && run.cur === n.id && run.status === 'running', wait = run && run.status === 'paused' && run.waitId === n.id, fail = run && run.failId === n.id;
      var need = !!issueBy[n.id], ring = '';
      if (isSel || cur || (linkTo && linkTo.id === n.id)) ring = '#203BDC'; if (ran && !fail) ring = '#16a34a'; if (wait) ring = '#ea580c'; if (fail) ring = '#dc2626';
      var badge = '', bfg = '', bbg = '', bl = '';
      if (need) { badge = 'ⓘ Cần cấu hình'; bfg = '#616161'; bbg = '#fff'; bl = '#d4d4d8'; }
      if (ran) { badge = '✓ ' + (s.last[n.id] ? s.last[n.id].ms.toLocaleString('vi-VN') + ' ms' : 'Đã chạy'); bfg = '#15803d'; bbg = '#f0fdf4'; bl = '#bbf7d0'; }
      if (wait) { badge = 'Đang chờ trả lời'; bfg = '#c2410c'; bbg = '#fff7ed'; bl = '#fed7aa'; }
      if (fail) { badge = 'Lỗi'; bfg = '#b91c1c'; bbg = '#fef2f2'; bl = '#fecaca'; }
      var o = outsOf(n), br = branchy(n), sub = subOf(n);
      var outs = [];
      if (n.parent) {
        var lp = byId[n.parent], larr = lp ? innerArr(lp, n) : [], last = larr[larr.length - 1] === n.id;
        if (last) { var op0 = outPt(n, 0); outs = [{ dx: -100, dy: -100, dot: 'transparent', cls: 'oplus' + (ro ? ' ro-hide' : ''), aria: 'Thêm bước sau ' + n.title + (lp.type === 'parallel' ? ' trong nhánh' : ' trong vòng lặp'), px: DIR === 'h' ? op0.x + 6 : op0.x - 11, py: DIR === 'h' ? op0.y - 11 : op0.y + 6, down: function (e) { e.stopPropagation(); }, plus: function (e) { e.stopPropagation(); self.setState({ sel: n.id }); self.openAdd({ mode: 'inner', loopId: n.parent, lane: n.lane || 0 }); } }]; }
      } else {
        outs = o.map(function (lbl, i) {
          var op = outPt(n, i), isErr = lbl === 'Lỗi';
          return { dx: op.x - 4, dy: op.y - 4, dot: isErr ? '#f59e0b' : '#242424', cls: 'oplus' + (isErr ? ' oplus-err' : '') + (ro ? ' ro-hide' : ''), aria: 'Thêm bước sau ' + n.title + (lbl ? ' - nhánh ' + lbl : '') + '. Kéo để nối tới bước khác.',
            px: DIR === 'h' ? op.x + 6 : op.x - 11, py: DIR === 'h' ? op.y - 11 : op.y + 6,
            down: function (e) { self.startLink(e, n.id, i); },
            plus: function (e) { e.stopPropagation(); if (self.justLinked) { self.justLinked = false; return; } self.setState({ sel: n.id, tab: 'cfg', runOpen: false, panel: null }); self.openAdd({ from: { id: n.id, out: i } }); } };
        });
      }
      var ip = inPt(n);
      return { id: n.id, x: n.x, y: n.y, w: z.w, h: z.h, title: n.title, icon: t.icon, tile: col[0],
        isNote: n.type === 'note', isCard: n.type !== 'note', noteText: n.cfg.text || '', isLoop: n.type === 'loop', loopEmpty: n.type === 'loop' && !n.cfg.inner.length, isPar: n.type === 'parallel',
        lanes: n.type === 'parallel' ? n.cfg.branches.map(function (b, li) { var p0 = innerPos(n, 0, li); return { label: b.name || ('Nhánh ' + (li + 1)), lx: DIR === 'h' ? 16 : p0.x, ly: DIR === 'h' ? p0.y + H / 2 - 9 : 66, lw: DIR === 'h' ? 100 : W, empty: !(b.inner || []).length && !ro, px: p0.x + W / 2 - 11, py: p0.y + H / 2 - 11, aria: 'Thêm bước vào nhánh ' + (b.name || li + 1), add: function (e) { e.stopPropagation(); self.setState({ sel: n.id }); self.openAdd({ mode: 'inner', loopId: n.id, lane: li }); } }; }) : [],
        addInner: function (e) { e.stopPropagation(); self.setState({ sel: n.id }); self.openAdd({ mode: 'inner', loopId: n.id }); },
        pills: br ? o.map(function (l) { var lab = l || 'Tiếp tục'; return { label: lab, flex: DIR === 'v' ? '1' : 'none', bg: l === 'Lỗi' ? '#fef3c7' : '#ebebee', fg: l === 'Lỗi' ? '#92400e' : '#242424' }; }) : [],
        pillDir: DIR === 'v' ? 'row' : 'column', pillPad: br ? '8px 12px 10px' : '0', headLine: br ? '1px solid #ececef' : 'none',
        hasSub: !badge && !!sub, sub: sub,
        bg: n.type === 'note' ? '#fff8c5' : (isBox(n) ? 'rgba(255,255,255,.45)' : '#fff'),
        border: isBox(n) ? '1.5px dashed ' + (ring || '#b9bcc4') : (ring ? '2px solid ' + ring : '1px solid ' + (n.type === 'note' ? '#f0d86e' : '#e2e3e8')),
        radius: n.type === 'note' ? 6 : (br || isBox(n) ? 18 : 28),
        shadow: isBox(n) ? 'none' : (isSel ? '0 0 0 4px rgba(32,59,220,.10), 0 2px 8px rgba(15,23,42,.08)' : '0 1px 2px rgba(15,23,42,.06), 0 2px 8px rgba(15,23,42,.04)'),
        cls: 'qn' + (isSel ? ' qn-sel' : '') + (cur ? ' running' : (wait ? ' waiting' : '')),
        badge: !!badge, badgeText: badge, badgeFg: bfg, badgeBg: bbg, badgeLine: bl,
        hasIn: n.type !== 'start' && n.type !== 'note' && !n.parent, inX: ip.x - 4, inYp: ip.y - 4, outs: outs,
        canDel: n.type !== 'start' && !locked, canRun: n.type !== 'note' && n.type !== 'start' && !locked, runAria: 'Chạy riêng bước ' + n.title, delAria: 'Xoá bước ' + n.title,
        run: function (e) { e.stopPropagation(); self.setState({ sel: n.id, tab: 'last', runOpen: false, panel: null }); setTimeout(function () { self.runOne(); }, 0); },
        del: function (e) { e.stopPropagation(); self.removeNode(n.id); },
        ctx: function (e) { e.preventDefault(); e.stopPropagation(); var r = self.canvasEl && self.canvasEl.getBoundingClientRect ? self.canvasEl.getBoundingClientRect() : { left: 0, top: 0 }; self.setState({ ctx: { id: n.id, x: e.clientX - r.left, y: e.clientY - r.top }, sel: n.id, tab: 'cfg', runOpen: false, panel: null }); },
        down: function (e) { self.startDrag(e, n.id); },
        select: function () { self.setState({ sel: n.id, tab: 'cfg', runOpen: false, add: null, panel: null }); } };
    });

    var d = '', ed = '', rd = '', tmpD = '', edgeDel = [];
    var ranHas = function (a, b) { return run && run.ran.indexOf(a) >= 0 && run.ran.indexOf(b) >= 0; };
    s.edges.forEach(function (e) {
      var a = byId[e.from], b = byId[e.to]; if (!a || !b) return;
      var bz = bez(absPt(a, outPt(a, e.out)), absPt(b, inPt(b))), lbl = outsOf(a)[e.out];
      if (run && run.redges.indexOf(e.from + ':' + e.out) >= 0) rd += bz.d; else if (lbl === 'Lỗi') ed += bz.d; else d += bz.d;
      if (!locked && building) edgeDel.push({ x: bz.m.x - 11, y: bz.m.y - 11, cls: 'edel', aria: 'Xoá kết nối từ ' + a.title + ' tới ' + b.title,
        pick: function (ev) { ev.stopPropagation(); self.commit(self.state.nodes, self.state.edges.filter(function (x) { return !(x.from === e.from && x.out === e.out && x.to === e.to); }), {}); } });
    });
    s.nodes.forEach(function (l) {
      if (l.type !== 'loop' || !l.cfg.inner.length) return;
      var chain = [absPt(l, DIR === 'h' ? { x: 0, y: sizeOf(l).h / 2 } : { x: sizeOf(l).w / 2, y: 0 })];
      var segs = '', prev = chain[0];
      l.cfg.inner.forEach(function (id) { var c = byId[id]; if (!c) return; segs += bez(prev, absPt(c, inPt(c))).d; prev = absPt(c, outPt(c, 0)); });
      segs += bez(prev, absPt(l, DIR === 'h' ? { x: sizeOf(l).w, y: sizeOf(l).h / 2 } : { x: sizeOf(l).w / 2, y: sizeOf(l).h })).d;
      if (run && run.ran.indexOf(l.id) >= 0 && ranHas(l.id, l.cfg.inner[l.cfg.inner.length - 1])) rd += segs; else d += segs;
    });
    if (s.link && s.link.moved) { var sn0 = byId[s.link.from.id]; if (sn0) tmpD = bez(absPt(sn0, outPt(sn0, s.link.from.out)), linkTo ? absPt(linkTo, inPt(linkTo)) : { x: s.link.mx, y: s.link.my }).d; }

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
      var up = n.parent ? (function () { var lp = byId[n.parent], la = innerArr(lp, n), u = upstreamOf(lp.id, s).concat(lp.type === 'loop' ? [{ v: 'phan_tu', l: 'phan_tu · ' + lp.title }] : []); la.slice(0, la.indexOf(n.id)).forEach(function (k) { if (byId[k]) outputsOf(byId[k]).forEach(function (v) { u.push({ v: v, l: v + ' · ' + byId[k].title }); }); }); return u; })() : upstreamOf(n.id, s);
      varOpts = varOpts.concat(up);
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
            note: c.trigger === 'agent' ? 'Nhân sự số đọc tên và mô tả để biết cần truyền gì. Trả kết quả bằng bước Respond to the agent, trong vòng 100 giây.' : 'Các bước sau dùng được những đầu vào này.',
            types: INTYPES.map(function (ty) { return { label: ty, pick: function () { self.updateCfg({ inputs: c.inputs.concat([{ name: '', t: ty, desc: '' }]) }); self.setState({ picking: null }); } }; }),
            add: function () { self.setState({ picking: s.picking === n.id ? null : n.id }); } }));
          break;
        case 'agent':
          help = 'Gọi AI một lần với prompt này. Không có tool, tri thức hay hội thoại: muốn vậy thì dùng Workforce.';
          pf.push(P('model', 'Model', 'select', { options: MODELS }));
          pf.push(P('instructions', 'Prompt', 'text', { ph: 'VD: Đọc hoá đơn {{tep_hoa_don}}, lấy số hoá đơn, số tiền, mã số thuế.', canVar: true }));
          var afiles = up.filter(function (o) { return /^tep/.test(o.v) || (startNode && startNode.cfg.inputs.some(function (f) { return f.name === o.v && f.t === 'Tệp'; })); });
          pf.push(P('doc', 'Tệp đầu vào (không bắt buộc)', 'select', { options: [{ v: '', l: afiles.length ? 'Không dùng tệp' : 'Chưa có tệp nào ở các bước trước' }].concat(afiles), hint: 'AI đọc tệp này: hoá đơn, CCCD, hợp đồng... Dùng với đầu ra có cấu trúc để lấy các trường.' }));
          pf.push(P('output', 'Đầu ra', 'select', { options: [{ v: 'text', l: 'Văn bản' }, { v: 'json', l: 'Có cấu trúc (các trường)' }], hint: c.output === 'json' ? '' : 'Muốn phân loại hoặc trích xuất, chọn Có cấu trúc rồi dùng Condition (hai nhánh) hoặc Switch (nhiều nhóm) để rẽ nhánh theo kết quả.' }));
          if (c.output === 'json') editors.push({ title: 'TRƯỜNG ĐẦU RA', hasB: false, addLabel: '+ Thêm trường', hasNote: true, note: 'Chọn mẫu như Hoá đơn VAT, CCCD để có sẵn các trường hay dùng.', hasExtra: true, extraLabel: 'Dùng mẫu có sẵn', extra: function () { self.setState({ picking: s.picking === n.id ? null : n.id }); }, picking: s.picking === n.id,
            types: DOCS.map(function (dd) { return { label: dd.label, pick: function () { self.updateCfg({ outVars: dd.out.slice(), output: 'json' }); self.setState({ picking: null }); } }; }),
            items: c.outVars.map(function (v, i) { return { a: v, aPh: 'ten_truong', aAria: 'Trường ' + (i + 1), aFont: 'ui-monospace, monospace', hasTag: false, lock: false, onA: function (ev) { var a2 = c.outVars.slice(); a2[i] = ev.target.value.replace(/\s+/g, '_'); self.updateCfg({ outVars: a2 }); }, remove: function () { self.updateCfg({ outVars: c.outVars.filter(function (_, j) { return j !== i; }) }); } }; }),
            add: function () { self.updateCfg({ outVars: c.outVars.concat(['']) }); } });
          break;
        case 'classify':
          pf.push(P('input', 'Dữ liệu cần phân loại', 'select', { options: ups }));
          pf.push(P('model', 'Model', 'select', { options: MODELS }));
          editors.push(LE('cats', 'NHÓM', { aPh: 'Tên nhóm', bPh: 'Thuộc nhóm này khi...', mono: false, addLabel: '+ Thêm nhóm', ports: true, min: 1, note: 'Mỗi nhóm một nhánh. AI không xếp được thì đi nhánh Khác.', blank: function (k) { return { name: 'Nhóm ' + (k + 1), desc: '' }; } }));
          break;
        case 'extract':
          var files = up.filter(function (o) { return /^tep/.test(o.v) || (startNode && startNode.cfg.inputs.some(function (f) { return f.name === o.v && f.t === 'Tệp'; })); });
          pf.push(P('doc', 'Tài liệu', 'select', { options: [{ v: '', l: files.length ? 'Chọn tài liệu' : 'Chưa có tệp nào ở các bước trước' }].concat(files), hint: 'Tệp ở bước Start, tệp người duyệt gửi lên hoặc tệp nhận từ sự kiện (biến bắt đầu bằng tep_).' }));
          editors.push(LE('fields', 'TRƯỜNG CẦN LẤY', { aPh: 'ten_truong', bPh: 'Mô tả (không bắt buộc)', addLabel: '+ Thêm tay',
            extraLabel: 'Dùng mẫu có sẵn', extra: function () { self.setState({ picking: s.picking === n.id ? null : n.id }); }, picking: s.picking === n.id,
            types: DOCS.map(function (dd) { return { label: dd.label, pick: function () { self.updateCfg({ fields: F(dd.out) }); self.setState({ picking: null }); } }; }),
            note: 'Chọn mẫu như Hoá đơn VAT, CCCD để có sẵn các trường hay dùng.' }));
          break;
        case 'human':
          help = 'Quy trình tạm dừng tới khi người nhận bấm trả lời. Khi chạy thử, bạn trả lời thay họ. Dùng Condition hoặc Switch sau đó để rẽ theo câu trả lời.';
          pf.push(P('assignee', 'Gửi cho', 'select', { options: opt(PEOPLE), hint: 'Người nhận thấy yêu cầu trong Omni Inbox và email.' }));
          pf.push(P('title', 'Tiêu đề', 'input', { ph: 'VD: Duyệt đề nghị mua sắm' }));
          pf.push(P('message', 'Nội dung', 'text', { ph: 'VD: {{nguoi_de_nghi}} đề nghị mua hàng, số tiền {{so_tien}}.', canVar: true }));
          pf.push(P('approveMode', 'Kiểu duyệt', 'select', { options: [{ v: 'first', l: 'Người trả lời đầu tiên' }, { v: 'all', l: 'Tất cả phải duyệt' }], hint: c.approveMode === 'all' ? 'Mọi người trong nhóm phải trả lời; một người từ chối là kết quả Từ chối.' : 'Khi Gửi cho là một nhóm, câu trả lời đầu tiên được tính.' }));
          pf.push(P('timeout', 'Hạn trả lời', 'input', { ph: 'VD: 3' }));
          pf.push(P('tunit', 'Đơn vị', 'select', { options: opt(['giờ', 'ngày']), hint: 'Tối đa 30 ngày, bằng thời gian tối đa của một lần chạy.' }));
          pf.push(P('onTimeout', 'Khi quá hạn', 'select', { options: [{ v: 'branch', l: 'Đi nhánh Quá hạn' }, { v: 'stop', l: 'Dừng Quy trình' }] }));
          editors.push(LE('fields', 'TRƯỜNG NGƯỜI NHẬN TRẢ LỜI', { aPh: 'ten_truong', bPh: 'Gợi ý, VD: Duyệt / Từ chối', addLabel: '+ Thêm trường', note: 'Đặt tên bắt đầu bằng tep_ nếu cần người nhận tải tệp lên.' }));
          break;
        case 'wait':
          pf.push(P('mode', 'Chờ', 'select', { options: [{ v: 'delay', l: 'Một khoảng thời gian (Delay)' }, { v: 'until', l: 'Tới một thời điểm (Delay until)' }] }));
          help = 'Quy trình tạm dừng rồi tự chạy tiếp. Muốn chờ hệ thống khác xong việc, dùng Loop: gọi Tool kiểm tra rồi Wait, lặp đến khi có kết quả.';
          if (c.mode === 'until') pf.push(P('at', 'Thời điểm', 'input', { ph: 'VD: 2026-11-01 08:00 hoặc {{han_giao}}', canVar: true, hint: 'Giờ Việt Nam (GMT+7). Tối đa 30 ngày kể từ lúc bắt đầu chạy.' }));
          else { pf.push(P('amount', 'Chờ trong', 'input', { ph: 'VD: 2' })); pf.push(P('aunit', 'Đơn vị', 'select', { options: opt(['phút', 'giờ', 'ngày']), hint: 'Tối đa 30 ngày.' })); }
          break;
        case 'decision':
          help = 'Mỗi dòng là một quy tắc. Khi: điều kiện, nối bằng "và", VD: tong_tien > 50000000 và loai_hang thuộc Phần mềm, Cloud. Thì: gán kết quả, cách nhau bằng ";", VD: can_it = true. Sửa ngưỡng ở một chỗ, mọi nhánh sau đều theo.';
          pf.push(P('hit', 'Khi nhiều quy tắc cùng đúng', 'select', { options: [{ v: 'first', l: 'Lấy quy tắc đúng đầu tiên' }, { v: 'collect', l: 'Gom kết quả của mọi quy tắc đúng' }] }));
          editors.push(LE('outCols', 'CỘT KẾT QUẢ', { aPh: 'ten_ket_qua', bPh: 'Giá trị mặc định', addLabel: '+ Thêm cột', min: 1, note: 'Không quy tắc nào đúng thì dùng giá trị mặc định.' }));
          editors.push(LE('rows', 'QUY TẮC', { aKey: 'when', bKey: 'then', aPh: 'Khi, VD: tong_tien > 50000000', bPh: 'Thì, VD: can_cap2 = true', mono: false, addLabel: '+ Thêm quy tắc', min: 1, blank: function () { return { when: '', then: '' }; } }));
          break;
        case 'parallel':
          help = 'Các nhánh chạy cùng lúc. Ra khỏi khối là mọi nhánh đã xong. Thêm bước vào nhánh bằng nút + trong khung.';
          editors.push({ title: 'NHÁNH', hasB: false, addLabel: '+ Thêm nhánh', hasNote: true, note: 'Mỗi nhánh là một chuỗi bước chạy thẳng: Prompt, Human approval, Wait, Tool, Set variable.', hasExtra: false, extraLabel: '', extra: function () {}, picking: false, types: [],
            items: c.branches.map(function (b, i) { return { a: b.name, aPh: 'Tên nhánh', aAria: 'Tên nhánh ' + (i + 1), aFont: 'inherit', hasTag: false, lock: c.branches.length <= 2,
              onA: function (ev) { var br2 = c.branches.slice(); br2[i] = Object.assign({}, b, { name: ev.target.value }); self.updateCfg({ branches: br2 }); },
              remove: function () { var kill = {}; (b.inner || []).forEach(function (k) { kill[k] = 1; }); var br2 = c.branches.filter(function (_, j) { return j !== i; }); self.setState(function (st) { return { nodes: st.nodes.filter(function (x) { return !kill[x.id]; }).map(function (x) { if (x.id === n.id) return Object.assign({}, x, { cfg: Object.assign({}, x.cfg, { branches: br2 }) }); if (x.parent === n.id && x.lane > i) return Object.assign({}, x, { lane: x.lane - 1 }); return x; }) }; }); self.relayoutSoon(); } }; }),
            add: function () { self.updateCfg({ branches: c.branches.concat([{ name: 'Nhánh ' + (c.branches.length + 1), desc: '', inner: [] }]) }); self.relayoutSoon(); } });
          break;
        case 'join':
          pf.push(P('mode', 'Chạy tiếp khi', 'select', { options: [{ v: 'all', l: 'Tất cả nhánh đã xong' }, { v: 'any', l: 'Một nhánh bất kỳ xong (bỏ các nhánh còn lại)' }] }));
          break;
        case 'code':
          help = 'Chạy tất định, cùng đầu vào luôn ra cùng kết quả. Đọc biến của các bước trước qua inputs["ten_bien"], trả kết quả bằng return { ... }.';
          pf.push(P('lang', 'Ngôn ngữ', 'select', { options: opt(['Python', 'JavaScript']) }));
          pf.push(P('code', 'Code', 'text', { ph: 'def main(inputs):\n    return { "ket_qua": inputs["so_tien"] * 2 }', font: 'ui-monospace, SFMono-Regular, Menlo, monospace', canVar: false }));
          editors.push({ title: 'KẾT QUẢ TRẢ RA', hasB: false, addLabel: '+ Thêm kết quả', hasNote: false, note: '', hasExtra: false, extraLabel: '', extra: function () {}, picking: false, types: [],
            items: c.outVars.map(function (v, i) { return { a: v, aPh: 'ten_ket_qua', aAria: 'Kết quả ' + (i + 1), aFont: 'ui-monospace, monospace', hasTag: false, lock: false, onA: function (ev) { var a2 = c.outVars.slice(); a2[i] = ev.target.value.replace(/\s+/g, '_'); self.updateCfg({ outVars: a2 }); }, remove: function () { self.updateCfg({ outVars: c.outVars.filter(function (_, j) { return j !== i; }) }); } }; }),
            add: function () { self.updateCfg({ outVars: c.outVars.concat(['']) }); } });
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
          pf.push(P('par', 'Chạy song song', 'toggle', { ph: 'Mặc định chạy lần lượt. Bật để chạy tối đa 50 phần tử cùng lúc.' }));
          help = 'Thêm bước vào vòng lặp bằng nút + trong khung, hoặc chọn khung rồi bấm bảng Thêm bước bên trái.';
          break;
        case 'subflow':
          pf.push(P('flow', 'Quy trình con', 'select', { options: opt([''].concat(FLOWS.map(function (f) { return f.name + ' · ' + f.ver; }))), hint: 'Chỉ chọn được Quy trình đã publish.' }));
          break;
        case 'end':
          pf.push(P('status', 'Trạng thái', 'select', { options: [{ v: 'ok', l: 'Thành công' }, { v: 'fail', l: 'Thất bại' }] }));
          pf.push(P('message', 'Ghi chú (không bắt buộc)', 'input', { ph: 'VD: Hồ sơ thiếu giấy tờ' }));
          help = 'Kết thúc lần chạy. Muốn trả dữ liệu cho Nhân sự số, thêm bước Respond to the agent trước bước này.';
          break;
        case 'respond':
          help = 'Nhân sự số đã gọi Quy trình nhận các dữ liệu này. Quy trình phải tới bước này trong vòng 100 giây kể từ lúc được gọi; Quy trình vẫn chạy tiếp sau bước này.';
          editors.push(LE('outs', 'DỮ LIỆU TRẢ VỀ', { aPh: 'ten_du_lieu', bPh: 'Giá trị, VD: {{so_warn}}', addLabel: '+ Thêm dữ liệu', min: 1 }));
          break;
        case 'note':
          pf.push(P('text', 'Nội dung', 'text', {}));
          break;
      }
      pf.forEach(function (f) { f.hasHint = !!f.hint; });
      if (n.type === 'condition') {
        help = 'Điều kiện đúng thì đi nhánh Có, sai thì đi nhánh Không. Rẽ theo nhiều giá trị thì dùng Switch.';
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
        canDelete: n.type !== 'start' && !this.ro(), hasTabs: n.type !== 'note' && n.type !== 'start' };
    }
    var errNode = selNode && TYPES[selNode.type].err ? selNode.cfg : { retry: false, err: 'stop' };
    var last = selNode ? s.last[selNode.id] : null;

    // chạy thử
    var runInputs = [], runLog = [], waitNode = null;
    if (run) {
      runInputs = startNode.cfg.inputs.filter(function (f) { return f.name; }).map(function (f) { return { k: f.name, t: f.t, value: run.inputs[f.name] || '', onChange: function (ev) { var inp = Object.assign({}, self.state.run.inputs); inp[f.name] = ev.target.value; self.setState({ run: Object.assign({}, self.state.run, { inputs: inp }) }); } }; });
      runLog = run.log.map(function (l) { var cc = colOf(l.type); return { title: l.title, note: l.note, st: l.st + ' · ' + l.ms.toLocaleString('vi-VN') + ' ms', stColor: l.st === 'Thành công' ? '#15803d' : '#b91c1c', tile: cc[0], tileBg: cc[1], icon: TYPES[l.type].icon }; });
      if (run.status === 'running' && byId[run.cur]) { var cn = byId[run.cur], c2 = colOf(cn.type); runLog.push({ title: cn.title, note: 'Đang chạy...', st: '', stColor: '#64748b', tile: c2[0], tileBg: c2[1], icon: TYPES[cn.type].icon }); }
      if (run.status === 'paused') { waitNode = byId[run.waitId]; if (waitNode) runLog.push({ title: waitNode.title, note: waitNode.type === 'wait' ? 'Đang chờ sự kiện' : 'Đang chờ trả lời', st: 'Tạm dừng', stColor: '#c2410c', tile: COL.human[0], tileBg: COL.human[1], icon: TYPES[waitNode.type].icon }); }
    }
    var RST = { idle: ['Chưa chạy', '#64748b'], running: ['Đang chạy', '#203BDC'], paused: ['Tạm dừng', '#c2410c'], done: [run && run.ok ? 'Thành công' : 'Dừng', run && run.ok ? '#15803d' : '#b91c1c'] };
    var rs = run ? RST[run.status] : RST.idle, waitActions = [];
    if (waitNode) {
      var hint = waitNode.type === 'human' && waitNode.cfg.fields[0] ? waitNode.cfg.fields[0].desc : '', opts = waitNode.type === 'wait' ? ['Gửi sự kiện'] : (hint.indexOf('/') > 0 ? hint.split('/').map(function (x) { return x.trim(); }) : ['Duyệt', 'Từ chối']);
      waitActions = opts.map(function (a, i) { return { label: a, cls: i === 0 ? 'btn btn-primary' : 'btn', pick: function () { self.step(a); } }; });
      if (waitNode.cfg.onTimeout === 'branch') waitActions.push({ label: 'Để quá hạn', cls: 'btn', pick: function () { self.step('__timeout'); } });
    }
    var statusMap = { draft: ['Bản nháp', '#f59e0b', ''], pending: ['Chờ duyệt publish', '#f59e0b', 'v1'] };
    var g0 = s.guard, guardList = function (arr) { return arr.map(function (x) { return { label: x[1], on: !!g0[x[0]], toggle: function () { if (self.roStop()) return; var ng = Object.assign({}, self.state.guard); ng[x[0]] = !ng[x[0]]; self.setState({ guard: ng }); } }; }); };
    var asTool = startNode && startNode.cfg.trigger === 'agent', emb = !!(this.props && this.props.embedded), pendVer = this.props && this.props.pendingVersion;
    var unwired = issues.filter(function (g) { return g.msgs.indexOf('Bước này chưa được nối vào luồng') >= 0; }).length, g1 = s.guard || {};
    var readyItems = [
      { label: 'Đã chọn kiểu kích hoạt', done: !!startNode, go: function () { self.setState({ section: 'flow', sel: startNode ? startNode.id : null, tab: 'cfg', runOpen: false }); } },
      { label: unwired ? 'Còn ' + unwired + ' bước chưa nối' : 'Đã nối mọi bước', done: !unwired, failed: unwired > 0, go: function () { self.setState({ checkOpen: true, pubOpen: false }); } },
      { label: issueCount ? 'Còn ' + issueCount + ' lỗi cần sửa' : 'Đã cấu hình mọi bước', done: !issueCount, failed: issueCount > 0, go: function () { self.setState({ checkOpen: true, pubOpen: false }); } },
      { label: 'Đã cấu hình Guardrails', done: Object.keys(g1).some(function (k) { return g1[k]; }), go: function () { self.setState({ readyOpen: false }); if (emb && self.props.onNav) self.props.onNav('guardrails'); else self.setState({ section: 'guard', checkOpen: false }); } },
      { label: 'Đã chạy thử', done: !!(run && run.status === 'done' && run.ok), go: function () { self.setState({ section: 'flow' }); self.openRun(); } }
    ].map(function (r) { return { label: r.label, done: r.done, failed: !r.done && !!r.failed, todo: !r.done && !r.failed, fg: r.done ? '#203BDC' : r.failed ? '#dc2626' : '#686873', pick: function () { self.setState({ readyOpen: false }); r.go(); } }; });

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
      name: s.savedName || s.name, statusLabel: s.status === 'pending' ? 'Chờ duyệt v1' : 'Bản nháp', statusDot: s.status === 'pending' ? '#f59e0b' : '#686873', statusBg: s.status === 'pending' ? '#fef3c7' : '#f5f3f0', statusFg: s.status === 'pending' ? '#92400e' : '#686873',
      versionTitle: s.status === 'pending' ? 'v1 · Chờ Admin duyệt' : 'Bản nháp', versionSub: s.status === 'pending' ? 'Gửi duyệt vừa xong' : 'Chưa publish lần nào · Đã tự lưu',
      share: function () { self.showToast('Cấp quyền dùng chung màn hình với Nhân sự số thường. Prototype chưa dựng phần này.'); },
      moreOpen: s.moreOpen, toggleMore: function () { self.setState({ moreOpen: !self.state.moreOpen, pubOpen: false, checkOpen: false }); },
      deleteProcess: function () { self.setState({ moreOpen: false }); self.showToast('Xoá Nhân sự số Quy trình dùng chung hộp thoại xác nhận với Nhân sự số thường.'); },
      topTabs: [
        { id: 'build', label: 'Build', icon: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z' },
        { id: 'evaluate', label: 'Evaluate', icon: 'M9 3h6 M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3 M7 15h10' },
        { id: 'channels', label: 'Channels', icon: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z' },
        { id: 'insights', label: 'Insights', icon: 'M4 4v16h16 M8 16v-4 M12 16V8 M16 16v-6' }
      ].map(function (x) { var on = s.top === x.id; return { label: x.label, icon: x.icon, on: on, bg: on ? '#eceefe' : 'transparent', fg: on ? '#203BDC' : '#686873', pick: function () { self.setState({ top: x.id, add: null, checkOpen: false, pubOpen: false, moreOpen: false }); } }; }),
      building: building, notBuilding: !building,
      isOtherTab: s.top !== 'build', isGuardPage: s.top === 'build' && s.section === 'guard', isVersionsPage: s.top === 'build' && s.section === 'versions',
      sideShow: s.sideOpen && s.top !== 'channels' && !emb, sideRail: !s.sideOpen && s.top !== 'channels' && !emb, showHeader: !emb, checkLeft: emb ? 16 : 248, checkPos: emb ? 'left: 16px; bottom: 60px' : 'left: 248px; bottom: 16px',
      readOnly: ro, roBanner: ro && building, canTest: !ro,
      panelReopen: building && s.panelHidden && !selNode && !showRun && (!emb || !ro), notEmb: !emb, runBtnLabel: emb ? 'Chạy thử' : 'Test run', reopenCfg: function () { self.setState({ panelHidden: false }); },
      bannerLeft: (function () { var pw = building && (pmNode || showRun || (pmProcess && !s.panelHidden)) ? (s.expand ? 640 : 476) : 0, lw = s.palOpen && !ro ? 232 : 0; return 'calc(' + lw + 'px + (100% - ' + (lw + pw) + 'px) / 2)'; })(),
      pendingBanner: building && !ro && (s.status === 'pending' || !!pendVer), pendingText: (pendVer || 'v1') + ' đang chờ duyệt. Bạn đang sửa bản nháp mới - Bản đã gửi duyệt giữ nguyên.',
      nameInput: s.name || '', desc: s.desc || '', descLen: (s.desc || '').length, nameLen: (s.name || '').length, nameInvalid: !!s.nameErr, nameBorder: s.nameErr ? '#dc2626' : '#e5e5e5',
      nameHint: s.nameErr ? 'Nhập tên Quy trình để lưu.' : 'Tên hiện ở danh sách Nhân sự số.', nameHintColor: s.nameErr ? '#dc2626' : '#686873',
      onName: function (e) { if (self.ro()) return; var v = e.target.value.slice(0, 100); self.setState({ name: v, nameErr: !v.trim(), savedName: v.trim() ? v.trim() : self.state.savedName }); },
      onNameBlur: function () { if (!String(self.state.name || '').trim()) self.setState({ nameErr: true }); },
      onDesc: function (e) { if (self.ro()) return; self.setState({ desc: e.target.value.slice(0, 500) }); },
      triggerName: startNode ? trigOf(startNode.cfg).name : '-',
      collapseSide: function () { self.setState({ sideOpen: false }); }, expandSide: function () { self.setState({ sideOpen: true }); },
      showReady: s.top === 'build',
      navItems: (s.top === 'build' ? [
        { id: 'flow', label: 'Quy trình', icon: ICON.flow, count: issueCount },
        { id: 'guard', label: 'Guardrails', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
        { id: 'versions', label: 'Phiên bản', icon: 'M3 12a9 9 0 1 0 3-6.7 M3 4v5h5 M12 7v5l3 2' }
      ] : s.top === 'evaluate' ? [
        { id: 'cases', label: 'Test case', icon: 'M9 11l3 3 8-8 M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9' },
        { id: 'runs', label: 'Lượt đánh giá', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2' }
      ] : s.top === 'insights' ? [
        { id: 'overview', label: 'Tổng quan', icon: 'M4 4v16h16 M8 16v-4 M12 16V8 M16 16v-6' },
        { id: 'history', label: 'Lịch sử chạy', icon: 'M3 12a9 9 0 1 0 3-6.7 M3 4v5h5 M12 7v5l3 2' }
      ] : []).map(function (it, i) { var on = s.top === 'build' ? s.section === it.id : i === 0; return { label: it.label, icon: it.icon, on: on, bg: on ? '#eceefe' : 'transparent', fg: on ? '#203BDC' : '#121216', fw: on ? 500 : 400, hasCount: !!it.count, count: it.count || 0, pick: function () { if (s.top === 'build') self.setState({ section: it.id, add: null, checkOpen: false, sel: it.id === 'flow' ? self.state.sel : null }); } }; }),
      otherIcon: { evaluate: 'M9 3h6 M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3', channels: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z', insights: 'M4 4v16h16 M8 16v-4 M12 16V8 M16 16v-6' }[s.top] || '',
      otherTitle: { evaluate: 'Evaluate', channels: 'Channels', insights: 'Insights' }[s.top] || '',
      otherText: { evaluate: 'Dùng chung tab Evaluate với Nhân sự số thường: mỗi test case là một bộ dữ liệu đầu vào và kết quả mong đợi, chạy lại hàng loạt trước mỗi lần publish. Prototype chưa dựng phần này.', channels: 'Dùng chung tab Channels với Nhân sự số thường. Quy trình chạy theo kiểu kích hoạt ở bước Start, publish xong gắn được làm tool cho Nhân sự số, gọi qua API hoặc webhook. Prototype chưa dựng phần này.', insights: 'Dùng chung tab Insights với Nhân sự số thường: lịch sử từng lần chạy, số lần chạy, tỉ lệ lỗi, thời gian chờ người duyệt. Prototype chưa dựng phần này.' }[s.top] || '',
      panelTabs: [{ id: 'cfg', label: emb ? 'Cấu hình' : 'Configuration' }, { id: 'run', label: emb ? 'Chạy thử' : 'Test run' }].filter(function (x) { return x.id !== 'run' || !ro; }).map(function (x) { var on = x.id === 'run' ? showRun : !showRun; return { label: x.label, on: on, bg: on ? '#eceefe' : 'transparent', fg: on ? '#203BDC' : '#686873', pick: function () { if (x.id === 'run') self.openRun(); else self.setState({ runOpen: false, panelHidden: false }); } }; }),
      panelCanClose: showRun || !!selNode,
      panelClose: function () { clearTimeout(self.timer); var r = self.state.run; self.setState({ runOpen: false, run: r && (r.status === 'running' || r.status === 'paused') ? null : r, sel: null, picking: null, panel: null, panelHidden: true }); },
      undo: function () { self.undo(); }, canUndoNot: !s.hist.length,
      issueGroups: issues.map(function (g) { var cc = colOf(g.type); return { title: g.title, count: g.msgs.length, msgs: g.msgs, tile: cc[0], icon: TYPES[g.type].icon, go: function () { self.setState({ sel: g.id, tab: 'cfg', checkOpen: false, runOpen: false, top: 'build', section: 'flow' }); setTimeout(function () { self.ensureVisible(g.id); }, 30); } }; }),
      issueCount: issueCount, hasIssues: issueCount > 0, noIssues: !issueCount, issueColor: issueCount ? '#b91c1c' : '#020817',
      checkOpen: s.checkOpen, checkAria: 'Kiểm tra, ' + issueCount + ' lỗi', toggleCheck: function () { self.setState({ checkOpen: !s.checkOpen, pubOpen: false, add: null, moreOpen: false }); },
      pubOpen: s.pubOpen, togglePub: function () { if (self.roStop()) return; self.setState({ pubOpen: !s.pubOpen, checkOpen: false, add: null, moreOpen: false }); },
      openVersions: function () { self.setState({ section: 'versions', top: 'build', pubOpen: false }); },
      pubState: s.status === 'pending' ? 'v1 đang chờ Admin duyệt' : 'Chưa publish lần nào · Đã tự lưu',
      publishDisabled: issueCount > 0 || s.status === 'pending', publishLabel: s.status === 'pending' ? 'Đã gửi duyệt' : 'Publish v1',
      publish: function () { self.setState({ status: 'pending', pubOpen: false }); self.showToast('Đã gửi yêu cầu publish v1. Admin duyệt xong thì Quy trình mới chạy thật.', 'good'); },
      toolHint: asTool ? 'Kích hoạt "Khi Nhân sự số gọi": publish xong, Nhân sự số thêm được Quy trình này vào mục Tool.' : 'Muốn Nhân sự số gọi Quy trình này như một tool, đổi kiểu kích hoạt ở bước Start thành "Khi Nhân sự số gọi".',
      toolHintColor: asTool ? '#15803d' : '#64748b',
      openRun: function () { self.setState({ top: 'build', section: 'flow' }); self.openRun(); },

      canvasRef: this.canvasRef, canvasCursor: s.drag ? 'grabbing' : (s.link ? 'crosshair' : 'default'),
      worldTransform: 'translate(' + s.px + 'px, ' + s.py + 'px) scale(' + s.z + ')',
      onBgDown: function (e) { if (e.target.closest && e.target.closest('[data-node],[data-ui]')) return; self.setState({ drag: { pan: true, sx: e.clientX, sy: e.clientY, ox: s.px, oy: s.py }, sel: null, add: null, checkOpen: false, readyOpen: false, pubOpen: false, picking: null, ctx: null, panel: null }); },
      onMove: function (e) { self.onMove(e); },
      onUp: function () { self.onUp(); },
      edgesD: d, errD: ed, ranD: rd, selD: '', tmpD: tmpD, edgeDel: edgeDel, viewNodes: viewNodes,
      showReadyChip: emb && building && issueCount > 0, readyOpen: false, toggleReady: function () { self.setState({ checkOpen: !self.state.checkOpen, readyOpen: false, add: null }); }, 
      readyChipText: issueCount ? issueCount + ' lỗi' : 'Sẵn sàng ' + readyItems.filter(function (r) { return r.done; }).length + '/' + readyItems.length,
      readyChipFg: issueCount ? '#b45309' : '#3f3f46', readyChipIcon: issueCount ? 'M12 3l10 18H2z M12 10v4 M12 17h.01' : 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M8 12l3 3 5-6',
      palOpen: s.palOpen && building && !ro, palClosed: !s.palOpen && building && !ro, togglePal: function () { self.setState({ palOpen: !self.state.palOpen }); },
      palItems: PAL.map(function (k, i) { var t = TYPES[k], cc = COL[t.c], hd = PAL_HEAD[k]; return { hasHead: !!hd, head: hd || '', name: t.name, desc: t.desc, icon: t.icon, tile: cc[0], tileBg: cc[1], more: k === 'tool' || k === 'func', pick: function () { self.palPick(k); } }; }),
      palHint: selNode && selNode.type === 'loop' ? 'Đang chọn vòng lặp: bước mới vào trong vòng lặp.' : (selNode ? 'Bước mới thêm ngay sau "' + selNode.title + '".' : 'Chọn một bước để thêm ngay sau nó.'),
      fit: function () { self.fit(0.15); },
      autoLayout: function () { self.commit(self.state.nodes, self.state.edges, {}); self.showToast('Đã sắp xếp gọn lại Quy trình.'); },
      toggleDir: function () { var nd = self.state.dir === 'h' ? 'v' : 'h'; DIR = nd; var f = layoutFlow({ nodes: clone(self.state.nodes), edges: self.state.edges }); self.setState({ dir: nd, nodes: f.nodes }); setTimeout(function () { self.fit(0.5); }, 0); },
      dirLabel: s.dir === 'v' ? 'Chuyển sang bố cục ngang' : 'Chuyển sang bố cục dọc',
      dirIcon: s.dir === 'v' ? 'M4 12h4 M16 12h4 M8 9h8v6H8z' : 'M12 4v4 M12 16v4 M9 8h6v8H9z',
      redo: function () { self.redo(); }, canRedoNot: !(s.fut && s.fut.length),
      openSettings: function () { self.setState({ panel: s.panel === 'settings' && !s.sel ? null : 'settings', sel: null, runOpen: false, add: null }); },
      panelOpen: building && (pmNode || showRun || (pmProcess && !s.panelHidden)), panelW: s.expand ? 640 : 476,
      expandLabel: s.expand ? 'Thu nhỏ bảng' : 'Mở rộng bảng', toggleExpand: function () { self.setState({ expand: !self.state.expand }); },
      ctxOpen: !!s.ctx && !!byId[s.ctx && s.ctx.id], ctxX: s.ctx ? s.ctx.x : 0, ctxY: s.ctx ? s.ctx.y : 0,
      ctxItems: s.ctx && byId[s.ctx.id] ? (function () { var cn = byId[s.ctx.id], isSt = cn.type === 'start'; return [
        { label: 'Nhân bản', off: isSt, fg: '#242424', pick: function () { self.duplicate(cn.id); } },
        { label: 'Sao chép', off: isSt, fg: '#242424', pick: function () { self.clip = clone(cn); self.setState({ ctx: null }); self.showToast('Đã sao chép "' + cn.title + '". Chuột phải rồi chọn Dán để thêm bản sao.'); } },
        { label: 'Dán', off: !self.clip, fg: '#242424', pick: function () { self.duplicate(null, true); } },
        { label: 'Xoá', off: isSt, fg: isSt ? '#a1a1aa' : '#dc2626', pick: function () { self.removeNode(cn.id); } }
      ]; })() : [],

      zoomPct: Math.round(s.z * 100), zoomIn: function () { self.setState({ z: Math.min(1.5, Math.round((s.z + 0.1) * 10) / 10) }); }, zoomOut: function () { self.setState({ z: Math.max(0.2, Math.round((s.z - 0.1) * 10) / 10) }); },
      runLocked: this.locked(), runBar: run && run.status === 'paused' ? 'Đang chờ trả lời - xem bảng Chạy thử bên phải' : 'Đang chạy thử - canvas tạm khoá',

      addOpen: !!ad, addQ: ad ? ad.q : '', addSections: addSections, addEmpty: !!ad && !flat.length, addHasFrom: !!addFrom, addFrom: addFrom,
      addHasCrumb: !!ad && (ad.level === 'func' || ad.mode === 'inner'), addCrumb: ad && ad.mode === 'inner' ? ((self.byId(ad.loopId) || {}).type === 'parallel' ? 'Nhánh song song' : 'Vòng lặp') : 'Hàm', addShowTabs: !!ad && ad.level !== 'func' && ad.mode !== 'inner' && !ad.q,
      addTabs: [{ id: 'featured', label: 'Nổi bật' }, { id: 'tool', label: 'Tool' }].map(function (x) { var on = ad && ad.tab === x.id; return { label: x.label, on: !!on, bg: on ? '#eef1fd' : '#fff', fg: on ? '#203BDC' : '#475569', line: on ? '#c7d2fe' : '#e5e5e5', pick: function () { self.setState({ add: Object.assign({}, self.state.add, { tab: x.id, idx: 0 }) }); } }; }),
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
      onErrMode: function (e) { var n = byId[s.sel], v = e.target.value, edges = self.state.edges; if (n.cfg.err === 'branch' && v !== 'branch') edges = edges.filter(function (x) { return !(x.from === n.id && x.out === 1); }); self.setState({ edges: edges }); self.updateCfg({ err: v }); self.relayoutSoon(); },
      nodeTabs: [{ id: 'cfg', label: emb ? 'Thiết lập' : 'Cấu hình' }, { id: 'last', label: emb ? 'Chạy riêng' : 'Chạy bước' }].map(function (x) { var on = s.tab === x.id; return { label: x.label, on: on, bg: on ? '#eef1fd' : '#fff', fg: on ? '#203BDC' : '#475569', line: on ? '#c7d2fe' : '#e5e5e5', pick: function () { self.setState({ tab: x.id }); } }; }),
      tabCfg: s.tab === 'cfg' || !(selNode && selNode.type !== 'note' && selNode.type !== 'start'), tabLast: s.tab === 'last' && !!selNode && selNode.type !== 'note' && selNode.type !== 'start', lastHas: !!last,
      last: last ? { st: last.st, ms: last.ms.toLocaleString('vi-VN') + ' ms', note: last.note, out: last.out, stColor: last.st === 'Thành công' ? '#15803d' : '#b91c1c' } : { st: '', ms: '', note: '', out: '', stColor: '#000' },
      runStep: function () { self.runOne(); },
      onTitle: function (e) { self.updateSel({ title: e.target.value }); },
      deselect: function () { self.setState({ sel: null, picking: null }); },
      deleteSel: function () { self.removeNode(self.state.sel); },

      aiCount: s.nodes.filter(function (n) { return TYPES[n.type].ai; }).length, actCount: s.nodes.filter(function (n) { return TYPES[n.type].act || (n.type === 'func' && n.cfg.fn === 'http'); }).length,
      guards: guardList([['safety', 'Chặn nội dung độc hại, xúc phạm'], ['pii', 'Che CCCD, số tài khoản, số điện thoại trong kết quả'], ['scope', 'Chặn yêu cầu ngoài phạm vi Quy trình']]),
      actGuards: guardList([['noDelete', 'Chặn thao tác xoá dữ liệu trên hệ thống khác'], ['maskOut', 'Che thông tin cá nhân trước khi gửi ra ngoài'], ['rate', 'Giới hạn 100 lần gọi mỗi giờ']]),
      stepCount: s.nodes.filter(function (n) { return n.type !== 'note'; }).length,
      readyItems: readyItems, readyDone: readyItems.filter(function (r) { return r.done; }).length, readyTotal: readyItems.length, readyPct: Math.round(readyItems.filter(function (r) { return r.done; }).length / readyItems.length * 100),

      runTabs: (run && run.status !== 'idle' ? [{ id: 'input', label: 'Dữ liệu vào' }, { id: 'result', label: 'Kết quả' }, { id: 'trace', label: 'Từng bước' }] : [{ id: 'input', label: 'Dữ liệu vào' }]).map(function (x) { var on = run && run.tab === x.id; return { label: x.label, on: !!on, bg: on ? '#eef1fd' : 'transparent', fg: on ? '#203BDC' : '#475569', pick: function () { self.setState({ run: Object.assign({}, self.state.run, { tab: x.id }) }); } }; }),
      runShowInput: !!run && run.tab === 'input', runShowResult: !!run && run.tab === 'result', runShowTrace: !!run && run.tab === 'trace',
      runInputTitle: startNode ? 'Dữ liệu chạy thử · ' + trigOf(startNode.cfg).name : 'Dữ liệu chạy thử',
      runStatusText: rs[0], runStatusColor: rs[1], runInputs: runInputs, noRunInputs: !runInputs.length, runLog: runLog,
      startRun: function () { self.startRun(); },
      rerun: function () { self.setState({ run: Object.assign({}, self.state.run, { status: 'idle', tab: 'input', log: [], ran: [], redges: [], failId: null, cur: null }) }); },
      closeRun: function () { clearTimeout(self.timer); var r = self.state.run; self.setState({ runOpen: false, run: r && (r.status === 'running' || r.status === 'paused') ? null : r }); },
      runPaused: !!run && run.status === 'paused', runRunning: !!run && run.status === 'running', runDone: !!run && run.status === 'done',
      waitTitle: waitNode ? 'Đang chờ: ' + waitNode.title : '', waitBody: waitNode ? (waitNode.type === 'wait' ? 'Chờ "' + waitNode.cfg.source + '" có ' + waitNode.cfg.key + ' = ' + ((run.vars || {})[waitNode.cfg.key] || '...') + '.' : (waitNode.cfg.title ? waitNode.cfg.title + ' - ' : '') + fill(waitNode.cfg.message, run.vars || {})) : '',
      waitWho: waitNode ? (waitNode.cfg.assignee || 'người duyệt') : '', waitActions: waitActions, waitExpire: waitNode ? waitNode.cfg.timeout + ' ' + waitNode.cfg.tunit + (waitNode.type === 'human' ? ({ remind: ', nhắc lại nếu chưa trả lời', escalate: ', sau đó chuyển cho ' + waitNode.cfg.escalateTo, branch: ', sau đó đi nhánh Quá hạn' })[waitNode.cfg.onTimeout] : (waitNode.cfg.onTimeout === 'branch' ? ', sau đó đi nhánh Quá hạn' : ', sau đó dừng Quy trình')) : '',
      waitRole: waitNode ? (waitNode.type === 'wait' ? 'Bạn đóng vai hệ thống gửi sự kiện. Chọn để Quy trình chạy tiếp.' : 'Bạn đang đóng vai ' + (waitNode.cfg.assignee || 'người duyệt') + '. Chọn câu trả lời để Quy trình chạy tiếp.') : '',
      runResText: run && run.text ? run.text : '', runResBorder: run && run.ok ? '#bbf7d0' : '#fecaca', runResBg: run && run.ok ? '#f0fdf4' : '#fef2f2',
      runHasOutput: !!(run && run.output), runOutput: run && run.output ? run.output : '',
      toast: !!s.toast, toastText: s.toast ? s.toast.text : '', toastBg: s.toast ? (s.toast.tone === 'bad' ? '#b91c1c' : (s.toast.tone === 'good' ? '#15803d' : '#0f172a')) : '#0f172a'
    };
  }

  startDrag(e, id) {
    if (e.button === 2) return;
    if (e.target.closest && e.target.closest('[data-plus],[data-ui]')) return;
    e.stopPropagation(); if (this.locked()) return;
    var n = this.byId(id);
    var base = { sel: id, add: null, runOpen: false, panel: null, top: 'build', ctx: null, tab: id === this.state.sel ? this.state.tab : 'cfg', picking: null };
    if (n.parent || this.ro()) { this.setState(base); return; }
    this.setState(Object.assign(base, { dragPre: this.snap().hist, drag: { id: id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y } }));
  }
  toWorld(cx, cy) { var s = this.state, r = this.canvasEl && this.canvasEl.getBoundingClientRect ? this.canvasEl.getBoundingClientRect() : { left: 0, top: 0 }; return { x: (cx - r.left - s.px) / s.z, y: (cy - r.top - s.py) / s.z }; }
  hitNode(x, y, fromId) {
    DIR = this.state.dir;
    var hit = null;
    this.state.nodes.forEach(function (n) { if (n.parent || n.type === 'start' || n.type === 'note' || n.id === fromId) return; var z = sizeOf(n); if (x >= n.x - 12 && x <= n.x + z.w + 12 && y >= n.y - 12 && y <= n.y + z.h + 12) hit = n; });
    return hit;
  }
  startLink(e, id, out) {
    if (this.locked() || this.ro()) return;
    e.stopPropagation();
    var p = this.toWorld(e.clientX, e.clientY);
    this.setState({ link: { from: { id: id, out: out }, sx: e.clientX, sy: e.clientY, mx: p.x, my: p.y, moved: false } });
  }
  onMove(e) {
    var lk = this.state.link;
    if (lk) { var p = this.toWorld(e.clientX, e.clientY); this.setState({ link: Object.assign({}, lk, { mx: p.x, my: p.y, moved: lk.moved || Math.abs(e.clientX - lk.sx) + Math.abs(e.clientY - lk.sy) > 5 }) }); return; }
    var dr = this.state.drag; if (!dr) return;
    var dx = e.clientX - dr.sx, dy = e.clientY - dr.sy;
    if (dr.pan) { this.setState({ px: dr.ox + dx, py: dr.oy + dy }); return; }
    var z = this.state.z, self = this;
    var nodes = this.state.nodes.map(function (n) { return n.id === dr.id ? Object.assign({}, n, { x: Math.round((dr.ox + dx / z) / 8) * 8, y: Math.round((dr.oy + dy / z) / 8) * 8 }) : n; });
    DIR = this.state.dir; placeInner(nodes);
    this.setState({ nodes: nodes });
  }
  onUp() {
    var lk = this.state.link;
    if (lk) {
      this.setState({ link: null });
      if (lk.moved) {
        var t = this.hitNode(lk.mx, lk.my, lk.from.id);
        this.justLinked = true; var self = this; setTimeout(function () { self.justLinked = false; }, 50);
        if (t) this.connect(lk.from, t.id);
      }
      return;
    }
    var dr = this.state.drag; if (!dr) return;
    var moved = !dr.pan && this.state.nodes.some(function (n) { return n.id === dr.id && (n.x !== dr.ox || n.y !== dr.oy); });
    this.setState(moved ? { drag: null, hist: this.state.dragPre, fut: [] } : { drag: null });
  }

  componentDidMount() {
    var self = this, p = this.props;
    if (p.initial) {
      var g = p.initial;
      this.openBuilder(null, g.name, false);
      DIR = g.dir || 'h';
      this.seq = 1000;
      this.setState({ outs: g.outs || [], panelHidden: (g.nodes || []).length > 2, nodes: g.nodes, edges: g.edges, dir: g.dir || 'h', desc: g.desc || '', guard: g.guard || this.state.guard, savedName: g.name, name: g.name, sel: null });
      setTimeout(function () { self.fit(1); }, 60);
      return;
    }
    if (p.prompt) { this.setState({ drafting: true }); this.timer = setTimeout(function () { self.openBuilder(pickKey(p.prompt), p.name || SUGGEST.filter(function (g) { return g.key === pickKey(p.prompt); })[0].name, true); }, 1300); }
    else this.openBuilder(p.draft || null, p.name || (p.draft ? (SUGGEST.filter(function (g) { return g.key === p.draft; })[0] || {}).name : ''), false);
  }
  componentDidUpdate(pp, ps) {
    var p = this.props, s = this.state, self = this;
    if (s.screen === 'builder' && p.onSave && (s.nodes !== ps.nodes || s.edges !== ps.edges || s.savedName !== ps.savedName || s.desc !== ps.desc || s.guard !== ps.guard || s.dir !== ps.dir || s.outs !== ps.outs)) {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(function () { var t = self.state; p.onSave({ nodes: t.nodes, edges: t.edges, name: t.savedName, desc: t.desc, guard: t.guard, dir: t.dir, outs: t.outs || [] }); }, 300);
    }
    if (s.sel && s.sel !== ps.sel && !s.drag) { var sid = s.sel; setTimeout(function () { if (!self.state.drag) self.ensureVisible(sid); }, 30); }
    if (p.command && p.command !== pp.command) {
      if (p.command.kind === 'issues') this.setState({ checkOpen: true, pubOpen: false });
      if (p.command.kind === 'run') this.openRun();
      if (p.command.kind === 'details') this.setState({ panelHidden: false, sel: null, runOpen: false, checkOpen: false, panel: null });
      if (p.command.kind === 'hide') this.setState({ panelHidden: true, sel: null, runOpen: false, panel: null });
    }
    if (p.onReady && this._v) {
      var v = this._v, key = JSON.stringify([v.readyItems.map(function (r) { return r.label + r.done; }), v.issueCount, v.stepCount]);
      if (key !== this._readyKey) { this._readyKey = key; p.onReady({ items: v.readyItems.map(function (r) { return { label: r.label, done: r.done, failed: r.failed }; }), pick: v.readyItems.map(function (r) { return r.pick; }), issueCount: v.issueCount, stepCount: v.stepCount }); }
    }
  }
  componentWillUnmount() { clearTimeout(this.timer); clearTimeout(this.saveTimer); }
  render() {
    var self = this, emb = !!this.props.embedded;
    if (this.state.screen !== 'builder') {
      return (
        <div className="qt-root" style={S(emb ? 'height: 100%; flex: 1; display: flex; align-items: center; justify-content: center; background: #f8fafc' : 'height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc')}>
          <style>{CSS}</style>
          <div role="status" style={S('display: flex; flex-direction: column; align-items: center; gap: 12px; color: #334155; font-size: 14px')}>
            <span className="qt-running" style={S('width: 40px; height: 40px; border-radius: 12px; background: #203BDC; color: #fff; display: flex; align-items: center; justify-content: center')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON.spark}></path></svg></span>
            AI đang dựng Quy trình từ mô tả của bạn...
          </div>
        </div>
      );
    }
    var v = this.renderVals(); this._v = v;
    var { actCount, actGuards, addCrumb, addEmpty, addFrom, addHasCrumb, addHasFrom, addOpen, addQ, addRoot, addSections, addShowTabs, addTabs, aiBanner, aiCount, autoLayout, backToList, bannerLeft, building, canRedoNot, canTest, canUndoNot, canvasCursor, canvasRef, cases, checkOpen, checkPos, closeAdd, collapseSide, ctxItems, ctxOpen, ctxX, ctxY, deleteProcess, deleteSel, desc, descLen, dirIcon, dirLabel, dismissBanner, draftSteps, edgeDel, edgesD, editors, errD, errMode, errRetry, expandLabel, expandSide, fit, guards, hasIssues, isGuardPage, isOtherTab, isVersionsPage, issueColor, issueCount, issueGroups, last, lastHas, moreOpen, name, nameBorder, nameHint, nameHintColor, nameInput, nameInvalid, nameLen, navItems, noIssues, noRunInputs, nodeTabs, notEmb, onAddKey, onAddQ, onBgDown, onDesc, onErrMode, onMove, onName, onNameBlur, onTitle, onUp, opOpts, openRun, openVersions, otherIcon, otherText, otherTitle, outVars, palClosed, palItems, palOpen, panelClose, panelOpen, panelReopen, panelTabs, panelW, pendingBanner, pendingText, pf, pmNode, pmProcess, pmRun, pubOpen, pubState, publish, publishDisabled, publishLabel, ranD, readOnly, readyChipFg, readyChipIcon, readyChipText, readyDone, readyItems, readyOpen, readyPct, readyTotal, redo, reopenCfg, rerun, roBanner, runBar, runBtnLabel, runDone, runHasOutput, runInputTitle, runInputs, runLocked, runLog, runOutput, runPaused, runResBg, runResBorder, runResText, runRunning, runShowInput, runShowResult, runShowTrace, runStatusColor, runStatusText, runStep, runTabs, sel, selD, share, showHeader, showReady, showReadyChip, sideRail, sideShow, startRun, statusBg, statusDot, statusFg, statusLabel, stepCount, tabCfg, tabLast, tmpD, toast, toastBg, toastText, toggleCheck, toggleDir, toggleExpand, toggleMore, togglePal, togglePub, toggleReady, toggleRetry, toolHint, toolHintColor, topTabs, triggerName, undo, varOpts, versionSub, versionTitle, viewNodes, waitActions, waitBody, waitExpire, waitRole, waitTitle, worldTransform, zoomIn, zoomOut, zoomPct } = v;
    backToList = function () { clearTimeout(self.timer); self.props.onBack(); };
    return (
      <div className="qt-root" style={S(emb ? 'flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; overflow: hidden; position: relative; background: #fff' : 'height: 100vh; min-height: 640px; display: flex; flex-direction: column; overflow: hidden; position: relative; background: #fff')}>
        <style>{CSS}</style>

{(showHeader) && (<>
<div style={S('height: 56px; flex-shrink: 0; border-bottom: 1px solid #e3e1dc; display: flex; align-items: center; padding: 0 16px; gap: 12px; position: relative; z-index: 30; background: #fff')}>
  <button type="button" className={Q('ghost')} aria-label="Quay lại danh sách Nhân sự số" onClick={backToList} style={S('width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #686873; flex-shrink: 0')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg></button>
  <button type="button" className={Q('ghost')} onClick={backToList} style={S('font-size: 12px; color: #686873; padding: 0; flex-shrink: 0')}>Nhân sự số</button>
  <span style={S('font-size: 12px; color: #b4b4ba; flex-shrink: 0')}>/</span>
  <div style={S('display: flex; align-items: center; gap: 8px; min-width: 140px; max-width: 300px')}>
    <span style={S('width: 28px; height: 28px; border-radius: 6px; background: #f5f3f0; border: 1px solid #e3e1dc; color: #203BDC; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5h6v5H3z M15 14h6v5h-6z M9 7.5h3a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2"></path></svg></span>
    <span style={S('font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0')} title={name}>{name}</span>
    <span style={S('display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 2px 6px; border-radius: 4px; background: #eef2ff; color: #4338ca; white-space: nowrap; flex-shrink: 0')}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5h6v5H3z M15 14h6v5h-6z M9 7.5h3a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2"></path></svg>Quy trình</span>
  </div>
  <div style={S('flex: 1; display: flex; justify-content: center; gap: 4px')}>
    {(topTabs || []).map((t, _it) => (<React.Fragment key={_it}>
      <button type="button" onClick={t.pick} aria-pressed={t.on} title={t.label} style={S(`display: inline-flex; align-items: center; gap: 10px; height: 32px; padding: 0 10px; border: 0; border-radius: 8px; font-size: 14px; font-weight: 500; white-space: nowrap; flex-shrink: 0; background: ${t.bg}; color: ${t.fg}`)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon}></path></svg>{t.label}</button>
    </React.Fragment>))}
  </div>
  <div style={S('display: flex; align-items: center; gap: 8px')}>
    <button type="button" onClick={openVersions} style={S(`height: 32px; display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; border-radius: 999px; border: 0; font-size: 12px; font-weight: 500; white-space: nowrap; background: ${statusBg}; color: ${statusFg}`)}><span style={S(`width: 6px; height: 6px; border-radius: 999px; background: ${statusDot}`)}></span>{statusLabel}</button>
    <button type="button" onClick={share} style={S('height: 36px; padding: 0 12px; border-radius: 8px; border: 1px solid #e3e1dc; background: #fff; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; color: #121216')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M16 11l2 2 4-4"></path></svg>Cấp quyền</button>
    <div style={S('position: relative')}>
      <button type="button" className={Q('btn btn-primary')} aria-expanded={pubOpen} onClick={togglePub} style={S('height: 36px; padding: 0 16px; border-radius: 8px; font-size: 14px; font-weight: 500; gap: 8px')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9-.8-.8-2.1-.8-2.9-.1z M12 15l-3-3c1.4-3.6 4.3-7.6 11-8-.4 6.7-4.4 9.6-8 11z M9 12H5l2-4h4 M12 15v4l4-2v-4"></path></svg>Publish</button>
      {(pubOpen) && (<>
        <div role="dialog" aria-label="Publish" style={S('position: absolute; right: 0; top: 44px; width: 300px; background: #fff; border: 1px solid #e3e1dc; border-radius: 12px; box-shadow: 0 12px 28px rgba(15,23,42,.14); padding: 14px')}>
          <div style={S('font-size: 12px; color: #686873')}>● {pubState}</div>
          <button type="button" className={Q('btn btn-primary')} onClick={publish} disabled={publishDisabled} style={S('width: 100%; justify-content: center; margin-top: 10px')}>{publishLabel}</button>
          {(hasIssues) && (<><p style={S('font-size: 11.5px; color: #b91c1c; margin: 6px 0 0')}>Còn {issueCount} lỗi. Xem mục Sẵn sàng publish bên trái.</p></>)}
          <p style={S(`font-size: 12px; color: ${toolHintColor}; margin: 12px 0 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 10px`)}>{toolHint}</p>
        </div>
      </>)}
    </div>
    <div style={S('position: relative')}>
      <button type="button" className={Q('ghost')} aria-label="Thao tác khác" aria-expanded={moreOpen} onClick={toggleMore} style={S('width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #686873')}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"></circle><circle cx="12" cy="12" r="1.6"></circle><circle cx="19" cy="12" r="1.6"></circle></svg></button>
      {(moreOpen) && (<>
        <div role="menu" style={S('position: absolute; right: 0; top: 40px; width: 176px; background: #fff; border: 1px solid #e3e1dc; border-radius: 8px; box-shadow: 0 12px 28px rgba(15,23,42,.14); padding: 4px 0; z-index: 40')}>
          <button type="button" role="menuitem" disabled={true} style={S('display: block; width: 100%; text-align: left; border: 0; background: transparent; padding: 6px 12px; font-size: 12px; color: #b4b4ba; cursor: not-allowed')}>Gỡ publish</button>
          <div style={S('height: 1px; background: #e3e1dc; margin: 4px 0')}></div>
          <button type="button" role="menuitem" onClick={deleteProcess} style={S('display: block; width: 100%; text-align: left; border: 0; background: transparent; padding: 6px 12px; font-size: 12px; color: #dc2626')}>Xóa Nhân sự số</button>
        </div>
      </>)}
    </div>
  </div>
</div>
</>)}

<div style={S('flex: 1; min-height: 0; display: flex; position: relative')}>
  {(sideShow) && (<>
    <aside style={S('width: 240px; flex-shrink: 0; border-right: 1px solid #e3e1dc; background: #fff; display: flex; flex-direction: column; height: 100%; box-sizing: border-box')}>
      <nav style={S('flex: 1; min-height: 0; overflow-y: auto; padding: 8px 8px 4px; display: flex; flex-direction: column; gap: 4px')}>
        {(navItems || []).map((it, _iit) => (<React.Fragment key={_iit}>
          <button type="button" onClick={it.pick} aria-current={it.on} style={S(`height: 36px; font-size: 14px; width: 100%; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 8px; padding: 0 10px; flex-shrink: 0; text-align: left; background: ${it.bg}; color: ${it.fg}; font-weight: ${it.fw}`)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={S('flex-shrink: 0')}><path d={it.icon}></path></svg><span style={S('flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap')}>{it.label}</span>{(it.hasCount) && (<><span style={S('min-width: 18px; height: 18px; border-radius: 999px; background: #dc2626; color: #fff; font-size: 10.5px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; padding: 0 5px')}>{it.count}</span></>)}</button>
        </React.Fragment>))}
      </nav>
      {(showReady) && (<>
        <div style={S('flex-shrink: 0; padding: 12px; border-top: 1px solid #e3e1dc; display: flex; flex-direction: column; gap: 8px')}>
          <div style={S('border: 1px solid #e3e1dc; background: rgba(245,243,240,.5); border-radius: 8px; padding: 10px')}>
            <div style={S('display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px')}><span style={S('font-size: 12px; font-weight: 600; color: #121216')}>Sẵn sàng publish</span><span style={S('font-size: 12px; color: #686873')}>{readyDone}/{readyTotal}</span></div>
            <div style={S('height: 6px; border-radius: 999px; background: #e3e1dc; overflow: hidden; margin-bottom: 8px')}><div style={S(`height: 100%; border-radius: 999px; background: #203BDC; width: ${readyPct}%`)}></div></div>
            {(readyItems || []).map((r, _ir) => (<React.Fragment key={_ir}>
              <button type="button" onClick={r.pick} style={S(`display: flex; align-items: center; gap: 6px; width: 100%; border: 0; background: transparent; padding: 2px 0; font-size: 14px; text-align: left; color: ${r.fg}; cursor: pointer`)}>
                {(r.done) && (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#203BDC" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={S('flex-shrink: 0')}><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M8 12l3 3 5-6"></path></svg></>)}
                {(r.failed) && (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={S('flex-shrink: 0')}><path d="M12 3l10 18H2z M12 10v4 M12 17h.01"></path></svg></>)}
                {(r.todo) && (<><span style={S('width: 12px; height: 12px; border-radius: 999px; border: 2px solid #686873; flex-shrink: 0; box-sizing: border-box')}></span></>)}
                <span>{r.label}</span>
              </button>
            </React.Fragment>))}
          </div>
          <button type="button" onClick={collapseSide} style={S('width: 100%; height: 32px; border-radius: 8px; border: 1px solid #e3e1dc; background: #fff; color: #686873; font-size: 12px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px')}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg>Collapse sidebar</button>
        </div>
      </>)}
    </aside>
  </>)}
  {(sideRail) && (<>
    <div style={S('width: 44px; flex-shrink: 0; border-right: 1px solid #e3e1dc; background: #fff; display: flex; justify-content: center; padding-top: 8px')}>
      <button type="button" className={Q('ghost')} aria-label="Mở sidebar" title="Mở sidebar" onClick={expandSide} style={S('width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #686873')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6"></path></svg></button>
    </div>
  </>)}
  {(checkOpen) && (<>
    <div role="dialog" aria-label="Lỗi cần sửa" style={S(`position: absolute; ${checkPos}; width: 360px; max-height: 460px; overflow-y: auto; background: #fff; border: 1px solid #e3e1dc; border-radius: 12px; box-shadow: 0 12px 28px rgba(15,23,42,.14); padding: 14px; z-index: 40`)}>
      <div style={S('display: flex; align-items: center; gap: 8px')}><b style={S('font-size: 14px; font-weight: 600; flex: 1')}>Lỗi cần sửa</b><span style={S('font-size: 11px; color: #b91c1c; background: #fef2f2; border-radius: 999px; padding: 1px 8px')}>{issueCount} lỗi</span><button type="button" className={Q('ghost')} aria-label="Đóng" onClick={toggleCheck} style={S('width: 26px; height: 26px; border-radius: 6px')}>✕</button></div>
      <p style={S('font-size: 12px; color: #686873; margin: 2px 0 0')}>Sửa hết thì mới publish được.</p>
      {(noIssues) && (<><p style={S('font-size: 12.5px; color: #15803d; margin: 10px 0 0')}>Không còn lỗi nào.</p></>)}
      {(issueGroups || []).map((g, _ig) => (<React.Fragment key={_ig}>
        <button type="button" onClick={g.go} style={S('display: block; width: 100%; text-align: left; border: 0; background: transparent; padding: 10px 6px 6px; border-radius: 8px; font: inherit; cursor: pointer')}>
          <span style={S('display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600')}><span style={S(`width: 20px; height: 20px; border-radius: 5px; background: ${g.tile}; color: #fff; display: inline-flex; align-items: center; justify-content: center`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={g.icon}></path></svg></span>{g.title} ({g.count})</span>
          {(g.msgs || []).map((m, _im) => (<React.Fragment key={_im}><span style={S('display: block; font-size: 12px; color: #475569; padding: 2px 0 0 28px')}>{m}</span></React.Fragment>))}
        </button>
      </React.Fragment>))}
    </div>
  </>)}
  <div style={S('flex: 1; min-width: 0; display: flex; flex-direction: column')}>

{(isOtherTab) && (<>
  <div style={S('flex: 1; display: flex; align-items: center; justify-content: center; background: #fff')}>
    <div style={S('max-width: 460px; text-align: center; padding: 24px')}>
      <span style={S('width: 44px; height: 44px; border-radius: 12px; background: #eceefe; color: #203BDC; display: inline-flex; align-items: center; justify-content: center')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={otherIcon}></path></svg></span>
      <h2 style={S('margin: 12px 0 0; font-size: 16px; font-weight: 600')}>{otherTitle}</h2>
      <p style={S('margin: 6px 0 0; font-size: 13px; color: #475569; line-height: 1.55')}>{otherText}</p>
    </div>
  </div>
</>)}
{(isGuardPage) && (<>
  <div style={S('flex: 1; overflow-y: auto; background: #fff')}>
    <div style={S('max-width: 720px; padding: 32px')}>
      <h2 style={S('margin: 0; font-size: 18px; font-weight: 600')}>Guardrails</h2>
      <p style={S('margin: 4px 0 0; font-size: 13px; color: #686873')}>Áp dụng cho mọi bước trong Quy trình này. Guardrails của Space luôn áp dụng trước và không tắt được ở đây.</p>
      <div style={S('margin-top: 18px; border: 1px solid #e3e1dc; border-radius: 12px; padding: 16px')}>
        <div style={S('font-size: 11px; font-weight: 600; letter-spacing: .04em; color: #475569')}>NỘI DUNG <span style={S('font-weight: 400; letter-spacing: 0; color: #686873')}>· {aiCount} bước AI</span></div>
        {(guards || []).map((g, _ig) => (<React.Fragment key={_ig}><label style={S('display: flex; gap: 8px; align-items: flex-start; font-size: 13px; padding: 5px 0; cursor: pointer')}><input type="checkbox" checked={g.on} onChange={g.toggle} style={S('margin-top: 2px; accent-color: #203BDC')} /><span>{g.label}</span></label></React.Fragment>))}
        <div style={S('font-size: 11px; font-weight: 600; letter-spacing: .04em; color: #475569; margin-top: 14px')}>HÀNH ĐỘNG <span style={S('font-weight: 400; letter-spacing: 0; color: #686873')}>· {actCount} bước Tool, HTTP</span></div>
        {(actGuards || []).map((g, _ig) => (<React.Fragment key={_ig}><label style={S('display: flex; gap: 8px; align-items: flex-start; font-size: 13px; padding: 5px 0; cursor: pointer')}><input type="checkbox" checked={g.on} onChange={g.toggle} style={S('margin-top: 2px; accent-color: #203BDC')} /><span>{g.label}</span></label></React.Fragment>))}
      </div>
    </div>
  </div>
</>)}
{(isVersionsPage) && (<>
  <div style={S('flex: 1; overflow-y: auto; background: #fff')}>
    <div style={S('max-width: 720px; padding: 32px')}>
      <h2 style={S('margin: 0; font-size: 18px; font-weight: 600')}>Phiên bản</h2>
      <p style={S('margin: 4px 0 0; font-size: 13px; color: #686873')}>Mỗi lần publish tạo một phiên bản. Lượt chạy đang dở vẫn chạy tiếp theo phiên bản cũ.</p>
      <div style={S('margin-top: 18px; border: 1px solid #e3e1dc; border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 10px')}>
        <span style={S(`width: 8px; height: 8px; border-radius: 999px; background: ${statusDot}`)}></span>
        <span style={S('flex: 1')}><b style={S('display: block; font-size: 14px; font-weight: 600')}>{versionTitle}</b><span style={S('font-size: 12px; color: #686873')}>{versionSub}</span></span>
        <span style={S('font-size: 12px; color: #686873')}>{stepCount} bước</span>
      </div>
    </div>
  </div>
</>)}
{(building) && (<>
<div style={S('flex: 1; min-height: 0; display: flex')}>
  <div ref={canvasRef} onMouseDown={onBgDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} style={S(`flex: 1; min-width: 0; position: relative; overflow: hidden; background-color: #f7f7f8; background-image: radial-gradient(#cfd2d8 1px, transparent 1px); background-size: 16px 16px; cursor: ${canvasCursor}`)}>

    <div style={S(`position: absolute; left: 0; top: 0; width: 0; height: 0; transform: ${worldTransform}; transform-origin: 0 0`)}>
      <svg width="6000" height="4000" style={S('position: absolute; left: -2000px; top: -2000px; overflow: visible; pointer-events: none')} aria-hidden="true">
        <g transform="translate(2000 2000)">
          <path d={edgesD} fill="none" stroke="#b9bcc4" strokeWidth="1.5" strokeLinecap="round"></path>
          <path d={errD} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round"></path>
          <path d={selD} fill="none" stroke="#203BDC" strokeWidth="1.8" strokeLinecap="round"></path>
          <path d={ranD} fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round"></path>
          <path d={tmpD} fill="none" stroke="#203BDC" strokeWidth="1.8" strokeDasharray="4 4" strokeLinecap="round"></path>
        </g>
      </svg>

      {(edgeDel || []).map((p, _ip) => (<React.Fragment key={_ip}>
        <button type="button" data-ui="1" className={Q(p.cls)} aria-label={p.aria} title="Xoá kết nối" onClick={p.pick} style={S(`left: ${p.x}px; top: ${p.y}px`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13"></path></svg></button>
      </React.Fragment>))}

      {(viewNodes || []).map((n, _in) => (<React.Fragment key={_in}>
        <div data-node={n.id} onMouseDown={n.down} onContextMenu={n.ctx} className={Q(n.cls)} style={S(`position: absolute; left: ${n.x}px; top: ${n.y}px; width: ${n.w}px; height: ${n.h}px; box-sizing: border-box; background: ${n.bg}; border: ${n.border}; border-radius: ${n.radius}px; box-shadow: ${n.shadow}; cursor: grab; user-select: none`)}>
          <button type="button" className={Q('sr')} onClick={n.select}>Chọn bước {n.title}</button>
          {(n.isNote) && (<>
            <div style={S('padding: 10px 12px; font-size: 12.5px; line-height: 1.5; color: #3f3f46; white-space: pre-wrap')}>{n.noteText}</div>
          </>)}
          {(n.isCard) && (<>
            <div style={S(`height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 16px; border-bottom: ${n.headLine}`)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={n.tile} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={S('flex-shrink: 0')}><path d={n.icon}></path></svg>
              <span style={S('flex: 1; min-width: 0')}>
                <span style={S('display: block; font-size: 14px; font-weight: 600; color: #121216; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>{n.title}</span>
                {(n.badge) && (<><span style={S(`display: inline-flex; align-items: center; gap: 3px; margin-top: 3px; font-size: 10.5px; font-weight: 500; color: ${n.badgeFg}; background: ${n.badgeBg}; border: 1px solid ${n.badgeLine}; border-radius: 999px; padding: 0 7px; line-height: 16px; white-space: nowrap`)}>{n.badgeText}</span></>)}
                {(n.hasSub) && (<><span style={S('display: block; margin-top: 2px; font-size: 12px; color: #5b5b66; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>{n.sub}</span></>)}
              </span>
            </div>
            <div style={S(`display: flex; flex-direction: ${n.pillDir}; gap: 8px; padding: ${n.pillPad}`)}>
              {(n.pills || []).map((b, _ib) => (<React.Fragment key={_ib}>
                <div style={S(`flex: ${b.flex}; height: 32px; border-radius: 16px; background: ${b.bg}; color: ${b.fg}; font-size: 12.5px; font-weight: 500; display: flex; align-items: center; justify-content: center; padding: 0 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0`)}>{b.label}</div>
              </React.Fragment>))}
            </div>
            {(n.isPar) && (<>
              {(n.lanes || []).map((ln, _iln) => (<React.Fragment key={_iln}>
                <span style={S(`position: absolute; left: ${ln.lx}px; top: ${ln.ly}px; width: ${ln.lw}px; font-size: 12px; font-weight: 600; color: #686873; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`)}>{ln.label}</span>
                {(ln.empty) && (<>
                  <button type="button" data-ui="1" className={Q('plus')} aria-label={ln.aria} onClick={ln.add} style={S(`position: absolute; left: ${ln.px}px; top: ${ln.py}px`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14 M5 12h14"></path></svg></button>
                </>)}
              </React.Fragment>))}
            </>)}
            {(n.isLoop) && (<>
              {(n.loopEmpty) && (<>
                <button type="button" data-ui="1" className={Q('plus')} aria-label="Thêm bước vào vòng lặp" onClick={n.addInner} style={S('position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)')}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14 M5 12h14"></path></svg></button>
              </>)}
            </>)}
          </>)}
          {(n.hasIn) && (<>
            <span className={Q('port')} style={S(`left: ${n.inX}px; top: ${n.inYp}px`)}></span>
          </>)}
          {(n.outs || []).map((o, _io) => (<React.Fragment key={_io}>
            <span className={Q('port')} style={S(`left: ${o.dx}px; top: ${o.dy}px; background: ${o.dot}`)}></span>
            <button type="button" data-ui="1" className={Q(o.cls)} aria-label={o.aria} onMouseDown={o.down} onClick={o.plus} style={S(`left: ${o.px}px; top: ${o.py}px`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14 M5 12h14"></path></svg></button>
          </React.Fragment>))}
          {(n.canDel) && (<>
            <div className={Q('qn-tools')} data-ui="1" style={S('position: absolute; right: -10px; top: -12px; display: flex; gap: 4px')}>
              {(n.canRun) && (<><button type="button" className={Q('qn-run')} aria-label={n.runAria} title="Chạy bước này" onClick={n.run}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"></path></svg></button></>)}
              <button type="button" className={Q('qn-del')} aria-label={n.delAria} title="Xoá bước" onClick={n.del}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13"></path></svg></button>
            </div>
          </>)}
        </div>
      </React.Fragment>))}
    </div>

    {/* Bảng Thêm bước */}
    {(palOpen) && (<>
      <div data-ui="1" style={S('position: absolute; left: 16px; top: 16px; width: 216px; max-height: calc(100% - 84px); overflow-y: auto; background: #fff; border: 1px solid #e3e1dc; border-radius: 12px; box-shadow: 0 4px 16px rgba(15,23,42,.08); padding: 6px 8px 8px; z-index: 6')}>
        <div style={S('display: flex; align-items: center; padding: 4px 4px 6px 8px')}><b style={S('flex: 1; font-size: 15px; font-weight: 600; color: #121216')}>Thêm bước</b><button type="button" className={Q('ghost')} aria-label="Thu gọn bảng thêm bước" title="Thu gọn" onClick={togglePal} style={S('width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16v16H4z M9 4v16"></path></svg></button></div>
        {(palItems || []).map((it, _iit) => (<React.Fragment key={_iit}>
          {(it.hasHead) && (<><div className={Q('palh')}>{it.head}</div></>)}
          <button type="button" className={Q('pal')} onClick={it.pick} title={it.desc}>
            <span style={S(`width: 26px; height: 26px; border-radius: 7px; background: ${it.tileBg}; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={it.tile} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={it.icon}></path></svg></span>
            <span style={S('flex: 1')}>{it.name}</span>
          </button>
        </React.Fragment>))}
      </div>
    </>)}
    {(palClosed) && (<>
      <button type="button" data-ui="1" className={Q('btn')} onClick={togglePal} style={S('position: absolute; left: 16px; top: 16px; z-index: 6; height: 34px; font-size: 13px')}>+ Thêm bước</button>
    </>)}

    <div data-ui="1" style={S('position: absolute; left: 16px; bottom: 16px; display: flex; align-items: center; gap: 2px; background: #fff; border: 1px solid #e6e6e9; border-radius: 10px; padding: 3px; box-shadow: 0 2px 8px rgba(15,23,42,.06); z-index: 6')}>
      <button type="button" className={Q('tbtn')} aria-label="Hoàn tác" title="Hoàn tác" onClick={undo} disabled={canUndoNot} style={S('width: 30px; height: 30px')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3"></path></svg></button>
      <button type="button" className={Q('tbtn')} aria-label="Làm lại" title="Làm lại" onClick={redo} disabled={canRedoNot} style={S('width: 30px; height: 30px')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 14l5-5-5-5 M20 9H10a6 6 0 0 0 0 12h3"></path></svg></button>
      <span style={S('width: 1px; height: 18px; background: #e3e1dc; margin: 0 2px')}></span>
      <button type="button" className={Q('tbtn')} aria-label="Phóng to" title="Phóng to" onClick={zoomIn} style={S('width: 30px; height: 30px')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-4.3-4.3 M11 8v6 M8 11h6"></path></svg></button>
      <button type="button" className={Q('tbtn')} aria-label="Thu nhỏ" title="Thu nhỏ" onClick={zoomOut} style={S('width: 30px; height: 30px')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-4.3-4.3 M8 11h6"></path></svg></button>
      <button type="button" className={Q('tbtn')} aria-label="Vừa khung" title="Vừa khung" onClick={fit} style={S('width: 30px; height: 30px')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5"></path></svg></button>
      <button type="button" className={Q('tbtn')} aria-label="Sắp xếp gọn" title="Sắp xếp gọn" onClick={autoLayout} style={S('width: 30px; height: 30px')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4l6 6 M17 7L8 16 M3 21l5-5 M6 13l5 5"></path></svg></button>
      <button type="button" className={Q('tbtn')} aria-label={dirLabel} title={dirLabel} onClick={toggleDir} style={S('width: 30px; height: 30px')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={dirIcon}></path></svg></button>
      <span style={S('font-size: 11.5px; color: #6b7280; padding: 0 6px 0 2px')}>{zoomPct}%</span>
      {(showReadyChip) && (<>
        <span style={S('width: 1px; height: 18px; background: #e3e1dc; margin: 0 2px')}></span>
        <button type="button" className={Q('tbtn')} onClick={toggleReady} aria-expanded={checkOpen} title="Xem lỗi cần sửa" style={S(`height: 30px; width: auto; padding: 0 10px; display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: ${readyChipFg}`)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={readyChipIcon}></path></svg>{readyChipText}</button>
      </>)}
    </div>

    {(aiBanner) && (<>
      <div data-ui="1" role="status" style={S(`position: absolute; left: ${bannerLeft}; top: 16px; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; background: #f3f5fe; border: 1px solid #c7d2fe; border-radius: 10px; padding: 7px 8px 7px 12px; font-size: 12.5px; color: #1e3a8a; max-width: 520px; z-index: 5`)}>
        <span>AI dựng {draftSteps} bước từ mô tả của bạn. Bấm chip số lỗi ở thanh dưới để xem chỗ còn thiếu.</span>
        <button type="button" className={Q('ghost')} onClick={dismissBanner} style={S('height: 28px; padding: 0 8px; border-radius: 6px; font-size: 12px; color: #1e3a8a; font-weight: 500; white-space: nowrap; flex-shrink: 0')}>Đã hiểu</button>
      </div>
    </>)}
    {(pendingBanner) && (<>
      <div data-ui="1" role="status" style={S(`position: absolute; left: ${bannerLeft}; top: 16px; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 8px 12px; font-size: 12.5px; color: #92400e; max-width: 560px; z-index: 5`)}><span style={S('width: 6px; height: 6px; border-radius: 999px; background: #f59e0b; flex-shrink: 0')}></span><span>{pendingText}</span></div>
    </>)}
    {(roBanner) && (<>
      <div data-ui="1" role="status" style={S(`position: absolute; left: ${bannerLeft}; top: 16px; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; background: #f5f3f0; border: 1px solid #e3e1dc; border-radius: 10px; padding: 8px 12px; font-size: 12.5px; color: #475569; z-index: 5`)}>Bạn chỉ xem được Quy trình này. Bấm vào bước để xem cấu hình.</div>
    </>)}
    {(panelReopen) && (<>
      <div data-ui="1" style={S('position: absolute; right: 16px; top: 16px; display: flex; gap: 4px; background: #fff; border: 1px solid #e3e1dc; border-radius: 10px; padding: 3px; box-shadow: 0 2px 8px rgba(15,23,42,.06); z-index: 6')}>
{(notEmb) && (<><button type="button" onClick={reopenCfg} style={S('height: 30px; padding: 0 12px; border: 0; border-radius: 8px; background: transparent; font-size: 13px; font-weight: 500; color: #121216')}>Configuration</button></>)}
        {(canTest) && (<><button type="button" onClick={openRun} style={S('height: 30px; padding: 0 12px; border: 0; border-radius: 8px; background: #eceefe; font-size: 13px; font-weight: 500; color: #203BDC; display: inline-flex; align-items: center; gap: 6px')}><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"></path></svg>{runBtnLabel}</button></>)}
      </div>
    </>)}
    {(runLocked) && (<>
      <div data-ui="1" style={S(`position: absolute; left: ${bannerLeft}; bottom: 16px; transform: translateX(-50%); background: #0f172a; color: #fff; font-size: 12px; border-radius: 999px; padding: 6px 12px; z-index: 5`)}>{runBar}</div>
    </>)}

    {(readyOpen) && (<>
      <div data-ui="1" role="dialog" aria-label="Sẵn sàng publish" style={S('position: absolute; left: 16px; bottom: 60px; width: 300px; background: #fff; border: 1px solid #e3e1dc; border-radius: 12px; box-shadow: 0 12px 28px rgba(15,23,42,.14); padding: 14px; z-index: 30')}>
        <div style={S('display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px')}><b style={S('font-size: 14px; font-weight: 600; color: #121216')}>Sẵn sàng publish</b><span style={S('font-size: 12.5px; color: #686873')}>{readyDone}/{readyTotal}</span></div>
        <div style={S('height: 6px; border-radius: 999px; background: #e3e1dc; overflow: hidden; margin-bottom: 10px')}><div style={S(`height: 100%; border-radius: 999px; background: #203BDC; width: ${readyPct}%`)}></div></div>
        {(readyItems || []).map((r, _ir) => (<React.Fragment key={_ir}>
          <button type="button" onClick={r.pick} style={S(`display: flex; align-items: center; gap: 8px; width: 100%; border: 0; background: transparent; padding: 4px 0; font-size: 14px; text-align: left; color: ${r.fg}; cursor: pointer`)}>
            {(r.done) && (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#203BDC" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={S('flex-shrink: 0')}><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M8 12l3 3 5-6"></path></svg></>)}
            {(r.failed) && (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={S('flex-shrink: 0')}><path d="M12 3l10 18H2z M12 10v4 M12 17h.01"></path></svg></>)}
            {(r.todo) && (<><span style={S('width: 14px; height: 14px; border-radius: 999px; border: 2px solid #686873; flex-shrink: 0; box-sizing: border-box')}></span></>)}
            <span>{r.label}</span>
          </button>
        </React.Fragment>))}
      </div>
    </>)}
    {/* Menu chuột phải */}
    {(ctxOpen) && (<>
      <div data-ui="1" role="menu" style={S(`position: absolute; left: ${ctxX}px; top: ${ctxY}px; width: 180px; background: #fff; border: 1px solid #e6e6e9; border-radius: 10px; box-shadow: 0 10px 24px rgba(15,23,42,.14); padding: 4px; z-index: 30`)}>
        {(ctxItems || []).map((m, _im) => (<React.Fragment key={_im}>
          <button type="button" role="menuitem" className={Q('cmi')} onClick={m.pick} disabled={m.off} style={S(`color: ${m.fg}`)}><span style={S('flex: 1')}>{m.label}</span></button>
        </React.Fragment>))}
      </div>
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
  

    {/* Panel nổi bên phải */}
    {(panelOpen) && (<>
      <aside data-ui="1" style={S(`position: absolute; right: 0; top: 0; bottom: 0; width: ${panelW}px; max-width: calc(100% - 200px); background: #fff; border-left: 1px solid #e3e1dc; overflow-y: auto; z-index: 8; box-sizing: border-box`)}>
      <div style={S('height: 44px; padding: 0 12px; border-bottom: 1px solid #e3e1dc; display: flex; align-items: center; gap: 4px; position: sticky; top: 0; background: #fff; z-index: 2')}>
        {(panelTabs || []).map((t, _it) => (<React.Fragment key={_it}>
          <button type="button" onClick={t.pick} aria-pressed={t.on} style={S(`height: 28px; padding: 0 12px; border-radius: 8px; border: 0; font-size: 14px; font-weight: 500; background: ${t.bg}; color: ${t.fg}`)}>{t.label}</button>
        </React.Fragment>))}
        <span style={S('flex: 1')}></span>
        <button type="button" className={Q('ghost')} aria-label={expandLabel} title={expandLabel} onClick={toggleExpand} style={S('width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #686873')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7"></path></svg></button>
        <button type="button" className={Q('ghost')} aria-label="Đóng bảng cấu hình" title="Đóng" onClick={panelClose} style={S('width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #686873')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12 M18 6L6 18"></path></svg></button>
      </div>
    {(pmRun) && (<>
      <div style={S('padding: 14px 16px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 8px')}>
        <h2 style={S('margin: 0; font-size: 15px; font-weight: 600; flex: 1')}>Chạy thử Quy trình <span style={S(`font-weight: 400; color: ${runStatusColor}`)}>· {runStatusText}</span></h2>
      </div>
      <div role="tablist" style={S('display: flex; gap: 4px; padding: 8px 12px 0')}>
        {(runTabs || []).map((t, _it) => (<React.Fragment key={_it}>
          <button type="button" role="tab" aria-selected={t.on} onClick={t.pick} style={S(`height: 28px; padding: 0 10px; border-radius: 7px; border: 0; font-size: 12.5px; font-weight: 500; background: ${t.bg}; color: ${t.fg}`)}>{t.label}</button>
        </React.Fragment>))}
      </div>
      <div style={S('padding: 12px 16px 20px')}>
        {(runShowInput) && (<>
          <div style={S('font-size: 12px; font-weight: 600')}>{runInputTitle}</div>
          {(noRunInputs) && (<><p style={S('font-size: 12px; color: #475569; margin: 6px 0 0')}>Bước Start không nhận dữ liệu nào.</p></>)}
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
              <p style={S('font-size: 11.5px; color: #64748b; margin: 8px 0 0')}>{waitRole}</p>
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
          <input id="ntitle" value={sel.title} onChange={onTitle} readOnly={readOnly} style={S('flex: 1; min-width: 0; border: 1px solid transparent; border-radius: 6px; font: inherit; font-size: 15px; font-weight: 600; padding: 3px 6px; background: transparent')} />

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
        <fieldset disabled={readOnly} style={S('border: 0; padding: 0; margin: 0; min-width: 0')}>
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
            <p style={S('font-size: 11.5px; color: #64748b; margin: 8px 0 0; line-height: 1.5')}>Mọi dòng đều đúng (VÀ) hoặc một dòng đúng (HOẶC) thì đi nhánh Có, còn lại đi nhánh Không.</p>
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
        </fieldset>
      </>)}
    </>)}

    {(pmProcess) && (<>
      <fieldset disabled={readOnly} style={S('border: 0; padding: 0; margin: 0; min-width: 0')}>
      <div style={S('padding: 16px')}>
        <h2 style={S('margin: 0; font-size: 15px; font-weight: 600')}>Thông tin Quy trình</h2>
        <label className={Q('lbl')} htmlFor="qt-name">Tên Quy trình <span style={S('color: #dc2626')}>*</span></label>
        <input id="qt-name" className={Q('field')} value={nameInput} maxlength="100" onChange={onName} onBlur={onNameBlur} aria-invalid={nameInvalid} style={S(`border-color: ${nameBorder}`)} />
        <div style={S('display: flex; justify-content: space-between; gap: 8px; margin-top: 4px')}><span style={S(`font-size: 11.5px; color: ${nameHintColor}`)}>{nameHint}</span><span style={S('font-size: 11.5px; color: #686873')}>{nameLen}/100</span></div>
        <label className={Q('lbl')} htmlFor="qt-desc">Mô tả</label>
        <textarea id="qt-desc" className={Q('field')} rows="3" maxlength="500" value={desc} onChange={onDesc} placeholder="VD: Duyệt đề nghị mua sắm nhiều cấp, tạo PO và đối chiếu 3 chiều." style={S('height: auto; padding: 8px 10px; resize: vertical')}></textarea>
        <div style={S('display: flex; justify-content: flex-end; margin-top: 4px')}><span style={S('font-size: 11.5px; color: #686873')}>{descLen}/500</span></div>
        <div style={S('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 16px')}>
          <div style={S('background: #f8fafc; border-radius: 8px; padding: 10px')}><div style={S('font-size: 20px; font-weight: 600')}>{stepCount}</div><div style={S('font-size: 11.5px; color: #475569')}>bước</div></div>
          <div style={S('background: #f8fafc; border-radius: 8px; padding: 10px')}><div style={S(`font-size: 20px; font-weight: 600; color: ${issueColor}`)}>{issueCount}</div><div style={S('font-size: 11.5px; color: #475569')}>lỗi cần sửa</div></div>
          <div style={S('background: #f8fafc; border-radius: 8px; padding: 10px')}><div style={S('font-size: 13px; font-weight: 600; line-height: 1.3; min-height: 26px')}>{triggerName}</div><div style={S('font-size: 11.5px; color: #475569')}>kích hoạt</div></div>
        </div>
        <p style={S('margin: 14px 0 0; font-size: 12.5px; color: #475569; line-height: 1.5')}>Chọn một bước trên canvas để cấu hình bước đó.</p>
        <p style={S(`margin: 8px 0 0; font-size: 12.5px; color: ${toolHintColor}; line-height: 1.5`)}>{toolHint}</p>
      </div>
      </fieldset>
    </>)}

      </aside>
    </>)}
  </div>
</div>
</>)}
  </div>
</div>

{(toast) && (<>
  <div role="status" style={S(`position: absolute; left: 50%; bottom: 84px; transform: translateX(-50%); background: ${toastBg}; color: #fff; font-size: 13px; border-radius: 10px; padding: 10px 16px; box-shadow: 0 8px 24px hsl(240 10% 8% / .25); z-index: 60; max-width: 520px; text-align: center; line-height: 1.45`)}>{toastText}</div>
</>)}


      </div>
    );
  }
}

export { ProcessBuilderInner, pickKey, SUGGEST };
export function ProcessCanvas(props: any) { return <ProcessBuilderInner {...props} embedded />; }

/** /process/:id now only resolves to the Nhân sự số page (/agents/:id), which hosts the canvas
 * inside the same shell as every other Nhân sự số. /process/new[?prompt=] creates the record. */
export default function ProcessBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [sp] = useSearchParams();
  React.useEffect(() => {
    if (!id || id === "new") {
      const prompt = sp.get("prompt") || "";
      const key = prompt ? pickKey(prompt) : null;
      const sug = key ? SUGGEST.filter(function (g) { return g.key === key; })[0] : null;
      const rec = processStore.create({ name: sp.get("name") || (sug ? sug.name : "") || "Quy trình chưa đặt tên", draftKey: key, prompt });
      navigate("/agents/" + rec.id + (prompt ? "?fromAi=1" : ""), { replace: true });
    } else {
      const rec = processStore.byDraftKey(id) || processStore.get(id);
      navigate(rec ? "/agents/" + rec.id : "/agents", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
