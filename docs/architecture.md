# LocalCraft - Kiến trúc hệ thống (System Architecture)

## 1. Tổng quan kiến trúc

LocalCraft được xây dựng theo kiến trúc phân lớp hướng dịch vụ (Multi-tier Service-Oriented Architecture), phân tách độc lập giữa Client (Frontend) và Server (Backend API):

```text
[ Client Layer ]
   React + Vite + TypeScript (Single Page Application)
          │
          │ HTTP / REST / JSON (JWT Authenticated)
          ▼
[ API & Business Layer ]
   Django + Django REST Framework (DRF)
   ├── Apps nghiệp vụ (Accounts, Artisans, Villages, Workshops, Orders...)
   └── AI Engine (Recommendation & NLP Chatbot modules)
          │
          │ MySQL Driver (mysqlclient / PyMySQL)
          ▼
[ Data Layer ]
   MySQL 8.0 (Relational Database)
```

---

## 2. Các tầng thành phần

### 2.1. Frontend (Client Layer)
- **Công nghệ:** React 18+, Vite, TypeScript.
- **Mô hình tổ chức:** Feature-driven architecture. Mỗi miền nghiệp vụ (Artisans, Villages, Workshops, Products, Bookings...) được nhóm trong `src/features/<feature_name>` với components, hooks, services, types riêng biệt.
- **Giao tiếp:** Gọi RESTful API tới Django Backend thông qua Axios / Fetch API client tập trung tại `src/services/api.ts` với tiền tố base URL lấy từ biến môi trường `VITE_API_BASE_URL`.

### 2.2. Backend (Server Layer)
- **Công nghệ:** Django 5.x, Django REST Framework.
- **Cấu hình chia môi trường:** `config/settings/` chia thành `base.py`, `development.py`, và `production.py`.
- **Mô hình ứng dụng:** Modular Django Apps đặt tại `backend/apps/`. Mỗi app đại diện cho một domain nghiệp vụ độc lập, giúp cô lập trách nhiệm (Separation of Concerns).

### 2.3. AI & Recommender System
- **Giai đoạn ban đầu:** Tích hợp trực tiếp dưới dạng các module Python bên trong Django (`apps/recommendations` và `apps/chatbot`).
- **Khả năng mở rộng:** Kiến trúc phân tách rõ ràng interface và pipeline AI, cho phép tách sang một microservice độc lập (ví dụ: FastAPI + Celery / Redis) khi khối lượng truy vấn hoặc xử lý embedding mô hình ngôn ngữ tăng cao mà không ảnh hưởng đến API chính.

### 2.4. Data Storage Layer
- **Cơ sở dữ liệu chính:** MySQL 8.0 với character set `utf8mb4` và collation `utf8mb4_unicode_ci` hỗ trợ tiếng Việt đầy đủ và chính xác.
- **Media & File Storage:** Lưu trữ ảnh sản phẩm, ảnh làng nghề, media workshop trong thư mục `media/` cục bộ khi phát triển, và hỗ trợ chuyển sang Object Storage (như Cloudinary hoặc AWS S3) trong môi trường sản xuất.
