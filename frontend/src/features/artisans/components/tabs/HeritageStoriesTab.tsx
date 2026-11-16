import React, { useState, useEffect } from 'react';
import { HeritageStoryItem } from '../../types';
import { storiesApi, HeritageStoryDto } from '@/services/api/stories';

interface HeritageStoriesTabProps {
  stories?: HeritageStoryItem[];
  villageId?: number;
  onOpenCreateStory: () => void;
  onLikeStory: (storyId: number) => void;
}

export const HeritageStoriesTab: React.FC<HeritageStoriesTabProps> = ({
  stories: initialStories = [],
  villageId,
  onOpenCreateStory,
  onLikeStory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [storiesList, setStoriesList] = useState<HeritageStoryItem[]>(initialStories);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveStories = async () => {
      setIsLoading(true);
      try {
        const res = await storiesApi.getAll({ village_id: villageId });
        if (res.success && Array.isArray(res.data) && res.data.length > 0 && isMounted) {
          const mapped: HeritageStoryItem[] = res.data.map((st: HeritageStoryDto) => ({
            id: st.story_id,
            villageId: st.village,
            artisanId: st.artisan || 0,
            artisanName: st.artisan_name || 'Nghệ nhân Di sản',
            title: st.title,
            slug: st.slug,
            excerpt: st.summary || (st.content ? st.content.slice(0, 150) + '...' : ''),
            content: st.content,
            coverImage: st.cover_image_url || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
            publishedAt: st.published_at ? new Date(st.published_at).toLocaleDateString('vi-VN') : 'Mới cập nhật',
            readTime: '4 phút đọc',
            likes: 42,
            views: 380,
            tag: 'Di sản & Ký ức',
          }));
          setStoriesList(mapped);
        } else if (initialStories.length > 0 && isMounted) {
          setStoriesList(initialStories);
        }
      } catch (err) {
        console.warn('Could not fetch live stories, using default list:', err);
        if (initialStories.length > 0 && isMounted) {
          setStoriesList(initialStories);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLiveStories();
    return () => {
      isMounted = false;
    };
  }, [villageId, initialStories]);

  const filteredStories = storiesList.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.artisanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="artisan-tab-pane heritage-stories-pane">
      {/* Top Toolbar */}
      <div className="tab-toolbar-card">
        <div className="toolbar-left">
          <div className="toolbar-search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Tìm câu chuyện di sản, bí quyết làng nghề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button type="button" className="toolbar-search-clear" onClick={() => setSearchTerm('')} title="Xóa tìm kiếm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <div className="toolbar-info-badge">
            {isLoading ? (
              <span>Đang tải câu chuyện di sản...</span>
            ) : (
              <span>Số hóa: <strong>{storiesList.length} câu chuyện di sản</strong> đã được lan tỏa</span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="artisan-primary-btn"
          onClick={onOpenCreateStory}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Viết Ký Ức Di Sản Mới
        </button>
      </div>

      {/* Stories Grid */}
      <div className="heritage-stories-grid">
        {filteredStories.map((s) => (
          <div key={s.id} className="heritage-story-card">
            <div className="story-card-image-wrap">
              <img src={s.coverImage} alt={s.title} className="story-card-img" />
              <span className="story-tag-badge">{s.tag}</span>
              <span className="story-readtime-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                {s.readTime}
              </span>
            </div>

            <div className="story-card-body">
              <div className="story-meta-top">
                <span className="story-author">Lời kể: <strong>{s.artisanName}</strong></span>
                <span className="story-date">{s.publishedAt}</span>
              </div>

              <h4 className="story-title">{s.title}</h4>
              <p className="story-excerpt">{s.excerpt}</p>

              <div className="story-card-footer">
                <div className="story-stats-row">
                  <span className="stat-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {s.views.toLocaleString()} lượt đọc
                  </span>
                  <button
                    type="button"
                    className="stat-btn-like"
                    onClick={() => onLikeStory(s.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#dc2626" stroke="#dc2626" strokeWidth="1.5">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span>{s.likes}</span>
                  </button>
                </div>

                <div className="story-ai-badge" title="Câu chuyện đã được số hóa và đưa vào dữ liệu AI Assistant gợi ý cho du khách" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                  </svg>
                  <span>Đã đồng bộ AI Guide</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default HeritageStoriesTab;
