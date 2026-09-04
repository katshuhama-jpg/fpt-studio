// sessionStorage-backed FAQ store for a Console Knowledge Base's "Câu hỏi thường gặp" tab.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { KnowledgeProcessingStatus } from "./knowledgeStatus";

export interface KnowledgeFaq {
  id: string;
  kbId: string;
  question: string;
  answer: string;
  categories: string[];
  status: KnowledgeProcessingStatus;
  chunkCount: number;
  updatedAt: number;
  updatedBy: string;
}

const STORE_KEY = "knowledge_faq_store_v2";
const SEEDED_KEY = "knowledge_faq_store_seeded_v2";
const store = loadMap<string, KnowledgeFaq>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

function seedKb(kbId: string) {
  const flagKey = `${SEEDED_KEY}:${kbId}`;
  if (sessionStorage.getItem(flagKey)) return;
  sessionStorage.setItem(flagKey, "1");
  const now = Date.now();
  const DAY = 86_400_000;
  const put = (f: KnowledgeFaq) => store.set(f.id, f);

  if (kbId === "kb-2") {
    put({ id: "faq-2-1", kbId, question: "Làm sao để khóa thẻ khi bị mất?", answer: "Bạn có thể khóa thẻ ngay trên ứng dụng ABC Bank tại mục Thẻ của tôi, hoặc gọi hotline 1900 xxxx để được hỗ trợ khóa thẻ tức thì.", categories: ["Thẻ"], status: "done", chunkCount: 1, updatedAt: now - 3 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-2", kbId, question: "Thời gian xử lý yêu cầu mở thẻ tín dụng là bao lâu?", answer: "Thông thường từ 3-5 ngày làm việc kể từ khi hồ sơ đầy đủ và hợp lệ.", categories: ["Thẻ", "Xử lý"], status: "done", chunkCount: 1, updatedAt: now - 6 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-3", kbId, question: "Tôi có thể thay đổi hạn mức thẻ tín dụng không?", answer: "Có, bạn có thể gửi yêu cầu điều chỉnh hạn mức qua ứng dụng hoặc tại quầy giao dịch, kèm theo chứng minh thu nhập nếu tăng hạn mức.", categories: ["Thẻ"], status: "processing", chunkCount: 0, updatedAt: now - 10 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "faq-2-4", kbId, question: "Tôi quên mật khẩu đăng nhập ứng dụng, phải làm sao?", answer: "Chọn \"Quên mật khẩu\" ở màn hình đăng nhập, xác thực bằng OTP gửi về số điện thoại đã đăng ký, sau đó đặt lại mật khẩu mới theo hướng dẫn.", categories: ["Tài khoản", "Bảo mật"], status: "pending", chunkCount: 0, updatedAt: now - 5 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "faq-2-5", kbId, question: "Tại sao giao dịch chuyển khoản của tôi báo lỗi liên tục?", answer: "Lỗi thường gặp do sai thông tin tài khoản thụ hưởng, hạn mức chuyển khoản trong ngày đã đạt tối đa, hoặc hệ thống ngân hàng thụ hưởng đang bảo trì. Vui lòng kiểm tra lại thông tin hoặc thử lại sau ít phút.", categories: ["Chuyển khoản"], status: "failed", chunkCount: 0, updatedAt: now - 2 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-6", kbId, question: "Tôi có thể mở tài khoản ký quỹ chứng khoán qua ứng dụng ABC Bank không?", answer: "Tính năng này đã ngừng cung cấp qua ứng dụng ABC Bank kể từ năm 2025; quý khách vui lòng liên hệ trực tiếp công ty chứng khoán đối tác để được hỗ trợ.", categories: ["Đầu tư"], status: "cancelled", chunkCount: 0, updatedAt: now - 20 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-7", kbId, question: "Phí duy trì tài khoản thanh toán hàng tháng là bao nhiêu?", answer: "Phí duy trì tài khoản thanh toán là 11.000đ/tháng, được miễn nếu số dư bình quân trong tháng đạt từ 5.000.000đ trở lên.", categories: ["Phí dịch vụ", "Tài khoản"], status: "done", chunkCount: 1, updatedAt: now - 8 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-8", kbId, question: "Làm thế nào để đăng ký nhận thông báo biến động số dư qua SMS?", answer: "Quý khách có thể đăng ký tại quầy giao dịch, qua tổng đài 1900 xxxx, hoặc trực tiếp trong ứng dụng tại mục Cài đặt > Thông báo > SMS Banking.", categories: ["Ứng dụng", "Tài khoản"], status: "done", chunkCount: 1, updatedAt: now - 12 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-9", kbId, question: "Ngân hàng có hỗ trợ giao dịch vào ngày lễ, Tết không?", answer: "Ứng dụng ABC Bank và Internet Banking hoạt động 24/7 kể cả ngày lễ, Tết. Các chi nhánh và phòng giao dịch tạm nghỉ theo lịch nghỉ lễ do Ngân hàng Nhà nước công bố.", categories: [], status: "done", chunkCount: 1, updatedAt: now - 15 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-10", kbId, question: "Lãi suất vay tiêu dùng hiện tại là bao nhiêu?", answer: "Lãi suất vay tiêu dùng tín chấp dao động từ 14%-22%/năm tùy theo hồ sơ và lịch sử tín dụng của khách hàng, được thẩm định cụ thể khi nộp hồ sơ vay.", categories: ["Vay"], status: "done", chunkCount: 1, updatedAt: now - 4 * DAY, updatedBy: "Tran Nam" });
    put({
      id: "faq-2-11", kbId,
      question: "Tôi cần chuẩn bị giấy tờ gì khi đến quầy giao dịch để thực hiện đồng thời mở thẻ tín dụng mới, đăng ký Internet Banking và cập nhật lại thông tin CMND/CCCD đã hết hạn trên hồ sơ?",
      answer: "Quý khách mang theo CCCD gắn chip còn hiệu lực, sổ hộ khẩu hoặc giấy xác nhận cư trú, sao kê lương 3 tháng gần nhất (hoặc hợp đồng lao động), và điền vào các mẫu đơn tương ứng tại quầy — nhân viên giao dịch sẽ hỗ trợ xử lý đồng thời cả ba yêu cầu trong cùng một lượt giao dịch.",
      categories: ["Thẻ", "Tài khoản", "Chuyển khoản", "Bảo mật", "Xử lý", "Ứng dụng"],
      status: "done", chunkCount: 1, updatedAt: now - DAY, updatedBy: "Tran Nam",
    });
    put({
      id: "faq-2-12", kbId,
      question: "Tôi đã thực hiện giao dịch chuyển khoản liên ngân hàng vào tài khoản của người thân tại một ngân hàng khác cách đây ba ngày làm việc, số tiền đã bị trừ khỏi tài khoản của tôi ngay sau khi xác nhận giao dịch, tuy nhiên đến thời điểm hiện tại người nhận vẫn khẳng định chưa nhận được khoản tiền này trong tài khoản của họ, tôi cũng đã thử liên hệ tổng đài chăm sóc khách hàng nhưng chỉ nhận được phản hồi chung chung là \"đang xử lý\" mà không có thời gian cụ thể, vậy trong trường hợp này tôi cần cung cấp thêm những thông tin, giấy tờ gì và nên thực hiện các bước như thế nào để yêu cầu ngân hàng tiến hành tra soát và xử lý dứt điểm giao dịch bị treo này trong thời gian sớm nhất?",
      answer: "Quý khách vui lòng gửi yêu cầu tra soát qua ứng dụng hoặc tổng đài, kèm theo mã giao dịch, ảnh chụp màn hình xác nhận và thông tin tài khoản thụ hưởng để bộ phận vận hành tiến hành đối soát với ngân hàng nhận.",
      categories: ["Chuyển khoản", "Khiếu nại"],
      status: "done", chunkCount: 1, updatedAt: now - 7 * DAY, updatedBy: "Tran Nam",
    });
    put({
      id: "faq-2-13", kbId,
      question: "Quy trình tra soát giao dịch chuyển khoản bị treo hoặc chưa đến tài khoản thụ hưởng được thực hiện như thế nào?",
      answer: "Khi phát hiện giao dịch chuyển khoản gặp sự cố, quý khách cần thực hiện tra soát theo quy trình sau. Bước 1: Quý khách kiểm tra lại lịch sử giao dịch trên ứng dụng ABC Bank hoặc Internet Banking để xác nhận trạng thái giao dịch, bao gồm mã giao dịch, số tiền, thời gian thực hiện và tài khoản thụ hưởng. Bước 2: Nếu giao dịch hiển thị trạng thái \"Đang xử lý\" quá 24 giờ làm việc hoặc trạng thái \"Thành công\" nhưng người nhận xác nhận chưa nhận được tiền, quý khách vui lòng chuẩn bị đầy đủ các thông tin sau để gửi yêu cầu tra soát: họ tên chủ tài khoản, số tài khoản nguồn, số tài khoản thụ hưởng, tên ngân hàng thụ hưởng, số tiền giao dịch, thời gian thực hiện giao dịch, mã giao dịch (nếu có) và ảnh chụp màn hình xác nhận giao dịch. Bước 3: Quý khách có thể gửi yêu cầu tra soát qua một trong các kênh sau: (1) Gọi tổng đài chăm sóc khách hàng 1900 xxxx, chọn nhánh Tra soát giao dịch, cung cấp thông tin xác thực và mô tả sự cố cho tổng đài viên; (2) Đến trực tiếp quầy giao dịch gần nhất và điền vào mẫu Đơn đề nghị tra soát giao dịch; (3) Gửi yêu cầu qua mục Hỗ trợ trong ứng dụng ABC Bank, chọn Tra soát giao dịch chuyển khoản và đính kèm các thông tin, hình ảnh liên quan. Bước 4: Sau khi tiếp nhận yêu cầu, ngân hàng sẽ tiến hành đối soát với ngân hàng thụ hưởng và phản hồi kết quả tra soát trong tối đa 5 ngày làm việc đối với giao dịch nội mạng và tối đa 15 ngày làm việc đối với giao dịch liên ngân hàng có yếu tố phức tạp. Trong thời gian chờ xử lý, quý khách sẽ nhận được mã theo dõi yêu cầu qua tin nhắn hoặc email đã đăng ký để tiện tra cứu tiến độ xử lý bất kỳ lúc nào cần thiết. Bước 5: Nếu kết quả tra soát xác nhận lỗi thuộc về hệ thống ngân hàng, số tiền sẽ được hoàn trả vào tài khoản của quý khách trong vòng 1-2 ngày làm việc kể từ khi có kết luận chính thức từ bộ phận vận hành. Trường hợp giao dịch đã được chuyển thành công đến tài khoản thụ hưởng nhưng chưa được xử lý do lỗi từ phía ngân hàng nhận, ngân hàng ABC sẽ chủ động liên hệ và phối hợp với ngân hàng đối tác để đẩy nhanh tiến độ xử lý hồ sơ của quý khách. Quý khách lưu ý không nên thực hiện lại giao dịch chuyển khoản trong thời gian chờ kết quả tra soát để tránh phát sinh giao dịch trùng lặp gây khó khăn cho việc đối soát sau này. Nếu quá thời hạn xử lý cam kết mà chưa nhận được phản hồi chính thức, quý khách có thể liên hệ trực tiếp bộ phận Chăm sóc khách hàng cấp cao qua số hotline ưu tiên được cung cấp trong email xác nhận yêu cầu tra soát ban đầu để được hỗ trợ đẩy nhanh tiến độ xử lý hồ sơ một cách triệt để nhất. Ngoài ra, đối với các giao dịch có giá trị lớn từ 50.000.000đ trở lên, ngân hàng khuyến nghị quý khách nên gọi trực tiếp tổng đài ngay sau khi thực hiện giao dịch thay vì chờ đến khi phát hiện bất thường, vì các giao dịch giá trị lớn thường được đối soát ưu tiên và có thể xử lý nhanh hơn nếu được báo cáo sớm. Toàn bộ quá trình tra soát đều miễn phí đối với khách hàng, ngân hàng ABC không thu bất kỳ khoản phí nào cho dịch vụ tra soát giao dịch, kể cả trong trường hợp kết quả xác định lỗi không thuộc về hệ thống ngân hàng.",
      categories: ["Khiếu nại", "Chuyển khoản"],
      status: "done", chunkCount: 2, updatedAt: now - 9 * DAY, updatedBy: "Tran Nam",
    });
  }

  if (kbId === "kb-1") {
    put({ id: "faq-1-1", kbId, question: "Ngân hàng ABC có những loại thẻ tín dụng nào?", answer: "ABC Bank cung cấp thẻ tín dụng Classic, Gold và Platinum, mỗi hạng thẻ có hạn mức và ưu đãi hoàn tiền khác nhau tùy theo hồ sơ thu nhập của khách hàng.", categories: ["Thẻ"], status: "done", chunkCount: 1, updatedAt: now - 2 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-1-2", kbId, question: "Điều kiện để được vay mua nhà tại ABC Bank là gì?", answer: "Khách hàng cần từ 20-65 tuổi, có nguồn thu nhập ổn định chứng minh được, tài sản đảm bảo hợp pháp, và lịch sử tín dụng tốt (không nợ xấu nhóm 3 trở lên).", categories: ["Vay"], status: "done", chunkCount: 1, updatedAt: now - 5 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-1-3", kbId, question: "Chính sách bảo mật thông tin khách hàng được quy định như thế nào?", answer: "Thông tin khách hàng được mã hóa và lưu trữ theo tiêu chuẩn bảo mật ngành ngân hàng, chỉ được chia sẻ khi có sự đồng ý của khách hàng hoặc theo yêu cầu của cơ quan nhà nước có thẩm quyền.", categories: ["Bảo mật"], status: "pending", chunkCount: 0, updatedAt: now - 3 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "faq-1-4", kbId, question: "Quy trình khiếu nại khi phát hiện giao dịch gian lận là gì?", answer: "Khách hàng cần khóa thẻ/tài khoản ngay lập tức, sau đó liên hệ tổng đài hoặc chi nhánh gần nhất để lập biên bản khiếu nại kèm bằng chứng giao dịch để ngân hàng tiến hành điều tra và xử lý.", categories: ["Khiếu nại"], status: "done", chunkCount: 1, updatedAt: now - 4 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-1-5", kbId, question: "Lãi suất tiết kiệm kỳ hạn 12 tháng hiện nay là bao nhiêu?", answer: "Lãi suất tiết kiệm kỳ hạn 12 tháng hiện là 5.5%/năm đối với hình thức lĩnh lãi cuối kỳ, có thể thay đổi theo từng thời điểm công bố của ngân hàng.", categories: ["Tiết kiệm"], status: "processing", chunkCount: 0, updatedAt: now - 8 * 60_000, updatedBy: "Tran Nam" });
  }

  persist();
}

// Normalizes records created before `categories` existed on this store (stale sessionStorage
// data from earlier in development) so components can always assume an array.
const normalize = (f: KnowledgeFaq): KnowledgeFaq => (f.categories ? f : { ...f, categories: [] });

export const knowledgeFaqStore = {
  list(kbId: string): KnowledgeFaq[] {
    seedKb(kbId);
    return [...store.values()].filter(f => f.kbId === kbId).sort((a, b) => b.updatedAt - a.updatedAt).map(normalize);
  },
  get(kbId: string, id: string): KnowledgeFaq | undefined {
    seedKb(kbId);
    const f = store.get(id);
    return f ? normalize(f) : undefined;
  },
  listCategories(kbId: string): string[] {
    const set = new Set<string>(this.list(kbId).flatMap(f => f.categories));
    return [...set].sort();
  },
  isDuplicateQuestion(kbId: string, question: string, excludeId?: string): boolean {
    const n = question.trim().toLowerCase();
    return this.list(kbId).some(f => f.id !== excludeId && f.question.trim().toLowerCase() === n);
  },
  create(kbId: string, data: { question: string; answer: string; categories: string[] }): KnowledgeFaq {
    const id = `faq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const rec: KnowledgeFaq = {
      id, kbId, question: data.question.trim(), answer: data.answer.trim(), categories: data.categories,
      status: "pending", chunkCount: 0, updatedAt: Date.now(), updatedBy: "Tran Nam",
    };
    store.set(id, rec);
    persist();
    return rec;
  },
  update(id: string, patch: Partial<Pick<KnowledgeFaq, "question" | "answer" | "categories">>) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, ...patch, status: "pending", chunkCount: 0, updatedAt: Date.now() });
    persist();
  },
  updateStatus(id: string, status: KnowledgeProcessingStatus, patch?: Partial<Pick<KnowledgeFaq, "chunkCount">>) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, status, ...patch, updatedAt: Date.now() });
    persist();
  },
  removeMany(ids: string[]) {
    for (const id of ids) store.delete(id);
    persist();
  },
};
