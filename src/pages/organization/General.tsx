import { Card, Row, PageHeader } from "./shared";
import fptLogo from "@/assets/fpt-logo.jpg";

export default function General() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="Thông tin chung" desc="Cách tổ chức của bạn hiển thị với đồng nghiệp. Chỉ xem." />

      <Card>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-xl bg-white border border-border flex items-center justify-center shadow-soft shrink-0 overflow-hidden">
            <img src={fptLogo} alt="FPT logo" className="w-full h-full object-contain p-2" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">FPT Corporation</div>
            <p className="text-xs text-muted-foreground mt-0.5">Logo tổ chức</p>
          </div>
        </div>
        <Row label="Tên tổ chức">
          <span className="text-sm text-foreground">FPT Corporation</span>
        </Row>
        <Row label="URL slug">
          <span className="text-sm text-foreground">app.fptai.com/fpt-corp</span>
        </Row>
        <Row label="Ngôn ngữ mặc định">
          <span className="text-sm text-foreground">Tiếng Việt</span>
        </Row>
      </Card>
    </div>
  );
}
