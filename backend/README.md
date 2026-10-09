# LocalCraft Backend API

Backend phục vụ nền tảng LocalCraft xây dựng trên nền tảng Django 5 và Django REST Framework (DRF), kết nối trực tiếp CSDL MySQL cài đặt trên máy.

---

## 1. Cấu trúc thư mục

```text
backend/
├── config/                  # Thiết lập hệ thống Django
│   ├── settings/            # Cấu hình môi trường (base, development, production)
│   ├── urls.py              # Root URL router
│   ├── wsgi.py              # WSGI entry point
│   └── asgi.py              # ASGI entry point
├── apps/                    # Các module nghiệp vụ theo domain
│   ├── common/              # Utilities, abstract models, pagination, helpers dùng chung
│   ├── accounts/            # Quản lý tài khoản, phân quyền, người dùng
│   ├── artisans/            # Hồ sơ nghệ nhân
│   ├── villages/            # Thông tin làng nghề truyền thống
│   ├── stories/             # Bài viết văn hóa, câu chuyện sản phẩm
│   ├── products/            # Danh mục và sản phẩm thủ công
│   ├── workshops/           # Khóa học / workshop trải nghiệm
│   ├── bookings/            # Đặt chỗ lịch workshop
│   ├── orders/              # Đơn hàng mua sản phẩm
│   ├── payments/            # Xử lý giao dịch thanh toán
│   ├── reviews/             # Đánh giá, bình luận
│   ├── recommendations/     # AI Recommendation engine
│   ├── chatbot/             # AI tư vấn văn hóa & hỗ trợ du khách
│   ├── notifications/       # Thông báo hệ thống
│   └── moderation/          # Kiểm duyệt nội dung của admin
├── tests/                   # Test cases tổng hợp
├── requirements/            # Quản lý thư viện Python
├── manage.py                # Django CLI tool
└── .env.example             # Biến môi trường mẫu
```

---

## 2. Hướng dẫn thiết lập & Chạy Backend

1. **Chuẩn bị CSDL MySQL:**
   - Đảm bảo MySQL đang chạy cục bộ (port 3306).
   - Tạo database:
     ```sql
     CREATE DATABASE IF NOT EXISTS localcraft_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```

2. **Cấu hình biến môi trường:**
   Tạo tệp `.env` từ `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Cập nhật `DB_USER` (ví dụ `root`) và `DB_PASSWORD` cho đúng với mật khẩu MySQL trên máy bạn.

3. **Tạo môi trường ảo (Virtualenv):**
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # Linux/macOS:
   source .venv/bin/activate
   ```

4. **Cài đặt thư viện phát triển:**
   ```bash
   pip install -r requirements/development.txt
   ```

5. **Chạy Migration & Khởi động Server:**
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```
   Server sẽ chạy tại `http://localhost:8000`.
