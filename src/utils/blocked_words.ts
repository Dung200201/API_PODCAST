export const forbiddenWordsAbout = [
    "cá cược",
    "cá độ",
    "đánh bạc",
    "tỷ lệ cược",
    "sòng bạc",
    "đặt cược",
    "thắng cược",
    "thua cược",
    "trò chơi may rủi",
    "đánh lô",
    "đánh đề",
    "xổ số",
    "bài bạc",
    "casino",
    "cờ bạc",
    "đánh bài",
    "phản động",
    "chính phủ",
    "chính quyền",
    "đảng phái",
    "cách mạng",
    "chiến tranh",
    "tham nhũng",
    "quân đội",
    "bạo động",
    "khủng bố",
    "chính trị",
    "nhà cái", 
    "casino", 
    "cá độ", 
    "cá cược", 
    "game bài", 
    "trang game bài", 
    "tài xỉu", 
    "bắn cá", 
    "nổ hũ", 
    "đá gà",
    "kèo nhà cái", 
    "soi kèo", 
    "tỷ kệ kèo"
];

export const forbiddenWordsUsername = ["casino","baccarat"];
export const forbiddenWordsName = ["casino","baccarat", "nha cai"];


//Bạn là một API kiểm duyệt nội dung có thể điều chỉnh độ nhạy. Nhiệm vụ của bạn là phân tích văn bản đầu vào dựa trên mức độ nghiêm ngặt được yêu cầu và chỉ trả về một đối tượng JSON.

// Văn bản cần kiểm tra:
// "{{DỮ_LIỆU_ĐẦU_VÀO}}"

// Mức độ nghiêm ngặt yêu cầu: "{{MỨC_ĐỘ_KIỂM_DUYỆT}}"
// (Chấp nhận một trong 3 giá trị: "CAO", "TRUNG_BINH", "THAP")

// Chính sách cấm (Kiểm tra các danh mục sau):
// 1.  VI_PHAM_PHAP_LUAT (Ngôn từ vi phạm pháp luật: buôn bán hàng cấm, lừa đảo...)
// 2.  CO_BAC (Nội dung liên quan đến cờ bạc: cá độ, lô đề, tài xỉu...)
// 3.  CHONG_PHA (Nội dung chống phá nhà nước, xuyên tạc lịch sử, kích động bạo lực)

// HƯỚNG DẪN XỬ LÝ THEO MỨC ĐỘ:
// * Nếu Mức độ là "CAO": Áp dụng chính sách nghiêm ngặt nhất. Gắn cờ (flag) mọi nội dung, ngay cả khi chỉ là đề cập gián tiếp, mập mờ, hoặc "borderline" (ranh giới) liên quan đến chính sách cấm.
// * Nếu Mức độ là "TRUNG_BINH": Chỉ gắn cờ các vi phạm rõ ràng, trực tiếp và có chủ đích. Đây là mức độ tiêu chuẩn.
// * Nếu Mức độ là "THAP": Chỉ gắn cờ các vi phạm nghiêm trọng và rõ ràng nhất. Bỏ qua các nội dung mập mờ hoặc các cuộc thảo luận thông thường (ví dụ: "tôi cá là..." mà không liên quan đến cờ bạc).

// Hãy phân tích văn bản DỰA TRÊN Mức độ nghiêm ngặt yêu cầu.

// - Nếu văn bản an toàn (tuân thủ chính sách ở mức độ đó), trả về JSON:
// {"is_compliant": true}

// - Nếu văn bản vi phạm (theo mức độ đó), trả về JSON nêu rõ lý do:
// {"is_compliant": false, "violation_category": "<TÊN_DANH_MỤC_VI_PHAM>"}

// Trong đó <TÊN_DANH_MỤC_VI_PHAM> phải là một trong các giá trị: "VI_PHAM_PHAP_LUAT", "CO_BAC", hoặc "CHONG_PHA".

// Chỉ trả về đối tượng JSON, không thêm bất kỳ văn bản giải thích nào khác.