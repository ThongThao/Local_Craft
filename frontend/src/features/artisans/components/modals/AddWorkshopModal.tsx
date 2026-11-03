import React, { useState, useEffect } from 'react';
import { CraftWorkshopItem, ArtisanProfileItem } from '../../types';

interface AddWorkshopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workshopData: Partial<CraftWorkshopItem>) => void;
  initialData?: CraftWorkshopItem | null;
  artisans: ArtisanProfileItem[];
}

export const AddWorkshopModal: React.FC<AddWorkshopModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  artisans,
}) => {
  const [title, setTitle] = useState('');
  const [artisanId, setArtisanId] = useState<number>(artisans[0]?.id || 101);
  const [pricePerPerson, setPricePerPerson] = useState<number>(450000);
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [maxParticipants, setMaxParticipants] = useState<number>(16);
  const [nextSessionDate, setNextSessionDate] = useState('14:30 - Thứ Bảy');
  const [location, setLocation] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [categoryName, setCategoryName] = useState('Workshop Trực Tiếp');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setArtisanId(initialData.artisanId || artisans[0]?.id || 101);
      setPricePerPerson(initialData.pricePerPerson || 450000);
      setDurationMinutes(initialData.durationMinutes || 120);
      setMaxParticipants(initialData.maxParticipants || 16);
      setNextSessionDate(initialData.nextSessionDate || '14:30 - Thứ Bảy');
      setLocation(initialData.location || '');
      setCoverImage(initialData.coverImage || '');
      setCategoryName(initialData.categoryName || 'Workshop Trực Tiếp');
    } else {
      setTitle('');
      setArtisanId(artisans[0]?.id || 101);
      setPricePerPerson(450000);
      setDurationMinutes(120);
      setMaxParticipants(16);
      setNextSessionDate('14:30 - Thứ Bảy');
      setLocation('Xưởng Gốm Nghệ Nhân, Xã Bát Tràng, Gia Lâm, Hà Nội');
      setCoverImage('https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80');
      setCategoryName('Workshop Trực Tiếp');
    }
  }, [initialData, isOpen, artisans]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedArtisan = artisans.find((a) => a.id === Number(artisanId)) || artisans[0];

    onSave({
      title,
      artisanId: Number(artisanId),
      artisanName: selectedArtisan?.displayName || 'Nghệ nhân',
      categoryName,
      pricePerPerson: Number(pricePerPerson),
      formattedPrice: `${Number(pricePerPerson).toLocaleString('vi-VN')}₫ / người`,
      durationMinutes: Number(durationMinutes),
      maxParticipants: Number(maxParticipants),
      enrolledCount: 0,
      nextSessionDate,
      location: location || 'Xưởng Làng Nghề',
      coverImage: coverImage || 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
      status: selectedArtisan?.verificationStatus === 'APPROVED' ? 'OPEN' : 'DRAFT',
      rating: 5.0,
    });
  };

  return (
    <div className="artisan-modal-overlay">
      <div className="artisan-modal-dialog">
        <div className="modal-header-row">
          <div>
            <div className="modal-tag sage">TRẢI NGHIỆM DI SẢN</div>
            <h3 className="modal-title">
              {initialData ? 'Chỉnh Sửa Ca Workshop' : 'Mở Lớp Workshop & Trải Nghiệm Mới'}
            </h3>
            <p className="modal-sub">Đón du khách trực tiếp đến xưởng học nghề cùng nghệ nhân</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-body">
          <div className="form-group">
            <label className="form-label">Tên lớp học / Chủ đề workshop *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ví dụ: Kỹ Thuật Chuốt Gốm Bàn Xoay & Phục Dựng Men Cổ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Nghệ nhân đứng lớp hướng dẫn *</label>
              <select
                className="form-select"
                value={artisanId}
                onChange={(e) => setArtisanId(Number(e.target.value))}
              >
                {artisans.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName} ({a.experienceYears} năm KN) - {a.verificationStatus === 'APPROVED' ? 'Đã duyệt' : 'Chờ xác minh'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Hình thức trải nghiệm *</label>
              <select
                className="form-select"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              >
                <option value="Workshop Trực Tiếp">Workshop Trực Tiếp (Tiêu Chuẩn)</option>
                <option value="Lớp Học Kèm 1:1">Lớp Học Kèm Chuyên Sâu 1:1</option>
                <option value="Trải Nghiệm Gia Đình">Trải Nghiệm Gia Đình & Cặp Đôi</option>
                <option value="Chuyên Đề Di Sản">Chuyên Đề Di Sản Nâng Cao</option>
              </select>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Giá vé / Du khách (VND) *</label>
              <input
                type="number"
                step="50000"
                min="100000"
                className="form-input"
                required
                value={pricePerPerson}
                onChange={(e) => setPricePerPerson(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Thời lượng (Phút) *</label>
              <input
                type="number"
                min="30"
                max="480"
                step="15"
                className="form-input"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Số khách tối đa *</label>
              <input
                type="number"
                min="1"
                max="100"
                className="form-input"
                required
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Lịch ca học sắp diễn ra *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="Ví dụ: 14:30 - Thứ Bảy hàng tuần"
                value={nextSessionDate}
                onChange={(e) => setNextSessionDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Địa điểm tổ chức tại làng nghề *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="Ví dụ: Xưởng Gốm Trần Độ, Giang Cao, Bát Tràng"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ảnh đại diện lớp học (URL chất lượng cao)</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://images.unsplash..."
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
            />
          </div>

          <div className="modal-actions-row">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-submit">
              {initialData ? 'Cập Nhật Lớp Học' : 'Mở Ca Workshop Ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default AddWorkshopModal;
