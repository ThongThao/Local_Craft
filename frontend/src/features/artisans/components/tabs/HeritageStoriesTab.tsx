import React, { useState } from 'react';
import { HeritageStoryItem } from '../../types';

interface HeritageStoriesTabProps {
  stories: HeritageStoryItem[];
  onOpenCreateStory: () => void;
  onLikeStory: (storyId: number) => void;
}

export const HeritageStoriesTab: React.FC<HeritageStoriesTabProps> = ({
  stories,
  onOpenCreateStory,
  onLikeStory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStories = stories.filter(
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
              <button type="button" className="toolbar-search-clear" onClick={() => setSearchTerm('')}>
                ✕
              </button>
            )}
          </div>
          <div className="toolbar-info-badge">
            Số hóa: <strong>{stories.length} câu chuyện di sản</strong> đã được lan tỏa
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
              <span className="story-readtime-badge">📖 {s.readTime}</span>
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
                  <span className="stat-item">👁️ {s.views.toLocaleString()} lượt đọc</span>
                  <button
                    type="button"
                    className="stat-btn-like"
                    onClick={() => onLikeStory(s.id)}
                  >
                    ❤️ {s.likes}
                  </button>
                </div>

                <div className="story-ai-badge" title="Câu chuyện đã được số hóa và đưa vào dữ liệu AI Assistant gợi ý cho du khách">
                  ✨ Đã đồng bộ AI Guide
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
