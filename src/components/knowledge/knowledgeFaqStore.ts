// sessionStorage-backed FAQ store for a Console Knowledge Base's "Câu hỏi thường gặp" tab.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { KnowledgeFaqStatus } from "./knowledgeStatus";
import { normalizeForCompare, similarity } from "./textSimilarity";

export interface KnowledgeFaq {
  id: string;
  kbId: string;
  question: string;
  answer: string;
  categories: string[];
  status: KnowledgeFaqStatus;
  /** Reason shown in the row's info-icon tooltip — only meaningful for "failed" and "invalid". */
  statusReason?: string;
  chunkCount: number;
  updatedAt: number;
  updatedBy: string;
}

export interface CategoryOption { name: string; count: number }

export interface ImportRowInput {
  question: string;
  answer: string;
  categories: string[];
  /** Set when this row matched an existing FAQ during import validation — "overwrite" mode
   * updates that FAQ in place instead of inserting a new row. */
  duplicateOfId?: string;
}

const STORE_KEY = "knowledge_faq_store_v6";
const SEEDED_KEY = "knowledge_faq_store_seeded_v6";
const store = loadMap<string, KnowledgeFaq>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

const LONG_ANSWER_INTRO = "Quy trình khôi phục quyền truy cập tài khoản khi khách hàng vừa đổi số điện thoại đăng ký nhưng vẫn giữ nguyên CCCD và các giấy tờ định danh khác được thực hiện qua nhiều bước để đảm bảo an toàn thông tin. ";
const LONG_ANSWER_STEP = "Bước tiếp theo, quý khách cần chuẩn bị đầy đủ giấy tờ tùy thân bản gốc còn hiệu lực, đến quầy giao dịch gần nhất hoặc thực hiện xác thực qua video call với tổng đài viên, cung cấp thông tin xác minh bổ sung nếu được yêu cầu, sau đó chờ hệ thống xử lý và gửi thông báo xác nhận qua kênh liên lạc đã đăng ký trước đó. ";
function buildLongAnswer(): string {
  let s = LONG_ANSWER_INTRO;
  while (s.length < 4600) s += LONG_ANSWER_STEP;
  return s;
}

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
    put({ id: "faq-2-5", kbId, question: "Tại sao giao dịch chuyển khoản của tôi báo lỗi liên tục?", answer: "Lỗi thường gặp do sai thông tin tài khoản thụ hưởng, hạn mức chuyển khoản trong ngày đã đạt tối đa, hoặc hệ thống ngân hàng thụ hưởng đang bảo trì. Vui lòng kiểm tra lại thông tin hoặc thử lại sau ít phút.", categories: ["Chuyển khoản"], status: "failed", statusReason: "Không đọc được nội dung câu trả lời.", chunkCount: 0, updatedAt: now - 2 * DAY, updatedBy: "Tran Nam" });
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
    put({ id: "faq-2-14", kbId, question: "Tôi có thể đóng tài khoản thanh toán trực tuyến không?", answer: "Hiện tại việc đóng tài khoản cần thực hiện tại quầy giao dịch để xác minh danh tính và tất toán các khoản liên kết.", categories: ["Tài khoản"], status: "done", chunkCount: 1, updatedAt: now - 11 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-15", kbId, question: "Hạn mức chuyển khoản trong ngày qua ứng dụng là bao nhiêu?", answer: "Hạn mức mặc định là 500 triệu đồng/ngày, có thể điều chỉnh tăng thêm tại quầy giao dịch với xác minh bổ sung.", categories: ["Chuyển khoản"], status: "done", chunkCount: 1, updatedAt: now - 13 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-16", kbId, question: "Làm sao để đăng ký Internet Banking lần đầu?", answer: "Tải ứng dụng ABC Bank, chọn Đăng ký, nhập số CCCD và số điện thoại đã đăng ký với ngân hàng, xác thực OTP rồi tạo mật khẩu đăng nhập.", categories: ["Ứng dụng", "Tài khoản"], status: "done", chunkCount: 1, updatedAt: now - DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-17", kbId, question: "Thẻ ghi nợ và thẻ tín dụng khác nhau như thế nào?", answer: "Thẻ ghi nợ trừ tiền trực tiếp từ số dư tài khoản, còn thẻ tín dụng cho phép chi tiêu trước trong hạn mức và thanh toán lại vào kỳ sao kê.", categories: ["Thẻ"], status: "done", chunkCount: 1, updatedAt: now - 16 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-18", kbId, question: "Tôi có thể rút tiền mặt bằng thẻ tín dụng không?", answer: "Có, nhưng giao dịch rút tiền mặt bằng thẻ tín dụng chịu phí và lãi suất cao hơn giao dịch mua sắm thông thường.", categories: ["Thẻ", "Phí dịch vụ"], status: "done", chunkCount: 1, updatedAt: now - 17 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-19", kbId, question: "Làm sao để tra cứu lịch sử giao dịch quá 6 tháng?", answer: "Quý khách có thể yêu cầu sao kê chi tiết tại quầy giao dịch hoặc qua tổng đài, thời gian xử lý từ 1-3 ngày làm việc.", categories: ["Tài khoản"], status: "pending", chunkCount: 0, updatedAt: now - 20 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "faq-2-20", kbId, question: "Ứng dụng ABC Bank có hỗ trợ đăng nhập bằng vân tay không?", answer: "Có, quý khách bật tính năng này tại Cài đặt > Bảo mật > Đăng nhập sinh trắc học trên thiết bị hỗ trợ.", categories: ["Ứng dụng", "Bảo mật"], status: "done", chunkCount: 1, updatedAt: now - 5 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-21", kbId, question: "Phí rút tiền tại cây ATM ngân hàng khác là bao nhiêu?", answer: "Phí rút tiền ngoài hệ thống ABC Bank là 3.300đ/giao dịch, áp dụng theo biểu phí hiện hành.", categories: ["Phí dịch vụ"], status: "done", chunkCount: 1, updatedAt: now - 6 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-22", kbId, question: "Tôi có thể vay thế chấp sổ tiết kiệm không?", answer: "Có, khách hàng có thể vay tối đa 90% giá trị sổ tiết kiệm với lãi suất ưu đãi hơn vay tín chấp thông thường.", categories: ["Vay", "Tiết kiệm"], status: "done", chunkCount: 1, updatedAt: now - 19 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-23", kbId, question: "Điều kiện tất toán sổ tiết kiệm trước hạn là gì?", answer: "Khách hàng có thể tất toán trước hạn bất kỳ lúc nào nhưng chỉ được hưởng lãi suất không kỳ hạn cho phần thời gian đã gửi.", categories: ["Tiết kiệm"], status: "done", chunkCount: 1, updatedAt: now - 22 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-24", kbId, question: "Làm sao để biết giao dịch của tôi có bị nghi ngờ gian lận không?", answer: "Hệ thống sẽ gửi thông báo xác thực bổ sung qua SMS hoặc ứng dụng khi phát hiện giao dịch bất thường, quý khách cần xác nhận trong vòng 5 phút.", categories: ["Bảo mật"], status: "processing", chunkCount: 0, updatedAt: now - 30 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "faq-2-25", kbId, question: "Tôi có thể đổi loại thẻ từ Classic lên Gold không?", answer: "Có, quý khách gửi yêu cầu nâng hạng thẻ tại ứng dụng hoặc quầy giao dịch, ngân hàng sẽ thẩm định hồ sơ thu nhập trước khi phê duyệt.", categories: ["Thẻ"], status: "done", chunkCount: 1, updatedAt: now - 10 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-26", kbId, question: "Khiếu nại về phí dịch vụ không đúng biểu phí cần gửi ở đâu?", answer: "Quý khách gửi khiếu nại qua mục Hỗ trợ trong ứng dụng hoặc tổng đài 1900 xxxx kèm ảnh chụp giao dịch để bộ phận vận hành đối chiếu.", categories: ["Khiếu nại", "Phí dịch vụ"], status: "done", chunkCount: 1, updatedAt: now - 14 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-27", kbId, question: "Tôi có thể mở tài khoản cho con dưới 18 tuổi không?", answer: "Có, phụ huynh hoặc người giám hộ hợp pháp có thể mở tài khoản giám hộ tại quầy giao dịch với giấy khai sinh của trẻ.", categories: ["Tài khoản"], status: "done", chunkCount: 1, updatedAt: now - 25 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-28", kbId, question: "Vay mua ô tô cần thế chấp gì?", answer: "Khoản vay mua ô tô thường thế chấp bằng chính chiếc xe mua, ngân hàng giữ đăng ký xe bản gốc trong suốt thời gian vay.", categories: ["Vay"], status: "done", chunkCount: 1, updatedAt: now - 18 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-29", kbId, question: "Tại sao ứng dụng báo lỗi khi tôi cập nhật thông tin cá nhân?", answer: "", status: "invalid", statusReason: "Câu trả lời còn trống, chưa thể lập chỉ mục.", categories: ["Ứng dụng"], chunkCount: 0, updatedAt: now - 40 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "faq-2-30", kbId, question: "Sao kê?", answer: "Sao kê là gì đó liên quan tới lịch sử giao dịch, thực ra chưa rõ khách cần hỏi gì cụ thể ở đây nên khó trả lời trọn vẹn được luôn.", categories: ["Tài khoản"], status: "invalid", statusReason: "Câu hỏi quá ngắn để lập chỉ mục.", chunkCount: 0, updatedAt: now - DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-31", kbId, question: "Chuyển khoản nhầm tài khoản thì phải làm sao?", answer: "Quý khách liên hệ ngay tổng đài hoặc chi nhánh gần nhất để được hỗ trợ liên hệ ngân hàng thụ hưởng thu hồi giao dịch, thời gian xử lý tùy thuộc vào thiện chí của người nhận.", categories: ["Chuyển khoản", "Khiếu nại"], status: "failed", statusReason: "Không thể kết nối đến dịch vụ lập chỉ mục. Vui lòng thử lại sau.", chunkCount: 0, updatedAt: now - 3 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-32", kbId, question: "Làm sao để nhận biết tin nhắn giả mạo ngân hàng?", answer: "Ngân hàng không bao giờ yêu cầu cung cấp mật khẩu, mã OTP qua tin nhắn hoặc cuộc gọi; quý khách nên kiểm tra kỹ đầu số gửi và không bấm vào đường link lạ.", categories: ["Bảo mật"], status: "done", chunkCount: 1, updatedAt: now - 8 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "faq-2-33", kbId, question: "Tôi muốn khôi phục quyền truy cập tài khoản sau khi đổi số điện thoại thì làm thế nào?", answer: buildLongAnswer(), categories: ["Tài khoản", "Bảo mật"], status: "done", chunkCount: 3, updatedAt: now - 2 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-34", kbId, question: "Phí thường niên thẻ tín dụng Gold là bao nhiêu?", answer: "Phí thường niên thẻ Gold là 300.000đ/năm, được miễn năm đầu tiên khi mở thẻ mới.", categories: ["Thẻ", "Phí dịch vụ"], status: "done", chunkCount: 1, updatedAt: now - 21 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-35", kbId, question: "Tôi có thể thanh toán hóa đơn điện nước qua ứng dụng không?", answer: "Có, chọn mục Thanh toán hóa đơn trên ứng dụng, chọn nhà cung cấp dịch vụ và nhập mã khách hàng để thanh toán.", categories: ["Ứng dụng"], status: "done", chunkCount: 1, updatedAt: now - 9 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "faq-2-36", kbId, question: "Ngân hàng có chương trình hoàn tiền cho thẻ tín dụng không?", answer: "Có, thẻ Gold và Platinum được hoàn tiền 1-3% cho các giao dịch tại siêu thị, nhà hàng và mua sắm trực tuyến tùy chương trình từng thời điểm.", categories: ["Thẻ"], status: "done", chunkCount: 1, updatedAt: now - 23 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-37", kbId, question: "Tôi cần làm gì khi ứng dụng báo tài khoản bị khóa tạm thời?", answer: "Quý khách liên hệ tổng đài 1900 xxxx để xác minh danh tính và được hỗ trợ mở khóa lại tài khoản trong thời gian sớm nhất.", categories: ["Tài khoản", "Bảo mật"], status: "pending", chunkCount: 0, updatedAt: now - 15 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "faq-2-38", kbId, question: "Lãi suất vay mua nhà cố định trong bao lâu?", answer: "Lãi suất ưu đãi cố định trong 12 hoặc 24 tháng đầu tùy gói vay, sau đó áp dụng lãi suất thả nổi theo quy định của ngân hàng.", categories: ["Vay"], status: "done", chunkCount: 1, updatedAt: now - 24 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-39", kbId, question: "Tôi có thể ủy quyền cho người khác giao dịch thay tại quầy không?", answer: "Có, cần có giấy ủy quyền công chứng và giấy tờ tùy thân của cả hai bên khi thực hiện giao dịch ủy quyền.", categories: ["Tài khoản"], status: "done", chunkCount: 1, updatedAt: now - 26 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-40", kbId, question: "Sản phẩm tiết kiệm online có lãi suất cao hơn tại quầy không?", answer: "Có, tiết kiệm online thường có lãi suất cao hơn 0.1-0.3%/năm so với gửi tại quầy do tiết kiệm chi phí vận hành.", categories: ["Tiết kiệm"], status: "done", chunkCount: 1, updatedAt: now - 27 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-41", kbId, question: "Tôi bị trừ phí SMS Banking dù không đăng ký, phải làm sao?", answer: "Quý khách gửi khiếu nại kèm ảnh chụp giao dịch qua ứng dụng hoặc tổng đài để bộ phận vận hành kiểm tra và hoàn phí nếu xác nhận lỗi hệ thống.", categories: ["Khiếu nại", "Phí dịch vụ"], status: "done", chunkCount: 1, updatedAt: now - 12 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "faq-2-42", kbId, question: "Làm sao để hủy đăng ký SMS Banking?", answer: "Quý khách vào Cài đặt > Thông báo > SMS Banking trên ứng dụng và chọn hủy, hoặc yêu cầu tại quầy giao dịch.", categories: ["Ứng dụng"], status: "done", chunkCount: 1, updatedAt: now - 28 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-43", kbId, question: "Tôi muốn tăng hạn mức vay tín chấp thì cần chứng minh gì?", answer: "Cần bổ sung sao kê lương gần nhất, hợp đồng lao động còn hiệu lực và lịch sử tín dụng tốt trong 12 tháng gần nhất.", categories: ["Vay"], status: "done", chunkCount: 1, updatedAt: now - 29 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-44", kbId, question: "Tài khoản của tôi có bị tính phí nếu không giao dịch trong thời gian dài không?", answer: "Có, tài khoản không phát sinh giao dịch trong 12 tháng liên tục sẽ chuyển sang trạng thái không hoạt động và áp dụng phí duy trì riêng.", categories: ["Tài khoản", "Phí dịch vụ"], status: "done", chunkCount: 1, updatedAt: now - 30 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-45", kbId, question: "Tôi có thể xem lại hợp đồng vay điện tử ở đâu?", answer: "Hợp đồng vay điện tử được lưu tại mục Hồ sơ của tôi trên ứng dụng, quý khách có thể tải về hoặc yêu cầu bản in tại quầy.", categories: ["Vay", "Ứng dụng"], status: "done", chunkCount: 1, updatedAt: now - 31 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-46", kbId, question: "Chuyển tiền quốc tế qua ABC Bank mất phí bao nhiêu?", answer: "Phí chuyển tiền quốc tế dao động 0.2%-0.5% số tiền chuyển tùy loại hình chuyển khoản và ngân hàng trung gian.", categories: ["Chuyển khoản", "Phí dịch vụ"], status: "done", chunkCount: 1, updatedAt: now - 32 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-47", kbId, question: "Tôi có thể đăng ký vay online hoàn toàn không cần đến quầy không?", answer: "Một số gói vay tín chấp nhỏ hỗ trợ đăng ký và giải ngân hoàn toàn online, các khoản vay lớn hơn vẫn cần xác minh trực tiếp tại quầy.", categories: ["Vay", "Ứng dụng"], status: "processing", chunkCount: 0, updatedAt: now - 45 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "faq-2-48", kbId, question: "Có thể mở nhiều sổ tiết kiệm cùng lúc không?", answer: "Có, khách hàng có thể mở không giới hạn số lượng sổ tiết kiệm với các kỳ hạn khác nhau trên cùng một tài khoản.", categories: ["Tiết kiệm"], status: "done", chunkCount: 1, updatedAt: now - 33 * DAY, updatedBy: "Tran Nam" });
  }

  if (kbId === "kb-1") {
    put({ id: "faq-1-1", kbId, question: "Ngân hàng ABC có những loại thẻ tín dụng nào?", answer: "ABC Bank cung cấp thẻ tín dụng Classic, Gold và Platinum, mỗi hạng thẻ có hạn mức và ưu đãi hoàn tiền khác nhau tùy theo hồ sơ thu nhập của khách hàng.", categories: ["Thẻ"], status: "done", chunkCount: 1, updatedAt: now - 2 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-1-2", kbId, question: "Điều kiện để được vay mua nhà tại ABC Bank là gì?", answer: "Khách hàng cần từ 20-65 tuổi, có nguồn thu nhập ổn định chứng minh được, tài sản đảm bảo hợp pháp, và lịch sử tín dụng tốt (không nợ xấu nhóm 3 trở lên).", categories: ["Vay"], status: "done", chunkCount: 1, updatedAt: now - 5 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-1-3", kbId, question: "Chính sách bảo mật thông tin khách hàng được quy định như thế nào?", answer: "Thông tin khách hàng được mã hóa và lưu trữ theo tiêu chuẩn bảo mật ngành ngân hàng, chỉ được chia sẻ khi có sự đồng ý của khách hàng hoặc theo yêu cầu của cơ quan nhà nước có thẩm quyền.", categories: ["Bảo mật"], status: "pending", chunkCount: 0, updatedAt: now - 3 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "faq-1-4", kbId, question: "Quy trình khiếu nại khi phát hiện giao dịch gian lận là gì?", answer: "Khách hàng cần khóa thẻ/tài khoản ngay lập tức, sau đó liên hệ tổng đài hoặc chi nhánh gần nhất để lập biên bản khiếu nại kèm bằng chứng giao dịch để ngân hàng tiến hành điều tra và xử lý.", categories: ["Khiếu nại"], status: "done", chunkCount: 1, updatedAt: now - 4 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-1-5", kbId, question: "Lãi suất tiết kiệm kỳ hạn 12 tháng hiện nay là bao nhiêu?", answer: "Lãi suất tiết kiệm kỳ hạn 12 tháng hiện là 5.5%/năm đối với hình thức lĩnh lãi cuối kỳ, có thể thay đổi theo từng thời điểm công bố của ngân hàng.", categories: ["Tiết kiệm"], status: "processing", chunkCount: 0, updatedAt: now - 8 * 60_000, updatedBy: "Tran Nam" });
  }

  // kb-4 "Chính sách nhân sự" — shared to Tran Nam by Linh Phan with "Có thể xem" access.
  if (kbId === "kb-4") {
    put({ id: "faq-4-1", kbId, question: "Nhân viên mới được nghỉ phép từ khi nào?", answer: "Nhân viên mới được cộng dồn ngày phép ngay từ tháng đầu tiên làm việc, theo tỷ lệ tương ứng với số tháng đã làm trong năm.", categories: ["Nghỉ phép"], status: "done", chunkCount: 1, updatedAt: now - 6 * DAY, updatedBy: "Linh Phan" });
    put({ id: "faq-4-2", kbId, question: "Bảo hiểm y tế bắt đầu áp dụng từ lúc nào?", answer: "Bảo hiểm y tế được kích hoạt từ ngày ký hợp đồng chính thức, sau khi kết thúc thời gian thử việc.", categories: ["Bảo hiểm"], status: "done", chunkCount: 1, updatedAt: now - 9 * DAY, updatedBy: "Linh Phan" });
    put({ id: "faq-4-3", kbId, question: "Làm sao để đăng ký nghỉ phép không lương?", answer: "Nhân viên gửi đơn xin nghỉ phép không lương qua hệ thống nhân sự nội bộ, cần được quản lý trực tiếp phê duyệt trước ít nhất 3 ngày làm việc.", categories: ["Nghỉ phép"], status: "pending", chunkCount: 0, updatedAt: now - 2 * 60_000, updatedBy: "Linh Phan" });
    put({ id: "faq-4-4", kbId, question: "Chính sách làm việc từ xa được áp dụng như thế nào?", answer: "Nhân viên có thể làm việc từ xa tối đa 2 ngày/tuần sau khi được quản lý trực tiếp đồng ý, riêng vị trí yêu cầu có mặt tại văn phòng không áp dụng.", categories: ["Làm việc từ xa"], status: "processing", chunkCount: 0, updatedAt: now - 18 * 60_000, updatedBy: "Linh Phan" });
  }

  // kb-5 "Kịch bản bán hàng" — shared to Tran Nam by Mai Hoang with "Có thể chỉnh sửa" access.
  if (kbId === "kb-5") {
    put({ id: "faq-5-1", kbId, question: "Khách hàng từ chối vì giá cao thì nên phản hồi thế nào?", answer: "Tập trung làm rõ giá trị và lợi ích lâu dài của sản phẩm thay vì tranh luận về giá, đồng thời gợi ý các gói hoặc ưu đãi phù hợp với ngân sách khách hàng.", categories: ["Từ chối"], status: "done", chunkCount: 1, updatedAt: now - 3 * DAY, updatedBy: "Mai Hoang" });
    put({ id: "faq-5-2", kbId, question: "Làm sao để mở đầu cuộc gọi tư vấn hiệu quả?", answer: "Giới thiệu ngắn gọn bản thân và mục đích cuộc gọi, xác nhận đây là thời điểm thuận tiện để trao đổi, sau đó đặt câu hỏi mở để hiểu nhu cầu khách hàng.", categories: ["Mở đầu"], status: "done", chunkCount: 1, updatedAt: now - 7 * DAY, updatedBy: "Mai Hoang" });
    put({ id: "faq-5-3", kbId, question: "Khi nào nên đề xuất chương trình khuyến mãi?", answer: "Chỉ nên đề xuất khuyến mãi sau khi khách hàng đã hiểu rõ giá trị sản phẩm, để tránh khiến khách hàng chỉ chờ giảm giá thay vì cân nhắc nhu cầu thực tế.", categories: ["Khuyến mãi"], status: "pending", chunkCount: 0, updatedAt: now - 40 * 60_000, updatedBy: "Mai Hoang" });
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
  listCategoriesWithCounts(kbId: string): CategoryOption[] {
    const counts = new Map<string, number>();
    for (const f of this.list(kbId)) for (const c of f.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },
  isDuplicateQuestion(kbId: string, question: string, excludeId?: string): boolean {
    const n = question.trim().toLowerCase();
    return this.list(kbId).some(f => f.id !== excludeId && f.question.trim().toLowerCase() === n);
  },
  /** Exact match (normalized) plus up to 3 near-matches (>=85% similarity), for the Create/Edit
   * FAQ modal's live duplicate-detection warning. The FAQ being edited never matches itself. */
  findMatches(kbId: string, question: string, excludeId?: string): { exact: KnowledgeFaq | null; similar: KnowledgeFaq[] } {
    const candidates = this.list(kbId).filter(f => f.id !== excludeId);
    const target = normalizeForCompare(question);
    let exact: KnowledgeFaq | null = null;
    const scored: { faq: KnowledgeFaq; score: number }[] = [];
    for (const f of candidates) {
      if (normalizeForCompare(f.question) === target) { exact = f; continue; }
      const score = similarity(f.question, question);
      if (score >= 0.85) scored.push({ faq: f, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return { exact, similar: scored.slice(0, 3).map(s => s.faq) };
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
    store.set(id, { ...cur, ...patch, status: "pending", statusReason: undefined, chunkCount: 0, updatedAt: Date.now() });
    persist();
  },
  updateStatus(id: string, status: KnowledgeFaqStatus, patch?: Partial<Pick<KnowledgeFaq, "chunkCount" | "statusReason">>) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, status, ...patch, updatedAt: Date.now() });
    persist();
  },
  /** Re-queues a single "failed" row for processing. Returns false (no-op) for any other status,
   * including "invalid" — those need an edit first, not a retry. */
  reprocess(id: string): boolean {
    const cur = store.get(id);
    if (!cur || cur.status !== "failed") return false;
    store.set(id, { ...cur, status: "pending", statusReason: undefined, updatedAt: Date.now() });
    persist();
    return true;
  },
  removeMany(ids: string[]) {
    for (const id of ids) store.delete(id);
    persist();
  },
  /** Bulk "Gán danh mục". "add" (default) merges the given categories into what each selected
   * FAQ already has (deduplicated case-insensitively, capped at 10). "replace" discards each
   * FAQ's existing categories and sets exactly the given list instead. */
  assignCategories(ids: string[], categories: string[], mode: "add" | "replace" = "add") {
    for (const id of ids) {
      const cur = store.get(id);
      if (!cur) continue;
      let merged: string[];
      if (mode === "replace") {
        merged = [...categories];
      } else {
        merged = [...cur.categories];
        for (const c of categories) if (!merged.some(m => m.toLowerCase() === c.toLowerCase())) merged.push(c);
      }
      store.set(id, { ...cur, categories: merged.slice(0, 10), updatedAt: Date.now() });
    }
    persist();
  },
  /** Renames a category everywhere it's used within one Kho tri thức. */
  renameCategory(kbId: string, oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    for (const f of this.list(kbId)) {
      if (!f.categories.some(c => c.toLowerCase() === oldName.toLowerCase())) continue;
      const next = f.categories.map(c => (c.toLowerCase() === oldName.toLowerCase() ? trimmed : c));
      store.set(f.id, { ...f, categories: [...new Set(next)], updatedAt: Date.now() });
    }
    persist();
  },
  /** Removes a category from every FAQ that carries it — the questions themselves are untouched. */
  deleteCategory(kbId: string, name: string) {
    for (const f of this.list(kbId)) {
      if (!f.categories.some(c => c.toLowerCase() === name.toLowerCase())) continue;
      store.set(f.id, { ...f, categories: f.categories.filter(c => c.toLowerCase() !== name.toLowerCase()), updatedAt: Date.now() });
    }
    persist();
  },
  /** Merges two or more categories into one — every FAQ using any of `names` switches to
   * `keepName` instead (deduplicated if it already had the kept name too). */
  mergeCategories(kbId: string, names: string[], keepName: string) {
    const lowerNames = new Set(names.map(n => n.toLowerCase()));
    for (const f of this.list(kbId)) {
      if (!f.categories.some(c => lowerNames.has(c.toLowerCase()))) continue;
      const next = f.categories.map(c => (lowerNames.has(c.toLowerCase()) ? keepName : c));
      store.set(f.id, { ...f, categories: [...new Set(next)], updatedAt: Date.now() });
    }
    persist();
  },
  /** Inserts validated import rows. A row carrying `duplicateOfId` either updates that existing
   * FAQ in place ("overwrite") or is skipped entirely ("skip"), per the batch-wide mode chosen
   * in the import modal. Returns the ids that were inserted or updated, all left at "pending"
   * so the caller can animate them through the same processing lifecycle as a manual save. */
  importRows(kbId: string, rows: ImportRowInput[], duplicateMode: "skip" | "overwrite"): string[] {
    const affectedIds: string[] = [];
    for (const row of rows) {
      if (row.duplicateOfId) {
        if (duplicateMode === "skip") continue;
        const cur = store.get(row.duplicateOfId);
        if (!cur) continue;
        store.set(row.duplicateOfId, {
          ...cur, answer: row.answer, categories: row.categories,
          status: "pending", statusReason: undefined, updatedAt: Date.now(),
        });
        affectedIds.push(row.duplicateOfId);
        continue;
      }
      const id = `faq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
      store.set(id, {
        id, kbId, question: row.question, answer: row.answer, categories: row.categories,
        status: "pending", chunkCount: 0, updatedAt: Date.now(), updatedBy: "Tran Nam",
      });
      affectedIds.push(id);
    }
    persist();
    return affectedIds;
  },
};
