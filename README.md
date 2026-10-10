# LocalCraft

Nền tảng số kết nối nghệ nhân và khách du lịch thông qua sản phẩm thủ công, làng nghề truyền thống và hoạt động trải nghiệm workshop, tích hợp AI hỗ trợ đề xuất cá nhân hóa.

---

## 1. Công nghệ sử dụng (Technology Stack)

- **Frontend:** React + Vite + TypeScript (SPA)
- **Backend:** Django + Django REST Framework (DRF)
- **Database:** MySQL 8.0 (cài đặt và chạy trực tiếp trên máy host)
- **AI / Data:** Python (tích hợp trong Django ban đầu, module hóa sẵn sàng tách sang FastAPI microservice khi mở rộng)
- **Version control:** Git

---

## 2. Cấu trúc thư mục (Monorepo Overview)

```text
localcraft/
├── frontend/             # Ứng dụng React + Vite + TypeScript
│   ├── public/           # Static public assets
│   ├── src/              # Source code (features, components, hooks, services...)
│   └── package.json
├── backend/              # Django + Django REST Framework
│   ├── config/           # Cấu hình dự án (settings base/dev/prod, urls, wsgi, asgi)
│   ├── apps/             # Các Django apps nghiệp vụ phân chia theo domain
│   ├── requirements/     # Dependencies theo từng môi trường (base, dev, prod)
│   └── manage.py
├── docs/                 # Tài liệu kiến trúc hệ thống, CSDL và API conventions
│   ├── architecture.md
│   ├── database-design.md
│   └── api-conventions.md
├── .env.example          # Biến môi trường mẫu cho monorepo
├── .gitignore            # Git ignore rule tổng hợp
└── README.md
```

---

## 3. Hướng dẫn thiết lập môi trường phát triển (Quick Start)

### 3.1. Chuẩn bị biến môi trường
Sao chép tệp cấu hình mẫu:
```bash
cp .env.example .env
```
Cập nhật `DB_USER` và `DB_PASSWORD` trong `.env` tương ứng với tài khoản MySQL trên máy của bạn.

### 3.2. Chuẩn bị cơ sở dữ liệu MySQL
1. Đảm bảo dịch vụ MySQL đang chạy trên máy (ví dụ service `MySQL80`).
2. Mở MySQL Workbench hoặc dòng lệnh MySQL và tạo cơ sở dữ liệu cho dự án:
   ```sql
   CREATE DATABASE IF NOT EXISTS localcraft_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 3.3. Khởi chạy Backend (Django)
1. Di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```
2. Tạo và kích hoạt môi trường ảo Python:
   ```bash
   # Windows PowerShell
   python -m venv .venv
   .venv\Scripts\Activate.ps1

   # Linux/macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Cài đặt các gói phụ thuộc phát triển:
   ```bash
   pip install -r requirements/development.txt
   ```
4. Áp dụng database migrations và khởi chạy server:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```
   *Backend hoạt động tại:* `http://localhost:8000`

### 3.4. Khởi chạy Frontend (React + Vite)
1. Mở terminal mới và di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
2. Cài đặt dependencies:
   ```bash
   npm install
   ```
3. Chạy development server:
   ```bash
   npm run dev
   ```
   *Frontend hoạt động tại:* `http://localhost:5173`

---

## 4. Mô hình người dùng & Tài khoản thử nghiệm (User Roles & Seed Accounts)

Hệ thống LocalCraft chuẩn hóa đúng 3 vai trò người dùng:
1. `TOURIST`: Khách du lịch trải nghiệm di sản, mua sắm sản phẩm thủ công, đặt workshop, viết đánh giá, thanh toán.
2. `CRAFT_VILLAGE`: Đại diện ban quản lý làng nghề (1 tài khoản quản lý đúng 1 làng nghề, quản lý sản phẩm, workshop, hồ sơ nghệ nhân, đơn hàng con `vendor_orders`).
3. `ADMIN`: Quản trị viên toàn hệ thống, kiểm duyệt nội dung và giám sát giao dịch.

*(Nghệ nhân `ArtisanProfile` là hồ sơ văn hoá thông tin phi đăng nhập, gắn liền với làng nghề `CraftVillage`).*

### Tài khoản mẫu sau khi seed data (`python manage.py seed_data`):
- **Admin:** `admin@localcraft.vn` | `Admin@123456`
- **Quản lý làng gốm Bát Tràng:** `manager.bat-trang@localcraft.vn` | `Manager@123456`
- **Khách du lịch:** `tourist@localcraft.vn` | `Tourist@123456`

---

## 5. Tài liệu chi tiết (Documentation)

- [Kiến trúc hệ thống](file:///d:/Local%20Craft/docs/architecture.md)
- [Thiết kế cơ sở dữ liệu](file:///d:/Local%20Craft/backend/LocalCraft_Database_Design.md)
- [Quy chuẩn thiết kế API](file:///d:/Local%20Craft/docs/api-conventions.md)
