# Agent Hub

ok, tôi đã nghiên cứu các đối thủ như Agent X, Relevance AI ( https://relevanceai.com/docs/build/introduction), coze.com (https://www.coze.com/open/docs/guides), và xác định cần sắp xếp lại giao diện và chức năng như sau. Hãy vẽ mockup theo ý của tôi
Sau khi đăng nhập, giao diện đầu tiên người dùng cần nhìn thấy tại cấp Workspace là trang Home. Home là 1 menu đầu tiên. Sau đó gồm các menu tiếp theo là Marketplace, My Agents Cấp workspace đã được chỉ định cho người có quyền.
1. Tại trang Home, hiển thị: 
- Khu vực tạo: workforce (Multi-Agent), new Agent, Tool, Knowledge
- Recent: Agent gần đây tương tác/chỉnh sửa
- Recommended AI Agents: Show 1 vài Agent phổ biến và dẫn dẫn sang menu Marketplace
- Basic models: Hiển thị các models được phép chat của FPT AI Marketplace, nhấn vào từng Models, dẫn sang MyAgents cho phép chat với Models
-  New on FPT AI Agents: gồm What's FPT AI Agents (dẫn sang Document center), Quick start ((dẫn sang Document center), Release Note((dẫn sang Document center), 
2.  Marketplace (hiện tại chưa có)
3. MyAgents: Nhấn sang trang MyAgent cho phép user chat với 1 con Agent mặc định với 1 số skill mặc định. Có thể @Agent để trò chuyện, hoặc chọn 1 Agent để trò chuyện
Phần Build gồm:
1. Agents: Hiển thị list Agent nếu có, hoặc cho phép tạo mới Agent
3. Knowledge: Knowledge chung của cả workspace: Cho tạo mới gồm: Upload document, website, sharepoint, FAQs
4. Workspace Settings: Model management, Thuật ngữ, Members, Audit log
Phần còn lại 
1. Template Store: gồm Task template, Agent template
2. Tool store: Hiển thị các builtin tools
3. API Keys
4. Document center

Tại menu Agents, hiển thị sẵn list Agent cho phép chọn 1 Agent, hệ thống chuyển hướng sang màn Build Agent gồm 2 tab lớn là Develop, Monitor (Analyze)
Tại Develop gồm:
1. Build:- General: Cho phép nhập Persona & Guildeline,chọn model, Các business process kèm theo tool và task, Guardrails
- Knowledge: Hiển thị knowledge của Agent đó
- Tool: Quản lý tool, Còn ở general cũng hiển thị tool trong luồng business process
- Task: Quản lý task. Còn ở general cũng hiển thị task trong luồng business process
- Trigger
-------
2. Test:
- Test case management
- Auto test
3. Advanced settings
- Nhắc nhở
- Thông tin xác thực
- Quản lý hội thoại
- Cấu hình chủ đề
- Opening questions
- Auto-sugestion
- Show reference
Tại Monitor bao gồm:1. Báo cáo (hiệu suất, hội thoại, người dùng)
2. Chất lượng (Đánh giá hài lòng, Đánh giá hội thoại)
3. Lịch sử (Lịch sử trò chuyện, Lịch sử kích hoạt)
Dưới đây là màn hình tôi đã có được, khá ổn, hãy phân tích thêm đối thủ và cho 1 bản hoàn thiện hơn:

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fptaiagents.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/93852083-d135-4a13-ac1d-034946e64966).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
test
test2
