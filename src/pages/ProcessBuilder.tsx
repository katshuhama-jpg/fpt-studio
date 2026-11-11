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
.qt-soon{font-size:10px;font-weight:600;color:#686873;background:#f1f1f4;border-radius:999px;padding:1px 6px;letter-spacing:0}
.qt-rcard{display:flex;gap:8px;align-items:flex-start;text-align:left;border:1px solid #e3e1dc;border-radius:8px;padding:8px 10px;background:#fff;font:inherit;min-width:0}
.qt-rcard:hover{border-color:#a5b4fc}
.qt-rdot{width:14px;height:14px;border-radius:999px;border:1.5px solid #c4c4cc;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;box-sizing:border-box}
.qt-rdot span{width:6px;height:6px;border-radius:999px}
.qt-stp{display:inline-flex;align-items:center;border:1px solid #e5e5e5;border-radius:8px;height:34px;overflow:hidden;background:#fff}
.qt-stp .qt-root button{width:30px;height:100%;border:0;background:#f8fafc;font-size:15px;color:#3f3f46;cursor:pointer}
.qt-stp button:disabled{color:#c4c4cc;cursor:default}
.qt-stp input{width:52px;height:100%;border:0;border-left:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:center;font:inherit;font-size:13px;outline:none}
.qt-vbtn{position:absolute;right:6px;height:22px;padding:0 6px;border-radius:5px;border:0;font-size:11px;font-weight:600;color:#1d4ed8;background:#eff6ff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;cursor:pointer}
.qt-vpk{margin-top:6px;border:1px solid #e3e1dc;border-radius:10px;padding:6px;max-height:240px;overflow-y:auto;background:#fff;box-shadow:0 8px 20px rgba(15,23,42,.10)}
.qt-vpi{display:flex;align-items:center;width:100%;min-height:28px;padding:4px 8px;border:0;background:transparent;border-radius:6px;font-size:12.5px;text-align:left;cursor:pointer}
.qt-vpi:hover{background:#f4f6fe}
.qt-chipbox{display:flex;flex-wrap:wrap;gap:6px;align-items:center;border:1px solid #e5e5e5;border-radius:8px;padding:5px 6px;min-height:34px;box-sizing:border-box}
.qt-chip{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 4px 0 8px;border-radius:999px;background:#eef1fd;color:#1e3a8a;font-size:12px;font-weight:500}
.qt-chip .qt-root button{width:18px;height:18px;border:0;border-radius:999px;background:transparent;color:#475569;font-size:10px;cursor:pointer;padding:0}
.qt-chip button:hover{background:#dfe5fb}
.qt-sw{appearance:none;-webkit-appearance:none;width:30px;height:18px;border-radius:999px;background:#d4d4d8;position:relative;flex-shrink:0;cursor:pointer;margin:0;transition:background .15s}
.qt-sw::after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:999px;background:#fff;transition:left .15s;box-shadow:0 1px 2px rgba(0,0,0,.2)}
.qt-sw:checked{background:#203BDC}.qt-sw:checked::after{left:14px}
.qt-sw:focus-visible{outline:2px solid #203BDC;outline-offset:2px}
.qt-dmn{border-collapse:separate;border-spacing:0;width:100%;font-size:12.5px}
.qt-dmn th,.qt-dmn td{border-bottom:1px solid #ececef;border-right:1px solid #ececef;padding:0;vertical-align:top;text-align:left}
.qt-dmn th{background:#fafafb;font-size:12px;color:#3f3f46;padding:6px 8px;font-weight:600}
.qt-dmn tr>*:first-child{border-left:1px solid #ececef}
.qt-dmn thead tr:first-child th{border-top:1px solid #ececef}
.qt-dmn-g{font-size:11px !important;letter-spacing:.05em;color:#475569 !important}
.qt-dmn-then{background:#f7f8fe}
.qt-dmn th.qt-dmn-then{background:#eef1fd}
.qt-dmn-no{width:30px;text-align:center !important;color:#686873;font-size:11.5px;padding:8px 0 !important}
.qt-dmn-in{width:100%;box-sizing:border-box;border:0;background:transparent;padding:8px;font:inherit;font-size:12.5px;outline:none;border-radius:4px}
.qt-dmn-in:focus{box-shadow:inset 0 0 0 2px #203BDC !important;background:#fff}
.qt-dmn-h{display:block;width:100%;border:0;background:transparent;text-align:left;font:inherit;padding:0;cursor:pointer}
.qt-dmn-pop{position:absolute;left:0;top:100%;z-index:5;width:260px;background:#fff;border:1px solid #e3e1dc;border-radius:10px;box-shadow:0 12px 28px rgba(15,23,42,.16);padding:12px;font-weight:400;text-align:left}
.qt-dmn-menu{position:absolute;right:0;top:100%;z-index:5;width:200px;background:#fff;border:1px solid #e3e1dc;border-radius:10px;box-shadow:0 12px 28px rgba(15,23,42,.16);padding:4px}
.qt-dmn-else td{background:#fcfcfd;padding:6px 8px}
.qt-dmn-else td.qt-dmn-then{padding:0;background:#f7f8fe}
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
var COL = { start: ['#15803D', '#e8f6ec'], agent: ['#203BDC', '#eef1fd'], logic: ['#475569', '#f1f5f9'], ai: ['#203BDC', '#eef1fd'], human: ['#0F766E', '#e6f4f2'], integ: ['#0369A1', '#e8f3fb'], fx: ['#475569', '#f1f5f9'], var: ['#475569', '#f1f5f9'], end: ['#B91C1C', '#fdecec'], note: ['#A16207', '#fef9c3'] };
var TYPES = {
  start: { c: 'start', name: 'Start', icon: ICON.bolt },
  end: { c: 'end', name: 'End', desc: 'Đóng hồ sơ: Completed, Rejected, Cancelled hoặc Failed', icon: ICON.end, kw: 'end ket thuc dong ho so' },
  agent: { c: 'ai', name: 'LLM', desc: 'Một lần gọi model với system prompt và user prompt', icon: ICON.scan, kw: 'llm prompt ai model soan trich xuat phan loai', err: 1, ai: 1 },
  worker: { c: 'agent', name: 'Agent', desc: 'Giao một việc cho Nhân sự số Năng suất hoặc agent bên ngoài', icon: ICON.bot, kw: 'agent nhan su so nang suat a2a giao viec', err: 1, ai: 1, tmo: 1 },
  human: { c: 'human', name: 'Human Review', desc: 'Giao việc cho người trong tổ chức, nhận ở Action Center', icon: ICON.approve, kw: 'human review duyet nguoi quick approval choice' },
  tool: { c: 'integ', name: 'Connector', desc: 'Một thao tác trên ứng dụng đã kết nối', icon: ICON.tool, kw: 'connector ung dung tool api mcp tich hop', act: 1, tmo: 1 },
  decision: { c: 'logic', name: 'DMN Table', desc: 'Bảng quyết định: mỗi dòng là một quy tắc', icon: ICON.table, kw: 'dmn decision table bang quyet dinh luat quy tac' },
  condition: { c: 'logic', name: 'If/Else', desc: 'Rẽ nhánh theo điều kiện, nhánh Else tạo tự động', icon: ICON.branch, kw: 'if else neu dieu kien re nhanh' },
  join: { c: 'logic', name: 'Join', desc: 'Hợp các nhánh song song', icon: ICON.join, kw: 'join hop nhanh song song' },
  loop: { c: 'logic', name: 'Loop', desc: 'Chạy các bước bên trong cho từng mục hoặc tới khi điều kiện đúng', icon: ICON.loop, kw: 'loop lap for each do until vong lap' },
  wait: { c: 'logic', name: 'Wait', desc: 'Chờ một khoảng hoặc tới một mốc rồi đi tiếp', icon: ICON.clock, kw: 'wait cho thoi gian moc' },
  variable: { c: 'var', name: 'Variable Assigner', desc: 'Gán, thêm vào cuối, đọc JSON hoặc xoá một biến', icon: ICON.vars, kw: 'variable assigner bien gan' },
  code: { c: 'fx', name: 'Code', desc: 'Python trong sandbox không có mạng', icon: ICON.code, kw: 'code python tinh toan' },
  note: { c: 'note', name: 'Note', desc: 'Ghi chú cho người đọc quy trình, không chạy', icon: ICON.note, kw: 'note ghi chu' },
  classify: { gone: 1, c: 'ai', name: 'Phân loại', icon: ICON.tag }, extract: { gone: 1, c: 'ai', name: 'Trích xuất', icon: ICON.scan }, func: { gone: 1, c: 'fx', name: 'Hàm', icon: ICON.fx },
  switch: { gone: 1, c: 'logic', name: 'Switch', icon: ICON.switch }, parallel: { gone: 1, c: 'logic', name: 'Parallel', icon: ICON.par }, respond: { gone: 1, c: 'integ', name: 'Respond to the agent', icon: ICON.reply },
  subflow: { p2: 1, c: 'integ', name: 'Subflow', icon: ICON.flow }
};
// Loại trigger theo console dev: chỉ "Agent khởi chạy" dùng được, các loại còn lại Sắp có
var TRIGGERS = [
  { id: 'manual', name: 'Thủ công', desc: 'Chạy quy trình khi cần bằng một nút bấm.', soon: 1 },
  { id: 'schedule', name: 'Định kỳ', desc: 'Chạy theo lịch', soon: 1 },
  { id: 'conn', name: 'Connector', desc: 'Kích hoạt từ một dịch vụ bên ngoài', soon: 1 },
  { id: 'http', name: 'Khi nhận một yêu cầu HTTP', desc: 'Trigger chạy khi nhận được một yêu cầu HTTP', soon: 1 },
  { id: 'agent', name: 'Agent khởi chạy', desc: 'Người dùng gọi bằng / trong cuộc chat, agent điền sẵn form' }
];
// Kiểu biến trong hộp Thêm biến
var VTYPES = [
  { v: 'Văn bản', code: 'string' }, { v: 'Số', code: 'number' }, { v: 'True / False', code: 'boolean' }, { v: 'Ngày', code: 'date' }, { v: 'Giờ', code: 'time' },
  { v: 'Ngày và giờ', code: 'datetime' }, { v: 'Thời lượng', code: 'duration' }, { v: 'Tệp', code: 'file', soon: 1 }, { v: 'Danh sách', code: 'array', soon: 1 }, { v: 'Bản ghi', code: 'object', soon: 1 }
];
var INTYPES = VTYPES.map(function (x) { return x.v; });
var SYSVARS = [{ v: 'case', t: 'record', d: 'Hồ sơ đang được xử lý' }, { v: 'initiator', t: 'record', d: 'Người khởi chạy hồ sơ (chỉ khi khởi chạy bằng agent)' }, { v: 'now', t: 'datetime', d: 'Thời gian hiện tại' }, { v: 'workflow', t: 'record', d: 'Workflow này' }];
var VIA = ['Action Center', 'Email'];
var VIA_DESC = { 'Action Center': 'Hiện việc trong Action Center', Email: 'Gửi yêu cầu qua Email' };
var VIA_END = { 'Action Center': 'Hiện kết quả trong Action Center', Email: 'Gửi kết quả qua Email' };
var INIT = '@Initiator';
var FUNCS = [];
function fnOf(c) { return { out: [] }; }
// Thao tác theo ứng dụng đã kết nối ở Console. args: tham số lấy từ schema của thao tác
var TOOLS = [
  { name: 'SharePoint · Đọc vùng Excel', kind: 'Connector', desc: 'Đọc một vùng ô trong tệp Excel trên SharePoint', out: ['remaining_budget'], args: ['duong_dan', 'vung'] },
  { name: 'SharePoint · Tải tài liệu lên', kind: 'Connector', desc: 'Tải một tệp lên thư viện tài liệu', out: ['po_url'], args: ['thu_muc', 'tep'], write: 1 },
  { name: 'SharePoint · Lấy danh sách tệp', kind: 'Connector', desc: 'Liệt kê tệp trong một thư mục', out: ['danh_sach_tep'], args: ['thu_muc'] },
  { name: 'Outlook · Gửi email', kind: 'Connector', desc: 'Gửi email từ hộp thư đã kết nối', out: ['message_id'], args: ['to', 'subject', 'body'], write: 1 },
  { name: 'Outlook · Tạo sự kiện lịch', kind: 'Connector', desc: 'Tạo sự kiện trên lịch Outlook', out: ['event_id'], args: ['tieu_de', 'thoi_gian'], write: 1 },
  { name: 'Outlook · Tìm email', kind: 'Connector', desc: 'Tìm email theo từ khoá', out: ['emails'], args: ['query'] },
  { name: 'FCI CRM · Query CRM (SQL)', kind: 'Connector', desc: 'Chạy câu SELECT chỉ đọc trên CRM', out: ['records'], args: ['sql'] },
  { name: 'FCI CRM · List CRM modules', kind: 'Connector', desc: 'Liệt kê các module CRM', out: ['modules'], args: [] },
  { name: 'FCI Jira · Tạo issue', kind: 'Connector', desc: 'Tạo issue trên Jira', out: ['issue_key'], args: ['project', 'summary'], write: 1 },
  { name: 'Google Calendar · Tạo sự kiện', kind: 'Connector', desc: 'Tạo sự kiện trên Google Calendar', out: ['event_id'], args: ['title', 'start'], write: 1 },
  { name: 'Tavily · Tìm kiếm web', kind: 'Connector', desc: 'Tìm kiếm thông tin trên web', out: ['results'], args: ['query'] },
  { name: 'SAP ERP · Ghi nhận công nợ', kind: 'API Tool', desc: 'Ghi công nợ phải trả theo hoá đơn', out: ['ma_but_toan'], args: ['ma_po', 'so_hd', 'so_tien'], write: 1 },
  { name: 'ERP nội bộ · Lấy PO', kind: 'API Tool', desc: 'Lấy PO theo mã', out: ['po_tong_tien', 'po_trang_thai'], args: ['ma_po'] },
  { name: 'MB Life · Policy Info', kind: 'API Tool', desc: 'Hợp đồng, người được bảo hiểm, ngày hiệu lực', out: ['hop_dong', 'ngay_hieu_luc'], args: ['so_hop_dong'] },
  { name: 'MB Life · Lịch sử bồi thường', kind: 'API Tool', desc: 'Các claim trước của người được bảo hiểm', out: ['lich_su'], args: ['so_hop_dong'] },
  { name: 'Bảng tham chiếu · Tra cứu', kind: 'MCP', desc: 'ICD nhóm bệnh, bệnh hiểm nghèo, loại trừ', out: ['nhom_benh'], args: ['ma_icd'] },
  { name: 'DataSuite · Truy vấn bảng', kind: 'MCP', desc: 'Lấy dữ liệu từ bảng đã kết nối', out: ['ket_qua'], args: ['bang', 'dieu_kien'] }
];
function toolOf(c) { return TOOLS.filter(function (x) { return x.name === c.tool; })[0]; }
function connOf(name) { return String(name || '').split(' · ')[0]; }
function actOf(name) { var p = String(name || '').split(' · '); return p[1] || p[0]; }
var CONNS = TOOLS.reduce(function (a, t) { var c = connOf(t.name); if (!a.some(function (x) { return x.name === c; })) a.push({ name: c, kind: t.kind, n: 0 }); a.filter(function (x) { return x.name === c; })[0].n++; return a; }, []);
var FLOWS = [{ name: 'Kiểm tra nhà cung cấp', ver: 'v3' }, { name: 'Gửi thông báo đa kênh', ver: 'v1' }];
var AGENTS = ['Trợ lý So sánh báo giá', 'Trợ lý Mua sắm', 'Trợ lý Kinh doanh', 'Tư vấn khoản vay'];
var KBS = ['Quy định mua sắm 2026', 'Chính sách tín dụng bán lẻ', 'Danh mục nhà cung cấp'];
var DOCS = [];
var INNER_OK = [];
var VARIANT = {};
var PAL_GROUP = { agent: 'AI', worker: 'AI', human: 'Con người', tool: 'Tích hợp', decision: 'Logic', condition: 'Logic', join: 'Logic', loop: 'Logic', wait: 'Logic', variable: 'Biến đổi', code: 'Biến đổi', end: 'Kết thúc', note: 'Khác' };
var PAL_HEAD = { agent: 'AI', human: 'Con người', tool: 'Tích hợp', decision: 'Logic', variable: 'Biến đổi', end: 'Kết thúc', note: 'Khác' };
var PAL = ['agent', 'worker', 'human', 'tool', 'decision', 'condition', 'join', 'loop', 'wait', 'variable', 'code', 'end', 'note'];
var EVENTS = [];
var PEOPLE = ['Nguyễn Văn Bình · Trưởng phòng', 'Trần Thị Mai · Kế toán trưởng', 'Lê Quốc Hùng · Giám đốc khối', 'Vũ Thanh Tâm · Ban Mua sắm', 'Hoàng Anh Tuấn · Kho vận', 'Ngô Bảo Ngọc · Kế toán', 'Phạm Minh Khoa · Người đề nghị', 'Lý Minh Châu · Thẩm định bồi thường'];
// Toán tử của If/Else theo console dev
var OPS = ['Bằng', 'Khác', 'Lớn hơn', 'Từ', 'Nhỏ hơn', 'Tối đa', 'Chứa', 'Không chứa', 'Bắt đầu bằng', 'Kết thúc bằng', 'Trống', 'Không trống'];
var OPS_NOVAL = ['Trống', 'Không trống'];
// Nhãn cổng ngoại lệ hiện trên canvas
var PORT_VI = { Failed: 'KHI LỖI', Timeout: 'HẾT HẠN', 'Max reached': 'ĐẠT TỐI ĐA' };
function isExc(l) { return l === 'Failed' || l === 'Timeout' || l === 'Max reached'; }

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
// Thư mục tổ chức và Nhân sự số Năng suất đã publish do trang bao ngoài truyền vào (window.__qtPeople / __qtAgents).
function dirPeople() { var w = (typeof window !== 'undefined' && window.__qtPeople) || []; return PEOPLE.concat(w.filter(function (x) { return PEOPLE.indexOf(x) < 0 && !PEOPLE.some(function (p) { return p.split(' · ')[0] === x.split(' · ')[0]; }); })); }
function dirAgents() { var w = (typeof window !== 'undefined' && window.__qtAgents) || []; var names = w.map(function (a) { return a.name; }); var SV = { 'Trợ lý So sánh báo giá': 'v3.1.0', 'Trợ lý Mua sắm': 'v1.4.0', 'Trợ lý Kinh doanh': 'v2.0.0', 'Tư vấn khoản vay': 'v1.0.3' }; return AGENTS.filter(function (n) { return names.indexOf(n) < 0; }).map(function (n) { return { name: n, ver: SV[n] || '' }; }).concat(w); }
function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd'); }
function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[0-9_]+/, ''); }
function colOf(type) { return COL[TYPES[type].c]; }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function trigOf(c) { return TRIGGERS.filter(function (t) { return t.id === c.trigger; })[0] || TRIGGERS[4]; }

function defaultCfg(type) {
  var base = { outs: [], upd: [] };
  switch (type) {
    case 'start': return { trigger: 'agent', cmd: '', hint: '', inputs: [], outputs: [], deadline: false, dAmount: '7', dUnit: 'ngày' };
    case 'agent': return Object.assign(base, { model: '', system: '', instructions: '', output: 'text', props: [], retry: '0', onErr: 'none' });
    case 'worker': return Object.assign(base, { kind: 'platform', worker: '', task: '', output: 'text', props: [], helpers: [INIT], helpVia: [], tmoOn: false, tmo: '1', tmoUnit: 'ngày', onErr: 'none' });
    case 'human': return Object.assign(base, { variant: 'approval', allowReturn: true, choices: [{ name: 'Lựa chọn 1', desc: '' }, { name: 'Lựa chọn 2', desc: '' }], assignees: [INIT], mode: 'any', via: [], title: '', message: '', fields: [], tmoOn: false, tmo: '1', tmoUnit: 'ngày' });
    case 'tool': return Object.assign(base, { tool: '', acc: 'process', args: {}, retry: '0', tmoOn: false, tmo: '1', tmoUnit: 'giờ' });
    case 'wait': return { mode: 'delay', amount: '1', aunit: 'ngày', at: '' };
    case 'decision': return { hit: 'unique', cols: [{ name: 'Điều kiện 1', expr: '', t: 'Số' }], res: [{ name: 'result', t: 'Văn bản' }], rules: [{ cells: [''], vals: [''], note: '' }], dflt: [''], upd: [] };
    case 'condition': return { cases: [{ name: 'If', logic: 'AND', rows: [{ v: '', op: 'Bằng', val: '' }] }] };
    case 'join': return { mode: 'all' };
    case 'loop': return { mode: 'each', list: '', conc: '1', onItemErr: 'stop', collect: '', until: '', max: '3' };
    case 'code': return Object.assign(base, { params: [], code: '' });
    case 'variable': return { op: 'set', name: '', value: '' };
    case 'end': return { status: 'completed', notify: [INIT], via: ['Action Center'] };
    case 'note': return { text: '' };
  }
  return {};
}
function humanOpts(c) { if (c.variant === 'choice') return c.choices.map(function (x) { return x.name || 'Lựa chọn'; }); return c.allowReturn === false ? ['Duyệt', 'Từ chối'] : ['Duyệt', 'Trả lại', 'Từ chối']; }
var END_ST = { completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled', failed: 'Failed' };
function outsOf(n) {
  var c = n.cfg;
  if (n.parent) return [''];
  switch (n.type) {
    case 'end': case 'note': return [];
    case 'condition': return c.cases.map(function (x) { return x.name || 'Nhánh'; }).concat(['Else']);
    case 'human': return humanOpts(c).concat(c.tmoOn ? ['Timeout'] : []);
    case 'loop': return c.mode === 'until' ? ['Mỗi vòng', 'Xong', 'Max reached'] : ['Mỗi vòng', 'Xong'];
    case 'worker': return [''].concat(c.tmoOn ? ['Timeout'] : []).concat(c.onErr === 'branch' ? ['Failed'] : []);
    case 'agent': return [''].concat(c.onErr === 'branch' ? ['Failed'] : []);
    case 'tool': return [''].concat(c.tmoOn ? ['Timeout'] : []);
  }
  return [''];
}
function nm(arr) { return (arr || []).map(function (f) { return f.name; }).filter(Boolean); }
function outputsOf(n) {
  var c = n.cfg, extra = nm(c.outs);
  switch (n.type) {
    case 'start': return nm(c.inputs).concat(nm(c.outputs));
    case 'agent': return (c.output === 'json' ? nm(c.props) : ['text']).concat(extra);
    case 'worker': return (c.output === 'json' ? nm(c.props) : ['text']).concat(extra);
    case 'human': return nm(c.fields).concat(['decision', 'responder']).concat(extra);
    case 'tool': var t = toolOf(c); return (t ? t.out : []).concat(extra);
    case 'variable': return c.name ? [c.name] : [];
    case 'loop': return c.mode === 'each' ? ['item', 'index', 'foreach'] : ['vong'];
    case 'decision': return nm(c.res).concat(['matched_rules']);
    case 'code': return extra;
  }
  return [];
}
var UNIT_H = { 'phút': 1 / 60, 'giờ': 1, 'ngày': 24 };
function hoursOf(c) { var n = parseFloat(c.tmo) || 0; return n * (UNIT_H[c.tmoUnit] || 24); }
function whoShort0(arr) { return (arr || []).map(function (x) { return x === INIT ? 'Initiator' : x.split(' · ')[0]; }); }
function subOf(n) {
  var c = n.cfg;
  switch (n.type) {
    case 'start': return (TRIGGERS.filter(function (t) { return t.id === c.trigger; })[0] || TRIGGERS[4]).name + ' · ' + nm(c.inputs).length + ' biến đầu vào';
    case 'tool': return c.tool ? c.tool : '';
    case 'worker': return c.worker ? c.worker + (c.tmoOn ? ' · ' + c.tmo + ' ' + c.tmoUnit : '') : '';
    case 'agent': return c.model ? c.model + (c.output === 'json' ? ' · ' + nm(c.props).length + ' thuộc tính' : '') : '';
    case 'wait': return c.mode === 'until' ? 'Đến ' + (c.at || '...') : c.amount + ' ' + c.aunit;
    case 'end': return END_ST[c.status] || '';
    case 'code': return 'Python';
    case 'variable': return ({ set: 'Gán', append: 'Thêm vào cuối', parse: 'Đọc JSON', clear: 'Xoá' }[c.op] || '') + (c.name ? ' · ' + c.name : '');
    case 'decision': return c.rules.length + ' quy tắc · ' + { unique: 'Duy nhất', first: 'Đầu tiên', collect: 'Tất cả' }[c.hit];
    case 'join': return c.mode === 'all' ? 'Chờ tất cả' : 'Chờ nhánh đầu tiên';
    case 'loop': return c.mode === 'until' ? 'Do Until · tối đa ' + c.max + ' vòng' : 'For Each' + (c.list ? ' · ' + c.list : '');
    case 'human': var w = whoShort0(c.assignees); return (c.variant === 'choice' ? 'Choice' : 'Quick Approval') + (w.length ? ' · ' + (w.length > 1 ? w.length + ' người · ' + (c.mode === 'all' ? 'All' : 'Any') : w[0]) : '');
  }
  return '';
}
function isWrite(c) { var t = toolOf(c); return !!(t && t.write); }
var SNAKE = /^[a-z][a-z0-9_]*$/;
function keyOf(n) { return n.cfg.nodeKey || slug(n.title) || n.type; }
var PORT_ISS = { Failed: 'Nhánh Khi lỗi chưa nối: bước lỗi thì hồ sơ dừng ở bước này', Timeout: 'Nhánh Hết hạn chưa nối: hết hạn thì hồ sơ dừng ở bước này', 'Max reached': 'Nhánh Đạt tối đa chưa nối: hết số vòng thì hồ sơ dừng ở bước này' };
// Thông báo bắt đầu bằng "W:" là cảnh báo (màu cam), không chặn publish
function issuesOf(n, s) {
  var c = n.cfg, m = [];
  if (n.type !== 'note') {
    var k = keyOf(n);
    if (!SNAKE.test(k)) m.push('Tên node chỉ gồm chữ thường, số và _, bắt đầu bằng chữ');
    else if (s.nodes.some(function (x) { return x.id !== n.id && x.type !== 'note' && keyOf(x) === k; })) m.push('Tên node bị trùng');
  }
  var badName = function (arr, what) { if ((arr || []).some(function (f) { return !SNAKE.test(f.name || ''); })) m.push('Có ' + what + ' chưa đặt tên hoặc tên chưa đúng (chữ, số và _, bắt đầu bằng chữ)'); };
  var tmoOk = function () { if (!c.tmoOn) return; var h = hoursOf(c); if (h <= 0) m.push('Cần nhập thời gian Timeout'); else if (h > 720) m.push('Timeout tối đa 30 ngày'); };
  badName(c.outs, 'output');
  if ((c.upd || []).some(function (u) { return !u.name || !String(u.value || '').trim(); })) m.push('Update variables cần chọn biến và giá trị');
  switch (n.type) {
    case 'start':
      badName(c.inputs, 'biến đầu vào');
      if (c.deadline && !(parseFloat(c.dAmount) > 0)) m.push('Cần nhập hạn của quy trình');
      break;
    case 'agent':
      if (!c.model) m.push('Cần chọn model');
      if (!String(c.instructions || '').trim()) m.push('Cần viết User prompt');
      if (c.output === 'json' && !c.props.length) m.push('Kết quả có cấu trúc cần ít nhất một thuộc tính');
      break;
    case 'worker':
      if (!c.worker) m.push('Cần chọn agent');
      if (!String(c.task || '').trim()) m.push('Cần viết hướng dẫn cho agent');
      if (c.output === 'json' && !c.props.length) m.push('Kết quả có cấu trúc cần ít nhất một thuộc tính');
      if (!c.helpers.length) m.push('Cần chọn người hỗ trợ');
      if (!c.helpVia.length) m.push('Chọn ít nhất một cách gửi cho người hỗ trợ');
      tmoOk();
      break;
    case 'human':
      if (!c.assignees.length) m.push('Cần chọn người được giao');
      if (!c.via.length) m.push('Chọn ít nhất một cách gửi');
      if (!String(c.title || '').trim()) m.push('Cần tiêu đề');
      if (c.variant === 'choice' && c.choices.filter(function (x) { return x.name; }).length < 2) m.push('Choice cần ít nhất 2 lựa chọn');
      if (c.variant !== 'choice' && c.mode === 'all' && c.assignees.length < 2) m.push('Cách giao All cần ít nhất 2 người được giao');
      badName(c.fields, 'input');
      tmoOk();
      break;
    case 'tool':
      if (!c.tool) m.push('Cần chọn ứng dụng và thao tác');
      else { var tl = toolOf(c); (tl && tl.args || []).forEach(function (a) { if (!String((c.args || {})[a] || '').trim()) m.push('Cần nhập tham số ' + a); }); }
      if (isWrite(c) && !approvedBefore(n.id, s, 0)) m.push('Thao tác ghi cần một bước Human Review duyệt ngay trước');
      tmoOk();
      break;
    case 'variable': if (!SNAKE.test(c.name || '')) m.push('Cần tên biến (chữ, số và _, bắt đầu bằng chữ)'); if (c.op !== 'clear' && !String(c.value || '').trim()) m.push('Cần giá trị'); break;
    case 'condition': if (c.cases.some(function (cs) { return !cs.rows.length || cs.rows.some(function (r) { return !r.v || (OPS_NOVAL.indexOf(r.op) < 0 && !String(r.val).trim()); }); })) m.push('Điều kiện còn trống'); break;
    case 'loop':
      if (c.mode === 'each' && !c.list) m.push('Cần danh sách để lặp');
      if (c.mode === 'until' && !String(c.until || '').trim()) m.push('Cần điều kiện dừng (Đến khi)');
      if (c.mode === 'until' && !(parseInt(c.max, 10) >= 1 && parseInt(c.max, 10) <= 20)) m.push('Số vòng tối đa từ 1 đến 20');
      if (c.mode === 'each' && !(parseInt(c.conc, 10) >= 1 && parseInt(c.conc, 10) <= 10)) m.push('Số mục chạy cùng lúc từ 1 đến 10');
      if (!s.edges.some(function (e) { return e.from === n.id && e.out === 0; })) m.push('Vòng lặp chưa có bước nào bên trong');
      break;
    case 'wait': if (c.mode === 'until') { if (!String(c.at || '').trim()) m.push('Cần mốc thời gian'); break; } var th = (parseFloat(c.amount) || 0) * (UNIT_H[c.aunit] || 24); if (th <= 0) m.push('Cần thời lượng'); else if (th > 720) m.push('Chờ tối đa 30 ngày'); break;
    case 'decision':
      if (c.cols.some(function (col) { return !String(col.expr || '').trim(); })) m.push('Có cột điều kiện chưa có giá trị cần xét');
      if (c.res.some(function (r) { return !SNAKE.test(r.name || ''); })) m.push('Có cột kết quả chưa đặt tên đúng');
      if (!c.rules.length) m.push('Bảng chưa có quy tắc nào');
      else if (c.rules.some(function (r) { return r.vals.some(function (v) { return !String(v).trim(); }); })) m.push('Mỗi quy tắc cần đủ kết quả');
      if (c.hit === 'unique' && dmnOverlap(c)) m.push('Có hai quy tắc cùng khớp một trường hợp (kiểu Duy nhất)');
      break;
    case 'join': if (s.edges.filter(function (e) { return e.to === n.id; }).length < 2) m.push('Join cần ít nhất 2 nhánh nối vào'); break;
    case 'code': if (!String(c.code || '').trim()) m.push('Cần viết code'); else if (!/def\s+main\s*\(/.test(c.code)) m.push('Code cần khai báo def main(...)'); badName(c.params, 'tham số'); break;
  }
  if (outsOf(n).length === 1 && n.type !== 'loop') {
    var fan = s.edges.filter(function (e) { return e.from === n.id && e.out === 0; });
    if (fan.length > 1 && !joinAfter(fan.map(function (e) { return e.to; }), s)) m.push('Các nhánh song song tách từ bước này cần hợp lại ở cùng một Join');
  }
  var inBody = s.nodes.some(function (L) { return L.type === 'loop' && loopBody(L, s)[n.id]; });
  if (n.type !== 'start' && n.type !== 'note' && !n.parent && !s.edges.some(function (e) { return e.to === n.id; })) m.push('W:"' + n.title + '" không bao giờ được chạy (chưa có đường đi từ Start)');
  if (n.type !== 'condition' && n.type !== 'human' && s.edges.some(function (e) { return e.from === n.id && exitLoopOf(e, s); })) m.push('Chỉ nhánh của If/Else hoặc Human Review bên trong vòng lặp mới được nối ra ngoài');
  var o = outsOf(n);
  o.forEach(function (lb, i) {
    if (n.type === 'loop' && i === 0) return;
    if (s.edges.some(function (e) { return e.from === n.id && e.out === i; })) return;
    if (inBody && !isExc(lb)) return;
    if (isExc(lb)) m.push('W:' + PORT_ISS[lb]);
    else m.push(lb ? 'Nhánh "' + lb + '" chưa được nối' : 'Bước này chưa nối tới bước tiếp theo: mọi đường đi phải kết thúc ở End');
  });
  return m;
}
// Thao tác ghi được duyệt khi bước ngay trước là Human Review, hoặc là thao tác ghi khác đã được duyệt (chuỗi ghi liền nhau sau một lần duyệt)
function approvedBefore(id, s, depth) {
  var ins = s.edges.filter(function (e) { return e.to === id; }); if (!ins.length || depth > 8) return false;
  return ins.every(function (e) { var src = s.nodes.filter(function (x) { return x.id === e.from; })[0]; if (!src) return false; if (src.type === 'human') return true; return src.type === 'tool' && isWrite(src.cfg) && approvedBefore(src.id, s, depth + 1); });
}
function isWarn(msg) { return String(msg).indexOf('W:') === 0; }
function msgText(msg) { return isWarn(msg) ? msg.slice(2) : msg; }
function errsOf(n, s) { return issuesOf(n, s).filter(function (x) { return !isWarn(x); }); }
// DMN: ô điều kiện. Trống hoặc "-" là Bất kỳ; hỗ trợ > >= < <= != =, danh sách "a, b" và khoảng "[a..b]"
function evalCell(cell, val, t) {
  var x = String(cell || '').trim(); if (!x || x === '-') return true;
  var m = x.match(/^(>=|<=|!=|>|<|=)\s*(.+)$/), sv = String(val === undefined ? '' : val);
  if (m) { var a = parseFloat(sv), b = parseFloat(m[2]); var num = !isNaN(a) && !isNaN(b);
    switch (m[1]) { case '>': return num && a > b; case '<': return num && a < b; case '>=': return num && a >= b; case '<=': return num && a <= b; case '!=': return sv !== m[2].trim(); case '=': return sv === m[2].trim(); } }
  var r = x.match(/^\[(.+)\.\.(.+)\]$/); if (r) { var v = parseFloat(sv); return v >= parseFloat(r[1]) && v <= parseFloat(r[2]); }
  return x.split(',').map(function (y) { return y.trim(); }).indexOf(sv) >= 0;
}
function dmnOverlap(c) {
  var single = function (cell) { var x = String(cell || '').trim(); return x && x !== '-' && !/^[<>!]/.test(x) && x.indexOf('..') < 0 ? x.replace(/^=\s*/, '').split(',').map(function (y) { return y.trim(); }) : null; };
  for (var i = 0; i < c.rules.length; i++) for (var j = i + 1; j < c.rules.length; j++) {
    var all = c.cols.every(function (_, k) { var a = single(c.rules[i].cells[k]), b = single(c.rules[j].cells[k]); if (!a || !b) return !String(c.rules[i].cells[k] || '').trim() || !String(c.rules[j].cells[k] || '').trim(); return a.some(function (z) { return b.indexOf(z) >= 0; }); });
    if (all) return true;
  }
  return false;
}
function loopAfter(L, edges) { return edges.filter(function (e) { return e.from === L.id && e.out >= 1; }).map(function (e) { return e.to; }); }
function loopBody(L, s) {
  var after = loopAfter(L, s.edges), seen = {}, stack = s.edges.filter(function (e) { return e.from === L.id && e.out === 0; }).map(function (e) { return e.to; });
  while (stack.length) { var cur = stack.pop(); if (seen[cur] || cur === L.id || after.indexOf(cur) >= 0) continue; seen[cur] = 1; s.edges.forEach(function (e) { if (e.from === cur) stack.push(e.to); }); }
  return seen;
}
function exitLoopOf(e, s) {
  var hit = null;
  s.nodes.forEach(function (L) { if (hit || L.type !== 'loop') return; if (loopBody(L, s)[e.from] && loopAfter(L, s.edges).indexOf(e.to) >= 0) hit = L; });
  return hit;
}
function joinAfter(ids, s) {
  var sets = ids.map(function (id) { return reachable(id, s.edges); });
  return s.nodes.some(function (j) { return j.type === 'join' && sets.every(function (r) { return r[j.id]; }); });
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
// Loop là khung chứa: các bước trong thân vòng nằm bên trong khung. FRAMES do layout tính
var FRAMES = {}, FSIG = '', LHEAD = 60, LCHIP = 96, LPAD = 24, LEMPTY = { w: 320, h: 156 };
function frameOf(n) { return FRAMES[n.id] || { w: LEMPTY.w, h: LEMPTY.h, cy: LHEAD + 44, empty: true }; }
// Nút có cổng chính '' cộng các cổng ngoại lệ: cổng chính ở đầu thẻ, ngoại lệ thành dòng bên dưới
function hdrPort(n) { var o = outsOf(n); return DIR === 'h' && !n.parent && n.type !== 'loop' && o.length > 1 && o[0] === ''; }
function sizeOf(n) {
  if (n.type === 'note') { var lines = String(n.cfg.text || '').split('\n').reduce(function (a, t) { return a + Math.max(1, Math.ceil(t.length / 24)); }, 0); return { w: 200, h: Math.max(100, 30 + lines * 19) }; }
  if (n.type === 'loop' && !n.parent) { var fr = frameOf(n); return { w: fr.w, h: fr.h }; }
  var o = outsOf(n);
  if (o.length < 2 || n.parent) return { w: W, h: H };
  var k = hdrPort(n) ? o.length - 1 : o.length;
  if (DIR === 'h') return { w: W, h: HEADB + PG + k * PH + (k - 1) * PG + 10 };
  return { w: Math.max(W, 24 + o.length * 92 + (o.length - 1) * PG), h: HEADB + PG + PH + 10 };
}
function isBox(n) { return false; }
function branchy(n) { return !n.parent && !isBox(n) && n.type !== 'loop' && outsOf(n).length > 1; }
function innerArr(P, ch) { return P.type === 'loop' ? (P.cfg.inner || []) : (P.cfg.branches[ch && ch.lane ? ch.lane : 0] || P.cfg.branches[0]).inner; }
function allInner(P) { return P.type === 'loop' ? (P.cfg.inner || []) : P.cfg.branches.reduce(function (a, b) { return a.concat(b.inner || []); }, []); }
function inPt(n) { var z = sizeOf(n); if (DIR === 'v') return { x: z.w / 2, y: 0 }; if (n.type === 'loop') return { x: 0, y: LHEAD / 2 }; return { x: 0, y: branchy(n) && !hdrPort(n) ? HEADB + PG + PH / 2 : H / 2 }; }
function outPt(n, i) {
  var z = sizeOf(n), o = outsOf(n);
  if (n.type === 'loop' && !n.parent) {
    var fr = frameOf(n);
    if (i === 0) return DIR === 'h' ? { x: 16 + LCHIP, y: fr.cy } : { x: fr.cx || z.w / 2, y: LHEAD + 36 };
    return DIR === 'h' ? { x: z.w, y: i === 1 ? LHEAD / 2 : LHEAD / 2 + 34 } : { x: z.w / 2 + (i === 1 ? 0 : 70), y: z.h };
  }
  if (!branchy(n)) return DIR === 'h' ? { x: z.w, y: H / 2 } : { x: z.w / 2, y: z.h };
  if (hdrPort(n)) { if (i === 0) return { x: z.w, y: H / 2 }; i -= 1; }
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
  nodes.forEach(function (l) { if (l.type === 'parallel') { l.cfg.branches.forEach(function (b, li) { (b.inner || []).forEach(function (id, k) { var c = byId[id]; if (!c) return; c.lane = li; var p = innerPos(l, k, li); c.x = l.x + p.x; c.y = l.y + p.y; }); }); return; } if (l.type !== 'loop') return; (l.cfg.inner || []).forEach(function (id, k) { var c = byId[id]; if (!c) return; var p = innerPos(l, k); c.x = l.x + p.x; c.y = l.y + p.y; }); });
  return nodes;
}
function bez(a, b) {
  if (DIR === 'h') { var dx = Math.max(36, Math.abs(b.x - a.x) / 2); return { d: 'M' + a.x + ' ' + a.y + ' C' + (a.x + dx) + ' ' + a.y + ' ' + (b.x - dx) + ' ' + b.y + ' ' + b.x + ' ' + b.y + ' ', m: { x: (a.x + 3 * (a.x + dx) + 3 * (b.x - dx) + b.x) / 8, y: (a.y + b.y) / 2 } }; }
  var dy = Math.max(30, Math.abs(b.y - a.y) / 2); return { d: 'M' + a.x + ' ' + a.y + ' C' + a.x + ' ' + (a.y + dy) + ' ' + b.x + ' ' + (b.y - dy) + ' ' + b.x + ' ' + b.y + ' ', m: { x: (a.x + b.x) / 2, y: (a.y + 3 * (a.y + dy) + 3 * (b.y - dy) + b.y) / 8 } };
}
function absPt(n, p) { return { x: n.x + p.x, y: n.y + p.y }; }
// Sắp xếp theo lớp, giống "Tidy up" của Copilot: mỗi bước cách bước trước một cột, bước hội tụ canh giữa các bước cha
function layoutCore(f, rootId) {
  var main = f.nodes, byId = {};
  main.forEach(function (n) { byId[n.id] = n; });
  var ed0 = f.edges.filter(function (e) { return byId[e.from] && byId[e.to]; }), st = rootId ? byId[rootId] : main.filter(function (n) { return n.type === 'start'; })[0];
  var back = {}, color = {}, dfs = function (id) { color[id] = 1; ed0.forEach(function (e, i) { if (e.from !== id) return; if (color[e.to] === 1) back[i] = 1; else if (!color[e.to]) dfs(e.to); }); color[id] = 2; };
  if (st) dfs(st.id); main.forEach(function (n) { if (!color[n.id]) dfs(n.id); });
  var ed = ed0.filter(function (e, i) { return !back[i]; });
  var rank = {};
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
  f.maxC = maxC;
  return f;
}

// Bố cục: mỗi Loop dựng thân vòng bên trong khung trước (vòng trong cùng trước), rồi dựng luồng chính coi khung là một khối
function layoutFlow(f) {
  var s = { nodes: f.nodes, edges: f.edges }, all = f.nodes.filter(function (n) { return !n.parent && n.type !== 'note'; }), byId = {};
  all.forEach(function (n) { byId[n.id] = n; });
  var loops = all.filter(function (n) { return n.type === 'loop'; }), body = {}, owner = {}, cnt = {};
  FRAMES = {};
  loops.forEach(function (L) { body[L.id] = loopBody(L, s); });
  // vòng lồng: thân vòng trong chỉ gồm các bước cũng nằm trong thân vòng ngoài
  loops.forEach(function (O) { loops.forEach(function (L) { if (L.id !== O.id && body[O.id][L.id]) Object.keys(body[L.id]).forEach(function (k) { if (!body[O.id][k]) delete body[L.id][k]; }); }); });
  loops.forEach(function (L) { cnt[L.id] = loops.filter(function (O) { return O.id !== L.id && body[O.id][L.id]; }).length; });
  all.forEach(function (n) { var best = null; loops.forEach(function (L) { if (L.id !== n.id && body[L.id][n.id] && (!best || cnt[L.id] > cnt[best])) best = L.id; }); if (best) owner[n.id] = best; });
  var topOf = function (id) { var k = id, guard = 0; while (owner[k] && guard++ < 50) k = owner[k]; return k; };
  loops.slice().sort(function (a, b) { return cnt[b.id] - cnt[a.id]; }).forEach(function (L) {
    var mem = all.filter(function (n) { return owner[n.id] === L.id; }), mid = {};
    mem.forEach(function (n) { mid[n.id] = 1; });
    var root = f.edges.filter(function (e) { return e.from === L.id && e.out === 0 && mid[e.to]; })[0];
    if (!mem.length || !root) { FRAMES[L.id] = { w: LEMPTY.w, h: LEMPTY.h, cy: LHEAD + 44, cx: LEMPTY.w / 2, empty: true }; return; }
    var sub = { nodes: mem, edges: f.edges.filter(function (e) { return mid[e.from] && mid[e.to]; }) };
    layoutCore(sub, root.to);
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    mem.forEach(function (n) { var z = sizeOf(n); minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + z.w); maxY = Math.max(maxY, n.y + z.h); });
    var offX = DIR === 'h' ? 16 + LCHIP + 40 : LPAD, offY = DIR === 'h' ? LHEAD + 16 : LHEAD + 76;
    mem.forEach(function (n) { n._rx = n.x - minX + offX; n._ry = n.y - minY + offY; });
    var rn = byId[root.to], bw = maxX - minX, bh = maxY - minY;
    FRAMES[L.id] = DIR === 'h' ? { w: Math.max(LEMPTY.w, offX + bw + LPAD), h: Math.max(LEMPTY.h, offY + bh + LPAD), cy: rn._ry + inPt(rn).y }
      : { w: Math.max(LEMPTY.w, offX + bw + LPAD), h: offY + bh + LPAD, cx: rn._rx + inPt(rn).x };
  });
  var top = all.filter(function (n) { return !owner[n.id]; }), seen = {}, ed = [];
  f.edges.forEach(function (e) {
    if (!byId[e.from] || !byId[e.to]) return;
    var a = topOf(e.from), b = topOf(e.to); if (a === b) return;
    if (owner[e.from] && !owner[e.to]) { var k = a + '>' + b; if (seen[k]) return; seen[k] = 1; ed.push({ from: a, out: 1, to: b }); return; }
    if (owner[e.to]) return;
    ed.push(e);
  });
  var res = layoutCore({ nodes: top, edges: ed }), maxC = res.maxC || 0, MA = DIR === 'h' ? 'x' : 'y', CR = DIR === 'h' ? 'y' : 'x';
  loops.slice().sort(function (a, b) { return cnt[a.id] - cnt[b.id]; }).forEach(function (L) { all.forEach(function (n) { if (owner[n.id] === L.id) { n.x = L.x + n._rx; n.y = L.y + n._ry; } }); });
  all.forEach(function (n) { delete n._rx; delete n._ry; });
  f.nodes.forEach(function (n) { if (n.type === 'note' && !n.x && !n.y) { n[MA] = 0; n[CR] = maxC + 60; maxC += 124; } });
  placeInner(f.nodes);
  return f;
}
// Thành viên của khung Loop (kể cả vòng lồng bên trong): dùng khi kéo khung
function frameMembers(L, s) { return Object.keys(loopBody(L, s)); }

var SUGGEST = [
  { key: 'pr', label: 'Đề nghị mua sắm', name: 'Đề nghị mua sắm', text: 'Người đề nghị gõ /Đề nghị mua sắm trong chat. Kiểm ngân sách, thiếu thì người đề nghị sửa lại. Nhân sự số lấy và so sánh báo giá 3 nhà cung cấp. Trưởng phòng duyệt, trên 50 triệu thì Kế toán trưởng và Giám đốc khối cùng duyệt. Tạo PO, Ban Mua sắm xác nhận rồi gửi nhà cung cấp, chờ phiếu nhập kho và chứng từ, đối chiếu rồi báo kế toán thanh toán.' },
  { key: 'invoice', label: 'Đối chiếu hoá đơn với PO', name: 'Đối chiếu hoá đơn với PO', text: 'Kế toán gõ /Đối chiếu hoá đơn và đính kèm hoá đơn VAT. Đọc số tiền, lấy PO tương ứng từ ERP để so khớp. Khớp thì ghi nhận công nợ, lệch thì chuyển kế toán xem lại.' },
  { key: 'mbl-rules', label: 'Rule thẩm định MB Life', name: 'Rule thẩm định MB Life', text: 'Thẩm định viên gõ /Thẩm định bồi thường với hồ sơ đã đọc OCR và số hợp đồng MB Life. Lấy Policy, lịch sử bồi thường và bảng tham chiếu cùng lúc, chạy rule chứng từ, hiệu lực và thẩm định không dùng LLM. Có WARN thì thẩm định viên xem lại.' }
];
function N(id, type, title, cfg) { return { id: id, type: type, title: title, x: 0, y: 0, cfg: Object.assign(defaultCfg(type), cfg || {}) }; }
function E(list) { return list.map(function (a) { return { from: a[0], out: a[1], to: a[2] }; }); }
function I(name, t, desc, extra) { return Object.assign({ name: name, t: t, desc: desc, req: true }, extra || {}); }
function F(names) { return names.map(function (x) { return { name: x, desc: '' }; }); }
function C(name, v, op, val) { return { name: name, logic: 'AND', rows: [{ v: v, op: op, val: val }] }; }
function O(name, expr) { return { name: name, expr: expr }; }
function HR(o) { return Object.assign({ via: ['Action Center', 'Email'] }, o); }
var VIA2 = ['Action Center', 'Email'];
function lane(name, ids) { return { name: name, desc: '', inner: ids }; }
function kid(n, parent, ln) { n.parent = parent; n.lane = ln || 0; return n; }
function K(n, key) { n.cfg.nodeKey = key; return n; }
function draftFlow(key) {
  var f, P = PEOPLE;
  if (key === 'invoice') f = {
    nodes: [
      K(N('n1', 'start', 'Start', { cmd: 'Đối chiếu hoá đơn', inputs: [I('ma_po', 'Văn bản', 'Mã đơn mua hàng'), I('tep_hoa_don', 'Văn bản', 'Đường dẫn hoá đơn PDF hoặc XML')] }), 'start'),
      K(N('n2', 'agent', 'Đọc hoá đơn', { model: 'DeepSeek V4.1 Flash', system: 'Bạn đọc hoá đơn VAT và trả đúng các trường được hỏi.', instructions: 'Đọc hoá đơn @tep_hoa_don, lấy số hoá đơn, tổng tiền, mã số thuế.', output: 'json', props: [I('so_hd', 'Văn bản', 'Số hoá đơn'), I('so_tien', 'Số', 'Tổng tiền gồm VAT'), I('ma_so_thue', 'Văn bản', 'Mã số thuế người bán')], retry: '2' }), 'read_invoice'),
      K(N('n3', 'tool', 'Lấy PO từ ERP', { tool: 'ERP nội bộ · Lấy PO', args: { ma_po: '@ma_po' }, retry: '3' }), 'get_po'),
      K(N('n4', 'condition', 'Khớp với PO?', { cases: [C('Khớp', 'so_tien', 'Bằng', '@po_tong_tien')] }), 'is_matched'),
      K(N('n5', 'tool', 'Ghi nhận công nợ', { tool: 'SAP ERP · Ghi nhận công nợ', args: { ma_po: '@ma_po', so_hd: '@so_hd', so_tien: '@so_tien' } }), 'post_payable'),
      K(N('n6', 'human', 'Kế toán xem lại', HR({ allowReturn: false, assignees: [P[5]], title: 'Hoá đơn @so_hd lệch PO @ma_po', message: 'Hoá đơn: @so_tien, PO: @po_tong_tien. Duyệt để vẫn ghi nhận, Từ chối để trả lại nhà cung cấp.', fields: [I('y_kien', 'Văn bản', 'Lý do', { req: false })] })), 'review_variance'),
      K(N('n7', 'tool', 'Báo nhà cung cấp', { tool: 'Outlook · Gửi email', acc: 'initiator', args: { to: '@email_ncc', subject: 'Hoá đơn @so_hd bị trả lại', body: '@y_kien' } }), 'notify_vendor'),
      K(N('n8', 'end', 'Đã ghi nhận', { status: 'completed', via: VIA2 }), 'completed'),
      K(N('n9', 'end', 'Trả lại nhà cung cấp', { status: 'rejected', via: VIA2 }), 'returned'),
      K(N('n11', 'human', 'Duyệt ghi công nợ', HR({ allowReturn: false, assignees: [P[5]], title: 'Ghi công nợ hoá đơn @so_hd?', message: 'Tự chèn trước Ghi nhận công nợ vì đây là thao tác ghi. Duyệt để ghi, Từ chối để dừng.' })), 'confirm_payable'),
      K(N('n12', 'end', 'Không ghi nhận', { status: 'cancelled', via: VIA2 }), 'not_posted')
    ],
    edges: E([['n1', 0, 'n2'], ['n2', 0, 'n3'], ['n3', 0, 'n4'], ['n4', 0, 'n11'], ['n11', 0, 'n5'], ['n11', 1, 'n12'], ['n4', 1, 'n6'], ['n6', 0, 'n5'], ['n6', 1, 'n7'], ['n5', 0, 'n8'], ['n7', 0, 'n9']])
  };
  else if (key === 'mbl-rules') f = {
    nodes: [
      K(N('n1', 'start', 'Start', { cmd: 'Thẩm định bồi thường', inputs: [I('ho_so_ocr', 'Văn bản', 'Kết quả đọc hồ sơ (JSON)'), I('so_hop_dong', 'Văn bản', 'Số hợp đồng MB Life'), I('claim_type', 'Văn bản', 'Mã claim type, VD IP-Sur')] }), 'start'),
      K(N('n2', 'tool', 'Tra Policy', { tool: 'MB Life · Policy Info', args: { so_hop_dong: '@so_hop_dong' }, retry: '3' }), 'get_policy'),
      K(N('n3', 'tool', 'Lấy lịch sử bồi thường', { tool: 'MB Life · Lịch sử bồi thường', args: { so_hop_dong: '@so_hop_dong' }, retry: '3' }), 'get_history'),
      K(N('n4', 'tool', 'Tra bảng tham chiếu', { tool: 'Bảng tham chiếu · Tra cứu', args: { ma_icd: '@ho_so_ocr.icd' }, retry: '3' }), 'get_reference'),
      K(N('n5', 'join', 'Đủ dữ liệu đối chiếu', { mode: 'all' }), 'join_data'),
      K(N('n6', 'condition', 'Có hợp đồng?', { cases: [C('Không có', 'hop_dong', 'Trống', '')] }), 'has_policy'),
      K(N('n7', 'code', 'Chạy rule D, E, A', { params: [{ name: 'ho_so', value: '@ho_so_ocr' }, { name: 'hop_dong', value: '@hop_dong' }, { name: 'lich_su', value: '@lich_su' }, { name: 'nhom_benh', value: '@nhom_benh' }], code: 'def main(ho_so, hop_dong, lich_su, nhom_benh):\n    kq = run_rules(ho_so, hop_dong, lich_su, nhom_benh)\n    return {"ket_qua_rule": kq.items, "so_warn": kq.warn}', outs: [O('ket_qua_rule', '@run_rules.ket_qua_rule'), O('so_warn', '@run_rules.so_warn')] }), 'run_rules'),
      K(N('n8', 'condition', 'Có WARN?', { cases: [C('Có WARN', 'so_warn', 'Lớn hơn', '0')] }), 'has_warn'),
      K(N('n9', 'human', 'Thẩm định viên xem lại', HR({ assignees: [P[7]], title: 'Hồ sơ @so_hop_dong có @so_warn WARN', message: '@ket_qua_rule' })), 'review_warn'),
      K(N('n10', 'end', 'Đã thẩm định', { status: 'completed' }), 'completed'),
      K(N('n11', 'end', 'Không có hợp đồng', { status: 'failed' }), 'no_policy'),
      K(N('n12', 'end', 'Từ chối bồi thường', { status: 'rejected' }), 'rejected'),
      N('n13', 'note', 'Note', { text: 'Không dùng LLM: rule D, E, A chạy trong node Code. Ba nguồn dữ liệu lấy song song (3 mũi tên từ Start), hợp lại ở Join.' })
    ],
    edges: E([['n1', 0, 'n2'], ['n1', 0, 'n3'], ['n1', 0, 'n4'], ['n2', 0, 'n5'], ['n3', 0, 'n5'], ['n4', 0, 'n5'], ['n5', 0, 'n6'], ['n6', 0, 'n11'], ['n6', 1, 'n7'], ['n7', 0, 'n8'], ['n8', 0, 'n9'], ['n8', 1, 'n10'], ['n9', 0, 'n10'], ['n9', 1, 'n10'], ['n9', 2, 'n12']])
  };
  else f = {
    nodes: [
      K(N('n1', 'start', 'Start', { cmd: 'Đề nghị mua sắm', hint: 'Lấy danh sách hàng và tổng tiền từ cuộc chat, hỏi mức ưu tiên nếu người dùng chưa nói.', inputs: [I('items', 'Văn bản', 'Danh sách hàng cần mua'), I('total', 'Số', 'Tổng tiền gồm VAT'), I('priority', 'Văn bản', 'Khẩn hoặc Thường'), I('reason', 'Văn bản', 'Lý do mua', { req: false })], deadline: true, dAmount: '30', dUnit: 'ngày' }), 'create_purchase_request'),
      K(N('n2', 'loop', 'Đến khi đủ ngân sách', { mode: 'until', until: '@remaining_budget >= @total', max: '5' }), 'budget_loop'),
      K(N('n3', 'tool', 'Kiểm ngân sách', { tool: 'SharePoint · Đọc vùng Excel', args: { duong_dan: 'Tài chính/Ngân sách 2026.xlsx', vung: 'FHO-FPD' }, retry: '3' }), 'check_budget'),
      K(N('n4', 'condition', 'Đủ ngân sách?', { cases: [C('Không đủ', 'remaining_budget', 'Nhỏ hơn', '@total')] }), 'budget_ok'),
      K(N('n5', 'human', 'Điều chỉnh đề nghị', HR({ allowReturn: false, assignees: [INIT], title: 'Ngân sách còn @remaining_budget - điều chỉnh đề nghị', message: 'Sửa danh sách hàng hoặc tổng tiền rồi Duyệt để gửi lại. Từ chối để huỷ đề nghị.', fields: [I('items', 'Văn bản', 'Danh sách hàng', { def: '@items' }), I('total', 'Số', 'Tổng tiền', { def: '@total' })] })), 'adjust_request'),
      K(N('n6', 'worker', 'Lấy & so sánh báo giá', { worker: 'Trợ lý So sánh báo giá', task: 'Xin báo giá từ ít nhất 3 NCC cho @items, so sánh giá, thời gian giao, bảo hành và đề xuất NCC.', output: 'json', props: [I('quotes', 'Văn bản', 'Bảng so sánh báo giá'), I('proposed_vendor', 'Văn bản', 'Nhà cung cấp đề xuất')], helpers: [INIT], helpVia: ['Action Center'], tmoOn: true, tmo: '48', tmoUnit: 'giờ', onErr: 'branch' }), 'collect_quotes'),
      K(N('n7', 'human', 'Nhập báo giá thủ công', HR({ allowReturn: false, assignees: [P[3]], title: 'Nhân sự số chưa lấy đủ báo giá - nhập tay', message: 'Bổ sung báo giá và NCC đề xuất.', fields: [I('quotes', 'Văn bản', 'Báo giá'), I('proposed_vendor', 'Văn bản', 'NCC đề xuất')] })), 'manual_quotes'),
      K(N('n8', 'decision', 'Tuyến duyệt', { hit: 'first', cols: [{ name: 'Tổng tiền', expr: '@total', t: 'Số' }], res: [{ name: 'needs_level2', t: 'Có / không' }], rules: [{ cells: ['> 50000000'], vals: ['true'], note: 'Trên 50 triệu cần duyệt cấp 2' }], dflt: ['false'] }), 'approver_rule'),
      K(N('n9', 'decision', 'SLA', { hit: 'unique', cols: [{ name: 'Ưu tiên', expr: '@priority', t: 'Văn bản' }], res: [{ name: 'remind_after', t: 'Văn bản' }, { name: 'escalate_after', t: 'Văn bản' }], rules: [{ cells: ['Khẩn'], vals: ['4h', '8h'], note: 'Đơn khẩn nhắc sau 4 giờ' }, { cells: ['Thường'], vals: ['24h', '48h'], note: '' }], dflt: ['24h', '48h'] }), 'sla_rule'),
      K(N('n10', 'human', 'Trưởng phòng duyệt', HR({ assignees: [P[0]], title: 'Duyệt đề nghị @case_code - @total', message: '@reason' })), 'manager_approval'),
      K(N('n11', 'condition', 'Cần duyệt cấp 2?', { cases: [C('Cần cấp 2', 'needs_level2', 'Bằng', 'true')] }), 'needs_level2'),
      K(N('n12', 'human', 'Duyệt cấp 2', HR({ assignees: [P[1], P[2]], mode: 'all', title: 'Duyệt cấp 2 - @case_code', message: 'Đơn trên 50 triệu cần Kế toán trưởng và Giám đốc khối cùng duyệt.' })), 'level2_approval'),
      K(N('n13', 'end', 'Từ chối', { status: 'rejected', via: VIA2 }), 'rejected'),
      K(N('n14', 'code', 'Tạo file PO', { params: [{ name: 'vendor', value: '@proposed_vendor' }, { name: 'items', value: '@items' }], code: 'def main(vendor, items):\n    po_code = next_po_code()\n    path = f"/work/{po_code}.docx"\n    build_po(path, vendor, items)\n    return {"po_code": po_code, "po_file": path}', outs: [O('po_code', '@render_po.po_code'), O('po_file', '@render_po.po_file')] }), 'render_po'),
      K(N('n15', 'tool', 'Lưu PO lên SharePoint', { tool: 'SharePoint · Tải tài liệu lên', args: { thu_muc: 'Đơn mua hàng', tep: '@po_file' } }), 'save_po'),
      K(N('n16', 'tool', 'Gửi PO cho NCC', { tool: 'Outlook · Gửi email', acc: 'initiator', args: { to: '@proposed_vendor', subject: 'Đơn mua hàng @po_code', body: 'Đính kèm @po_url' } }), 'send_po'),
      K(N('n28', 'human', 'Duyệt lưu và gửi PO', HR({ allowReturn: false, assignees: [P[3]], title: 'Lưu và gửi PO @po_code cho @proposed_vendor?', message: 'Lưu PO lên SharePoint và gửi email cho NCC là thao tác ghi. Duyệt để làm tiếp, Từ chối để huỷ.' })), 'confirm_po'),
      K(N('n29', 'human', 'Duyệt báo Kế toán', HR({ allowReturn: false, assignees: [P[3], P[5]], title: 'Báo Kế toán thanh toán PO @po_code?', message: 'Tự chèn trước Báo Kế toán vì gửi email là thao tác ghi.' })), 'confirm_notify'),
      K(N('n17', 'end', 'Đã huỷ', { status: 'cancelled', via: VIA2 }), 'cancelled'),
      K(N('n18', 'human', 'Chờ phiếu nhập kho', HR({ allowReturn: false, assignees: [P[4]], title: 'Xác nhận hàng về cho @po_code', message: 'Nhập số phiếu nhập kho khi hàng về đủ.', fields: [I('so_phieu_nhap', 'Văn bản', 'Số phiếu nhập kho')] })), 'wait_goods'),
      K(N('n19', 'human', 'Chờ hoá đơn NCC', HR({ allowReturn: false, assignees: [P[3]], title: 'Nhận hoá đơn của NCC cho @po_code', message: 'Nhập số hoá đơn khi nhận được.', fields: [I('so_hoa_don', 'Văn bản', 'Số hoá đơn')], tmoOn: true, tmo: '7', tmoUnit: 'ngày' })), 'wait_bill'),
      K(N('n20', 'tool', 'Nhắc NCC', { tool: 'Outlook · Gửi email', args: { to: '@proposed_vendor', subject: 'Nhắc hoá đơn PO @po_code', body: 'Vui lòng gửi hoá đơn cho PO @po_code.' } }), 'remind_vendor'),
      K(N('n21', 'join', 'Đủ chứng từ', { mode: 'all' }), 'join_docs'),
      K(N('n22', 'code', 'Three-way match', { params: [{ name: 'po', value: '@po_code' }, { name: 'receipt', value: '@so_phieu_nhap' }, { name: 'bill', value: '@so_hoa_don' }], code: 'def main(po, receipt, bill):\n    diffs = compare(po, receipt, bill)\n    return {"ok": not diffs, "diffs": diffs}', outs: [O('ok', '@three_way_match.ok'), O('diffs', '@three_way_match.diffs')] }), 'three_way_match'),
      K(N('n23', 'condition', 'Khớp chứng từ?', { cases: [C('Lệch', 'ok', 'Bằng', 'false')] }), 'is_matched'),
      K(N('n24', 'human', 'Xử lý chênh lệch', HR({ allowReturn: false, assignees: [P[3]], title: 'Chứng từ @po_code bị lệch', message: '@diffs', fields: [I('resolution', 'Văn bản', 'Cách xử lý')] })), 'resolve_variance'),
      K(N('n25', 'tool', 'Báo Kế toán', { tool: 'Outlook · Gửi email', args: { to: 'ketoan@fpt.com', subject: 'Thanh toán PO @po_code', body: 'Chứng từ đã đối chiếu.' } }), 'notify_accounting'),
      K(N('n26', 'end', 'Hoàn tất', { status: 'completed', via: VIA2 }), 'completed'),
      K(N('n27', 'end', 'Người đề nghị huỷ', { status: 'cancelled', via: VIA2 }), 'request_cancelled')
    ],
    edges: E([['n1', 0, 'n2'], ['n2', 0, 'n3'], ['n3', 0, 'n4'], ['n4', 0, 'n5'], ['n5', 1, 'n27'], ['n2', 2, 'n27'],
      ['n2', 1, 'n6'], ['n6', 0, 'n8'], ['n6', 1, 'n7'], ['n6', 2, 'n7'], ['n7', 0, 'n8'], ['n7', 1, 'n27'], ['n8', 0, 'n9'], ['n9', 0, 'n10'],
      ['n10', 0, 'n11'], ['n10', 1, 'n2'], ['n10', 2, 'n13'], ['n11', 0, 'n12'], ['n11', 1, 'n14'], ['n12', 0, 'n14'], ['n12', 1, 'n2'], ['n12', 2, 'n13'],
      ['n14', 0, 'n28'], ['n28', 0, 'n15'], ['n15', 0, 'n16'], ['n28', 1, 'n17'], ['n16', 0, 'n18'], ['n16', 0, 'n19'], ['n18', 0, 'n21'], ['n18', 1, 'n17'], ['n19', 0, 'n21'], ['n19', 1, 'n17'], ['n19', 2, 'n20'], ['n20', 0, 'n19'],
      ['n21', 0, 'n22'], ['n22', 0, 'n23'], ['n23', 0, 'n24'], ['n23', 1, 'n29'], ['n29', 0, 'n25'], ['n29', 1, 'n26'], ['n24', 0, 'n25'], ['n24', 1, 'n17'], ['n25', 0, 'n26']])
  };
  return layoutFlow(f);
}
function pickKey(text) { var t = norm(text); if (t.indexOf('mua sam') >= 0) return 'pr'; if (t.indexOf('mb life') >= 0 || t.indexOf('boi thuong') >= 0) return 'mbl-rules'; if (t.indexOf('hoa don') >= 0) return 'invoice'; return 'pr'; }
var MOCK = { ket_qua_cham: 'Cần thẩm định', hop_dong: 'MBL-0091234', lich_su: '2 lần, 2025', thu_nhap_tb: '32000000', so_thang: '3', po_tong_tien: '75000000', po_trang_thai: 'Đã duyệt', ma_lan_chay: 'QT-2026-0193', san_pham: 'Tiêu dùng', ma_ho_so_vay: 'HSV-2026-118', xu_ly: 'Đã xử lý', ket_qua_rule: 'D1 PASS, D2 PASS, D5 PASS, E1 PASS, E2 PASS, E3 NOT_EVALUATED, A2 WARN', so_warn: '1', so_not_evaluated: '1', rule_version: 'MBL-HSCR3-2026.10', ket_qua_e_a: 'E1 PASS, E2 PASS, E3 NOT_EVALUATED, A2 WARN', so_luong_nhan: '20', so_luong_hd: '20', so_tien_hd: '120000000', chenh_lech: '0', tep_hoa_don: 'HD-55812.pdf', so_hd: 'HD-55812', yeu_cau: '20 license Microsoft 365 E3, 12 tháng', tong_tien: '120000000', loai_hang: 'Phần mềm', ngan_sach_con: '300000000', bang_so_sanh: 'FPT IS 120tr · CMC 128tr · Viettel 131tr', khop: 'true', so_phieu_nhap: 'PNK-1021', so_hoa_don: 'HD-55812', nha_cung_cap: 'Công ty TNHH Phong Vũ', danh_muc: '20 laptop Dell Latitude', ma_so_thue: '0101234567', ngay_hd: '2026-10-18', so_cccd: '001090012345', ho_ten: 'Nguyễn Văn An', ngay_sinh: '1990-05-12', dat: 'true', ly_do: 'Thu nhập trung bình 32 triệu/tháng, đủ điều kiện', tra_loi: 'Đã xử lý xong', ma_po: 'PO-2026-0481', so_tien: '75000000', ma_but_toan: 'BT-77120', status: '200' };
var MOCK2 = { total: '85000000', priority: 'Thường', items: '20 màn hình Dell 27 inch', reason: 'Thay màn hình phòng Kinh doanh', so_warn: '1', remaining_budget: '120000000', needs_level2: 'true', remind_after: '24h', quotes: '[3 báo giá]', proposed_vendor: 'Công ty Phong Vũ', po_code: 'PO-2026-0381', po_file: '/work/PO-2026-0381.docx', po_url: 'https://fptsoft.sharepoint.com/sites/MuaSam/PO-2026-0381.docx', ok: 'true', diffs: '[]', message_id: 'msg_8812', case_code: 'PR-0142', initiator: 'Phạm Minh Khoa' };
function mockOf(k) { if (MOCK2[k] !== undefined) return MOCK2[k]; return MOCK[k] !== undefined ? MOCK[k] : 'Mẫu ' + k; }
function sampleOf(f) { if (MOCK2[f.name] !== undefined) return MOCK2[f.name]; if (MOCK[f.name] !== undefined) return MOCK[f.name]; var m = { 'Số': '75000000', 'Ngày': '2026-10-20', 'Tệp': f.name + '.pdf', 'Có / Không': 'true', 'Email': 'lan.nt@fpt.com' }; return m[f.t] || 'Mẫu ' + f.name; }
function msOf(type, seed) { var base = { worker: 9600, agent: 2400, tool: 540, code: 180, decision: 12, subflow: 1800 }; return (base[type] || 6) + (seed * 37) % (base[type] ? 400 : 9); }
function evalClause(cl, vars) {
  var m = cl.trim().match(/^([a-z0-9_]+)\s*(>=|<=|!=|>|<|=|thuộc)\s*(.+)$/i); if (!m) return false;
  var a = vars[m[1]], b = fill(m[3].trim(), vars); if (a === undefined) return false;
  var na = parseFloat(a), nb = parseFloat(b);
  switch (m[2]) { case '>': return na > nb; case '<': return na < nb; case '>=': return na >= nb; case '<=': return na <= nb; case '!=': return String(a) !== b; case '=': return String(a) === b; }
  return b.split(',').map(function (x) { return x.trim(); }).indexOf(String(a)) >= 0;
}
function evalDecision(c, vars) {
  var cv = c.cols.map(function (col) { return fill(String(col.expr || ''), vars); }), res = {}, hits = [];
  c.rules.forEach(function (r, i) {
    if (hits.length && c.hit !== 'collect') return;
    if (!c.cols.every(function (_, k) { return evalCell(r.cells[k], cv[k]); })) return;
    hits.push(i + 1);
    c.res.forEach(function (o, k) { var v = fill(r.vals[k], vars); res[o.name] = res[o.name] !== undefined && c.hit === 'collect' ? res[o.name] + ', ' + v : v; });
  });
  if (!hits.length) c.res.forEach(function (o, k) { res[o.name] = fill(c.dflt[k], vars); });
  return { vals: res, hits: hits };
}
function fill(t, vars) { return String(t || '').replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, function (m, k) { var v = vars[k]; return v !== undefined ? v : m; }); }


// ── Diễn giải luồng bằng lời cho người không chuyên ───────────────────────────
var XK = { b: 'color: #121216; font-weight: 600', who: 'color: #1d4ed8; font-weight: 600', time: 'color: #b45309; font-weight: 600', warn: 'color: #b45309; font-weight: 600', ok: 'color: #15803d; font-weight: 600', bad: 'color: #b91c1c; font-weight: 600', mut: 'color: #5b5b66' };
var XC = { b: ['#121216', 600], who: ['#1d4ed8', 600], time: ['#b45309', 600], warn: ['#b45309', 600], ok: ['#15803d', 600], bad: ['#b91c1c', 600], mut: ['#5b5b66', 400] };
function SG(t, k) { var c = XC[k] || ['inherit', 400]; return { t: t, c: c[0], w: c[1] }; }
function lc1(t) { t = String(t || ''); return t.charAt(0).toLowerCase() + t.slice(1); }
function plainVar(t) { return String(t || '').replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, '$1'); }
function whoOf(c) { var ps = c.assignees.map(function (x) { if (x === INIT) return 'người tạo hồ sơ'; var p = x.split(' · '); return p[1] ? p[1] + ' (' + p[0] + ')' : p[0]; }); if (!ps.length) return 'người nhận (chưa chọn)'; if (ps.length === 1) return ps[0]; return ps.join(' và ') + (c.mode === 'all' ? ' (cả hai đều phải duyệt)' : ' (một người xử lý là đủ)'); }
var END_VI = { completed: ['Hoàn tất', 'ok'], rejected: ['Bị từ chối', 'bad'], cancelled: ['Đã huỷ', 'bad'], failed: ['Thất bại', 'bad'] };
function explainFlow(s) {
  var byId = {}; s.nodes.forEach(function (n) { byId[n.id] = n; });
  var st = s.nodes.filter(function (n) { return n.type === 'start'; })[0]; if (!st) return { summary: [], steps: [] };
  var order = [], seen = {}, q = [st.id];
  while (q.length) { var id = q.shift(); if (seen[id] || !byId[id]) continue; seen[id] = 1; if (byId[id].type !== 'note') order.push(id); s.edges.filter(function (e) { return e.from === id; }).sort(function (a, b) { return a.out - b.out; }).forEach(function (e) { q.push(e.to); }); }
  var pos = function (id) { var n = byId[id]; return DIR === 'h' ? n.x * 10000 + n.y : n.y * 10000 + n.x; };
  order = order.filter(function (id) { return byId[id].type !== 'end'; }).sort(function (a, b) { return byId[a].type === 'start' ? -1 : byId[b].type === 'start' ? 1 : pos(a) - pos(b); }).concat(order.filter(function (id) { return byId[id].type === 'end'; }));
  var num = {}; order.forEach(function (id, i) { num[id] = i + 1; });
  var ref = function (id) { var n = byId[id]; if (!n) return [SG('chưa nối bước tiếp', 'warn')]; if (n.type === 'end') { var ev = END_VI[n.cfg.status] || ['Kết thúc', 'b']; return [SG('kết thúc hồ sơ: ', ''), SG(ev[0], ev[1])]; } return [SG('bước ' + num[id] + ' ', 'mut'), SG('"' + n.title + '"', 'b')]; };
  var outsTo = function (n, i) { return s.edges.filter(function (e) { return e.from === n.id && e.out === i; }).map(function (e) { return e.to; }); };
  var branches = function (n, labels) {
    var segs = [];
    outsOf(n).forEach(function (lb, i) { var to = outsTo(n, i); if (!to.length) return; var name = labels && labels[lb] || lb || 'Xong';
      segs.push(SG(' ' + name + ' thì ', '')); to.forEach(function (t, k) { if (k) segs.push(SG(' và đồng thời ', '')); if (byId[t] && byId[t].type !== 'end') segs.push(SG('sang ', '')); segs = segs.concat(ref(t)); }); segs.push(SG(';', '')); });
    if (segs.length) segs[segs.length - 1] = SG('.', '');
    return segs;
  };
  var next = function (n) { var to = outsTo(n, 0); if (!to.length) return [SG(' Sau đó dừng ở đây.', 'mut')]; if (to.length > 1) { var sg = [SG(' Sau đó ', ''), SG('chạy song song ' + to.length + ' nhánh', 'b'), SG(': ', '')]; to.forEach(function (t, k) { if (k) sg.push(SG(' và ', '')); sg = sg.concat(ref(t)); }); sg.push(SG('.', '')); return sg; } return [SG(' Sau đó sang ', '')].concat(ref(to[0])).concat([SG('.', '')]); };
  var tmo = function (n) { var c = n.cfg; return c.tmoOn && parseFloat(c.tmo) > 0 ? [SG(', hạn ', ''), SG(c.tmo + ' ' + c.tmoUnit, 'time')] : []; };
  var portTo = function (n, lb) { var i = outsOf(n).indexOf(lb); return i < 0 ? [] : outsTo(n, i); };
  var steps = order.map(function (id) {
    var n = byId[id], c = n.cfg, t = [];
    switch (n.type) {
      case 'start': t = [SG('Hồ sơ bắt đầu khi người dùng gõ ', ''), SG('/' + (c.cmd || 'tên Quy trình'), 'who'), SG(' trong Workspace. Agent điền sẵn form gồm ', ''), SG(c.inputs.filter(function (f) { return f.name; }).length + ' thông tin', 'b'), SG(' (' + c.inputs.map(function (f) { return f.desc || f.name; }).filter(Boolean).join(', ') + ')', 'mut'), SG(', người dùng kiểm tra rồi ', ''), SG('bấm Nộp', 'b'), SG('.', '')].concat(next(n)); break;
      case 'loop': t = c.mode === 'until' ? [SG('Lặp lại các bước bên trong ', ''), SG('cho tới khi ' + plainVar(c.until), 'b'), SG(', ', ''), SG('tối đa ' + c.max + ' vòng', 'time'), SG('.', '')] : [SG('Làm lần lượt các bước bên trong cho ', ''), SG('từng phần tử của ' + (c.list || 'danh sách'), 'b'), SG('.', '')];
        t = t.concat([SG(' Bắt đầu vòng ở ', '')]).concat(outsTo(n, 0).length ? ref(outsTo(n, 0)[0]) : [SG('(chưa nối)', 'warn')]).concat([SG('. Lặp xong thì sang ', '')]).concat(outsTo(n, 1).length ? ref(outsTo(n, 1)[0]) : [SG('(chưa nối)', 'warn')]);
        if (c.mode === 'until' && outsTo(n, 2).length) t = t.concat([SG('; hết số vòng mà chưa đạt thì ', 'warn')]).concat(ref(outsTo(n, 2)[0])); t.push(SG('.', '')); break;
      case 'tool': var tl = TOOLS.filter(function (x) { return x.name === c.tool; })[0]; t = [SG('Hệ thống tự ', ''), SG(lc1(actOf(c.tool) || 'chạy thao tác'), 'b'), SG(' trên ' + (connOf(c.tool) || 'hệ thống ngoài'), '')];
        if (c.acc === 'initiator') t.push(SG(' bằng tài khoản của người tạo đề nghị', 'who')); if (tl && tl.write) t.push(SG(' (thao tác ghi, đã có người duyệt trước)', 'warn'));
        if (parseInt(c.retry, 10) > 0) t.push(SG(', lỗi kỹ thuật thì thử lại ' + c.retry + ' lần', 'mut')); t = t.concat(tmo(n)).concat([SG('.', '')]).concat(next(n)); if (portTo(n, 'Timeout').length) t = t.concat([SG(' Quá hạn thì ', 'warn')]).concat(ref(portTo(n, 'Timeout')[0])).concat([SG('.', '')]); break;
      case 'condition': t = [SG('Kiểm tra: ', '')]; c.cases.forEach(function (cs, i) { t.push(SG('nếu ' + cs.rows.map(function (r) { return r.v + ' ' + r.op.toLowerCase() + ' ' + plainVar(r.val); }).join(cs.logic === 'OR' ? ' hoặc ' : ' và '), 'b')); t.push(SG(' thì ', '')); var to = outsTo(n, i); if (to.length && byId[to[0]].type !== 'end') t.push(SG('sang ', '')); t = t.concat(to.length ? ref(to[0]) : [SG('tiếp tục trong vòng lặp', 'mut')]); t.push(SG('; ', '')); });
        t.push(SG('còn lại', 'b')); t.push(SG(' thì ', '')); var te = outsTo(n, c.cases.length); if (te.length && byId[te[0]].type !== 'end') t.push(SG('sang ', '')); t = t.concat(te.length ? ref(te[0]) : [SG('tiếp tục trong vòng lặp', 'mut')]); t.push(SG('.', '')); break;
      case 'human': var vb = c.variant === 'choice' ? 'chọn' : 'duyệt';
        t = [SG(whoOf(c).charAt(0).toUpperCase() + whoOf(c).slice(1), 'who'), SG(' nhận việc ', ''), SG(vb + ' "' + plainVar(c.title) + '"', 'b'), SG(' qua ' + (c.via.length ? c.via.join(' và ') : '(chưa chọn cách gửi)'), '')].concat(c.tmoOn ? [SG(', hạn ', ''), SG(c.tmo + ' ' + c.tmoUnit, 'time')] : []); t.push(SG('.', ''));
        t = t.concat(branches(n, { 'Trả lại': 'Trả lại để sửa', Timeout: 'Quá hạn' })); break;
      case 'worker': t = [SG('Nhân sự số ', ''), SG(c.worker || '(chưa chọn)', 'who'), SG(' làm việc: ', ''), SG(plainVar(c.task), '')].concat(c.tmoOn ? [SG(' Hạn ', ''), SG(c.tmo + ' ' + c.tmoUnit, 'time')] : []).concat([SG('.', '')]).concat(next(n));
        if (portTo(n, 'Timeout').length) t = t.concat([SG(' Quá hạn thì ', 'warn')]).concat(ref(portTo(n, 'Timeout')[0])).concat([SG('.', '')]); if (portTo(n, 'Failed').length) t = t.concat([SG(' Lỗi thì ', 'warn')]).concat(ref(portTo(n, 'Failed')[0])).concat([SG('.', '')]); break;
      case 'agent': t = [SG('AI ', ''), SG(lc1(n.title), 'b'), SG(c.model ? ' (' + c.model + ')' : '', 'mut'), SG('.', '')].concat(next(n)); if (portTo(n, 'Failed').length) t = t.concat([SG(' Lỗi thì ', 'warn')]).concat(ref(portTo(n, 'Failed')[0])).concat([SG('.', '')]); break;
      case 'decision': t = [SG('Tra bảng quyết định ', ''), SG('"' + n.title + '"', 'b'), SG(': ', '')]; c.rules.forEach(function (r, i) { if (i) t.push(SG('; ', '')); t.push(SG('khi ' + c.cols.map(function (col, k) { var x = String(r.cells[k] || '').trim(); return x && x !== '-' ? col.name.toLowerCase() + ' ' + x : ''; }).filter(Boolean).join(' và ') || 'mọi trường hợp', 'b')); t.push(SG(' thì ' + c.res.map(function (o, k) { return o.name + ' = ' + r.vals[k]; }).join(', '), '')); }); if (c.dflt.some(function (v) { return String(v).trim(); })) t.push(SG('; còn lại thì ' + c.res.map(function (o, k) { return o.name + ' = ' + c.dflt[k]; }).join(', '), 'mut')); t.push(SG('.', '')); t = t.concat(next(n)); break;
      case 'wait': t = [SG('Chờ ', ''), SG(c.mode === 'until' ? 'tới ' + plainVar(c.at) : c.amount + ' ' + c.aunit, 'time'), SG(' rồi tự đi tiếp.', '')].concat(next(n)); break;
      case 'join': t = [SG(c.mode === 'all' ? 'Chờ đủ tất cả các nhánh chạy song song' : 'Nhánh nào xong trước thì đi tiếp, các nhánh còn lại bị huỷ', 'b'), SG('.', '')].concat(next(n)); break;
      case 'code': t = [SG('Hệ thống tự tính toán: ', ''), SG(lc1(n.title), 'b'), SG(' (không dùng AI, kết quả chính xác tuyệt đối).', 'mut')].concat(next(n)); break;
      case 'variable': t = [SG('Ghi lại thông tin ', ''), SG(c.name || '(chưa đặt tên)', 'b'), SG('.', '')].concat(next(n)); break;
      case 'end': var ev2 = END_VI[c.status] || ['Kết thúc', 'b']; t = [SG('Hồ sơ đóng với kết quả ', ''), SG(ev2[0], ev2[1])].concat([SG('. ', '')]).concat((c.notify || []).length ? [SG(whoOf({ assignees: c.notify, mode: 'any' }).replace(/ \(một người xử lý là đủ\)/, ''), 'who'), SG(' nhận thông báo' + ((c.via || []).length ? ' qua ' + c.via.join(' và ') : '') + '.', '')] : [SG('Không ai được báo.', 'mut')]); break;
    }
    var col = colOf(n.type);
    return { n: num[id], title: n.title, kind: TYPES[n.type].name, segs: t, tile: col[0], tileBg: col[1], icon: TYPES[n.type].icon, id: n.id };
  });
  var people = s.nodes.filter(function (n) { return n.type === 'human'; }).length, branchN = s.nodes.filter(function (n) { return n.type === 'condition' || n.type === 'decision'; }).length, ends = s.nodes.filter(function (n) { return n.type === 'end'; });
  var summary = [SG('Quy trình có ', ''), SG(order.length + ' bước', 'b'), SG(', trong đó ', ''), SG(people + ' bước cần người xử lý', 'who'), SG(' và ', ''), SG(branchN + ' điểm rẽ nhánh theo luật', 'b'), SG('. Hồ sơ có thể kết thúc theo ' + ends.length + ' cách: ', '')];
  ends.forEach(function (e, i) { var ev = END_VI[e.cfg.status] || ['Kết thúc', 'b']; if (i) summary.push(SG(', ', '')); summary.push(SG(e.title, ev[1])); }); summary.push(SG('.', ''));
  return { summary: summary, steps: steps };
}


// Đường chính: đường ngắn nhất từ Start tới End Completed, ngoại lệ ghi nhỏ dưới từng bước.
var EXC_VI = { Timeout: 'Quá hạn', Failed: 'Lỗi', 'Max reached': 'Hết số vòng', Else: 'Còn lại' };
function roleOf(p) { var x = String(p || '').split(' · '); return x[1] || x[0]; }
function mainFlow(s) {
  var byId = {}; s.nodes.forEach(function (n) { byId[n.id] = n; });
  var st = s.nodes.filter(function (n) { return n.type === 'start'; })[0]; if (!st) return { summary: [], steps: [] };
  var outE = function (n, i) { return s.edges.filter(function (e) { return e.from === n.id && e.out === i; }); };
  var bodyOf = {}; s.nodes.forEach(function (L) { if (L.type === 'loop') bodyOf[L.id] = loopBody(L, s); });
  var happy = function (n, lb) { if (n.type === 'loop') return lb === 'Xong'; return ['Trả lại', 'Từ chối', 'Timeout', 'Failed', 'Max reached'].indexOf(lb) < 0; };
  var nexts = function (n) {
    var res = [];
    var ports = outsOf(n).map(function (lb, i) { return [lb, i]; }); if (n.type === 'condition') ports.reverse();
    ports.forEach(function (pp) { var lb = pp[0], i = pp[1]; if (!happy(n, lb)) return; var es = outE(n, i);
      if (es.length > 1) { var j = s.nodes.filter(function (x) { return x.type === 'join' && es.every(function (e) { return reachable(e.to, s.edges)[x.id]; }); })[0]; if (j) { res.push(j.id); return; } }
      es.forEach(function (e) { res.push(e.to); }); });
    return res;
  };
  var prev = {}, seen = {}, q = [st.id], goal = null; seen[st.id] = 1;
  while (q.length && !goal) { var id = q.shift(), n = byId[id]; if (n.type === 'end' && n.cfg.status === 'completed') { goal = id; break; } nexts(n).forEach(function (t) { if (!seen[t] && byId[t] && !Object.keys(bodyOf).some(function (L) { return bodyOf[L][t] && !bodyOf[L][id] && id !== L; })) { seen[t] = 1; prev[t] = id; q.push(t); } }); }
  var path = []; if (goal) { for (var c = goal; c; c = prev[c]) path.unshift(c); } else path = [st.id];
  var num = {}; path.forEach(function (id, i) { num[id] = i + 1; });
  var tgt = function (id, back) { var n = byId[id]; if (!n) return [SG('chưa nối bước tiếp', 'warn')];
    if (n.type === 'end') { var ev = END_VI[n.cfg.status] || ['Kết thúc', 'b']; return [SG('kết thúc ', ''), SG(ev[0], ev[1])]; }
    if (num[id]) return [SG((num[id] < back ? 'quay về bước ' : 'sang bước ') + num[id], '')];
    var w = n.type === 'human' ? whoShort(n.cfg) : ''; return [SG(n.title + (w ? ' (' + w + ')' : ''), '')]; };
  var excOf = function (n, k) {
    var ex = [], byT = {};
    outsOf(n).forEach(function (lb, i) { if (lb === 'Mỗi vòng' || (happy(n, lb) && n.type !== 'condition')) return; var es = outE(n, i); if (!es.length) return;
      if (n.type === 'condition' && es.some(function (e) { return path.indexOf(e.to) >= 0; })) return;
      var to = es[0].to, nm = EXC_VI[lb] || lb; if (byT[to]) { byT[to].names.push(nm.toLowerCase()); return; } byT[to] = { names: [nm], to: to }; ex.push(byT[to]); });
    return ex.map(function (x) { return { segs: [SG(x.names.join(' hoặc ') + ': ', '')].concat(tgt(x.to, k)) }; });
  };
  var whoShort = function (c) { var r = c.assignees.map(function (x) { return x === INIT ? 'Người tạo hồ sơ' : roleOf(x); }); return r.length ? r.join(' + ') : 'Chưa chọn người'; };
  var steps = [];
  path.forEach(function (id, idx) {
    var n = byId[id], c = n.cfg, k = idx + 1, st0 = { n: k, id: id, title: n.title, who: '', meta: '', exc: excOf(n, k), lead: [], isEnd: n.type === 'end', isStart: n.type === 'start', isPeople: false };
    var col = colOf(n.type); st0.tile = col[0]; st0.tileBg = col[1]; st0.icon = TYPES[n.type].icon;
    switch (n.type) {
      case 'start': st0.title = 'Người dùng gõ /' + (c.cmd || 'tên Quy trình') + ' trong Workspace, kiểm tra form rồi bấm Nộp'; break;
      case 'end': var ev = END_VI[c.status] || ['Kết thúc', 'b']; st0.title = 'Hồ sơ kết thúc'; st0.endLabel = ev[0]; st0.endOk = c.status === 'completed'; break;
      case 'human': st0.who = whoShort(c); st0.meta = c.tmoOn ? c.tmo + ' ' + c.tmoUnit : ''; st0.isPeople = true; break;
      case 'decision': st0.title = 'Tra bảng quyết định: ' + n.title; break;
      case 'condition': st0.title = 'Kiểm tra: ' + n.title; break;
      case 'worker': st0.who = c.worker || 'Chưa chọn Nhân sự số'; st0.meta = c.tmoOn ? c.tmo + ' ' + c.tmoUnit : ''; st0.isPeople = true; break;
      case 'loop':
        var body = s.nodes.filter(function (x) { return bodyOf[n.id][x.id] && x.type !== 'note'; });
        st0.title = body.length ? body.map(function (x) { return x.title; })[0] : n.title;
        st0.meta = c.mode === 'until' ? 'lặp tới khi đạt, tối đa ' + c.max + ' vòng' : 'cho từng phần tử';
        body.forEach(function (b) { outsOf(b).forEach(function (lb, i) { outE(b, i).forEach(function (e) { if (bodyOf[n.id][e.to] && byId[e.to].type !== 'end') { var t2 = byId[e.to]; if (b.type === 'condition') st0.exc.unshift({ segs: [SG((lb === 'Else' ? 'Còn lại' : lb) + ': ', ''), SG(t2.title + (t2.type === 'human' ? ' (' + whoShort(t2.cfg) + ')' : '') + ', rồi làm lại', '')] }); } }); }); });
        break;
    }
    var fan = s.edges.filter(function (e) { return e.from === id && e.out === 0; });
    if (fan.length > 1 && outsOf(n).length >= 1 && n.type !== 'loop') st0.par = fan.map(function (e) { var t = byId[e.to]; return { t: t.title, who: t.type === 'human' ? whoShort(t.cfg) : (t.type === 'worker' ? t.cfg.worker : '') }; });
    if (n.type === 'join') { var ins = s.edges.filter(function (e) { return e.to === id; }).map(function (e) { return byId[e.from]; }); st0.title = 'Cùng lúc: ' + ins.map(function (x) { return x.title; }).join(', ').replace(/, ([^,]*)$/, ' và $1'); var ws = ins.filter(function (x) { return x.type === 'human'; }).map(function (x) { return whoShort(x.cfg); }); st0.who = ws.join(' · '); st0.isPeople = !!ws.length; st0.meta = c.mode === 'all' ? (ins.length > 2 ? 'chờ đủ ' + ins.length + ' nhánh' : 'chờ đủ cả hai') : 'nhánh nào xong trước';
      ins.forEach(function (x) { excOf(x, k).forEach(function (e) { st0.exc.push(e); }); }); }
    steps.push(st0);
  });
  // gộp node rẽ song song vào bước Join kế tiếp
  steps = steps.filter(function (x) { return !x.par || x.isStart; });
  steps.forEach(function (x, i) { x.n = i + 1; });
  var people = steps.filter(function (x) { return x.isPeople; }).length;
  var summary = goal ? [SG('Khi mọi việc suôn sẻ, hồ sơ đi qua ', ''), SG(steps.length + ' bước', 'b'), SG(' dưới đây', '')].concat(people ? [SG(', có ', ''), SG(people + ' lượt cần người hoặc Nhân sự số xử lý', 'who')] : [SG(', tất cả chạy tự động', 'b')]).concat([SG('. Các trường hợp khác ghi nhỏ ngay dưới bước liên quan.', '')])
    : [SG('Quy trình chưa có đường nào tới End Completed. Xem tab Tất cả bước.', 'warn')];
  return { summary: summary, steps: steps };
}

// ── Refine với AI (mock): hiểu vài câu lệnh, đề xuất thay đổi để người dựng Áp dụng ──
var REFINE_TIPS = ['Thêm bước Giám đốc khối duyệt sau Trưởng phòng duyệt', 'Đổi hạn Trưởng phòng duyệt thành 24 giờ', 'Chờ 3 ngày trước Nhắc NCC', 'Gửi email báo người đề nghị khi Hoàn tất', 'Kiểm tra Quy trình còn lỗi gì', 'Giải thích luồng này'];
function personOf(t) { var x = norm(t), m = [['giam doc', 2], ['ke toan truong', 1], ['ke toan', 5], ['truong phong', 0], ['mua sam', 3], ['kho', 4]]; for (var i = 0; i < m.length; i++) if (x.indexOf(m[i][0]) >= 0) return PEOPLE[m[i][1]]; var p = PEOPLE.filter(function (pp) { return x.indexOf(norm(pp.split(' · ')[0])) >= 0; })[0]; return p || ''; }
function nodeIn(t, s, after) { var x = norm(t), key = after ? (x.split(/\b(sau|truoc)\b/)[2] || x) : x, best = null; s.nodes.forEach(function (n) { if (n.type === 'note' || n.type === 'start') return; var k = norm(n.title); if (key.indexOf(k) >= 0 && (!best || k.length > norm(best.title).length)) best = n; }); return best; }

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
  insets() { var s = this.state, panel = (s.sel || s.runOpen || !s.panelHidden) ? (s.expand ? 640 : 476) : 0; return { l: s.palOpen ? (s.leftTab === 'ai' ? 372 : 248) : 40, r: panel + 24 }; }
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
      if (a.tab === 'tool') { TOOLS.forEach(function (t) { if (match(t.name)) res.push({ g: 'Connector đã kết nối', type: 'tool', preset: { tool: t.name, acc: 'space' }, title: t.name.split(' · ')[1], name: t.name, desc: t.desc, icon: ICON.tool, tile: COL.integ[0], tileBg: COL.integ[1], tag: 'Đã kết nối' }); }); return res; }
      var boxN = this.byId(a.loopId), gname = boxN && boxN.type === 'parallel' ? 'Bước trong nhánh ' + ((boxN.cfg.branches[a.lane || 0] || {}).name || '') : 'Bước trong vòng lặp';
      INNER_OK.forEach(function (k) { if (match(TYPES[k].name + ' ' + TYPES[k].kw)) res.push(Object.assign(T(k, gname), k === 'tool' ? { more: true, goTab: 'tool' } : {})); });
      return res;
    }
    if (q) TOOLS.forEach(function (t) { if (match(t.name + ' ' + t.desc + ' tool connector ' + t.kind)) res.push({ g: 'Thao tác của connector', type: 'tool', preset: { tool: t.name, acc: 'process' }, title: actOf(t.name), name: t.name, desc: t.kind + ' · ' + t.desc, icon: ICON.tool, tile: COL.integ[0], tileBg: COL.integ[1], tag: t.write ? 'Ghi' : '', hasTag: !!t.write }); });
    else if (a.tab === 'tool' && String(a.level).indexOf('c:') === 0) { var cn = a.level.slice(2); TOOLS.forEach(function (t) { if (connOf(t.name) === cn) res.push({ g: 'Thao tác', type: 'tool', preset: { tool: t.name, acc: 'process' }, title: actOf(t.name), name: actOf(t.name), desc: t.desc + (t.write ? ' · tự chèn Human Review · Confirm trước' : ''), icon: ICON.tool, tile: COL.integ[0], tileBg: COL.integ[1], tag: t.write ? 'Ghi' : '' }); }); }
    else if (a.tab === 'tool') CONNS.forEach(function (cc) { res.push({ g: cc.kind, name: cc.name, desc: cc.n + ' thao tác', icon: ICON.tool, tile: COL.integ[0], tileBg: COL.integ[1], more: true, goLevel: 'c:' + cc.name }); });
    if (a.tab === 'featured' || q) {
      PAL.forEach(function (k) {
        if (match(TYPES[k].name + ' ' + TYPES[k].kw + ' ' + TYPES[k].desc + ' ' + VARIANT[k])) res.push(Object.assign(T(k, q ? 'Bước' : PAL_GROUP[k], { desc: VARIANT[k] }), k === 'tool' && !q ? { more: true, goTab: 'tool' } : {}));
      });
    }
    if (a.from && a.tab === 'featured') {
      var anc = {}, stack = [a.from.id]; anc[a.from.id] = 1;
      while (stack.length) { var cur = stack.pop(); st.edges.forEach(function (e) { if (e.to === cur && !anc[e.from]) { anc[e.from] = 1; stack.push(e.from); } }); }
      st.nodes.forEach(function (n) { if (anc[n.id] || n.type === 'start' || n.type === 'note' || n.parent) return; if (match(n.title + ' noi co san')) { var c = colOf(n.type); res.push({ g: 'Nối tới bước phía sau', connect: n.id, name: n.title, desc: '', icon: TYPES[n.type].icon, tile: c[0], tileBg: c[1] }); } });
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
    var src = this.byId(from.id), multi = src && outsOf(src).length === 1 && src.type !== 'loop';
    if (this.state.edges.some(function (e) { return e.from === from.id && e.out === from.out && e.to === toId; })) { this.setState({ add: null }); return; }
    var edges = this.state.edges.filter(function (e) { return multi || !(e.from === from.id && e.out === from.out); }).concat([{ from: from.id, out: from.out, to: toId }]);
    if (multi && edges.filter(function (e) { return e.from === from.id; }).length > 1) this.showToast('Hai mũi tên ra từ một bước: các nhánh chạy song song. Gộp lại bằng Join.');
    this.commit(this.state.nodes, edges, { add: null });
  }
  makeNode(type, preset, title) { this.seq += 1; return { id: 'n' + this.seq, type: type, title: title || TYPES[type].name, x: 0, y: 0, cfg: Object.assign(defaultCfg(type), preset || {}) }; }
  capFull() { if (this.state.nodes.length >= 500) { this.showToast('Quy trình đã đủ 500 bước - Gộp hoặc bỏ bớt bước rồi thêm lại.'); return true; } return false; }
  addNode(type, from, preset, title) {
    if (this.capFull()) return;
    if (this.roStop()) return;
    var s = this.state, node = this.makeNode(type, preset, title), src = from ? this.byId(from.id) : null;
    if (type === 'note') {
      var cs = this.canvasSize(); node.x = Math.round((cs.w / 2 - s.px) / s.z - 100); node.y = Math.round((80 - s.py) / s.z);
      this.setState(Object.assign(this.snap(), { nodes: s.nodes.concat([node]), sel: node.id, tab: 'cfg', add: null, runOpen: false, panel: null })); return;
    }
    var edges = s.edges.slice(); if (src) edges.push({ from: src.id, out: from.out, to: node.id });
    var w = this.withConfirm(s.nodes.concat([node]), edges, node.id);
    this.commit(w.nodes, w.edges, { sel: node.id, tab: 'cfg', add: null, runOpen: false, aiBanner: false, picking: null, panel: null }, node.id);
  }
  insertOnEdge(type, e, preset, title) {
    if (this.capFull()) return;
    if (this.roStop()) return;
    var s = this.state, node = this.makeNode(type, preset, title);
    var edges = s.edges.filter(function (x) { return !(x.from === e.from && x.out === e.out && x.to === e.to); });
    edges.push({ from: e.from, out: e.out, to: node.id }); edges.push({ from: node.id, out: 0, to: e.to });
    var w = this.withConfirm(s.nodes.concat([node]), edges, node.id);
    this.commit(w.nodes, w.edges, { sel: node.id, tab: 'cfg', add: null, runOpen: false, picking: null, panel: null }, node.id);
  }
  removeNode(id) {
    if (this.roStop()) return;
    var s = this.state, n = this.byId(id); if (!n || n.type === 'start') return;
    var gone = {}; gone[id] = 1; if (isBox(n)) allInner(n).forEach(function (k) { gone[k] = 1; });
    var nodes = s.nodes.filter(function (x) { return !gone[x.id]; }).map(function (x) { if (x.type === 'loop' && (x.cfg.inner || []).indexOf(id) >= 0) return Object.assign({}, x, { cfg: Object.assign({}, x.cfg, { inner: x.cfg.inner.filter(function (k) { return k !== id; }) }) }); if (x.type === 'parallel' && allInner(x).indexOf(id) >= 0) return Object.assign({}, x, { cfg: Object.assign({}, x.cfg, { branches: x.cfg.branches.map(function (b) { return Object.assign({}, b, { inner: (b.inner || []).filter(function (k) { return k !== id; }) }); }) }) }); return x; });
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
  withConfirm(nodes, edges, id) {
    var n = nodes.filter(function (x) { return x.id === id; })[0]; if (!n || n.type !== 'tool' || !isWrite(n.cfg)) return { nodes: nodes, edges: edges };
    var ins = edges.filter(function (e) { return e.to === id; });
    var human = function (e) { var src = nodes.filter(function (x) { return x.id === e.from; })[0]; return src && src.type === 'human'; };
    if (ins.length && ins.every(human)) return { nodes: nodes, edges: edges };
    var act = (n.cfg.tool.split(' · ')[1] || n.cfg.tool).toLowerCase();
    var h = this.makeNode('human', { variant: 'approval', allowReturn: false, nodeKey: 'confirm_' + keyOf(n), title: 'Duyệt trước khi ' + act, message: 'Kiểm tra nội dung rồi Duyệt để chạy ' + n.cfg.tool + ', Từ chối để không chạy.', via: ['Action Center'] }, 'Duyệt ' + act);
    var es = edges.map(function (e) { return e.to === id && !human(e) ? Object.assign({}, e, { to: h.id }) : e; }).concat([{ from: h.id, out: 0, to: id }]);
    this.showToast('Thao tác ghi: đã chèn bước Human Review duyệt ngay trước. Chọn người được giao và nối nhánh Từ chối.');
    return { nodes: nodes.concat([h]), edges: es };
  }

  refineSend(text) {
    var s = this.state, t = String(text || s.rq || '').trim(); if (!t) return;
    var x = norm(t), msgs = (s.rmsgs || []).concat([{ role: 'me', text: t }]), reply = null, prop = null;
    var anchor = nodeIn(t, s, /\b(sau|truoc)\b/.test(x)), num = (x.match(/(\d+)\s*(gio|ngay|phut|tuan)/) || []);
    if (/giai thich|dien giai|tom tat|mo ta luong/.test(x)) { reply = 'Mình đã mở Diễn giải luồng: từng bước được kể lại bằng lời, chỗ quan trọng in đậm và tô màu.'; this.setState({ explainOpen: true }); }
    else if (/kiem tra|loi|thieu gi|san sang/.test(x)) { var all = this.allIssues(); reply = all.length ? 'Quy trình còn ' + all.length + ' lỗi cần sửa trước khi publish: ' + all.slice(0, 4).map(function (i) { return '"' + i.title + '": ' + i.msgs[0]; }).join('; ') + (all.length > 4 ? '...' : '') + '.' : 'Không còn lỗi nào. Bạn có thể Chạy thử rồi Publish.'; }
    else if (/\b(xoa|bo)\b/.test(x) && anchor) prop = { op: 'del', id: anchor.id, text: 'Xoá bước "' + anchor.title + '". Các mũi tên nối tới bước này cũng bị gỡ, bạn cần nối lại đường đi.' };
    else if (/\bhan\b/.test(x) && num[1] && anchor && (anchor.type === 'human' || anchor.type === 'worker')) { var u = { gio: 'giờ', ngay: 'ngày', phut: 'phút', tuan: 'tuần' }[num[2]]; prop = { op: 'cfg', id: anchor.id, patch: { tmoOn: true, tmo: num[1], tmoUnit: u === 'tuần' ? 'ngày' : u }, text: 'Đổi hạn của "' + anchor.title + '" thành ' + num[1] + ' ' + u + '.' }; }
    else if (/\bcho\b/.test(x) && num[1]) { var u2 = { gio: 'giờ', ngay: 'ngày', phut: 'phút', tuan: 'ngày' }[num[2]]; prop = { op: 'add', type: 'wait', title: 'Chờ ' + num[1] + ' ' + u2, preset: { mode: 'delay', amount: num[1], aunit: u2 }, anchor: anchor, before: /\btruoc\b/.test(x) }; prop.text = 'Thêm bước Wait "' + prop.title + '"' + (anchor ? (prop.before ? ' trước "' : ' sau "') + anchor.title + '"' : '') + '.'; }
    else if (/duyet|phe duyet|approve/.test(x)) { var who = personOf(t.replace(/sau .*$/i, '')) || PEOPLE[2]; var ttl = who.split(' · ')[1] + ' duyệt'; prop = { op: 'add', type: 'human', title: ttl, preset: { variant: 'approval', assignees: [who], via: ['Action Center', 'Email'], title: ttl + ' @case_code', tmoOn: true, tmo: '48', tmoUnit: 'giờ' }, anchor: anchor }; prop.text = 'Thêm Human Review · Quick Approval "' + ttl + '" giao cho ' + who.split(' · ')[0] + ', gửi qua Action Center và Email, hạn 48 giờ' + (anchor ? ', ngay sau "' + anchor.title + '"' : '') + '. Nhánh Trả lại, Từ chối và Hết hạn bạn nối tiếp sau khi áp dụng.'; }
    else if (/email|gui mail|thong bao/.test(x)) { var end = /hoan tat|xong/.test(x) ? s.nodes.filter(function (n) { return n.type === 'end' && n.cfg.status === 'completed'; })[0] : null, anc = anchor || null; prop = { op: 'add', type: 'tool', title: 'Gửi email thông báo', preset: { tool: 'Outlook · Gửi email', acc: 'process', args: { to: '@initiator.email', subject: 'Hồ sơ @case_code đã xong', body: 'Hồ sơ @case_code đã xử lý xong.' } }, anchor: anc, beforeId: !anc && end ? end.id : null }; prop.text = 'Thêm Connector Outlook · Gửi email' + (end && !anc ? ' ngay trước "' + end.title + '"' : anc ? ' sau "' + anc.title + '"' : '') + '. Gửi email là thao tác ghi nên một bước Human Review duyệt sẽ được tự chèn ngay trước.'; }
    else reply = 'Mình có thể thêm bước duyệt, bước chờ, email thông báo, đổi hạn xử lý, xoá bước, kiểm tra lỗi hoặc giải thích luồng. Thử gõ: "' + REFINE_TIPS[0] + '".';
    if (prop) reply = 'Đề xuất thay đổi: ' + prop.text;
    msgs.push({ role: 'ai', text: reply, prop: prop, done: false });
    this.setState({ rmsgs: msgs, rq: '' });
  }
  refineApply(i) {
    if (this.roStop()) return;
    var s = this.state, m = (s.rmsgs || [])[i]; if (!m || !m.prop || m.done) return;
    var pr = m.prop, msgs = s.rmsgs.map(function (x, j) { return j === i ? Object.assign({}, x, { done: true }) : x; });
    this.setState({ rmsgs: msgs });
    if (pr.op === 'del') { this.removeNode(pr.id); return; }
    if (pr.op === 'cfg') { var nodes = s.nodes.map(function (n) { return n.id === pr.id ? Object.assign({}, n, { cfg: Object.assign({}, n.cfg, pr.patch) }) : n; }); this.commit(nodes, s.edges, { sel: pr.id, tab: 'cfg' }, pr.id); return; }
    var a = pr.anchor ? this.byId(pr.anchor.id) : null, edge = null;
    if (pr.beforeId) edge = s.edges.filter(function (e) { return e.to === pr.beforeId; })[0];
    else if (a && pr.before) edge = s.edges.filter(function (e) { return e.to === a.id; })[0];
    else if (a) edge = s.edges.filter(function (e) { return e.from === a.id && e.out === 0; })[0];
    if (edge) this.insertOnEdge(pr.type, edge, pr.preset, pr.title); else this.addNode(pr.type, a ? { id: a.id, out: 0 } : null, pr.preset, pr.title);
  }
  setTool(id, tool) {
    if (this.ro()) return;
    var nodes = this.state.nodes.map(function (x) { return x.id === id ? Object.assign({}, x, { cfg: Object.assign({}, x.cfg, { tool: tool }) }) : x; });
    var w = this.withConfirm(nodes, this.state.edges, id);
    this.commit(w.nodes, w.edges, {}, id);
  }
  updateCfg(patch, nodeId) {
    if (this.ro()) return; var id = nodeId || this.state.sel, old = this.byId(id); if (!old) return;
    var nn = Object.assign({}, old, { cfg: Object.assign({}, old.cfg, patch) }), o1 = outsOf(old), o2 = outsOf(nn), st = { nodes: this.state.nodes.map(function (n) { return n.id === id ? nn : n; }) };
    if (o1.join('|') !== o2.join('|')) {
      // giữ mũi tên theo tên nhánh; nhánh đổi tên giữ theo vị trí; nhánh không còn thì gỡ mũi tên
      st.edges = this.state.edges.map(function (e) { if (e.from !== id) return e; var lb = o1[e.out], j = o2.indexOf(lb); if (j < 0 && e.out < o2.length && o1.indexOf(o2[e.out]) < 0) j = e.out; return j < 0 ? null : Object.assign({}, e, { out: j }); }).filter(Boolean);
      this.relayoutSoon();
    }
    this.setState(st);
  }
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
    if (!s.nodes.some(function (n) { return n.type === 'end'; })) list.push({ id: st ? st.id : '', title: 'Quy trình', type: 'end', msgs: ['Thêm ít nhất một bước End để đóng hồ sơ'] });
    return list;
  }

  openRun() {
    if (this.roStop()) return;
    var s = this.state, st = s.nodes.filter(function (n) { return n.type === 'start'; })[0], inputs = {};
    st.cfg.inputs.forEach(function (f) { if (f.name) inputs[f.name] = sampleOf(f); });
    this.setState({ panelHidden: false, runOpen: true, sel: null, add: null, checkOpen: false, pubOpen: false, panel: null, ctx: null, run: s.run && s.run.status !== 'idle' ? s.run : { status: 'idle', tab: 'input', inputs: inputs, log: [], ran: [], redges: [] } });
  }
  startRun() {
    var errs = this.allIssues().reduce(function (a, g) { return a + g.msgs.filter(function (m) { return !isWarn(m); }).length; }, 0);
    if (errs) { this.setState({ checkOpen: true }); this.showToast('Còn ' + errs + ' lỗi cần sửa trước khi chạy thử. Xem Danh sách kiểm tra.', 'bad'); return; }
    var self = this, st = this.state.nodes.filter(function (n) { return n.type === 'start'; })[0], inputs = this.state.run.inputs;
    this.setState({ run: { status: 'running', tab: 'trace', inputs: inputs, log: [], ran: [], redges: [], cur: st.id, vars: Object.assign({}, inputs) }, aiBanner: false });
    clearTimeout(this.timer); this.timer = setTimeout(function () { self.step(); }, 500);
  }
  finish(ok, text, output) { this.setState(function (st) { return { run: Object.assign({}, st.run, { status: 'done', tab: 'result', cur: null, ok: ok, text: text, output: output || '' }) }; }); }
  evalCase(cs, vars) {
    var res = cs.rows.map(function (r) {
      var a = vars[r.v], b = fill(r.val, vars); if (a === undefined) return false;
      var na = parseFloat(a), nb = parseFloat(b);
      var sa = String(a);
      switch (r.op) { case 'Bằng': return sa === b; case 'Khác': return sa !== b; case 'Lớn hơn': return na > nb; case 'Từ': return na >= nb; case 'Nhỏ hơn': return na < nb; case 'Tối đa': return na <= nb;
        case 'Chứa': return sa.indexOf(b) >= 0; case 'Không chứa': return sa.indexOf(b) < 0; case 'Bắt đầu bằng': return sa.indexOf(b) === 0; case 'Kết thúc bằng': return sa.slice(-b.length) === b; case 'Trống': return !sa; case 'Không trống': return !!sa; }
      return false;
    });
    return cs.logic === 'OR' ? res.some(Boolean) : res.every(Boolean);
  }
  step(answer) {
    var self = this, s = this.state, r = s.run;
    if (!r || (r.status !== 'running' && r.status !== 'paused')) return;
    var n = this.byId(r.cur); if (!n) return;
    var c = n.cfg, vars = Object.assign({}, r.vars), note = '', out = 0, st = 'Thành công', stop = null, seed = parseInt(n.id.slice(1), 10) || 1, ms = msOf(n.type, seed);
    var queue = (r.queue || []).slice(), arr = Object.assign({}, r.arr || {}), loops = (r.loops || []).slice(), done = Object.assign({}, r.loopDone || {});
    var issues = errsOf(n, s).filter(function (m) { return m.indexOf('Tên node') < 0 && m.indexOf('song song') < 0 && m.indexOf('Nhánh "') !== 0 && m.indexOf('Bước này chưa nối') !== 0 && m.indexOf('Chỉ nhánh') !== 0; });
    var go = function (patch, delay) { self.setState({ run: Object.assign({}, r, { status: 'running', waitId: null }, patch) }); clearTimeout(self.timer); self.timer = setTimeout(function () { self.step(); }, delay || 650); };
    if (answer === '__timeout') {
      out = outsOf(n).indexOf('Timeout'); ms = 8010; note = 'Quá hạn ' + c.tmo + ' ' + c.tmoUnit + ', đi nhánh Hết hạn'; st = 'Hết hạn';
    } else if (answer !== undefined) {
      out = Math.max(0, humanOpts(c).indexOf(answer)); vars.decision = answer; vars.responder = 'Bạn (chạy thử)'; ms = 8010;
      c.fields.forEach(function (f) { if (f.name) vars[f.name] = f.def ? fill(f.def, vars) : (vars[f.name] !== undefined ? vars[f.name] : mockOf(f.name)); });
      note = 'Bạn chọn "' + answer + '" thay ' + (c.assignees.length > 1 ? c.assignees.length + ' người (' + (c.mode === 'all' ? 'All' : 'Any') + ')' : whoShort0(c.assignees)[0] || 'người nhận');
    } else if (n.type === 'human') {
      if (issues.length) stop = issues[0];
      else { this.setState({ run: Object.assign({}, r, { status: 'paused', tab: 'result', waitId: n.id, vars: vars }) }); return; }
    } else if (n.type === 'start') {
      vars.case_code = /mua s/i.test(c.cmd || '') ? 'PR-0142' : 'HS-2026-0193'; vars.initiator = 'Phạm Minh Khoa';
      note = 'Hồ sơ ' + vars.case_code + ' được tạo khi Initiator bấm Nộp · ' + c.inputs.filter(function (f) { return f.name; }).length + ' biến đầu vào';
    } else if (issues.length && TYPES[n.type].err) {
      var rt = parseInt(c.retry, 10) || 0; st = rt ? 'Lỗi sau ' + (rt + 1) + ' lần chạy' : 'Lỗi'; ms += rt * 1000;
      if (c.onErr === 'branch') { out = outsOf(n).indexOf('Failed'); note = issues[0] + '. Đi nhánh Khi lỗi.'; } else stop = issues[0] + (rt ? ' (đã chạy lại ' + rt + ' lần). Hồ sơ dừng, chủ Quy trình chạy lại từ bước lỗi' : '. Hồ sơ dừng, chủ Quy trình chạy lại từ bước lỗi');
    } else if (issues.length) {
      stop = issues[0];
    } else {
      switch (n.type) {
        case 'condition': out = c.cases.length; for (var i = 0; i < c.cases.length; i++) if (self.evalCase(c.cases[i], vars)) { out = i; break; } note = out < c.cases.length ? 'Đi nhánh "' + c.cases[out].name + '"' : 'Không điều kiện nào đúng, đi Else'; break;
        case 'worker': outputsOf(n).forEach(function (v) { if (vars[v] === undefined) vars[v] = mockOf(v); }); note = c.worker + ' nộp kết quả đúng schema: ' + outputsOf(n).join(', '); break;
        case 'agent': outputsOf(n).forEach(function (v) { if (vars[v] === undefined) vars[v] = mockOf(v); }); note = c.model + ' trả lời' + (c.output === 'json' ? ': ' + nm(c.props).join(', ') : ''); break;
        case 'tool': outputsOf(n).forEach(function (v) { vars[v] = mockOf(v); }); note = c.tool + ' chạy xong' + (c.acc === 'initiator' ? ' bằng tài khoản của người khởi chạy' : ''); break;
        case 'variable': vars[c.name] = c.op === 'clear' ? '' : c.op === 'append' ? (vars[c.name] ? vars[c.name] + ', ' : '') + fill(c.value, vars) : fill(c.value, vars); note = ({ set: 'Gán', append: 'Thêm vào cuối', parse: 'Đọc JSON', clear: 'Xoá' }[c.op]) + ': ' + c.name + (c.op === 'clear' ? '' : ' = ' + vars[c.name]); break;
        case 'wait': ms = 8010; note = (c.mode === 'until' ? 'Chờ tới ' + fill(c.at, vars) : 'Chờ ' + c.amount + ' ' + c.aunit) + ' rồi đi tiếp (chạy thử không chờ thật)'; break;
        case 'decision': var dv = evalDecision(c, vars); Object.keys(dv.vals).forEach(function (k) { vars[k] = dv.vals[k]; }); vars.matched_rules = dv.hits.join(', '); note = (dv.hits.length ? 'Khớp quy tắc ' + dv.hits.join(', ') : 'Không quy tắc nào khớp, dùng dòng Còn lại') + ': ' + Object.keys(dv.vals).map(function (k) { return k + ' = ' + dv.vals[k]; }).join(', '); break;
        case 'code': outputsOf(n).forEach(function (v) { vars[v] = mockOf(v); }); note = 'Python chạy xong: ' + outputsOf(n).map(function (k) { return k + ' = ' + vars[k]; }).join(', '); break;
        case 'loop':
          if (done[n.id]) { out = 1; note = c.mode === 'each' ? 'Lặp xong mọi phần tử (chạy thử chạy thân vòng một lần)' : 'Điều kiện "' + c.until + '" đúng, ra khỏi vòng'; delete done[n.id]; loops = loops.filter(function (x) { return x !== n.id; }); }
          else { out = 0; note = c.mode === 'each' ? 'Bắt đầu lặp qua ' + (c.list || 'danh sách') + ' · phần tử 1' : 'Vòng 1/' + c.max; vars.item = mockOf('item'); vars.index = '0'; loops.push(n.id); }
          break;
        case 'join': note = 'Đủ nhánh, đi tiếp'; break;
        default: note = 'Xong';
      }
    }
    if (n.type === 'join' && !stop) {
      var need = s.edges.filter(function (x) { return x.to === n.id; }).length; arr[n.id] = (arr[n.id] || 0) + 1;
      var hold = c.mode === 'all' ? arr[n.id] < need : arr[n.id] > 1;
      if (hold) {
        var nxt = queue.shift(), lg = r.log.concat([{ id: n.id, title: n.title, type: n.type, st: 'Thành công', note: c.mode === 'all' ? 'Đã xong ' + arr[n.id] + '/' + need + ' nhánh, chờ nhánh còn lại' : 'Đã có nhánh khác xong trước, bỏ nhánh này', ms: 4 }]);
        if (!nxt) { this.setState({ run: Object.assign({}, r, { log: lg, vars: vars, arr: arr }) }); this.finish(false, 'Dừng ở "' + n.title + '": còn nhánh chưa tới.'); return; }
        go({ log: lg, vars: vars, arr: arr, queue: queue, cur: nxt }); return;
      }
    }
    var log = r.log.concat([{ id: n.id, title: n.title, type: n.type, st: stop ? 'Lỗi' : st, note: stop || note, ms: ms }]);
    var last = Object.assign({}, s.last); last[n.id] = { st: stop ? 'Lỗi' : st, ms: ms, note: stop || note, out: JSON.stringify(outputsOf(n).reduce(function (o, k) { o[k] = vars[k] !== undefined ? vars[k] : null; return o; }, {}), null, 2) };
    var ran = r.ran.concat([n.id]);
    if (stop) { this.setState({ last: last, run: Object.assign({}, r, { log: log, ran: ran, failId: n.id, vars: vars }) }); this.finish(false, 'Dừng ở bước "' + n.title + '": ' + stop + '.'); return; }
    if (n.type === 'end') {
      this.setState({ last: last, run: Object.assign({}, r, { log: log, ran: ran, vars: vars }) });
      this.finish(c.status === 'completed', 'Hồ sơ ' + (vars.case_code || '') + ' đóng ở trạng thái ' + END_ST[c.status] + ' sau ' + ran.length + ' bước' + (c.message ? ': ' + c.message : '') + '. Initiator nhận thông báo qua chuông và email.');
      return;
    }
    var es = s.edges.filter(function (x) { return x.from === n.id && x.out === out; }), redges = r.redges.concat([n.id + ':' + out]);
    if (es.length > 1) queue = es.slice(1).map(function (x) { return x.to; }).concat(queue);
    var e = es[0];
    if (!e && queue.length) { go({ log: log, ran: ran, vars: vars, arr: arr, queue: queue.slice(1), cur: queue[0], redges: redges, loops: loops, loopDone: done }); return; }
    if (!e && loops.length) { var lid = loops[loops.length - 1]; done[lid] = true; go({ log: log, ran: ran, vars: vars, arr: arr, queue: queue, cur: lid, redges: redges, loops: loops, loopDone: done }); this.setState({ last: last }); return; }
    if (!e) { this.setState({ last: last, run: Object.assign({}, r, { log: log, ran: ran, vars: vars }) }); var lb = outsOf(n)[out]; this.finish(true, 'Chạy xong qua ' + ran.length + ' bước. Hồ sơ dừng sau "' + n.title + '"' + (lb ? ' (nhánh ' + lb + ')' : '') + ' vì chưa có bước tiếp theo.'); return; }
    if (loops.length) { var lTop = this.byId(loops[loops.length - 1]); if (lTop && loopAfter(lTop, s.edges).indexOf(e.to) >= 0) { loops = loops.slice(0, -1); delete done[lTop.id]; log[log.length - 1] = Object.assign({}, log[log.length - 1], { note: log[log.length - 1].note + ' · Thoát vòng "' + lTop.title + '"' }); } }
    this.setState({ last: last });
    go({ log: log, ran: ran, redges: redges, cur: e.to, vars: vars, queue: queue, arr: arr, loops: loops, loopDone: done });
  }
  runOne() {
    if (this.roStop()) return;
    var s = this.state, n = this.byId(s.sel); if (!n) return;
    var issues = issuesOf(n, s).filter(function (m) { return m !== 'Chưa có mũi tên đi vào'; });
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
    var warnCount = 0; issues.forEach(function (g) { g.msgs.forEach(function (m) { if (isWarn(m)) warnCount++; else issueCount++; }); if (g.title !== 'Quy trình') issueBy[g.id] = g.msgs; });
    var selNode = byId[s.sel] || null, showRun = s.runOpen && !!run, building = s.top === 'build' && s.section === 'flow';
    var startNode = s.nodes.filter(function (n) { return n.type === 'start'; })[0];

    DIR = s.dir || 'h';
    var linkTo = s.link && s.link.moved ? this.hitNode(s.link.mx, s.link.my, s.link.from.id) : null;
    var memOf = {}; s.nodes.forEach(function (L) { if (L.type === 'loop' && !L.parent) Object.keys(loopBody(L, s)).forEach(function (k) { memOf[k] = 1; }); });
    var fsig = DIR + '|' + s.nodes.map(function (x) { return x.id + ':' + x.type + ':' + outsOf(x).length + ':' + (x.type === 'loop' ? 0 : sizeOf(x).h); }).join(',') + '|' + s.edges.map(function (e) { return e.from + e.out + e.to; }).join(',');
    if (fsig !== FSIG) { layoutFlow({ nodes: clone(s.nodes), edges: s.edges }); FSIG = fsig; }
    var order = s.nodes.slice().sort(function (a, b) { var fa = a.type === 'loop' ? -(sizeOf(a).w * sizeOf(a).h) : 0, fb = b.type === 'loop' ? -(sizeOf(b).w * sizeOf(b).h) : 0; return fa - fb; });
    var viewNodes = order.map(function (n) {
      var t = TYPES[n.type], z = sizeOf(n), col = colOf(n.type), isSel = s.sel === n.id;
      var ran = run && run.ran.indexOf(n.id) >= 0, cur = run && run.cur === n.id && run.status === 'running', wait = run && run.status === 'paused' && run.waitId === n.id, fail = run && run.failId === n.id;
      var need = (issueBy[n.id] || []).some(function (m) { return !isWarn(m); }), ring = '';
      if (isSel || cur || (linkTo && linkTo.id === n.id)) ring = '#203BDC'; if (ran && !fail) ring = '#16a34a'; if (wait) ring = '#ea580c'; if (fail) ring = '#dc2626';
      var badge = '', bfg = '', bbg = '', bl = '';
      if (need) { badge = 'ⓘ Cần cấu hình'; bfg = '#616161'; bbg = '#fff'; bl = '#d4d4d8'; }
      if (ran) { badge = '✓ ' + (s.last[n.id] ? s.last[n.id].ms.toLocaleString('vi-VN') + ' ms' : 'Đã chạy'); bfg = '#15803d'; bbg = '#f0fdf4'; bl = '#bbf7d0'; }
      if (wait) { badge = 'Đang chờ trả lời'; bfg = '#c2410c'; bbg = '#fff7ed'; bl = '#fed7aa'; }
      if (fail) { badge = 'Lỗi'; bfg = '#b91c1c'; bbg = '#fef2f2'; bl = '#fecaca'; }
      var o = outsOf(n), br = branchy(n), sub = subOf(n), isLp = n.type === 'loop' && !n.parent, hp = hdrPort(n);
      var outs = [];
      if (n.parent) {
        var lp = byId[n.parent], larr = lp ? innerArr(lp, n) : [], last = larr[larr.length - 1] === n.id;
        if (last) { var op0 = outPt(n, 0); outs = [{ dx: -100, dy: -100, dot: 'transparent', cls: 'oplus' + (ro ? ' ro-hide' : ''), aria: 'Thêm bước sau ' + n.title + (lp.type === 'parallel' ? ' trong nhánh' : ' trong vòng lặp'), px: DIR === 'h' ? op0.x + 6 : op0.x - 11, py: DIR === 'h' ? op0.y - 11 : op0.y + 6, down: function (e) { e.stopPropagation(); }, plus: function (e) { e.stopPropagation(); self.setState({ sel: n.id }); self.openAdd({ mode: 'inner', loopId: n.parent, lane: n.lane || 0 }); } }]; }
      } else {
        outs = o.map(function (lbl, i) {
          var op = outPt(n, i), isErr = isExc(lbl);
          return { dx: op.x - 4, dy: op.y - 4, dot: isErr ? '#f59e0b' : '#242424', cls: 'oplus' + (isErr ? ' oplus-err' : '') + (ro ? ' ro-hide' : ''), aria: 'Thêm bước sau ' + n.title + (lbl ? ' - nhánh ' + lbl : '') + '. Kéo để nối tới bước khác.',
            px: DIR === 'h' ? op.x + 6 : op.x - 11, py: DIR === 'h' ? op.y - 11 : op.y + 6,
            down: function (e) { self.startLink(e, n.id, i); },
            plus: function (e) { e.stopPropagation(); if (self.justLinked) { self.justLinked = false; return; } self.setState({ sel: n.id, tab: 'cfg', runOpen: false, panel: null }); self.openAdd({ from: { id: n.id, out: i } }); } };
        });
      }
      var ip = inPt(n);
      return { id: n.id, x: n.x, y: n.y, w: z.w, h: z.h, title: n.title, icon: t.icon, tile: col[0], tileBg: col[1],
        isNote: n.type === 'note', isCard: n.type !== 'note', noteText: n.cfg.text || '', isLoop: isLp, loopEmpty: isLp && frameOf(n).empty && !ro, isPar: false,
        chipX: 16, chipY: isLp ? (DIR === 'h' ? frameOf(n).cy - 13 : LHEAD + 10) : 0, chipLabel: isLp ? (n.cfg.mode === 'each' ? 'Mỗi mục' : 'Mỗi vòng') : '',
        lpPorts: isLp ? o.slice(1).map(function (l, k) { var op = outPt(n, k + 1); return { label: l === 'Xong' ? 'XONG' : (PORT_VI[l] || l), fg: isExc(l) ? '#b45309' : '#475569', x: DIR === 'h' ? op.x - 96 : op.x - 44, y: DIR === 'h' ? op.y - 9 : op.y - 24, w: 84, align: DIR === 'h' ? 'right' : 'center' }; }) : [],
        emptyX: isLp ? 16 + LCHIP + 40 : 0, emptyY: isLp ? frameOf(n).cy - 17 : 0,
        addFirst: function (e) { e.stopPropagation(); self.setState({ sel: n.id, tab: 'cfg', runOpen: false, panel: null }); self.openAdd({ from: { id: n.id, out: 0 } }); },
        lanes: false ? n.cfg.branches.map(function (b, li) { var p0 = innerPos(n, 0, li); return { label: b.name || ('Nhánh ' + (li + 1)), lx: DIR === 'h' ? 16 : p0.x, ly: DIR === 'h' ? p0.y + H / 2 - 9 : 66, lw: DIR === 'h' ? 100 : W, empty: !(b.inner || []).length && !ro, px: p0.x + W / 2 - 11, py: p0.y + H / 2 - 11, aria: 'Thêm bước vào nhánh ' + (b.name || li + 1), add: function (e) { e.stopPropagation(); self.setState({ sel: n.id }); self.openAdd({ mode: 'inner', loopId: n.id, lane: li }); } }; }) : [],
        addInner: function (e) { e.stopPropagation(); self.setState({ sel: n.id }); self.openAdd({ mode: 'inner', loopId: n.id }); },
        pills: br ? o.slice(hp ? 1 : 0).map(function (l, pi) { var lab = PORT_VI[l] || l || 'Tiếp theo', warn = isExc(l) || l === 'Từ chối'; return { label: lab, flex: DIR === 'v' ? '1' : 'none', fg: warn ? '#b45309' : '#3f3f46', bg: warn ? '#fff8eb' : '#f6f6f8', arrow: warn ? '#d6a35c' : '#a1a1aa' }; }) : [],
        pillDir: DIR === 'v' ? 'row' : 'column', pillPad: br ? '8px 12px 10px' : '0', headLine: br ? '1px solid #ececef' : 'none', headW: isLp ? 'calc(100% - 110px)' : '100%',
        hasSub: !badge && !!sub, sub: sub,
        bg: n.type === 'note' ? '#fff8c5' : (isLp ? 'rgba(239,241,253,.45)' : '#fff'),
        border: isLp ? (ring ? '2px dashed ' + ring : '1.5px dashed #aab3d6') : (ring ? '2px solid ' + ring : '1px solid ' + (n.type === 'note' ? '#f0d86e' : '#e2e3e8')),
        radius: n.type === 'note' ? 6 : (isLp ? 16 : (br ? 18 : 28)),
        shadow: isLp ? 'none' : (isSel ? '0 0 0 4px rgba(32,59,220,.10), 0 2px 8px rgba(15,23,42,.08)' : '0 1px 2px rgba(15,23,42,.06), 0 2px 8px rgba(15,23,42,.04)'),
        cls: 'qn' + (isSel ? ' qn-sel' : '') + (cur ? ' running' : (wait ? ' waiting' : '')),
        badge: !!badge, badgeText: badge, badgeFg: bfg, badgeBg: bbg, badgeLine: bl,
        hasIn: n.type !== 'start' && n.type !== 'note' && !n.parent, inX: ip.x - 4, inYp: ip.y - 4, outs: outs,
        canDel: n.type !== 'start' && !locked, canRun: n.type !== 'note' && n.type !== 'start' && !locked, runAria: 'Chạy riêng bước ' + n.title, delAria: 'Xoá bước ' + n.title,
        run: function (e) { e.stopPropagation(); self.setState({ sel: n.id, tab: 'last', runOpen: false, panel: null }); setTimeout(function () { self.runOne(); }, 0); },
        del: function (e) { e.stopPropagation(); self.removeNode(n.id); },
        ctx: function (e) { e.preventDefault(); e.stopPropagation(); var r = self.canvasEl && self.canvasEl.getBoundingClientRect ? self.canvasEl.getBoundingClientRect() : { left: 0, top: 0 }; self.setState({ ctx: { id: n.id, x: e.clientX - r.left, y: e.clientY - r.top }, sel: n.id, tab: 'cfg', runOpen: false, panel: null }); },
        down: function (e) { self.startDrag(e, n.id, !!memOf[n.id]); },
        select: function () { self.setState({ sel: n.id, tab: 'cfg', runOpen: false, add: null, panel: null }); } };
    });

    var d = '', ed = '', rd = '', bd = '', tmpD = '', edgeDel = [], edgeTags = [];
    var ranHas = function (a, b) { return run && run.ran.indexOf(a) >= 0 && run.ran.indexOf(b) >= 0; };
    s.edges.forEach(function (e) {
      var a = byId[e.from], b = byId[e.to]; if (!a || !b) return;
      var pa = absPt(a, outPt(a, e.out)), pb = absPt(b, inPt(b)), bz = bez(pa, pb), lbl = outsOf(a)[e.out];
      var isBack = DIR === 'h' ? pb.x < pa.x - 10 : pb.y < pa.y - 10;
      if (isBack) {
        var za = sizeOf(a), zb = sizeOf(b), pts;
        if (DIR === 'h') { var low = Math.max(a.y + za.h, b.y + zb.h) + 28; pts = [[pa.x, pa.y], [pa.x + 18, pa.y], [pa.x + 18, low], [pb.x - 18, low], [pb.x - 18, pb.y], [pb.x, pb.y]]; bz = { d: roundPath(pts, 10) + ' ', m: { x: (pa.x + pb.x) / 2, y: low } }; }
        else { var rt = Math.max(a.x + za.w, b.x + zb.w) + 28; pts = [[pa.x, pa.y], [pa.x, pa.y + 18], [rt, pa.y + 18], [rt, pb.y - 18], [pb.x, pb.y - 18], [pb.x, pb.y]]; bz = { d: roundPath(pts, 10) + ' ', m: { x: rt, y: (pa.y + pb.y) / 2 } }; }
      }
      if (run && run.redges.indexOf(e.from + ':' + e.out) >= 0) rd += bz.d; else if (isBack) bd += bz.d; else if (isExc(lbl)) ed += bz.d; else d += bz.d;
      if (exitLoopOf(e, s)) edgeTags.push({ x: bz.m.x - 34, y: bz.m.y - 24, label: 'Thoát vòng' });
      if (!locked && building) edgeDel.push({ x: bz.m.x - 11, y: bz.m.y - 11, cls: 'edel', aria: 'Xoá kết nối từ ' + a.title + ' tới ' + b.title,
        pick: function (ev) { ev.stopPropagation(); self.commit(self.state.nodes, self.state.edges.filter(function (x) { return !(x.from === e.from && x.out === e.out && x.to === e.to); }), {}); } });
    });
    s.nodes.forEach(function (l) {
      if (l.type !== 'loop' || !(l.cfg.inner || []).length) return;
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
      var pick0 = s.vpick || '';
      // Bộ chọn dữ liệu: gõ / hoặc bấm {x} để chèn biến hệ thống hoặc dữ liệu từ bước trước
      var vGroups = function (key, kind) {
        var groups = [{ g: 'Hệ thống', items: SYSVARS.map(function (x) { return { v: '@' + x.v, l: '@' + x.v, d: x.t + ' · ' + x.d }; }) }], byStep = {};
        up.forEach(function (o) { var st = o.l.split(' · ').slice(1).join(' · ') || 'Bước trước'; if (!byStep[st]) { byStep[st] = { g: st, items: [] }; groups.push(byStep[st]); } byStep[st].items.push({ v: '@' + o.v, l: '@' + o.v, d: '' }); });
        return groups.map(function (gr) { return { g: gr.g, items: gr.items.map(function (it) { return Object.assign(it, { hasD: !!it.d, pick: function () { var cur = self.byId(n.id).cfg, p = {}; if (kind === 'arg') { var a2 = Object.assign({}, cur.args || {}); a2[key] = (a2[key] || '') + it.v; p.args = a2; } else p[key] = (cur[key] || '') + it.v; self.updateCfg(p); self.setState({ vpick: '' }); } }); }) }; });
      };
      var BASEF = { isInput: false, isSelect: false, isText: false, isToggle: false, isRadio: false, isNum: false, isChecks: false, isChips: false, isEditor: false, isSec: false, isCard: false, isConfirm: false, isStatic: false,
        hasLabel: true, label: '', req: false, ph: '', hint: '', options: [], opts: [], value: '', checked: false, ro: false, font: 'inherit', canVar: false, vOpen: false, vGroups: [], rows: 4,
        hasUnit: false, units: [], unit: '', dir: 'column', items: [], picking: false, chips: [], pickList: [], q: '', staticText: '' };
      var P = function (key, label, kind, extra) {
        var e = extra || {}, vk = e.vkey || key, vkind = e.vkind || 'cfg';
        var f = Object.assign({}, BASEF, { id: 'f-' + key, label: label, isInput: kind === 'input', isSelect: kind === 'select', isText: kind === 'text', isToggle: kind === 'toggle', isNum: kind === 'num', value: c[key], checked: !!c[key],
          onChange: function (ev) { var p = {}; p[key] = ev.target.value; self.updateCfg(p); },
          onToggle: function () { var p = {}; p[key] = !self.byId(n.id).cfg[key]; self.updateCfg(p); },
          insertVar: function () { self.setState({ vpick: pick0 === n.id + ':' + vk ? '' : n.id + ':' + vk }); } }, e);
        f.padR = f.canVar ? '34px' : '10px';
        if (f.canVar) { f.vOpen = pick0 === n.id + ':' + vk; if (f.vOpen) f.vGroups = vGroups(vk, vkind); }
        if (kind === 'num') {
          var mn = e.min === undefined ? 0 : e.min, mx = e.max === undefined ? 999 : e.max, step = function (d) { var v = parseInt(self.byId(n.id).cfg[key], 10); if (isNaN(v)) v = mn; v = Math.max(mn, Math.min(mx, v + d)); var p = {}; p[key] = String(v); self.updateCfg(p); };
          f.dec = function () { step(-1); }; f.inc = function () { step(1); }; f.decNot = (parseInt(c[key], 10) || 0) <= mn; f.incNot = (parseInt(c[key], 10) || 0) >= mx;
          if (e.unitKey) { f.hasUnit = true; f.unit = c[e.unitKey]; f.units = opt(e.units || ['phút', 'giờ', 'ngày']); f.onUnit = function (ev) { var p = {}; p[e.unitKey] = ev.target.value; self.updateCfg(p); }; }
        }
        return f;
      };
      // Chọn một: thẻ có mô tả (dọc) hoặc nút gọn (ngang). Mục Sắp có bị khoá
      var R = function (key, label, options, extra) {
        var e = extra || {}, cur = e.value !== undefined ? e.value : c[key];
        return Object.assign({}, BASEF, { id: 'f-' + key, label: label, isRadio: true, dir: e.row ? 'row' : 'column',
          opts: options.map(function (o) { var on = cur === o.v; return { l: o.l, d: o.d || '', hasD: !!o.d, soon: !!o.soon, on: on, dis: !!o.soon, cur: o.soon ? 'not-allowed' : 'pointer', flex: e.row ? '1' : 'none', bd: on ? '#203BDC' : '#e3e1dc', bg: on ? '#f3f5fe' : '#fff', fg: o.soon ? '#9a9aa3' : '#121216', dot: on ? '#203BDC' : '#c4c4cc', dotIn: on ? '#203BDC' : 'transparent',
            pick: function () { if (o.soon || on) return; if (e.onPick) { e.onPick(o.v); return; } var p = {}; p[key] = o.v; self.updateCfg(p); } }; }) }, e.f || {});
      };
      // Chọn nhiều có mô tả (Cách gửi)
      var CK = function (key, label, options, extra) {
        var arr = c[key] || [];
        return Object.assign({}, BASEF, { id: 'f-' + key, label: label, isChecks: true, req: !!(extra && extra.req),
          opts: options.map(function (o) { var on = arr.indexOf(o.v) >= 0; return { l: o.l, d: o.d || '', hasD: !!o.d, soon: !!o.soon, on: on, dis: !!o.soon, cur: o.soon ? 'not-allowed' : 'pointer', fg: o.soon ? '#9a9aa3' : '#121216',
            toggle: function () { if (o.soon) return; var a = (self.byId(n.id).cfg[key] || []).slice(), i = a.indexOf(o.v); if (i >= 0) a.splice(i, 1); else a.push(o.v); var p = {}; p[key] = a; self.updateCfg(p); } }; }) }, (extra && extra.f) || {});
      };
      // Chip người: @Initiator và người trong tổ chức
      var PPL = function (key, label, extra) {
        var arr = c[key] || [], pk = s.picking === n.id + ':' + key, q = norm(String(s.pickQ || '').replace(/^@/, '')).trim();
        var pool = [INIT].concat(dirPeople()).filter(function (p) { return arr.indexOf(p) < 0 && (!q || norm(p).indexOf(q) >= 0); }).slice(0, 12);
        return Object.assign({}, BASEF, { id: 'f-' + key, label: label, isChips: true, req: !!(extra && extra.req), hint: (extra && extra.hint) || '', picking: pk, q: s.pickQ || '',
          chips: arr.map(function (p, i) { return { l: p === INIT ? '@Initiator' : p.split(' · ')[0], t: p === INIT ? 'Người khởi chạy hồ sơ' : p, rm: function () { var pp = {}; pp[key] = arr.filter(function (_, j) { return j !== i; }); self.updateCfg(pp); }, rmAria: 'Bỏ ' + p }; }),
          pickList: pool.map(function (p) { return { l: p === INIT ? '@Initiator' : p.split(' · ')[0], d: p === INIT ? 'Người khởi chạy hồ sơ' : p.split(' · ').slice(1).join(' · '), hasD: true, pick: function () { var pp = {}; pp[key] = (self.byId(n.id).cfg[key] || []).concat([p]); self.updateCfg(pp); self.setState({ picking: null, pickQ: '' }); } }; }),
          noPick: !pool.length, togglePick: function () { self.setState({ picking: pk ? null : n.id + ':' + key, pickQ: '' }); }, onQ: function (ev) { self.setState({ pickQ: ev.target.value }); } });
      };
      var SEC = function (title, hint) { return Object.assign({}, BASEF, { isSec: true, hasLabel: false, label: title, hint: hint || '' }); };
      var ST = function (text) { return Object.assign({}, BASEF, { isStatic: true, hasLabel: false, staticText: text }); };
      // Bộ sửa danh sách: mỗi phần tử {name, desc|value|expr}
      var LE = function (key, title, o) {
        o = o || {}; var arr = c[key] || [];
        return Object.assign({}, BASEF, { isEditor: true, hasLabel: false, label: title, hasB: o.hasB !== false, addLabel: o.addLabel || '+ Thêm', hasNote: !!o.note, note: o.note || '',
          items: arr.map(function (it, i) {
            var set = function (p) { var a2 = (self.byId(n.id).cfg[key] || []).slice(); a2[i] = Object.assign({}, a2[i], p); var pp = {}; pp[key] = a2; self.updateCfg(pp); };
            return { a: it[o.aKey || 'name'], b: it[o.bKey || 'desc'], aPh: o.aPh || 'ten_bien', bPh: o.bPh || 'Mô tả', aAria: (o.aPh || 'Tên') + ' ' + (i + 1), bAria: (o.bPh || 'Giá trị') + ' ' + (i + 1), aFont: o.mono === false ? 'inherit' : 'ui-monospace, SFMono-Regular, Menlo, monospace',
              hasTag: !!it.t, tag: it.t || '', hasReq: !!o.req, req: it.req !== false, reqAria: 'Bắt buộc ' + (it.name || i + 1), onReq: function () { set({ req: it.req === false }); }, lock: (o.min || 0) >= arr.length,
              hasEdit: !!o.edit, edit: function () { if (o.edit) o.edit(i); },
              onA: function (ev) { var p = {}; p[o.aKey || 'name'] = o.mono === false ? ev.target.value : ev.target.value.replace(/\s+/g, '_'); set(p); },
              onB: function (ev) { var p = {}; p[o.bKey || 'desc'] = ev.target.value; set(p); },
              remove: function () { var pp = {}; pp[key] = (self.byId(n.id).cfg[key] || []).filter(function (_, j) { return j !== i; }); self.updateCfg(pp); } };
          }),
          add: o.add || function () { var pp = {}; pp[key] = (self.byId(n.id).cfg[key] || []).concat([o.blank ? o.blank(arr.length) : { name: '', desc: '' }]); self.updateCfg(pp); } });
      };
      var openVar = function (key, idx) { var it = idx >= 0 ? c[key][idx] : null; self.setState({ varModal: { nodeId: n.id, key: key, idx: idx, t: it ? it.t : 'Văn bản', name: it ? it.name : '', def: it ? (it.def || '') : '', desc: it ? (it.desc || '') : '', req: it ? it.req !== false : true, err: '' } }); };
      var OUTS = function () { pf.push(LE('outs', 'OUTPUTS', { aPh: 'ten_bien', bPh: 'Giá trị, VD @' + keyOf(n) + '.text', bKey: 'expr', addLabel: '+ Thêm output', note: 'Đặt tên cho dữ liệu bước sau cần dùng. Gõ / trong ô giá trị để chèn dữ liệu.', blank: function () { return { name: '', expr: '' }; } })); };
      var UPD = function () { pf.push(LE('upd', 'UPDATE VARIABLES', { aPh: 'Biến', bPh: 'Giá trị mới', bKey: 'value', addLabel: '+ Cập nhật biến', note: 'Ghi đè biến đã có, VD đổi @total sau khi người duyệt sửa.', blank: function () { return { name: '', value: '' }; } })); };
      var TMO = function (hint) { pf.push(P('tmoOn', 'Timeout', 'toggle', { ph: hint })); if (c.tmoOn) pf.push(P('tmo', 'Thời gian chờ tối đa', 'num', { min: 1, max: 720, unitKey: 'tmoUnit', units: ['phút', 'giờ', 'ngày'], hint: 'Tối đa 30 ngày. Hết hạn thì đi cổng HẾT HẠN.' })); };
      var RETRY = function () { pf.push(P('retry', 'Retry', 'num', { min: 0, max: 5, hint: 'Retry ' + (parseInt(c.retry, 10) || 0) + ' = tối đa ' + ((parseInt(c.retry, 10) || 0) + 1) + ' lần chạy.' })); };
      var ONERR = function () { pf.push(R('onErr', 'Xử lý lỗi', [{ v: 'none', l: 'Không', d: 'Bước lỗi thì hồ sơ dừng ở bước này' }, { v: 'default', l: 'Giá trị mặc định', d: 'Dùng giá trị định sẵn rồi đi tiếp', soon: 1 }, { v: 'branch', l: 'Nhánh lỗi', d: 'Thêm cổng KHI LỖI để xử lý riêng' }])); };
      var OUTFMT = function () {
        pf.push(R('output', 'Kiểu output', [{ v: 'text', l: 'Trả lời dạng văn bản' }, { v: 'json', l: 'Kết quả có cấu trúc' }], { row: true }));
        if (c.output === 'json') pf.push(LE('props', 'THUỘC TÍNH', { aPh: 'ten_thuoc_tinh', bPh: 'Mô tả cho model', addLabel: '+ Thêm thuộc tính', blank: function () { return { name: '', t: 'Văn bản', desc: '', req: true }; } }));
      };
      var VIAOPTS = function (desc) { return VIA.map(function (v) { return { v: v, l: v, d: desc[v] }; }).concat([{ v: 'Teams', l: 'Teams', d: 'Gửi qua Microsoft Teams', soon: 1 }]); };
      var MODELS = [{ v: '', l: 'Chọn model' }].concat(opt(['DeepSeek V4.1 Flash', 'DeepSeek V4 Flash 0731', 'Gemma 4 26B A4B IT', 'Qwen 3.6 35B A3B', 'Qwen 3.8 27B'])), help = '';
      switch (n.type) {
        case 'start':
          help = 'Hồ sơ bắt đầu khi người dùng gọi Quy trình bằng / trong cuộc chat. Agent điền sẵn biến đầu vào từ cuộc chat, người dùng kiểm tra rồi bấm Nộp.';
          pf.push(R('trigger', 'Loại trigger', TRIGGERS.map(function (x) { return { v: x.id, l: x.name, d: x.desc, soon: x.soon }; })));
          pf.push(LE('inputs', 'BIẾN ĐẦU VÀO', { hasB: false, addLabel: '+ Thêm biến', req: true, edit: function (i) { openVar('inputs', i); }, add: function () { openVar('inputs', -1); }, note: 'Agent điền các biến này từ cuộc chat và hỏi phần còn thiếu. Biến bắt buộc phải có giá trị thì mới Nộp được.' }));
          pf.push(LE('outputs', 'ĐẦU RA', { aPh: 'ten_bien', bPh: 'Giá trị, VD @po_code', bKey: 'expr', addLabel: '+ Thêm đầu ra', note: 'Kết quả Quy trình trả về khi hồ sơ đóng.', blank: function () { return { name: '', expr: '' }; } }));
          pf.push(P('deadline', 'Hạn của quy trình', 'toggle', { ph: 'Quá hạn mà hồ sơ chưa đóng thì hồ sơ dừng ở trạng thái Failed.' }));
          if (c.deadline) pf.push(P('dAmount', 'Hồ sơ phải xong trong', 'num', { min: 1, max: 365, unitKey: 'dUnit', units: ['giờ', 'ngày'] }));
          break;
        case 'agent':
          help = 'Một lần gọi model: không có tool, không nói chuyện với người. Cần tool hoặc hội thoại thì dùng node Agent.';
          pf.push(P('model', 'Model', 'select', { req: true, options: MODELS }));
          pf.push(P('system', 'System prompt', 'text', { ph: 'VD: Bạn soạn email nhắc nhà cung cấp, lịch sự, ngắn gọn.', canVar: true }));
          pf.push(P('instructions', 'User prompt', 'text', { req: true, ph: 'Gõ / để chèn dữ liệu. VD: Soạn email nhắc @vendor gửi báo giá cho @case.', canVar: true }));
          OUTFMT(); OUTS(); UPD();
          pf.push(SEC('THỬ LẠI VÀ XỬ LÝ LỖI')); RETRY(); ONERR();
          break;
        case 'worker':
          help = 'Giao một bước cho agent như một hộp đen. Agent có thể hỏi người hỗ trợ qua Action Center. Thứ cần đúng tuyệt đối thì đặt ở DMN Table, Code hoặc Human Review.';
          pf.push(R('kind', 'Loại agent', [{ v: 'platform', l: 'Platform Agent', d: 'Nhân sự số đã publish trong Space' }, { v: 'a2a', l: 'External Agent (A2A)', d: 'Agent bên ngoài nói chuyện qua giao thức A2A', soon: 1 }], { row: true }));
          pf.push(P('worker', 'Agent', 'select', { req: true, options: [{ v: '', l: 'Chọn agent' }].concat(dirAgents().map(function (a) { return { v: a.name, l: a.name + (a.ver ? ' · ' + a.ver : '') }; })), hint: 'Mỗi lượt chạy dùng bản đã duyệt mới nhất của agent.' }));
          pf.push(P('task', 'Hướng dẫn', 'text', { req: true, ph: 'Gõ / để chèn dữ liệu. VD: Xin báo giá từ ít nhất 3 NCC cho @items và đề xuất NCC.', canVar: true }));
          OUTFMT();
          pf.push(SEC('NHỜ NGƯỜI HỖ TRỢ', 'Khi thiếu thông tin, agent gửi câu hỏi cho người hỗ trợ và chờ trả lời.'));
          pf.push(PPL('helpers', 'Người hỗ trợ', { req: true }));
          pf.push(CK('helpVia', 'Cách gửi', VIAOPTS(VIA_DESC), { req: true }));
          OUTS(); UPD();
          pf.push(SEC('THỜI HẠN VÀ XỬ LÝ LỖI'));
          TMO('Tính cả thời gian chờ người trả lời.'); ONERR();
          break;
        case 'human':
          help = 'Giao việc cho người trong tổ chức. Việc hiện trong Action Center của Workspace, mỗi kết quả đi một nhánh.';
          pf.push(R('variant', 'Loại việc', [{ v: 'approval', l: 'Quick Approval', d: 'Duyệt, Trả lại hoặc Từ chối' }, { v: 'choice', l: 'Choice', d: 'Chọn một trong các lựa chọn, mỗi lựa chọn một nhánh' }]));
          if (c.variant !== 'choice') pf.push(P('allowReturn', 'Cho phép Trả lại', 'toggle', { ph: 'Có thêm nhánh Trả lại để người gửi sửa rồi gửi lại.' }));
          pf.push(PPL('assignees', 'Người được giao', { req: true, hint: 'Chỉ giao được cho người trong tổ chức của bạn.' }));
          pf.push(R('mode', 'Cách giao việc', [{ v: 'any', l: 'Any', d: 'Một người xử lý là xong' }, { v: 'all', l: 'All', d: 'Mọi người đều phải xử lý' }], { row: true }));
          pf.push(CK('via', 'Cách gửi', VIAOPTS(VIA_DESC), { req: true }));
          pf.push(P('title', 'Tiêu đề', 'input', { req: true, ph: 'VD: Duyệt đề nghị @case - @total', canVar: true }));
          pf.push(P('message', 'Message', 'text', { ph: 'Mô tả việc cần xử lý. Gõ / để chèn dữ liệu.', canVar: true }));
          if (c.variant === 'choice') pf.push(LE('choices', 'LỰA CHỌN', { aPh: 'Tên lựa chọn', hasB: false, mono: false, addLabel: '+ Thêm lựa chọn', min: 2, blank: function (k) { return { name: 'Lựa chọn ' + (k + 1), desc: '' }; } }));
          pf.push(LE('fields', 'INPUTS', { aPh: 'ten_truong', bPh: 'Giá trị điền sẵn, VD @total', bKey: 'def', addLabel: '+ Thêm input', note: 'Người được giao điền hoặc sửa các trường này khi xử lý việc.', blank: function () { return { name: '', t: 'Văn bản', desc: '', def: '', req: true }; } }));
          OUTS(); UPD();
          TMO('Hết thời gian mà chưa ai xử lý thì đi cổng HẾT HẠN.');
          break;
        case 'tool':
          help = 'Chạy một thao tác trên ứng dụng đã kết nối ở Console. Thao tác Ghi cần một bước Human Review duyệt ngay trước.';
          var curConn = c.conn || connOf(c.tool), tl0 = toolOf(c);
          pf.push(P('conn', 'Ứng dụng', 'select', { req: true, value: curConn, options: [{ v: '', l: 'Chọn ứng dụng' }].concat(CONNS.map(function (x) { return { v: x.name, l: x.name }; })), onChange: function (ev) { self.updateCfg({ conn: ev.target.value, tool: '', args: {} }); } }));
          pf.push(P('tool', 'Thao tác', 'select', { req: true, options: [{ v: '', l: curConn ? 'Chọn thao tác' : 'Chọn ứng dụng trước' }].concat(TOOLS.filter(function (x) { return connOf(x.name) === curConn; }).map(function (x) { return { v: x.name, l: actOf(x.name) + (x.write ? ' · Ghi' : ' · Đọc') }; })), hint: tl0 ? tl0.desc + (tl0.write ? '. Thao tác Ghi: cần Human Review duyệt ngay trước.' : '.') : '', onChange: function (ev) { self.setTool(n.id, ev.target.value); } }));
          pf.push(R('acc', 'Credential', [{ v: 'process', l: 'Dùng chung', d: 'Tài khoản người dựng đã kết nối' }, { v: 'initiator', l: 'Cá nhân', d: 'Tài khoản của người khởi chạy' }], { row: true }));
          if (tl0 && tl0.args.length) {
            pf.push(SEC('THAM SỐ'));
            tl0.args.forEach(function (a) { pf.push(P('arg-' + a, a, 'input', { req: true, value: (c.args || {})[a] || '', font: 'inherit', ph: 'Gõ / để chèn dữ liệu', canVar: true, vkey: a, vkind: 'arg', onChange: function (ev) { var a2 = Object.assign({}, self.byId(n.id).cfg.args || {}); a2[a] = ev.target.value; self.updateCfg({ args: a2 }); } })); });
          }
          OUTS(); UPD();
          pf.push(SEC('THỬ LẠI VÀ THỜI HẠN')); RETRY(); TMO('Thao tác chạy quá lâu thì đi cổng HẾT HẠN.');
          break;
        case 'wait':
          help = 'Dừng hồ sơ rồi tự đi tiếp. Không chờ người, không chờ sự kiện.';
          pf.push(R('mode', 'Chờ', [{ v: 'delay', l: 'Trong một khoảng' }, { v: 'until', l: 'Đến một mốc' }], { row: true }));
          if (c.mode === 'until') pf.push(P('at', 'Đến', 'input', { req: true, ph: 'VD: @delivery_date 08:00', canVar: true, hint: 'Nếu mốc đã qua, quy trình đi tiếp ngay. Giờ Việt Nam (GMT+7).' }));
          else pf.push(P('amount', 'Thời lượng', 'num', { req: true, min: 1, max: 720, unitKey: 'aunit', units: ['phút', 'giờ', 'ngày'], hint: 'Tối đa 30 ngày.' }));
          break;
        case 'decision':
          help = 'Bảng luật nghiệp vụ: mỗi dòng là một quy tắc, cột KHI là điều kiện, cột THÌ là kết quả. Đổi quy chế thì sửa bảng, không cần dev.';
          var dErr = issueBy[n.id] || [];
          pf.push(Object.assign({}, BASEF, { isCard: true, hasLabel: false, cardHit: { unique: 'Duy nhất', first: 'Đầu tiên', collect: 'Tất cả' }[c.hit], cardMeta: c.cols.length + ' điều kiện · ' + c.res.length + ' kết quả · ' + c.rules.length + ' quy tắc', cardErr: dErr.filter(function (x) { return !isWarn(x); }).length ? dErr.filter(function (x) { return !isWarn(x); }).length + ' lỗi cần sửa trong bảng' : '', hasCardErr: dErr.filter(function (x) { return !isWarn(x); }).length > 0,
            cardRules: c.rules.slice(0, 3).map(function (r, i) { return { t: (i + 1) + '. Khi ' + c.cols.map(function (col, k) { return col.name + ' ' + (String(r.cells[k] || '').trim() || 'bất kỳ'); }).join(', ') + ' thì ' + c.res.map(function (rs, k) { return rs.name + ' = ' + (r.vals[k] || '...'); }).join(', ') }; }), moreRules: c.rules.length > 3, moreText: '+ ' + (c.rules.length - 3) + ' quy tắc nữa',
            openTable: function () { self.setState({ dmn: n.id, dmnCol: null, dmnMenu: null }); } }));
          UPD();
          break;
        case 'join':
          help = 'Gộp các nhánh chạy song song. Sau Join, dữ liệu do mọi nhánh tạo ra đều dùng được.';
          pf.push(R('mode', 'Chờ', [{ v: 'all', l: 'Chờ tất cả', d: 'Đi tiếp khi mọi nhánh đã xong' }, { v: 'any', l: 'Chờ nhánh đầu tiên', d: 'Các nhánh còn lại bị huỷ' }]));
          break;
        case 'code':
          help = 'Python trong sandbox, không có mạng. Tham số truyền vào hàm main, giá trị return dùng cho Outputs.';
          pf.push(LE('params', 'THAM SỐ', { aPh: 'ten_tham_so', bPh: 'Giá trị, VD @total', bKey: 'value', addLabel: '+ Thêm tham số', blank: function () { return { name: '', value: '' }; } }));
          pf.push(P('code', 'Code (Python)', 'text', { req: true, rows: 7, ph: 'def main(total):\n    return {"vat": total * 0.1}', font: 'ui-monospace, SFMono-Regular, Menlo, monospace' }));
          OUTS(); UPD();
          break;
        case 'variable':
          help = 'Gán hoặc đổi giá trị một biến để các bước sau dùng.';
          pf.push(R('op', 'Thao tác', [{ v: 'set', l: 'Gán', d: 'Đặt giá trị, tạo biến nếu chưa có' }, { v: 'append', l: 'Thêm vào cuối', d: 'Thêm một phần tử vào cuối danh sách' }, { v: 'parse', l: 'Đọc JSON', d: 'Chuyển chuỗi JSON thành bản ghi' }, { v: 'clear', l: 'Xoá', d: 'Xoá giá trị của biến' }]));
          pf.push(P('name', 'Biến', 'input', { req: true, ph: 'ten_bien', font: 'ui-monospace, SFMono-Regular, Menlo, monospace' }));
          if (c.op !== 'clear') pf.push(P('value', 'Giá trị', 'input', { req: true, ph: 'Gõ / để chèn dữ liệu', canVar: true }));
          break;
        case 'loop':
          help = c.mode === 'each' ? 'Chạy các bước bên trong khung cho từng mục của danh sách. Bước bên trong đọc mục đang xử lý qua @item và vị trí qua @index.' : 'Chạy lại các bước bên trong khung cho tới khi điều kiện đúng.';
          var lsw = s.loopSwitch && s.loopSwitch.id === n.id ? s.loopSwitch.to : '';
          pf.push(R('mode', 'Loại vòng lặp', [{ v: 'each', l: 'For Each', d: 'Lặp qua từng mục của danh sách' }, { v: 'until', l: 'Do Until', d: 'Lặp đến khi điều kiện đúng' }], { row: true, onPick: function (v) { self.setState({ loopSwitch: { id: n.id, to: v } }); } }));
          if (lsw) pf.push(Object.assign({}, BASEF, { isConfirm: true, hasLabel: false, cTitle: 'Đổi loại vòng lặp?', cText: 'Cấu hình của loại hiện tại sẽ bị xoá. Các bước bên trong vòng lặp được giữ nguyên.', cOk: 'Đổi loại',
            cancel: function () { self.setState({ loopSwitch: null }); }, ok: function () { var d0 = defaultCfg('loop'); self.updateCfg({ mode: lsw, list: d0.list, conc: d0.conc, onItemErr: d0.onItemErr, until: d0.until, max: d0.max }); self.setState({ loopSwitch: null }); } }));
          if (c.mode === 'each') {
            pf.push(P('list', 'Danh sách', 'select', { req: true, options: [{ v: '', l: 'Chọn danh sách' }].concat(up) }));
            pf.push(P('conc', 'Số mục chạy cùng lúc', 'num', { min: 1, max: 10, hint: '1 = chạy lần lượt từng mục.' }));
            pf.push(R('onItemErr', 'Khi một mục lỗi', [{ v: 'stop', l: 'Dừng vòng lặp', d: 'Quy trình lỗi' }, { v: 'keep', l: 'Bỏ qua, vẫn giữ trong kết quả' }, { v: 'drop', l: 'Bỏ qua, không đưa vào kết quả' }]));
            pf.push(ST('Thu thập: kết quả từng mục ở @foreach.results, mục lỗi ở @foreach.failed.'));
          } else {
            pf.push(P('until', 'Đến khi', 'input', { req: true, ph: 'VD: @remaining_budget >= @total', canVar: true }));
            pf.push(P('max', 'Số vòng tối đa', 'num', { req: true, min: 1, max: 20, hint: 'Hết số vòng mà điều kiện chưa đúng thì đi cổng ĐẠT TỐI ĐA.' }));
          }
          break;
        case 'end':
          help = 'Đóng hồ sơ và báo kết quả cho người được chọn.';
          pf.push(R('status', 'Trạng thái', [{ v: 'completed', l: 'Completed', d: 'Hoàn thành' }, { v: 'rejected', l: 'Rejected', d: 'Bị từ chối' }, { v: 'cancelled', l: 'Cancelled', d: 'Đã huỷ' }, { v: 'failed', l: 'Failed', d: 'Thất bại' }]));
          pf.push(PPL('notify', 'Thông báo cho'));
          pf.push(CK('via', 'Cách gửi', VIAOPTS(VIA_END)));
          break;
        case 'note':
          pf.push(P('text', 'Ghi chú', 'text', { rows: 6 }));
          break;
      }
      if (n.type !== 'note') pf.unshift(P('nodeKey', 'Tên node', 'input', { value: keyOf(n), ph: 'snake_case', font: 'ui-monospace, SFMono-Regular, Menlo, monospace', hint: 'Bước sau gọi dữ liệu của bước này bằng @' + keyOf(n) + '.', onChange: function (ev) { self.updateCfg({ nodeKey: ev.target.value.trim() }); } }));
      pf.forEach(function (f) { f.hasHint = !!f.hint; f.hasStar = !!f.req; });
      if (n.type === 'condition') {
        help = 'Xét các nhánh từ trên xuống, nhánh đúng đầu tiên được đi.';
        cases = c.cases.map(function (cs, ci) {
          var setCase = function (ncs) { var arr = self.byId(n.id).cfg.cases.slice(); arr[ci] = ncs; self.updateCfg({ cases: arr }); };
          return { id: 'case-' + ci, name: cs.name, logic: cs.logic === 'OR' ? 'OR' : 'AND', canRemove: c.cases.length > 1,
            onName: function (ev) { setCase(Object.assign({}, cs, { name: ev.target.value })); },
            toggleLogic: function () { setCase(Object.assign({}, cs, { logic: cs.logic === 'OR' ? 'AND' : 'OR' })); },
            remove: function () { self.updateCfg({ cases: c.cases.filter(function (_, j) { return j !== ci; }) }); },
            addRow: function () { setCase(Object.assign({}, cs, { rows: cs.rows.concat([{ v: '', op: 'Bằng', val: '' }]) })); },
            rows: cs.rows.map(function (r, ri) {
              var setRow = function (p) { var rows = cs.rows.slice(); rows[ri] = Object.assign({}, r, p); setCase(Object.assign({}, cs, { rows: rows })); };
              return { v: r.v, op: r.op, val: r.val, noVal: OPS_NOVAL.indexOf(r.op) >= 0, valPh: OPS_NOVAL.indexOf(r.op) >= 0 ? 'Không cần' : 'Giá trị', onV: function (ev) { setRow({ v: ev.target.value }); }, onOp: function (ev) { setRow({ op: ev.target.value }); }, onVal: function (ev) { setRow({ val: ev.target.value }); },
                remove: function () { setCase(Object.assign({}, cs, { rows: cs.rows.filter(function (_, j) { return j !== ri; }) })); } };
            }) };
        });
      }
      outVars = outputsOf(n);
      var nIss = issueBy[n.id] || [];
      sel = { title: n.title, icon: t.icon, tile: col[0], tileBg: col[1], help: help, hasHelp: !!help, hasIssue: nIss.some(function (x) { return !isWarn(x); }), issueText: nIss.filter(function (x) { return !isWarn(x); }).join(' · '), hasWarn: nIss.some(isWarn), warnText: nIss.filter(isWarn).map(msgText).join(' · '),
        isCond: n.type === 'condition', hasOutVars: outVars.length > 0 && ['start', 'variable', 'note', 'end'].indexOf(n.type) < 0, hasErr: false, hasRetry: false,
        canDelete: n.type !== 'start' && !this.ro(), hasTabs: n.type !== 'note' && n.type !== 'start' };
    }
    // Bảng quyết định (DMN) mở dạng hộp thoại
    var dmnN = s.dmn && s.dmn === s.sel ? byId[s.dmn] : null, dmnV = null;
    if (dmnN && dmnN.type === 'decision') {
      var dc = dmnN.cfg, setD = function (p) { self.updateCfg(p, dmnN.id); }, cur = function () { return self.byId(dmnN.id).cfg; };
      var setRules = function (fn) { var r0 = cur().rules.map(function (r) { return { cells: r.cells.slice(), vals: r.vals.slice(), note: r.note || '' }; }); fn(r0); setD({ rules: r0 }); };
      var TT = ['Số', 'Văn bản', 'Có / không'];
      dmnV = { title: dmnN.title, hit: dc.hit, onHit: function (ev) { setD({ hit: ev.target.value }); }, hitOpts: [{ v: 'unique', l: 'Duy nhất: chỉ một quy tắc được khớp' }, { v: 'first', l: 'Đầu tiên: lấy quy tắc khớp đầu tiên' }, { v: 'collect', l: 'Tất cả: gom kết quả mọi quy tắc khớp' }],
        nCols: dc.cols.length, nRes: dc.res.length, span: dc.cols.length + dc.res.length + 2,
        cols: dc.cols.map(function (col, k) {
          var open = s.dmnCol === k, setC = function (p) { var a = cur().cols.slice(); a[k] = Object.assign({}, a[k], p); setD({ cols: a }); };
          return { name: col.name || 'Điều kiện ' + (k + 1), sub: col.expr || 'Chưa chọn giá trị', subFg: col.expr ? '#5b5b66' : '#b91c1c', t: col.t, open: open, expr: col.expr, rawName: col.name,
            toggle: function () { self.setState({ dmnCol: open ? null : k, dmnMenu: null }); }, onName: function (ev) { setC({ name: ev.target.value }); }, onExpr: function (ev) { setC({ expr: ev.target.value }); },
            types: TT.map(function (x) { var on = col.t === x; return { l: x, on: on, bg: on ? '#eceefe' : '#fff', fg: on ? '#203BDC' : '#3f3f46', bd: on ? '#203BDC' : '#e3e1dc', pick: function () { setC({ t: x }); } }; }),
            canDel: dc.cols.length > 1, del: function () { var c0 = cur(); setD({ cols: c0.cols.filter(function (_, j) { return j !== k; }), rules: c0.rules.map(function (r) { return Object.assign({}, r, { cells: r.cells.filter(function (_, j) { return j !== k; }) }); }) }); self.setState({ dmnCol: null }); } };
        }),
        res: dc.res.map(function (rs, k) {
          var setR = function (p) { var a = cur().res.slice(); a[k] = Object.assign({}, a[k], p); setD({ res: a }); };
          return { name: rs.name, t: rs.t, onName: function (ev) { setR({ name: ev.target.value.replace(/\s+/g, '_') }); }, onT: function (ev) { setR({ t: ev.target.value }); }, tOpts: TT, ariaN: 'Tên kết quả ' + (k + 1), ariaT: 'Kiểu kết quả ' + (k + 1),
            canDel: dc.res.length > 1, del: function () { var c0 = cur(); setD({ res: c0.res.filter(function (_, j) { return j !== k; }), dflt: (c0.dflt || []).filter(function (_, j) { return j !== k; }), rules: c0.rules.map(function (r) { return Object.assign({}, r, { vals: r.vals.filter(function (_, j) { return j !== k; }) }); }) }); } };
        }),
        rows: dc.rules.map(function (r, i) {
          var menu = s.dmnMenu === i;
          return { no: i + 1, note: r.note || '', menu: menu,
            cells: dc.cols.map(function (_, k) { return { v: r.cells[k] || '', aria: 'Quy tắc ' + (i + 1) + ', điều kiện ' + (k + 1), on: function (ev) { var v = ev.target.value; setRules(function (a) { a[i].cells[k] = v; }); } }; }),
            vals: dc.res.map(function (_, k) { var v0 = r.vals[k] || ''; return { v: v0, aria: 'Quy tắc ' + (i + 1) + ', kết quả ' + (k + 1), bd: String(v0).trim() ? 'transparent' : '#fecaca', on: function (ev) { var v = ev.target.value; setRules(function (a) { a[i].vals[k] = v; }); } }; }),
            onNote: function (ev) { var v = ev.target.value; setRules(function (a) { a[i].note = v; }); },
            toggleMenu: function () { self.setState({ dmnMenu: menu ? null : i, dmnCol: null }); },
            insAbove: function () { setRules(function (a) { a.splice(i, 0, { cells: dc.cols.map(function () { return ''; }), vals: dc.res.map(function () { return ''; }), note: '' }); }); self.setState({ dmnMenu: null }); },
            insBelow: function () { setRules(function (a) { a.splice(i + 1, 0, { cells: dc.cols.map(function () { return ''; }), vals: dc.res.map(function () { return ''; }), note: '' }); }); self.setState({ dmnMenu: null }); },
            dup: function () { setRules(function (a) { a.splice(i + 1, 0, { cells: a[i].cells.slice(), vals: a[i].vals.slice(), note: a[i].note }); }); self.setState({ dmnMenu: null }); },
            del: function () { setRules(function (a) { a.splice(i, 1); }); self.setState({ dmnMenu: null }); } };
        }),
        dflt: dc.res.map(function (_, k) { return { v: (dc.dflt || [])[k] || '', aria: 'Kết quả khi không quy tắc nào khớp ' + (k + 1), on: function (ev) { var a = (cur().dflt || []).slice(); a[k] = ev.target.value; setD({ dflt: a }); } }; }),
        errs: (issueBy[dmnN.id] || []).filter(function (x) { return !isWarn(x) && !/^Tên node/.test(x); }), 
        addRule: function () { setRules(function (a) { a.push({ cells: dc.cols.map(function () { return ''; }), vals: dc.res.map(function () { return ''; }), note: '' }); }); },
        addCol: function () { var c0 = cur(); setD({ cols: c0.cols.concat([{ name: 'Điều kiện ' + (c0.cols.length + 1), expr: '', t: 'Số' }]), rules: c0.rules.map(function (r) { return Object.assign({}, r, { cells: r.cells.concat(['']) }); }) }); self.setState({ dmnCol: c0.cols.length, dmnMenu: null }); },
        addRes: function () { var c0 = cur(); setD({ res: c0.res.concat([{ name: 'result_' + (c0.res.length + 1), t: 'Văn bản' }]), dflt: (c0.dflt || []).concat(['']), rules: c0.rules.map(function (r) { return Object.assign({}, r, { vals: r.vals.concat(['']) }); }) }); },
        close: function () { self.setState({ dmn: null, dmnCol: null, dmnMenu: null }); } };
      dmnV.hasErrs = dmnV.errs.length > 0; dmnV.errText = dmnV.errs.join(' · '); dmnV.noRules = !dc.rules.length;
    }
    // Hộp thoại Thêm biến
    var vm = s.varModal, varV = null;
    if (vm) {
      var setV = function (p) { self.setState({ varModal: Object.assign({}, self.state.varModal, p) }); };
      varV = { title: vm.idx >= 0 ? 'Sửa biến' : 'Thêm biến', okLabel: vm.idx >= 0 ? 'Lưu' : 'Thêm', name: vm.name, def: vm.def, desc: vm.desc, req: vm.req, err: vm.err || '', hasErr: !!vm.err,
        types: VTYPES.map(function (x) { var on = vm.t === x.v; return { l: x.v, code: x.code, soon: !!x.soon, dis: !!x.soon, on: on, bd: on ? '#203BDC' : '#e3e1dc', bg: on ? '#f3f5fe' : '#fff', fg: x.soon ? '#9a9aa3' : '#121216', pick: function () { if (!x.soon) setV({ t: x.v }); } }; }),
        onName: function (ev) { setV({ name: ev.target.value.replace(/\s+/g, '_'), err: '' }); }, onDef: function (ev) { setV({ def: ev.target.value }); }, onDesc: function (ev) { setV({ desc: ev.target.value }); }, toggleReq: function () { setV({ req: !self.state.varModal.req }); },
        cancel: function () { self.setState({ varModal: null }); },
        save: function () {
          var m = self.state.varModal, node = self.byId(m.nodeId); if (!node) { self.setState({ varModal: null }); return; }
          var arr = (node.cfg[m.key] || []).slice(), nm0 = String(m.name || '').trim();
          if (!SNAKE.test(nm0)) { setV({ err: 'Tên biến chỉ gồm chữ thường, số và _, bắt đầu bằng chữ.' }); return; }
          if (arr.some(function (x, j) { return j !== m.idx && x.name === nm0; })) { setV({ err: 'Đã có biến tên ' + nm0 + '.' }); return; }
          var it = { name: nm0, t: m.t, def: m.def, desc: m.desc, req: m.req };
          if (m.idx >= 0) arr[m.idx] = Object.assign({}, arr[m.idx], it); else arr.push(it);
          var p = {}; p[m.key] = arr; self.updateCfg(p, m.nodeId); self.setState({ varModal: null });
        } };
    }
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
      var opts = humanOpts(waitNode.cfg);
      waitActions = opts.map(function (a, i) { return { label: a, cls: i === 0 ? 'btn btn-primary' : 'btn', pick: function () { self.step(a); } }; });
      if (waitNode.cfg.tmoOn) waitActions.push({ label: 'Để quá hạn', cls: 'btn', pick: function () { self.step('__timeout'); } });
    }
    var statusMap = { draft: ['Bản nháp', '#f59e0b', ''], pending: ['Chờ duyệt publish', '#f59e0b', 'v1'] };
    var g0 = s.guard, guardList = function (arr) { return arr.map(function (x) { return { label: x[1], on: !!g0[x[0]], toggle: function () { if (self.roStop()) return; var ng = Object.assign({}, self.state.guard); ng[x[0]] = !ng[x[0]]; self.setState({ guard: ng }); } }; }); };
    var asTool = false, emb = !!(this.props && this.props.embedded), pendVer = this.props && this.props.pendingVersion;
    var unwired = issues.filter(function (g) { return g.msgs.indexOf('Chưa có mũi tên đi vào') >= 0; }).length, g1 = s.guard || {};
    var readyItems = [
      { label: 'Đã chọn kiểu kích hoạt', done: !!startNode, go: function () { self.setState({ section: 'flow', sel: startNode ? startNode.id : null, tab: 'cfg', runOpen: false }); } },
      { label: unwired ? 'Còn ' + unwired + ' bước chưa nối' : 'Đã nối mọi bước', done: !unwired, failed: unwired > 0, go: function () { self.setState({ checkOpen: true, pubOpen: false }); } },
      { label: issueCount ? 'Còn ' + issueCount + ' lỗi cần sửa' : 'Đã cấu hình mọi bước', done: !issueCount, failed: issueCount > 0, go: function () { self.setState({ checkOpen: true, pubOpen: false }); } },
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
      bannerLeft: (function () { var pw = building && (pmNode || showRun || (pmProcess && !s.panelHidden)) ? (s.expand ? 640 : 476) : 0, lw = s.palOpen && !ro ? (s.leftTab === 'ai' ? 356 : 232) : 0; return 'calc(' + lw + 'px + (100% - ' + (lw + pw) + 'px) / 2)'; })(),
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
      warnCount: warnCount, hasWarns: warnCount > 0, checkBadge: (issueCount + warnCount) || 0, checkBadgeBg: issueCount ? '#dc2626' : (warnCount ? '#f59e0b' : '#16a34a'),
      issueGroups: issues.map(function (g) { var cc = colOf(g.type), ne = g.msgs.filter(function (m) { return !isWarn(m); }).length; return { title: g.title, count: g.msgs.length, cntFg: ne ? '#b91c1c' : '#b45309', msgs: g.msgs.slice().sort(function (a, b) { return isWarn(a) - isWarn(b); }).map(function (m) { return { t: msgText(m), fg: isWarn(m) ? '#b45309' : '#b91c1c', dot: isWarn(m) ? '#f59e0b' : '#dc2626' }; }), tile: cc[0], icon: TYPES[g.type].icon, go: function () { self.setState({ sel: g.id, tab: 'cfg', checkOpen: false, runOpen: false, top: 'build', section: 'flow' }); setTimeout(function () { self.ensureVisible(g.id); }, 30); } }; }),
      issueCount: issueCount, hasIssues: issueCount > 0, noIssues: !issueCount, issueColor: issueCount ? '#b91c1c' : '#020817',
      checkOpen: s.checkOpen, checkAria: 'Kiểm tra, ' + issueCount + ' lỗi', toggleCheck: function () { self.setState({ checkOpen: !s.checkOpen, pubOpen: false, add: null, moreOpen: false }); },
      pubOpen: s.pubOpen, togglePub: function () { if (self.roStop()) return; self.setState({ pubOpen: !s.pubOpen, checkOpen: false, add: null, moreOpen: false }); },
      openVersions: function () { self.setState({ section: 'versions', top: 'build', pubOpen: false }); },
      pubState: s.status === 'pending' ? 'v1 đang chờ Admin duyệt' : 'Chưa publish lần nào · Đã tự lưu',
      publishDisabled: issueCount > 0 || s.status === 'pending', publishLabel: s.status === 'pending' ? 'Đã gửi duyệt' : 'Publish v1',
      publish: function () { self.setState({ status: 'pending', pubOpen: false }); self.showToast('Đã gửi yêu cầu publish v1. Admin duyệt xong thì Quy trình mới chạy thật.', 'good'); },
      toolHint: 'Publish xong, người dùng trong phạm vi publish gõ /' + ((startNode && startNode.cfg.cmd) || 'tên Quy trình') + ' ở Workspace để mở hồ sơ. Menu / và Action Center thuộc Workspace.',
      toolHintColor: asTool ? '#15803d' : '#64748b',
      openRun: function () { self.setState({ top: 'build', section: 'flow' }); self.openRun(); },

      canvasRef: this.canvasRef, canvasCursor: s.drag ? 'grabbing' : (s.link ? 'crosshair' : 'default'),
      worldTransform: 'translate(' + s.px + 'px, ' + s.py + 'px) scale(' + s.z + ')',
      onBgDown: function (e) { if (e.target.closest && e.target.closest('[data-node],[data-ui]')) return; self.setState({ drag: { pan: true, sx: e.clientX, sy: e.clientY, ox: s.px, oy: s.py }, sel: null, add: null, checkOpen: false, readyOpen: false, pubOpen: false, picking: null, ctx: null, panel: null }); },
      onMove: function (e) { self.onMove(e); },
      onUp: function () { self.onUp(); },
      edgesD: d, errD: ed, backD: bd, ranD: rd, selD: '', tmpD: tmpD, edgeDel: edgeDel, edgeTags: edgeTags, viewNodes: viewNodes,
      showReadyChip: emb && building,
      sysOpen: !!s.sysOpen && building, toggleSys: function () { self.setState({ sysOpen: !self.state.sysOpen, checkOpen: false }); }, sysVars: SYSVARS.map(function (x) { return { v: '@' + x.v, t: x.t, d: x.d }; }), readyOpen: false, toggleReady: function () { self.setState({ checkOpen: !self.state.checkOpen, readyOpen: false, add: null }); }, 
      readyChipText: 'Danh sách kiểm tra' + (issueCount ? ' · ' + issueCount + ' lỗi' : '') + (warnCount ? ' · ' + warnCount + ' cảnh báo' : '') + (!issueCount && !warnCount ? ' · Đạt' : ''),
      readyChipFg: issueCount ? '#b91c1c' : (warnCount ? '#b45309' : '#15803d'), readyChipIcon: issueCount ? 'M12 3l10 18H2z M12 10v4 M12 17h.01' : 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M8 12l3 3 5-6',
      leftAI: s.leftTab === 'ai', leftAdd: s.leftTab !== 'ai', leftW: s.leftTab === 'ai' ? 340 : 216,
      leftTabs: [{ id: 'add', label: 'Thêm node' }, { id: 'ai', label: 'Refine với AI' }].map(function (x) { var on = (s.leftTab || 'add') === x.id; return { label: x.label, on: on, bg: on ? '#fff' : 'transparent', fg: on ? '#121216' : '#5b5b66', sh: on ? '0 1px 2px rgba(15,23,42,.08)' : 'none', pick: function () { self.setState({ leftTab: x.id }); } }; }),
      rmsgs: (s.rmsgs || []).map(function (m, i) { return { me: m.role === 'me', ai: m.role === 'ai', text: m.text, hasProp: !!m.prop && !m.done, applied: !!m.prop && m.done, apply: function () { self.refineApply(i); }, skip: function () { self.setState({ rmsgs: self.state.rmsgs.map(function (x, j) { return j === i ? Object.assign({}, x, { prop: null, text: x.text + ' (đã bỏ qua)' }) : x; }) }); } }; }),
      rEmpty: !(s.rmsgs || []).length, rq: s.rq || '', onRq: function (e) { self.setState({ rq: e.target.value }); }, onRqKey: function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self.refineSend(); } }, rSend: function () { self.refineSend(); }, rSendNot: !String(s.rq || '').trim(),
      rTips: REFINE_TIPS.map(function (t) { return { t: t, pick: function () { self.refineSend(t); } }; }),
      explainOpen: !!s.explainOpen, closeExplain: function () { self.setState({ explainOpen: false }); },
      exMain: (s.exTab || 'main') === 'main', exAll: s.exTab === 'all',
      exTabs: [{ id: 'main', label: 'Đường chính' }, { id: 'all', label: 'Tất cả ' + s.nodes.filter(function (n) { return n.type !== 'note'; }).length + ' bước' }].map(function (x) { var on = (s.exTab || 'main') === x.id; return { label: x.label, bg: on ? '#eef1fd' : '#fff', fg: on ? '#203BDC' : '#52525b', line: on ? '#c7d2fe' : '#e4e4e7', on: on, pick: function () { self.setState({ exTab: x.id }); } }; }),
      explain: s.explainOpen ? (function () { var go = function (id) { return function () { self.setState({ explainOpen: false, sel: id, tab: 'cfg', runOpen: false, panel: null }); }; };
        var x = explainFlow(s), m = mainFlow(s);
        return { summary: (s.exTab || 'main') === 'main' ? m.summary : x.summary, steps: x.steps.map(function (st) { return Object.assign({}, st, { go: go(st.id) }); }),
          main: m.steps.map(function (st, i) { return Object.assign({}, st, { go: go(st.id), hasWho: !!st.who, hasMeta: !!st.meta, hasExc: st.exc.length > 0, isEnd: !!st.isEnd, notEnd: !st.isEnd, endFg: st.endOk ? '#15803d' : '#b91c1c', dotBg: st.isEnd ? (st.endOk ? '#e8f6ec' : '#fdecec') : (st.isPeople ? '#e6f0fe' : '#f1f1f4'), dotFg: st.isEnd ? (st.endOk ? '#15803d' : '#b91c1c') : (st.isPeople ? '#1d4ed8' : '#3f3f46'), line: i < m.steps.length - 1 ? '#ececef' : 'transparent' }); }) }; })() : { summary: [], steps: [], main: [] },
      palOpen: s.palOpen && building && !ro, palClosed: !s.palOpen && building && !ro, togglePal: function () { self.setState({ palOpen: !self.state.palOpen }); },
      palQ: s.palQ || '', onPalQ: function (ev) { self.setState({ palQ: ev.target.value }); }, palNone: !PAL.some(function (k) { var q = norm(s.palQ || '').trim(); return !q || norm(TYPES[k].name + ' ' + TYPES[k].kw + ' ' + PAL_GROUP[k]).indexOf(q) >= 0; }),
      palItems: PAL.filter(function (k) { var q = norm(s.palQ || '').trim(); return !q || norm(TYPES[k].name + ' ' + TYPES[k].kw + ' ' + PAL_GROUP[k]).indexOf(q) >= 0; }).map(function (k, i, arr) { var t = TYPES[k], cc = COL[t.c], hd = i === 0 || PAL_GROUP[arr[i - 1]] !== PAL_GROUP[k] ? PAL_GROUP[k] : ''; return { hasHead: !!hd, head: hd || '', name: t.name, desc: t.desc, icon: t.icon, tile: cc[0], tileBg: cc[1], more: k === 'tool' || k === 'func', pick: function () { self.palPick(k); } }; }),
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
      addHasCrumb: !!ad && (ad.level === 'func' || ad.mode === 'inner' || String(ad.level).indexOf('c:') === 0), addCrumb: ad && ad.mode === 'inner' ? ((self.byId(ad.loopId) || {}).type === 'parallel' ? 'Nhánh song song' : 'Vòng lặp') : (ad && String(ad.level).indexOf('c:') === 0 ? 'Connector › ' + ad.level.slice(2) : 'Hàm'), addShowTabs: !!ad && ad.level !== 'func' && ad.mode !== 'inner' && !ad.q,
      addTabs: [{ id: 'featured', label: 'Bước' }, { id: 'tool', label: 'Connector' }].map(function (x) { var on = ad && ad.tab === x.id; return { label: x.label, on: !!on, bg: on ? '#eef1fd' : '#fff', fg: on ? '#203BDC' : '#475569', line: on ? '#c7d2fe' : '#e5e5e5', pick: function () { self.setState({ add: Object.assign({}, self.state.add, { tab: x.id, level: 'root', idx: 0 }) }); } }; }),
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
      sel: sel, pf: pf, editors: editors, cases: cases, varOpts: varOpts, opOpts: OPS, outVars: outVars,
      addCase: function () { var n = byId[s.sel]; self.updateCfg({ cases: n.cfg.cases.concat([{ name: 'Nhánh ' + (n.cfg.cases.length + 1), logic: 'AND', rows: [{ v: '', op: 'Bằng', val: '' }] }]) }); },
      errRetry: false, errMode: '', toggleRetry: function () {},
      vpickClose: function () { self.setState({ vpick: '' }); },
      dmnOpen: !!dmnV, dmnV: dmnV || { title: '', cols: [], res: [], rows: [], dflt: [], hitOpts: [] },
      varOpen: !!varV, varV: varV || { title: '', types: [], name: '', def: '', desc: '', req: false, err: '', hasErr: false },
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
      waitTitle: waitNode ? 'Đang chờ: ' + waitNode.title : '', waitBody: waitNode ? (waitNode.cfg.title ? fill(waitNode.cfg.title, run.vars || {}) + (waitNode.cfg.message ? ' - ' : '') : '') + fill(waitNode.cfg.message, run.vars || {}) : '',
      waitWho: waitNode ? whoShort0(waitNode.cfg.assignees).join(', ') : '', waitActions: waitActions,
      waitExpire: waitNode ? (waitNode.cfg.tmoOn ? waitNode.cfg.tmo + ' ' + waitNode.cfg.tmoUnit + ', quá hạn thì đi cổng Hết hạn' : 'Không giới hạn') : '',
      waitRole: waitNode ? 'Việc này nằm ở Action Center của ' + (whoShort0(waitNode.cfg.assignees)[0] || 'người được giao') + (waitNode.cfg.assignees.length > 1 ? ' và ' + (waitNode.cfg.assignees.length - 1) + ' người khác' : '') + '. Khi chạy thử, bạn xử lý thay để hồ sơ chạy tiếp.' : '',
      runResText: run && run.text ? run.text : '', runResBorder: run && run.ok ? '#bbf7d0' : '#fecaca', runResBg: run && run.ok ? '#f0fdf4' : '#fef2f2',
      runHasOutput: !!(run && run.output), runOutput: run && run.output ? run.output : '',
      toast: !!s.toast, toastText: s.toast ? s.toast.text : '', toastBg: s.toast ? (s.toast.tone === 'bad' ? '#b91c1c' : (s.toast.tone === 'good' ? '#15803d' : '#0f172a')) : '#0f172a'
    };
  }

  startDrag(e, id, member) {
    if (e.button === 2) return;
    if (e.target.closest && e.target.closest('[data-plus],[data-ui]')) return;
    e.stopPropagation(); if (this.locked()) return;
    var n = this.byId(id);
    var base = { sel: id, add: null, runOpen: false, panel: null, top: 'build', ctx: null, tab: id === this.state.sel ? this.state.tab : 'cfg', picking: null };
    if (n.parent || member || this.ro()) { this.setState(base); return; }
    var st0 = this.state, kids = n.type === 'loop' ? frameMembers(n, st0).map(function (k) { var c = st0.nodes.filter(function (x) { return x.id === k; })[0]; return c ? { id: k, ox: c.x, oy: c.y } : null; }).filter(Boolean) : [];
    this.setState(Object.assign(base, { dragPre: this.snap().hist, drag: { id: id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, kids: kids } }));
  }
  toWorld(cx, cy) { var s = this.state, r = this.canvasEl && this.canvasEl.getBoundingClientRect ? this.canvasEl.getBoundingClientRect() : { left: 0, top: 0 }; return { x: (cx - r.left - s.px) / s.z, y: (cy - r.top - s.py) / s.z }; }
  hitNode(x, y, fromId) {
    DIR = this.state.dir;
    var hit = null;
    var area = 1e12; this.state.nodes.forEach(function (n) { if (n.parent || n.type === 'start' || n.type === 'note' || n.id === fromId) return; var z = sizeOf(n); if (x >= n.x - 12 && x <= n.x + z.w + 12 && y >= n.y - 12 && y <= n.y + z.h + 12 && z.w * z.h < area) { hit = n; area = z.w * z.h; } });
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
    var nx = Math.round((dr.ox + dx / z) / 8) * 8, ny = Math.round((dr.oy + dy / z) / 8) * 8, km = {}; (dr.kids || []).forEach(function (k) { km[k.id] = k; });
    var nodes = this.state.nodes.map(function (n) { if (n.id === dr.id) return Object.assign({}, n, { x: nx, y: ny }); var k = km[n.id]; return k ? Object.assign({}, n, { x: k.ox + nx - dr.ox, y: k.oy + ny - dr.oy }) : n; });
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
      if (p.command.kind === 'explain') this.setState({ explainOpen: true, add: null });
      if (p.command.kind === 'refine') this.setState({ palOpen: true, leftTab: 'ai' });
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
    var { actCount, actGuards, addCase, addCrumb, addEmpty, addFrom, addHasCrumb, addHasFrom, addOpen, addQ, addRoot, addSections, addShowTabs, addTabs, aiBanner, aiCount, autoLayout, backD, backToList, bannerLeft, building, canRedoNot, canTest, canUndoNot, canvasCursor, canvasRef, cases, checkOpen, checkPos, closeAdd, closeExplain, collapseSide, ctxItems, ctxOpen, ctxX, ctxY, deleteProcess, deleteSel, desc, descLen, dirIcon, dirLabel, dismissBanner, dmnOpen, dmnV, draftSteps, edgeDel, edgeTags, edgesD, errD, exAll, exMain, exTabs, expandLabel, expandSide, explain, explainOpen, fit, guards, hasIssues, hasWarns, isGuardPage, isOtherTab, isVersionsPage, issueColor, issueCount, issueGroups, last, lastHas, leftAI, leftAdd, leftTabs, leftW, moreOpen, name, nameBorder, nameHint, nameHintColor, nameInput, nameInvalid, nameLen, navItems, noIssues, noRunInputs, nodeTabs, notEmb, onAddKey, onAddQ, onBgDown, onDesc, onMove, onName, onNameBlur, onPalQ, onRq, onRqKey, onTitle, onUp, opOpts, openRun, openVersions, otherIcon, otherText, otherTitle, outVars, palClosed, palItems, palNone, palOpen, palQ, panelClose, panelOpen, panelReopen, panelTabs, panelW, pendingBanner, pendingText, pf, pmNode, pmProcess, pmRun, pubOpen, pubState, publish, publishDisabled, publishLabel, rEmpty, rSend, rSendNot, rTips, ranD, readOnly, readyChipFg, readyChipIcon, readyChipText, readyDone, readyItems, readyOpen, readyPct, readyTotal, redo, reopenCfg, rerun, rmsgs, roBanner, rq, runBar, runBtnLabel, runDone, runHasOutput, runInputTitle, runInputs, runLocked, runLog, runOutput, runPaused, runResBg, runResBorder, runResText, runRunning, runShowInput, runShowResult, runShowTrace, runStatusColor, runStatusText, runStep, runTabs, sel, selD, share, showHeader, showReady, showReadyChip, sideRail, sideShow, startRun, statusBg, statusDot, statusFg, statusLabel, stepCount, sysOpen, sysVars, tabCfg, tabLast, tmpD, toast, toastBg, toastText, toggleCheck, toggleDir, toggleExpand, toggleMore, togglePal, togglePub, toggleReady, toggleSys, toolHint, toolHintColor, topTabs, triggerName, undo, varOpen, varOpts, varV, versionSub, versionTitle, viewNodes, waitActions, waitBody, waitExpire, waitRole, waitTitle, warnCount, worldTransform, zoomIn, zoomOut, zoomPct } = v;
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
    <div role="dialog" aria-label="Danh sách kiểm tra" style={S(`position: absolute; ${checkPos}; width: 360px; max-height: 460px; overflow-y: auto; background: #fff; border: 1px solid #e3e1dc; border-radius: 12px; box-shadow: 0 12px 28px rgba(15,23,42,.14); padding: 14px; z-index: 40`)}>
      <div style={S('display: flex; align-items: center; gap: 8px')}><b style={S('font-size: 14px; font-weight: 600; flex: 1')}>Danh sách kiểm tra</b><span style={S('font-size: 11px; color: #b91c1c; background: #fef2f2; border-radius: 999px; padding: 1px 8px')}>{issueCount} lỗi</span>{(hasWarns) && (<><span style={S('font-size: 11px; color: #b45309; background: #fff7ed; border-radius: 999px; padding: 1px 8px')}>{warnCount} cảnh báo</span></>)}<button type="button" className={Q('ghost')} aria-label="Đóng" onClick={toggleCheck} style={S('width: 26px; height: 26px; border-radius: 6px')}>✕</button></div>
      <p style={S('font-size: 12px; color: #686873; margin: 2px 0 0')}>Lỗi màu đỏ chặn chạy thử và publish. Cảnh báo màu cam không chặn.</p>
      {(noIssues) && (<><p style={S('font-size: 12.5px; color: #15803d; margin: 10px 0 0')}>Không còn lỗi nào.</p></>)}
      {(issueGroups || []).map((g, _ig) => (<React.Fragment key={_ig}>
        <button type="button" onClick={g.go} style={S('display: block; width: 100%; text-align: left; border: 0; background: transparent; padding: 10px 6px 6px; border-radius: 8px; font: inherit; cursor: pointer')}>
          <span style={S('display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600')}><span style={S(`width: 20px; height: 20px; border-radius: 5px; background: ${g.tile}; color: #fff; display: inline-flex; align-items: center; justify-content: center`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={g.icon}></path></svg></span>{g.title} <span style={S(`color: ${g.cntFg}; font-weight: 500`)}>({g.count})</span></span>
          {(g.msgs || []).map((m, _im) => (<React.Fragment key={_im}><span style={S('display: flex; gap: 6px; align-items: baseline; font-size: 12px; color: #334155; padding: 3px 0 0 28px; line-height: 1.45')}><span style={S(`width: 6px; height: 6px; border-radius: 999px; background: ${m.dot}; flex-shrink: 0; transform: translateY(-1px)`)}></span>{m.t}</span></React.Fragment>))}
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
          <path d={backD} fill="none" stroke="#7c8aa5" strokeWidth="1.5" strokeDasharray="2 4" strokeLinecap="round"></path>
          <path d={selD} fill="none" stroke="#203BDC" strokeWidth="1.8" strokeLinecap="round"></path>
          <path d={ranD} fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round"></path>
          <path d={tmpD} fill="none" stroke="#203BDC" strokeWidth="1.8" strokeDasharray="4 4" strokeLinecap="round"></path>
        </g>
      </svg>

      {(edgeTags || []).map((t, _it) => (<React.Fragment key={_it}>
        <span style={S(`position: absolute; left: ${t.x}px; top: ${t.y}px; font-size: 11px; font-weight: 500; color: #3f3f46; background: #fff; border: 1px solid #e2e3e8; border-radius: 6px; padding: 1px 6px; pointer-events: none; white-space: nowrap`)}>{t.label}</span>
      </React.Fragment>))}
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
            <div style={S(`height: 56px; width: ${n.headW}; box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 0 14px; border-bottom: ${n.headLine}`)}>
              <span style={S(`width: 28px; height: 28px; border-radius: 8px; background: ${n.tileBg}; display: grid; place-items: center; flex-shrink: 0`)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={n.tile} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={n.icon}></path></svg></span>
              <span style={S('flex: 1; min-width: 0')}>
                <span style={S('display: block; font-size: 14px; font-weight: 600; color: #121216; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>{n.title}</span>
                {(n.badge) && (<><span style={S(`display: inline-flex; align-items: center; gap: 3px; margin-top: 3px; font-size: 10.5px; font-weight: 500; color: ${n.badgeFg}; background: ${n.badgeBg}; border: 1px solid ${n.badgeLine}; border-radius: 999px; padding: 0 7px; line-height: 16px; white-space: nowrap`)}>{n.badgeText}</span></>)}
                {(n.hasSub) && (<><span style={S('display: block; margin-top: 2px; font-size: 12px; color: #5b5b66; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>{n.sub}</span></>)}
              </span>
            </div>
            <div style={S(`display: flex; flex-direction: ${n.pillDir}; gap: 8px; padding: ${n.pillPad}`)}>
              {(n.pills || []).map((b, _ib) => (<React.Fragment key={_ib}>
                <div style={S(`flex: ${b.flex}; height: 32px; border-radius: 10px; background: ${b.bg}; color: ${b.fg}; font-size: 12px; font-weight: 500; display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 0 10px; white-space: nowrap; min-width: 0`)}><span style={S('overflow: hidden; text-overflow: ellipsis')}>{b.label}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={b.arrow} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={S('flex-shrink: 0')}><path d="M5 12h14 M13 6l6 6-6 6"></path></svg></div>
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
              <span style={S(`position: absolute; left: ${n.chipX}px; top: ${n.chipY}px; width: 96px; height: 26px; border-radius: 999px; background: #fff; border: 1px solid #c7cdea; color: #3b4a8c; font-size: 11.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 5px; pointer-events: none`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4 M3 11V9a3 3 0 0 1 3-3h15 M7 22l-4-4 4-4 M21 13v2a3 3 0 0 1-3 3H3"></path></svg>{n.chipLabel}</span>
              {(n.lpPorts || []).map((lp, _ilp) => (<React.Fragment key={_ilp}><span style={S(`position: absolute; left: ${lp.x}px; top: ${lp.y}px; width: ${lp.w}px; text-align: ${lp.align}; font-size: 10.5px; font-weight: 600; letter-spacing: .04em; color: ${lp.fg}; pointer-events: none`)}>{lp.label}</span></React.Fragment>))}
              {(n.loopEmpty) && (<>
                <button type="button" data-ui="1" onClick={n.addFirst} style={S(`position: absolute; left: ${n.emptyX}px; top: ${n.emptyY}px; height: 34px; padding: 0 14px; border-radius: 10px; border: 1.5px dashed #aab3d6; background: #fff; color: #203BDC; font-size: 12.5px; font-weight: 600; display: flex; align-items: center; gap: 6px`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14 M5 12h14"></path></svg>Thêm node</button>
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

    {/* Bảng trái: Thêm bước | Refine với AI */}
    {(palOpen) && (<>
      <div data-ui="1" style={S(`position: absolute; left: 16px; top: 16px; bottom: 68px; width: ${leftW}px; display: flex; flex-direction: column; background: #fff; border: 1px solid #e3e1dc; border-radius: 12px; box-shadow: 0 4px 16px rgba(15,23,42,.08); z-index: 6; overflow: hidden`)}>
        <div style={S('display: flex; align-items: center; gap: 6px; padding: 8px 8px 6px')}>
          <div role="tablist" aria-label="Bảng bên trái" style={S('flex: 1; display: flex; gap: 2px; padding: 3px; background: #f1f1f4; border-radius: 9px')}>
            {(leftTabs || []).map((lt, _ilt) => (<React.Fragment key={_ilt}>
              <button type="button" role="tab" aria-selected={lt.on} onClick={lt.pick} style={S(`flex: 1; height: 28px; border-radius: 7px; border: 0; background: ${lt.bg}; color: ${lt.fg}; box-shadow: ${lt.sh}; font-size: 12.5px; font-weight: 600; white-space: nowrap`)}>{lt.label}</button>
            </React.Fragment>))}
          </div>
          <button type="button" className={Q('ghost')} aria-label="Thu gọn bảng bên trái" title="Thu gọn" onClick={togglePal} style={S('width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16v16H4z M9 4v16"></path></svg></button>
        </div>
        {(leftAdd) && (<>
          <div style={S('padding: 2px 10px 4px')}><label className={Q('sr')} htmlFor="palq">Tìm node</label><input id="palq" className={Q('field')} value={palQ} onChange={onPalQ} placeholder="Tìm node" style={S('height: 32px; font-size: 13px')} /></div>
          <div style={S('flex: 1; min-height: 0; overflow-y: auto; padding: 0 8px 8px')}>
            {(palNone) && (<><p style={S('font-size: 12.5px; color: #686873; margin: 10px 8px')}>Không có node nào khớp.</p></>)}
            {(palItems || []).map((it, _iit) => (<React.Fragment key={_iit}>
              {(it.hasHead) && (<><div className={Q('palh')}>{it.head}</div></>)}
              <button type="button" className={Q('pal')} onClick={it.pick} title={it.desc}>
                <span style={S(`width: 26px; height: 26px; border-radius: 7px; background: ${it.tileBg}; display: flex; align-items: center; justify-content: center; flex-shrink: 0`)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={it.tile} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={it.icon}></path></svg></span>
                <span style={S('flex: 1')}>{it.name}</span>
              </button>
            </React.Fragment>))}
          </div>
        </>)}
        {(leftAI) && (<>
          <div style={S('flex: 1; min-height: 0; overflow-y: auto; padding: 4px 12px 8px; display: flex; flex-direction: column; gap: 10px')}>
            <div style={S('font-size: 12px; color: #5b5b66; line-height: 1.5; background: #f4f6fe; border: 1px solid #dfe5fb; border-radius: 10px; padding: 8px 10px')}>Chat để AI sửa luồng trên bản nháp. Mỗi thay đổi hiện thành đề xuất, bấm <b style={S('color: #121216')}>Áp dụng</b> thì mới đổi trên canvas.</div>
            {(rEmpty) && (<>
              <div style={S('font-size: 11.5px; font-weight: 600; color: #71717a; letter-spacing: .04em; margin-top: 2px')}>THỬ HỎI</div>
              {(rTips || []).map((tp, _itp) => (<React.Fragment key={_itp}>
                <button type="button" onClick={tp.pick} style={S('text-align: left; font-size: 12.5px; color: #27272a; background: #fff; border: 1px solid #e4e4e7; border-radius: 10px; padding: 8px 10px; line-height: 1.4')}>{tp.t}</button>
              </React.Fragment>))}
            </>)}
            {(rmsgs || []).map((m, _im) => (<React.Fragment key={_im}>
              {(m.me) && (<><div style={S('align-self: flex-end; max-width: 85%; background: #203BDC; color: #fff; font-size: 13px; line-height: 1.45; border-radius: 12px 12px 4px 12px; padding: 8px 10px')}>{m.text}</div></>)}
              {(m.ai) && (<>
                <div style={S('align-self: flex-start; max-width: 92%; background: #f4f4f5; color: #27272a; font-size: 13px; line-height: 1.5; border-radius: 12px 12px 12px 4px; padding: 8px 10px')}>{m.text}
                  {(m.hasProp) && (<><div style={S('display: flex; gap: 6px; margin-top: 8px')}><button type="button" className={Q('btn-p')} onClick={m.apply} style={S('height: 28px; padding: 0 12px; border-radius: 7px; border: 0; background: #203BDC; color: #fff; font-size: 12.5px; font-weight: 600')}>Áp dụng</button><button type="button" className={Q('btn')} onClick={m.skip} style={S('height: 28px; font-size: 12.5px')}>Bỏ qua</button></div></>)}
                  {(m.applied) && (<><div style={S('margin-top: 6px; font-size: 12px; font-weight: 600; color: #15803d')}>✓ Đã áp dụng trên canvas</div></>)}
                </div>
              </>)}
            </React.Fragment>))}
          </div>
          <div style={S('padding: 8px 10px 10px; border-top: 1px solid #ececef')}>
            <div style={S('display: flex; align-items: flex-end; gap: 6px; border: 1px solid #e4e4e7; border-radius: 10px; padding: 6px 6px 6px 10px')}>
              <label className={Q('sr')} htmlFor="rq">Nhắn cho AI</label>
              <textarea id="rq" rows="2" value={rq} onChange={onRq} onKeyDown={onRqKey} placeholder="VD: Thêm bước Giám đốc khối duyệt sau Trưởng phòng duyệt" style={S('flex: 1; resize: none; border: 0; outline: none; font: inherit; font-size: 13px; line-height: 1.45; background: transparent')}></textarea>
              <button type="button" aria-label="Gửi" onClick={rSend} disabled={rSendNot} style={S('width: 30px; height: 30px; border-radius: 8px; border: 0; background: #203BDC; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14 M13 6l6 6-6 6"></path></svg></button>
            </div>
          </div>
        </>)}
      </div>
    </>)}
    {(palClosed) && (<>
      <button type="button" data-ui="1" className={Q('btn')} onClick={togglePal} style={S('position: absolute; left: 16px; top: 16px; z-index: 6; height: 34px; font-size: 13px')}>+ Thêm node · Refine với AI</button>
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
      <span style={S('width: 1px; height: 18px; background: #e3e1dc; margin: 0 2px')}></span>
      <button type="button" className={Q('tbtn')} onClick={toggleSys} aria-expanded={sysOpen} title="Biến hệ thống dùng được ở mọi bước" style={S('height: 30px; width: auto; padding: 0 10px; font-size: 13px; font-weight: 500; color: #3f3f46; font-family: ui-monospace, SFMono-Regular, Menlo, monospace')}>{'{'}x{'}'} Biến hệ thống</button>
    </div>
    {(sysOpen) && (<>
      <div data-ui="1" role="dialog" aria-label="Biến hệ thống" style={S('position: absolute; left: 16px; bottom: 62px; width: 340px; background: #fff; border: 1px solid #e3e1dc; border-radius: 12px; box-shadow: 0 12px 28px rgba(15,23,42,.14); padding: 12px 14px; z-index: 40')}>
        <div style={S('display: flex; align-items: center')}><b style={S('flex: 1; font-size: 13.5px; font-weight: 600')}>Biến hệ thống</b><button type="button" className={Q('ghost')} aria-label="Đóng" onClick={toggleSys} style={S('width: 26px; height: 26px; border-radius: 6px')}>✕</button></div>
        <p style={S('font-size: 12px; color: #686873; margin: 2px 0 6px')}>Dùng được ở mọi bước, chèn bằng / hoặc nút {'{'}x{'}'}.</p>
        {(sysVars || []).map((v, _iv) => (<React.Fragment key={_iv}><div style={S('display: flex; gap: 8px; align-items: baseline; padding: 5px 0; border-top: 1px solid #f1f1f4')}><span style={S('font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; color: #1d4ed8; min-width: 92px')}>{v.v}</span><span style={S('font-size: 11px; color: #686873; min-width: 56px')}>{v.t}</span><span style={S('font-size: 12px; color: #334155')}>{v.d}</span></div></React.Fragment>))}
      </div>
    </>)}

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
    {(explainOpen) && (<>
      <div data-ui="1" onMouseDown={closeExplain} style={S('position: absolute; inset: 0; z-index: 20; background: rgba(15,23,42,.22)')}></div>
      <div data-ui="1" role="dialog" aria-label="Diễn giải luồng" style={S('position: absolute; left: 50%; top: 32px; transform: translateX(-50%); width: 760px; max-width: calc(100% - 32px); max-height: calc(100% - 64px); display: flex; flex-direction: column; background: #fff; border-radius: 14px; box-shadow: 0 24px 60px rgba(15,23,42,.25); z-index: 21; overflow: hidden')}>
        <div style={S('display: flex; align-items: flex-start; gap: 10px; padding: 16px 18px 12px; border-bottom: 1px solid #ececef')}>
          <div style={S('flex: 1')}>
            <div style={S('font-size: 17px; font-weight: 600; color: #121216')}>Diễn giải luồng</div>
            <div style={S('font-size: 14px; color: #3f3f46; line-height: 1.6; margin-top: 6px')}>{(explain.summary || []).map((g, _ig) => (<React.Fragment key={_ig}><span style={S(`color: ${g.c}; font-weight: ${g.w}`)}>{g.t}</span></React.Fragment>))}</div>
            <div role="tablist" style={S('display: flex; gap: 4px; margin-top: 12px')}>
              {(exTabs || []).map((et, _iet) => (<React.Fragment key={_iet}><button type="button" role="tab" aria-selected={et.on} onClick={et.pick} style={S(`height: 28px; padding: 0 10px; border-radius: 7px; border: 1px solid ${et.line}; background: ${et.bg}; color: ${et.fg}; font-size: 12.5px; font-weight: 600`)}>{et.label}</button></React.Fragment>))}
            </div>
          </div>
          <button type="button" className={Q('ghost')} aria-label="Đóng" onClick={closeExplain} style={S('width: 30px; height: 30px; border-radius: 7px')}>✕</button>
        </div>
        {(exMain) && (<>
        <ol style={S('list-style: none; margin: 0; padding: 10px 22px 20px; overflow-y: auto')}>
          {(explain.main || []).map((x, _ix) => (<React.Fragment key={_ix}>
            <li style={S('display: flex; gap: 12px; position: relative; padding-bottom: 16px')}>
              <span style={S(`position: absolute; left: 13px; top: 30px; bottom: 0; width: 2px; background: ${x.line}`)}></span>
              <button type="button" onClick={x.go} title="Mở bước này trên canvas" style={S(`width: 28px; height: 28px; border-radius: 999px; border: 0; background: ${x.dotBg}; color: ${x.dotFg}; font-size: 12px; font-weight: 600; flex-shrink: 0; cursor: pointer; position: relative`)}>{x.n}</button>
              <div style={S('flex: 1; min-width: 0; padding-top: 4px')}>
                <div style={S('font-size: 14.5px; line-height: 1.45; color: #18181b')}>
                  {(x.notEnd) && (<><span>{x.title}</span></>)}
                  {(x.isEnd) && (<><span>{x.title} </span><b style={S(`color: ${x.endFg}; font-weight: 600`)}>{x.endLabel}</b></>)}
                  {(x.hasWho) && (<><span style={S('color: #a1a1aa')}> · </span><b style={S('color: #1d4ed8; font-weight: 600')}>{x.who}</b></>)}
                  {(x.hasMeta) && (<><span style={S('font-size: 12.5px; color: #71717a; margin-left: 8px')}>{x.meta}</span></>)}
                </div>
                {(x.hasExc) && (<>
                  <div style={S('margin-top: 5px; display: flex; flex-direction: column; gap: 3px')}>
                    {(x.exc || []).map((ex, _iex) => (<React.Fragment key={_iex}><div style={S('font-size: 12.5px; color: #71717a; line-height: 1.45; padding-left: 16px; position: relative')}><span style={S('position: absolute; left: 0; color: #a1a1aa')}>↳</span>{(ex.segs || []).map((g, _ig) => (<React.Fragment key={_ig}><span style={S(`color: ${g.c}; font-weight: ${g.w}`)}>{g.t}</span></React.Fragment>))}</div></React.Fragment>))}
                  </div>
                </>)}
              </div>
            </li>
          </React.Fragment>))}
        </ol>
        </>)}
        {(exAll) && (<>
        <ol style={S('list-style: none; margin: 0; padding: 8px 18px 18px; overflow-y: auto')}>
          {(explain.steps || []).map((x, _ix) => (<React.Fragment key={_ix}>
            <li style={S('display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f1f1f4')}>
              <span style={S('width: 26px; height: 26px; border-radius: 999px; background: #f1f1f4; color: #3f3f46; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0')}>{x.n}</span>
              <div style={S('flex: 1; min-width: 0')}>
                <button type="button" onClick={x.go} title="Mở bước này trên canvas" style={S('display: inline-flex; align-items: center; gap: 8px; border: 0; background: none; padding: 0; cursor: pointer')}><span style={S(`width: 22px; height: 22px; border-radius: 6px; background: ${x.tileBg}; display: flex; align-items: center; justify-content: center`)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={x.tile} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={x.icon}></path></svg></span><span style={S('font-size: 14px; font-weight: 600; color: #121216')}>{x.title}</span><span style={S('font-size: 11.5px; color: #71717a')}>{x.kind}</span></button>
                <p style={S('margin: 6px 0 0; font-size: 14px; line-height: 1.65; color: #3f3f46')}>{(x.segs || []).map((g, _ig) => (<React.Fragment key={_ig}><span style={S(`color: ${g.c}; font-weight: ${g.w}`)}>{g.t}</span></React.Fragment>))}</p>
              </div>
            </li>
          </React.Fragment>))}
        </ol>
        </>)}
      </div>
    </>)}
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
          <input id="addq" className={Q('field')} style={S('padding-left: 32px; height: 36px')} placeholder="Tìm bước hoặc connector..." value={addQ} onChange={onAddQ} onKeyDown={onAddKey} autoFocus={true} />
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
          <p style={S('font-size: 11.5px; color: #64748b; margin: 8px 0 0; line-height: 1.5')}>Sửa hết lỗi trong Danh sách kiểm tra thì mới chạy thử và publish được.</p>
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
          {(sel.hasWarn) && (<><div style={S('margin-top: 8px; border: 1px solid #fed7aa; background: #fff7ed; color: #9a3412; border-radius: 8px; padding: 8px 10px; font-size: 12px; line-height: 1.5')}>{sel.warnText}</div></>)}
          {(sel.hasHelp) && (<><p style={S('font-size: 12px; color: #475569; margin: 10px 0 0; line-height: 1.5')}>{sel.help}</p></>)}

          {(pf || []).map((f, _if) => (<React.Fragment key={_if}>
            <div>
              {(f.isSec) && (<><div className={Q('sec')} style={S('margin-top: 20px; padding-top: 12px; border-top: 1px solid #ececef')}>{f.label}</div></>)}
              {(f.hasLabel) && (<><label className={Q('lbl')} htmlFor={f.id}>{f.label}{(f.hasStar) && (<><span style={S('color: #dc2626')}> *</span></>)}</label></>)}
              {(f.isInput) && (<>
                <div style={S('position: relative')}><input id={f.id} className={Q('field')} value={f.value} placeholder={f.ph} onChange={f.onChange} readOnly={f.ro} style={S(`font-family: ${f.font}; padding-right: ${f.padR}`)} />
                {(f.canVar) && (<><button type="button" className={Q('vbtn')} aria-label="Chèn dữ liệu" title="Chèn dữ liệu (/)" onClick={f.insertVar} style={S('top: 6px')}>{'{'}x{'}'}</button></>)}</div>
              </>)}
              {(f.isSelect) && (<><select id={f.id} className={Q('field')} value={f.value} onChange={f.onChange}>{(f.options || []).map((o, _io) => (<React.Fragment key={_io}><option value={o.v}>{o.l}</option></React.Fragment>))}</select></>)}
              {(f.isText) && (<>
                <div style={S('position: relative')}><textarea id={f.id} className={Q('field')} rows={f.rows} value={f.value} placeholder={f.ph} onChange={f.onChange} style={S(`height: auto; padding: 8px 10px; resize: vertical; font-family: ${f.font}`)}></textarea>
                {(f.canVar) && (<><button type="button" className={Q('vbtn')} aria-label="Chèn dữ liệu" title="Chèn dữ liệu (/)" onClick={f.insertVar} style={S('bottom: 10px')}>{'{'}x{'}'}</button></>)}</div>
              </>)}
              {(f.vOpen) && (<>
                <div className={Q('vpk')} role="listbox" aria-label="Chèn dữ liệu">
                  {(f.vGroups || []).map((g, _ig) => (<React.Fragment key={_ig}>
                    <div className={Q('palh')} style={S('padding: 6px 8px 2px')}>{g.g}</div>
                    {(g.items || []).map((it, _iit) => (<React.Fragment key={_iit}><button type="button" className={Q('vpi')} onClick={it.pick}><span style={S('font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #1d4ed8')}>{it.l}</span>{(it.hasD) && (<><span style={S('color: #686873; font-size: 11.5px; margin-left: 6px')}>{it.d}</span></>)}</button></React.Fragment>))}
                  </React.Fragment>))}
                </div>
              </>)}
              {(f.isToggle) && (<>
                <label style={S('display: flex; gap: 10px; align-items: flex-start; cursor: pointer')}><input id={f.id} type="checkbox" role="switch" className={Q('sw')} checked={f.checked} onChange={f.onToggle} /><span style={S('font-size: 12px; color: #475569; line-height: 1.45; padding-top: 1px')}>{f.ph}</span></label>
              </>)}
              {(f.isNum) && (<>
                <div style={S('display: flex; gap: 6px; align-items: center')}>
                  <div className={Q('stp')}><button type="button" aria-label="Giảm" onClick={f.dec} disabled={f.decNot}>−</button><input id={f.id} inputmode="numeric" value={f.value} onChange={f.onChange} /><button type="button" aria-label="Tăng" onClick={f.inc} disabled={f.incNot}>+</button></div>
                  {(f.hasUnit) && (<><select className={Q('field')} aria-label="Đơn vị" value={f.unit} onChange={f.onUnit} style={S('width: 96px')}>{(f.units || []).map((o, _io) => (<React.Fragment key={_io}><option value={o.v}>{o.l}</option></React.Fragment>))}</select></>)}
                </div>
              </>)}
              {(f.isRadio) && (<>
                <div role="radiogroup" aria-label={f.label} style={S(`display: flex; flex-direction: ${f.dir}; gap: 6px`)}>
                  {(f.opts || []).map((o, _io) => (<React.Fragment key={_io}>
                    <button type="button" role="radio" aria-checked={o.on} aria-disabled={o.dis} onClick={o.pick} className={Q('rcard')} style={S(`flex: ${o.flex}; border-color: ${o.bd}; background: ${o.bg}; cursor: ${o.cur}`)}>
                      <span className={Q('rdot')} style={S(`border-color: ${o.dot}`)}><span style={S(`background: ${o.dotIn}`)}></span></span>
                      <span style={S('flex: 1; min-width: 0')}><span style={S(`display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500; color: ${o.fg}`)}>{o.l}{(o.soon) && (<><span className={Q('soon')}>Sắp có</span></>)}</span>
                      {(o.hasD) && (<><span style={S('display: block; font-size: 11.5px; color: #686873; margin-top: 2px; line-height: 1.4')}>{o.d}</span></>)}</span>
                    </button>
                  </React.Fragment>))}
                </div>
              </>)}
              {(f.isChecks) && (<>
                <div style={S('display: flex; flex-direction: column; gap: 6px')}>
                  {(f.opts || []).map((o, _io) => (<React.Fragment key={_io}>
                    <label className={Q('rcard')} style={S(`cursor: ${o.cur}`)}><input type="checkbox" checked={o.on} disabled={o.dis} onChange={o.toggle} style={S('margin-top: 2px; accent-color: #203BDC')} /><span style={S('flex: 1; min-width: 0')}><span style={S(`display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500; color: ${o.fg}`)}>{o.l}{(o.soon) && (<><span className={Q('soon')}>Sắp có</span></>)}</span>{(o.hasD) && (<><span style={S('display: block; font-size: 11.5px; color: #686873; margin-top: 2px')}>{o.d}</span></>)}</span></label>
                  </React.Fragment>))}
                </div>
              </>)}
              {(f.isChips) && (<>
                <div className={Q('chipbox')}>
                  {(f.chips || []).map((ch, _ich) => (<React.Fragment key={_ich}><span className={Q('chip')} title={ch.t}>{ch.l}<button type="button" aria-label={ch.rmAria} onClick={ch.rm}>✕</button></span></React.Fragment>))}
                  <button type="button" className={Q('ghost link')} onClick={f.togglePick} aria-expanded={f.picking} style={S('margin: 0; height: 24px')}>+ Thêm</button>
                </div>
                {(f.picking) && (<>
                  <div className={Q('vpk')}>
                    <input className={Q('field')} aria-label="Tìm người" value={f.q} onChange={f.onQ} placeholder="Tìm theo tên hoặc chức danh" autoFocus={true} style={S('height: 30px; font-size: 12.5px; margin-bottom: 4px')} />
                    {(f.pickList || []).map((p, _ip) => (<React.Fragment key={_ip}><button type="button" className={Q('vpi')} onClick={p.pick}><span style={S('font-weight: 500')}>{p.l}</span><span style={S('color: #686873; font-size: 11.5px; margin-left: 6px')}>{p.d}</span></button></React.Fragment>))}
                    {(f.noPick) && (<><p style={S('font-size: 12px; color: #686873; margin: 6px 8px')}>Không tìm thấy người trong tổ chức.</p></>)}
                  </div>
                </>)}
              </>)}
              {(f.isStatic) && (<><p style={S('font-size: 12px; color: #475569; margin: 10px 0 0; line-height: 1.5; background: #f8fafc; border-radius: 8px; padding: 8px 10px')}>{f.staticText}</p></>)}
              {(f.isConfirm) && (<>
                <div role="alertdialog" aria-label={f.cTitle} style={S('margin-top: 8px; border: 1px solid #fed7aa; background: #fff7ed; border-radius: 10px; padding: 10px 12px')}>
                  <b style={S('font-size: 12.5px; font-weight: 600; color: #9a3412')}>{f.cTitle}</b>
                  <p style={S('font-size: 12px; color: #7c2d12; margin: 4px 0 0; line-height: 1.5')}>{f.cText}</p>
                  <div style={S('display: flex; gap: 6px; justify-content: flex-end; margin-top: 8px')}><button type="button" className={Q('btn')} onClick={f.cancel} style={S('height: 28px; font-size: 12px')}>Huỷ</button><button type="button" className={Q('btn btn-primary')} onClick={f.ok} style={S('height: 28px; font-size: 12px')}>{f.cOk}</button></div>
                </div>
              </>)}
              {(f.isCard) && (<>
                <div style={S('margin-top: 12px; border: 1px solid #e3e1dc; border-radius: 10px; padding: 12px')}>
                  <div style={S('display: flex; align-items: center; gap: 8px')}><span style={S('font-size: 11px; font-weight: 600; color: #203BDC; background: #eceefe; border-radius: 999px; padding: 2px 8px')}>{f.cardHit}</span><span style={S('font-size: 12px; color: #475569')}>{f.cardMeta}</span></div>
                  {(f.cardRules || []).map((r, _ir) => (<React.Fragment key={_ir}><p style={S('font-size: 12px; color: #334155; margin: 8px 0 0; line-height: 1.45')}>{r.t}</p></React.Fragment>))}
                  {(f.moreRules) && (<><p style={S('font-size: 12px; color: #686873; margin: 6px 0 0')}>{f.moreText}</p></>)}
                  {(f.hasCardErr) && (<><p style={S('font-size: 12px; color: #b91c1c; margin: 8px 0 0')}>{f.cardErr}</p></>)}
                  <button type="button" className={Q('btn')} onClick={f.openTable} style={S('margin-top: 10px; width: 100%; justify-content: center; height: 32px; font-size: 12.5px')}>Sửa bảng</button>
                </div>
              </>)}
              {(f.isEditor) && (<>
                <div className={Q('sec')} style={S('margin-top: 20px; padding-top: 12px; border-top: 1px solid #ececef')}>{f.label}</div>
                {(f.items || []).map((li, _ili) => (<React.Fragment key={_ili}>
                  <div style={S('display: flex; gap: 6px; margin-top: 6px; align-items: center')}>
                    {(li.hasTag) && (<><span style={S('font-size: 10.5px; background: #f1f5f9; border-radius: 5px; padding: 3px 6px; white-space: nowrap; color: #334155')}>{li.tag}</span></>)}
                    <input className={Q('field')} aria-label={li.aAria} value={li.a} placeholder={li.aPh} onChange={li.onA} style={S(`font-family: ${li.aFont}; font-size: 12.5px; min-width: 0`)} />
                    {(f.hasB) && (<><input className={Q('field')} aria-label={li.bAria} value={li.b} placeholder={li.bPh} onChange={li.onB} style={S('font-size: 12.5px; min-width: 0')} /></>)}
                    {(li.hasReq) && (<><label title="Bắt buộc" style={S('display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: #475569; white-space: nowrap; cursor: pointer')}><input type="checkbox" checked={li.req} onChange={li.onReq} aria-label={li.reqAria} style={S('accent-color: #203BDC')} />Bắt buộc</label></>)}
                    {(li.hasEdit) && (<><button type="button" className={Q('ghost')} aria-label="Sửa" title="Sửa" onClick={li.edit} style={S('width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"></path></svg></button></>)}
                    <button type="button" className={Q('ghost')} aria-label="Xoá" onClick={li.remove} disabled={li.lock} style={S('width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0')}>✕</button>
                  </div>
                </React.Fragment>))}
                <button type="button" className={Q('ghost link')} onClick={f.add}>{f.addLabel}</button>
                {(f.hasNote) && (<><p style={S('font-size: 11.5px; color: #64748b; margin: 2px 0 0; line-height: 1.5')}>{f.note}</p></>)}
              </>)}
              {(f.hasHint) && (<><p style={S('font-size: 11.5px; color: #64748b; margin: 4px 0 0; line-height: 1.45')}>{f.hint}</p></>)}
            </div>
          </React.Fragment>))}

          {/* Nhánh của If/Else */}
          {(sel.isCond) && (<>
            {(cases || []).map((c, _ic) => (<React.Fragment key={_ic}>
              <div style={S('margin-top: 12px; border: 1px solid #e5e5e5; border-radius: 10px; padding: 10px; background: #fafafa')}>
                <div style={S('display: flex; align-items: center; gap: 6px')}>
                  <label className={Q('sr')} htmlFor={c.id}>Tên nhánh</label>
                  <input id={c.id} className={Q('field')} value={c.name} onChange={c.onName} style={S('height: 30px; font-weight: 600')} />
                  {(c.canRemove) && (<><button type="button" className={Q('ghost')} aria-label="Xoá nhánh" onClick={c.remove} style={S('width: 26px; height: 26px; border-radius: 6px')}>✕</button></>)}
                </div>
                <div style={S('display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12px; color: #475569')}>Điều kiện<button type="button" className={Q('ghost')} onClick={c.toggleLogic} title="Đổi AND / OR" style={S('height: 22px; padding: 0 8px; border-radius: 5px; font-size: 11px; font-weight: 600; border: 1px solid #e5e5e5; background: #fff')}>{c.logic} ▾</button></div>
                {(c.rows || []).map((r, _ir) => (<React.Fragment key={_ir}>
                  <div style={S('display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr) 24px; gap: 6px; margin-top: 6px; align-items: center')}>
                    <select className={Q('field')} aria-label="Thuộc tính" value={r.v} onChange={r.onV} style={S('font-size: 12px')}>{(varOpts || []).map((o, _io) => (<React.Fragment key={_io}><option value={o.v}>{o.l}</option></React.Fragment>))}</select>
                    <select className={Q('field')} aria-label="Toán tử" value={r.op} onChange={r.onOp} style={S('font-size: 12px')}>{(opOpts || []).map((o, _io) => (<React.Fragment key={_io}><option value={o}>{o}</option></React.Fragment>))}</select>
                    <input className={Q('field')} aria-label="Giá trị" value={r.val} onChange={r.onVal} disabled={r.noVal} placeholder={r.valPh} style={S('font-size: 12px')} />
                    <button type="button" className={Q('ghost')} aria-label="Xoá dòng" onClick={r.remove} style={S('width: 24px; height: 24px; border-radius: 5px')}>✕</button>
                  </div>
                </React.Fragment>))}
                <button type="button" className={Q('ghost link')} onClick={c.addRow}>+ Thêm dòng</button>
              </div>
            </React.Fragment>))}
            <button type="button" className={Q('btn')} onClick={addCase} style={S('width: 100%; justify-content: center; margin-top: 10px; height: 32px; font-size: 12.5px')}>+ Thêm nhánh</button>
            <p style={S('font-size: 11.5px; color: #64748b; margin: 8px 0 0; line-height: 1.5')}>Nhánh "Else" được tạo tự động, đi khi không nhánh nào đúng.</p>
          </>)}

          {(sel.hasOutVars) && (<>
            <div className={Q('sec')} style={S('margin-top: 20px; padding-top: 12px; border-top: 1px solid #ececef')}>DỮ LIỆU BƯỚC NÀY TẠO RA</div>
            <div style={S('display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px')}>
              {(outVars || []).map((v, _iv) => (<React.Fragment key={_iv}><span style={S('font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: #1d4ed8; background: #eff6ff; border-radius: 5px; padding: 3px 7px')}>{v}</span></React.Fragment>))}
            </div>
            <p style={S('font-size: 11.5px; color: #64748b; margin: 6px 0 0')}>Bước sau chèn bằng / hoặc nút {'{'}x{'}'}.</p>
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
          <div style={S('background: #f8fafc; border-radius: 8px; padding: 10px')}><div style={S('font-size: 13px; font-weight: 600; line-height: 1.3; min-height: 26px')}>{triggerName}</div><div style={S('font-size: 11.5px; color: #475569')}>khởi chạy</div></div>
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

{(dmnOpen) && (<>
  <div data-ui="1" style={S('position: absolute; inset: 0; background: rgba(15,23,42,.32); z-index: 70; display: flex; align-items: center; justify-content: center; padding: 24px')}>
    <div role="dialog" aria-modal="true" aria-label="Bảng quyết định" style={S('width: min(1080px, 100%); max-height: 100%; display: flex; flex-direction: column; background: #fff; border-radius: 14px; box-shadow: 0 20px 48px rgba(15,23,42,.24); overflow: hidden')}>
      <div style={S('display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #ececef')}>
        <span style={S('flex: 1; min-width: 0')}><b style={S('font-size: 15px; font-weight: 600')}>Bảng quyết định</b><span style={S('font-size: 12px; color: #686873; margin-left: 8px')}>DMN Table · {dmnV.title}</span></span>
        <label htmlFor="dmn-hit" style={S('font-size: 12px; color: #475569')}>Khi nhiều quy tắc cùng khớp</label>
        <select id="dmn-hit" className={Q('field')} value={dmnV.hit} onChange={dmnV.onHit} style={S('width: 280px; height: 32px; font-size: 12.5px')}>{(dmnV.hitOpts || []).map((o, _io) => (<React.Fragment key={_io}><option value={o.v}>{o.l}</option></React.Fragment>))}</select>
        <button type="button" className={Q('ghost')} aria-label="Đóng" onClick={dmnV.close} style={S('width: 30px; height: 30px; border-radius: 8px')}>✕</button>
      </div>
      {(dmnV.hasErrs) && (<><div style={S('margin: 10px 18px 0; border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; border-radius: 8px; padding: 7px 10px; font-size: 12px')}>{dmnV.errText}</div></>)}
      <div style={S('flex: 1; min-height: 400px; overflow: auto; padding: 12px 18px 4px')}>
        <table className={Q('dmn')}>
          <thead>
            <tr><th className={Q('dmn-no')} rowspan="2">#</th><th colspan={dmnV.nCols} className={Q('dmn-g')}>KHI</th><th colspan={dmnV.nRes} className={Q('dmn-g dmn-then')}>THÌ</th><th className={Q('dmn-g')} rowspan="2" style={S('min-width: 160px')}>GHI CHÚ</th><th rowspan="2" style={S('width: 36px')}></th></tr>
            <tr>
              {(dmnV.cols || []).map((c, _ic) => (<React.Fragment key={_ic}>
                <th style={S('position: relative; min-width: 150px')}>
                  <button type="button" className={Q('dmn-h')} onClick={c.toggle} aria-expanded={c.open}><span style={S('display: block; font-weight: 600')}>{c.name}</span><span style={S(`display: block; font-weight: 400; font-size: 11px; color: ${c.subFg}`)}><span style={S('font-family: ui-monospace, SFMono-Regular, Menlo, monospace')}>{c.sub}</span> · {c.t}</span></button>
                  {(c.open) && (<>
                    <div className={Q('dmn-pop')} role="dialog" aria-label="Cột điều kiện">
                      <label className={Q('lbl')} style={S('margin-top: 0')}>Tên cột</label><input className={Q('field')} value={c.rawName} onChange={c.onName} placeholder="VD: Tổng tiền" />
                      <label className={Q('lbl')}>Giá trị cần xét <span style={S('color: #dc2626')}>*</span></label><input className={Q('field')} value={c.expr} onChange={c.onExpr} placeholder="VD: @total" style={S('font-family: ui-monospace, SFMono-Regular, Menlo, monospace')} />
                      <label className={Q('lbl')}>Kiểu</label>
                      <div style={S('display: flex; gap: 6px')}>{(c.types || []).map((ty, _ity) => (<React.Fragment key={_ity}><button type="button" onClick={ty.pick} style={S(`flex: 1; height: 28px; border-radius: 7px; border: 1px solid ${ty.bd}; background: ${ty.bg}; color: ${ty.fg}; font-size: 12px; font-weight: 500`)}>{ty.l}</button></React.Fragment>))}</div>
                      <div style={S('display: flex; justify-content: space-between; margin-top: 12px')}>{(c.canDel) && (<><button type="button" className={Q('ghost')} onClick={c.del} style={S('height: 28px; padding: 0 8px; border-radius: 6px; color: #b91c1c; font-size: 12px')}>Xoá cột</button></>)}<button type="button" className={Q('btn')} onClick={c.toggle} style={S('height: 28px; font-size: 12px; margin-left: auto')}>Xong</button></div>
                    </div>
                  </>)}
                </th>
              </React.Fragment>))}
              {(dmnV.res || []).map((r, _ir) => (<React.Fragment key={_ir}>
                <th className={Q('dmn-then')} style={S('min-width: 150px')}>
                  <div style={S('display: flex; gap: 4px; align-items: center')}><input className={Q('dmn-in')} aria-label={r.ariaN} value={r.name} onChange={r.onName} style={S('font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, monospace')} />{(r.canDel) && (<><button type="button" className={Q('ghost')} aria-label="Xoá cột kết quả" onClick={r.del} style={S('width: 22px; height: 22px; border-radius: 5px; font-size: 11px')}>✕</button></>)}</div>
                  <select className={Q('dmn-in')} aria-label={r.ariaT} value={r.t} onChange={r.onT} style={S('font-weight: 400; font-size: 11px; color: #5b5b66')}>{(r.tOpts || []).map((o, _io) => (<React.Fragment key={_io}><option value={o}>{o}</option></React.Fragment>))}</select>
                </th>
              </React.Fragment>))}
            </tr>
          </thead>
          <tbody>
            {(dmnV.rows || []).map((row, _irow) => (<React.Fragment key={_irow}>
              <tr>
                <td className={Q('dmn-no')}>{row.no}</td>
                {(row.cells || []).map((cl, _icl) => (<React.Fragment key={_icl}><td><input className={Q('dmn-in')} aria-label={cl.aria} value={cl.v} onChange={cl.on} placeholder="Bất kỳ" /></td></React.Fragment>))}
                {(row.vals || []).map((vl, _ivl) => (<React.Fragment key={_ivl}><td className={Q('dmn-then')}><input className={Q('dmn-in')} aria-label={vl.aria} value={vl.v} onChange={vl.on} placeholder="Kết quả" style={S(`box-shadow: inset 0 0 0 1px ${vl.bd}`)} /></td></React.Fragment>))}
                <td><input className={Q('dmn-in')} aria-label={`Ghi chú quy tắc ${row.no}`} value={row.note} onChange={row.onNote} placeholder="Ghi chú" /></td>
                <td style={S('position: relative')}>
                  <button type="button" className={Q('ghost')} aria-label={`Thao tác với quy tắc ${row.no}`} aria-expanded={row.menu} onClick={row.toggleMenu} style={S('width: 26px; height: 26px; border-radius: 6px')}>⋯</button>
                  {(row.menu) && (<>
                    <div className={Q('dmn-menu')} role="menu"><button type="button" role="menuitem" className={Q('cmi')} onClick={row.insAbove}>Chèn quy tắc phía trên</button><button type="button" role="menuitem" className={Q('cmi')} onClick={row.insBelow}>Chèn quy tắc phía dưới</button><button type="button" role="menuitem" className={Q('cmi')} onClick={row.dup}>Nhân bản</button><button type="button" role="menuitem" className={Q('cmi')} onClick={row.del} style={S('color: #b91c1c')}>Xoá</button></div>
                  </>)}
                </td>
              </tr>
            </React.Fragment>))}
            <tr className={Q('dmn-else')}>
              <td className={Q('dmn-no')}>–</td>
              <td colspan={dmnV.nCols}><b style={S('font-size: 12px; font-weight: 600')}>Còn lại</b><span style={S('display: block; font-size: 11px; color: #686873; line-height: 1.4')}>Khi không quy tắc nào khớp. Để trống thì bước dừng với lỗi.</span></td>
              {(dmnV.dflt || []).map((d, _id) => (<React.Fragment key={_id}><td className={Q('dmn-then')}><input className={Q('dmn-in')} aria-label={d.aria} value={d.v} onChange={d.on} placeholder="Để trống" /></td></React.Fragment>))}
              <td></td><td></td>
            </tr>
          </tbody>
        </table>
        <div style={S('display: flex; gap: 6px; margin-top: 8px')}>
          <button type="button" className={Q('ghost link')} onClick={dmnV.addRule} style={S('margin: 0')}>+ Thêm quy tắc</button>
          <button type="button" className={Q('ghost link')} onClick={dmnV.addCol} style={S('margin: 0')}>+ Thêm điều kiện</button>
          <button type="button" className={Q('ghost link')} onClick={dmnV.addRes} style={S('margin: 0')}>+ Thêm kết quả</button>
        </div>
        <p style={S('font-size: 11.5px; color: #686873; margin: 6px 0 10px; line-height: 1.5')}>Ô điều kiện: để trống là Bất kỳ. Viết &gt; 50000000, &gt;= 10, != Khẩn, danh sách "A, B" hoặc khoảng [10..20].</p>
      </div>
      <div style={S('display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-top: 1px solid #ececef')}>
        <span style={S('flex: 1; font-size: 12px; color: #686873')}>Thay đổi được lưu cùng bản nháp ngay khi bạn sửa.</span>
        <button type="button" className={Q('btn btn-primary')} onClick={dmnV.close} style={S('height: 32px')}>Xong</button>
      </div>
    </div>
  </div>
</>)}

{(varOpen) && (<>
  <div data-ui="1" style={S('position: absolute; inset: 0; background: rgba(15,23,42,.32); z-index: 70; display: flex; align-items: center; justify-content: center; padding: 24px')}>
    <div role="dialog" aria-modal="true" aria-label={varV.title} style={S('width: 480px; max-width: 100%; max-height: 100%; overflow-y: auto; background: #fff; border-radius: 14px; box-shadow: 0 20px 48px rgba(15,23,42,.24); padding: 18px 20px')}>
      <div style={S('display: flex; align-items: center')}><b style={S('flex: 1; font-size: 15px; font-weight: 600')}>{varV.title}</b><button type="button" className={Q('ghost')} aria-label="Đóng" onClick={varV.cancel} style={S('width: 28px; height: 28px; border-radius: 7px')}>✕</button></div>
      <div className={Q('lbl')}>Kiểu</div>
      <div role="radiogroup" aria-label="Kiểu biến" style={S('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px')}>
        {(varV.types || []).map((ty, _ity) => (<React.Fragment key={_ity}>
          <button type="button" role="radio" aria-checked={ty.on} aria-disabled={ty.dis} onClick={ty.pick} className={Q('rcard')} style={S(`border-color: ${ty.bd}; background: ${ty.bg}; padding: 7px 10px`)}><span style={S(`flex: 1; display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500; color: ${ty.fg}`)}>{ty.l}<span style={S('font-size: 11px; color: #9a9aa3; font-family: ui-monospace, SFMono-Regular, Menlo, monospace')}>{ty.code}</span>{(ty.soon) && (<><span className={Q('soon')}>Sắp có</span></>)}</span></button>
        </React.Fragment>))}
      </div>
      <label className={Q('lbl')} htmlFor="vm-name">Tên biến <span style={S('color: #dc2626')}>*</span></label>
      <input id="vm-name" className={Q('field')} value={varV.name} onChange={varV.onName} placeholder="VD: total" autoFocus={true} aria-invalid={varV.hasErr} style={S('font-family: ui-monospace, SFMono-Regular, Menlo, monospace')} />
      <p style={S('font-size: 11.5px; color: #64748b; margin: 4px 0 0')}>Chữ, số và _. Dấu cách thành _.</p>
      {(varV.hasErr) && (<><p role="alert" style={S('font-size: 12px; color: #b91c1c; margin: 4px 0 0')}>{varV.err}</p></>)}
      <label className={Q('lbl')} htmlFor="vm-def">Giá trị mặc định</label>
      <input id="vm-def" className={Q('field')} value={varV.def} onChange={varV.onDef} placeholder="Không bắt buộc" />
      <label className={Q('lbl')} htmlFor="vm-desc">Mô tả</label>
      <textarea id="vm-desc" className={Q('field')} rows="2" value={varV.desc} onChange={varV.onDesc} placeholder="Cho agent biết cần điền gì vào đây." style={S('height: auto; padding: 8px 10px; resize: vertical')}></textarea>
      <label style={S('display: flex; gap: 10px; align-items: center; margin-top: 12px; cursor: pointer')}><input type="checkbox" role="switch" className={Q('sw')} checked={varV.req} onChange={varV.toggleReq} /><span style={S('font-size: 12.5px')}>Bắt buộc</span></label>
      <div style={S('display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px')}><button type="button" className={Q('btn')} onClick={varV.cancel}>Huỷ</button><button type="button" className={Q('btn btn-primary')} onClick={varV.save}>{varV.okLabel}</button></div>
    </div>
  </div>
</>)}

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
      navigate(rec ? "/agents/" + rec.id : "/processes", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
