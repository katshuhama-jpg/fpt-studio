import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AgentAnalytics, { type AnalyticsSection } from "./AgentAnalytics";

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});
const show = async (section: AnalyticsSection, qs = "", props: Partial<React.ComponentProps<typeof AgentAnalytics>> = {}) => {
  render(<MemoryRouter initialEntries={[`/agents/faq?tab=insights&section=${section}${qs}`]}><AgentAnalytics agentId="faq" section={section} published onOpenChannels={() => {}} onPublish={() => {}} {...props} /></MemoryRouter>);
  await act(async () => { await new Promise(r => setTimeout(r, 450)); });
};

describe("Insights v1.3", () => {
  it("Tổng quan: 4 thẻ, mặc định 7 ngày qua, giờ cập nhật 2 giờ, không so sánh kỳ trước", async () => {
    await show("performance");
    for (const t of ["Số người dùng đang hoạt động", "Phiên", "Tổng lượt tương tác", "Token sử dụng"]) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.queryByText("Tỷ lệ Like")).toBeNull();
    expect(screen.getByLabelText("Khoảng thời gian: 7 ngày qua")).toBeTruthy();
    expect(screen.getByText(/Giờ cập nhật:/)).toBeTruthy();
    expect(screen.getByText(/Lần cập nhật kế tiếp:/)).toBeTruthy();
    expect(screen.getByText(/\d+ Like : \d+ Dislike/)).toBeTruthy();
    expect(screen.queryByText(/So với/)).toBeNull();
  });
  it("chưa publish: tag Chưa có số liệu, số liệu kênh thật là --, vẫn có token Chạy thử", async () => {
    await show("performance", "", { published: false });
    expect(screen.getByText("Chưa có số liệu")).toBeTruthy();
    expect(screen.getAllByText("--").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole("button", { name: /Publish/ })).toBeTruthy();
  });
  it("Chất lượng: số lượt Like/Dislike mới + giữ các bảng cũ (Phase 2)", async () => {
    await show("feedback");
    expect(screen.getByText("Số lượt Like")).toBeTruthy();
    expect(screen.getByText("CSAT")).toBeTruthy();
    expect(screen.getByText("Số lần Guardrail chặn")).toBeTruthy();
    expect(screen.queryByText("Tỷ lệ Like và tỷ lệ Dislike theo ngày")).toBeNull();
  });
  it("Agent không phải hội thoại: Đang phát triển", async () => {
    await show("performance", "", { kind: "process" });
    expect(screen.getByText("Đang phát triển")).toBeTruthy();
  });
  it("link khoảng thời gian không hợp lệ quay về 7 ngày qua", async () => {
    await show("cost", "&range=custom&from=2020-01-01&to=2020-03-01");
    expect(screen.getByLabelText("Khoảng thời gian: 7 ngày qua")).toBeTruthy();
    expect(screen.getByText("% đầu vào / đầu ra")).toBeTruthy();
  });
});

describe("Insights demo theo từng Agent", () => {
  it("mỗi Agent một trạng thái", async () => {
    const one = async (agentId: string) => {
      const r = render(<MemoryRouter initialEntries={[`/agents/${agentId}?tab=insights`]}><AgentAnalytics agentId={agentId} section="performance" published onOpenChannels={() => {}} /></MemoryRouter>);
      await act(async () => { await new Promise(res => setTimeout(res, 450)); });
      return r;
    };
    let r = await one("finance-check"); expect(screen.getByText("Chưa có phiên nào")).toBeTruthy(); r.unmount();
    r = await one("legal-review"); expect(screen.getByText("Không có phiên trong khoảng thời gian này")).toBeTruthy(); r.unmount();
    r = await one("three-way-match-agent"); expect(screen.getByText(/Unpublish từ/)).toBeTruthy(); r.unmount();
    r = await one("ops"); expect(screen.getByText("Không tải được số liệu. Vui lòng thử lại.")).toBeTruthy(); r.unmount();
    r = await one("policy-assistant"); expect(screen.getByText(/Agent bắt đầu có số liệu từ/)).toBeTruthy(); r.unmount();
  });
});
