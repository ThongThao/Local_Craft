# LocalCraft - Quy chuẩn thiết kế REST API (API Conventions)

Tài liệu này xác định các quy tắc thiết kế và chuẩn hóa API giao tiếp giữa Frontend và Backend trong dự án LocalCraft.

---

## 1. Cấu trúc URL (URL Structure)

- Tất cả API endpoints đều bắt đầu với tiền tố: `/api/v1/`
- Sử dụng danh từ số nhiều (plural nouns) cho tài nguyên:
  - `/api/v1/products/`
  - `/api/v1/artisans/`
  - `/api/v1/villages/`
  - `/api/v1/workshops/`
  - `/api/v1/bookings/`
- Sử dụng chữ thường và dấu gạch ngang (kebab-case) cho các đường dẫn lồng nhau:
  - `/api/v1/workshops/{id}/available-schedules/`
- Phương thức HTTP (HTTP Methods):
  - `GET`: Lấy dữ liệu (danh sách hoặc chi tiết)
  - `POST`: Tạo mới tài nguyên
  - `PUT`: Cập nhật toàn bộ tài nguyên
  - `PATCH`: Cập nhật một phần tài nguyên
  - `DELETE`: Xóa tài nguyên

---

## 2. Xác thực (Authentication)

- Sử dụng JWT (JSON Web Token).
- Header yêu cầu cho các request cần xác thực:
  ```http
  Authorization: Bearer <access_token>
  ```
- Endpoint xác thực:
  - `POST /api/v1/auth/login/` -> Trả về `access` và `refresh` tokens.
  - `POST /api/v1/auth/refresh/` -> Cấp mới `access` token.

---

## 3. Định dạng phản hồi chuẩn (Response Format)

### 3.1. Phản hồi thành công (Success Response)
```json
{
  "success": true,
  "data": { ... },
  "message": "Thao tác thành công"
}
```

### 3.2. Phản hồi phân trang (Paginated Response)
```json
{
  "success": true,
  "count": 120,
  "next": "http://localhost:8000/api/v1/products/?page=2",
  "previous": null,
  "results": [ ... ]
}
```

### 3.3. Phản hồi lỗi (Error Response)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu gửi lên không hợp lệ",
    "details": {
      "email": ["Email đã tồn tại trong hệ thống"]
    }
  }
}
```

---

## 4. Các mã trạng thái HTTP phổ biến (HTTP Status Codes)

| Mã | Tên | Sử dụng |
|:---|:---|:---|
| `200` | OK | Truy vấn thành công, cập nhật thành công |
| `201` | Created | Tạo mới tài nguyên thành công |
| `204` | No Content | Xóa thành công, không có nội dung trả về |
| `400` | Bad Request | Dữ liệu đầu vào sai định dạng hoặc không hợp lệ |
| `401` | Unauthorized | Chưa đăng nhập hoặc token không hợp lệ / hết hạn |
| `403` | Forbidden | Không có quyền truy cập vào tài nguyên này |
| `404` | Not Found | Tài nguyên không tồn tại |
| `500` | Internal Server Error | Lỗi nội bộ phía máy chủ |
