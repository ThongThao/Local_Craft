# LocalCraft - Thiết kế cơ sở dữ liệu (Database Design Overview)

Tài liệu này phác thảo các miền dữ liệu (Domains) và các bảng thực thể dự kiến trong cơ sở dữ liệu MySQL của dự án LocalCraft.

---

## 1. Thiết lập CSDL (Database Configuration)

- **Hệ quản trị CSDL:** MySQL 8.0
- **Bộ mã ký tự (Charset):** `utf8mb4`
- **Quy tắc so sánh (Collation):** `utf8mb4_unicode_ci`
- **Naming convention:** Snake_case cho tên bảng và tên cột (`created_at`, `user_id`, `artisan_profile`). Khóa chính sử dụng chuẩn `BigAutoField` (`id`). Khóa ngoại có hậu tố `_id`.

---

## 2. Các miền dữ liệu chính (Data Domains)

### 2.1. Quản lý người dùng & phân quyền (`accounts`)
- `users`: Tài khoản người dùng (họ tên, email, số điện thoại, mật khẩu mã hóa, vai trò: `tourist`, `artisan`, `admin`, trạng thái kích hoạt).
- `user_profiles`: Thông tin hồ sơ cá nhân mở rộng (avatar, tiểu sử, ngôn ngữ ưa thích, vị trí).

### 2.2. Nghệ nhân & Làng nghề (`artisans`, `villages`, `stories`)
- `villages`: Thông tin làng nghề (tên, mô tả, địa chỉ, tỉnh/thành, tọa độ GPS, lịch sử hình thành, hình ảnh tiêu biểu).
- `artisan_profiles`: Thông tin nghệ nhân (liên kết `user_id`, thâm niên, chuyên môn, thuộc làng nghề `village_id`, chứng nhận, danh hiệu).
- `cultural_stories`: Bài viết câu chuyện văn hóa, lịch sử nghề, câu chuyện sản phẩm gắn với nghệ nhân hoặc làng nghề.

### 2.3. Sản phẩm thủ công & Danh mục (`products`)
- `categories`: Danh mục sản phẩm (Gốm sứ, Dệt may, Điêu khắc mộc, Mây tre đan...).
- `products`: Thông tin sản phẩm (tên, mã SKU, mô tả, câu chuyện sản phẩm, giá bán, số lượng tồn kho, nghệ nhân `artisan_id`, trạng thái kiểm duyệt).
- `product_images`: Hình ảnh chi tiết của sản phẩm.

### 2.4. Workshop & Lịch trải nghiệm (`workshops`, `bookings`)
- `workshops`: Khóa trải nghiệm thủ công do nghệ nhân tổ chức (tiêu đề, mô tả, nội dung học, địa điểm tổ chức, thời lượng, số lượng khách tối đa, giá vé/người).
- `workshop_schedules`: Lịch mở lớp theo ngày, khung giờ và số chỗ còn trống.
- `bookings`: Đơn đặt chỗ tham gia workshop của khách du lịch (khách hàng, lịch học, số lượng khách, tổng tiền, trạng thái: `pending`, `confirmed`, `completed`, `cancelled`).

### 2.5. Đơn hàng & Thanh toán (`orders`, `payments`)
- `orders`: Đơn mua sản phẩm thủ công (người mua, địa chỉ nhận hàng, số điện thoại, tổng tiền hàng, phí vận chuyển, trạng thái đơn hàng).
- `order_items`: Chi tiết sản phẩm trong đơn hàng (sản phẩm, đơn giá tại thời điểm mua, số lượng).
- `payments`: Giao dịch thanh toán (liên kết đơn hàng hoặc booking, phương thức thanh toán, mã giao dịch, số tiền, trạng thái thanh toán).

### 2.6. Đánh giá & Phản hồi (`reviews`)
- `reviews`: Đánh giá và chấm điểm sao từ khách du lịch dành cho sản phẩm hoặc trải nghiệm workshop.
- `review_images`: Ảnh chụp thực tế đính kèm đánh giá.

### 2.7. Gợi ý cá nhân hóa & Chatbot (`recommendations`, `chatbot`)
- `user_preferences`: Sở thích của người dùng (chủ đề quan tâm, mức ngân sách, địa điểm yêu thích).
- `interaction_logs`: Lịch sử tương tác (lượt xem, tìm kiếm, thêm vào giỏ, đặt chỗ) phục vụ thuật toán đề xuất (Collaborative Filtering / Content-based).
- `chat_sessions` & `chat_messages`: Lưu vết hội thoại giữa du khách và trợ lý AI tư vấn văn hóa / lịch trình.

### 2.8. Kiểm duyệt & Thông báo (`moderation`, `notifications`)
- `moderation_logs`: Lịch sử kiểm duyệt nội dung của quản trị viên (sản phẩm mới, workshop, bài viết văn hóa).
- `notifications`: Thông báo hệ thống gửi đến người dùng (cập nhật đơn hàng, xác nhận booking, nhắc lịch).
