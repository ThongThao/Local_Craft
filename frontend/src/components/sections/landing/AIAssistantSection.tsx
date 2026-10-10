import React, { useState } from 'react';
import AppIcon from '@/components/ui/AppIcon';
import TiltCard from '@/components/ui/TiltCard';
import Button from '@/components/ui/Button';
import { AI_PRESETS } from '@/data/landing';
import { recommendationsApi } from '@/services/api';

interface AIAssistantSectionProps {
  onBookMatch?: (title: string) => void;
}

export const AIAssistantSection: React.FC<AIAssistantSectionProps> = ({
  onBookMatch,
}) => {
  const [activePresetIndex, setActivePresetIndex] = useState<number>(0);
  const [customInput, setCustomInput] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [apiMatch, setApiMatch] = useState<{
    title: string;
    description: string;
    image: string;
    matchScore: number;
    matchLabel: string;
    price: string;
  } | null>(null);

  const currentPreset = AI_PRESETS[activePresetIndex] || AI_PRESETS[0];

  const handleSelectPreset = async (idx: number) => {
    setIsThinking(true);
    setActivePresetIndex(idx);
    setCustomInput('');
    try {
      const res = await recommendationsApi.queryRecommendations({
        query: AI_PRESETS[idx].query,
      });
      if (res.data?.matches && res.data.matches.length > 0) {
        const topMatch = res.data.matches[0];
        setApiMatch({
          title: topMatch.title,
          description: topMatch.reason || topMatch.village,
          image: topMatch.image,
          matchScore: topMatch.match_score,
          matchLabel: topMatch.match_label,
          price: topMatch.formatted_price,
        });
      }
    } catch {
      setApiMatch(null);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    setIsThinking(true);
    try {
      const res = await recommendationsApi.queryRecommendations({
        query: customInput.trim(),
      });
      if (res.data?.matches && res.data.matches.length > 0) {
        const topMatch = res.data.matches[0];
        setApiMatch({
          title: topMatch.title,
          description: topMatch.reason,
          image: topMatch.image,
          matchScore: topMatch.match_score,
          matchLabel: topMatch.match_label,
          price: topMatch.formatted_price,
        });
      }
    } catch {
      setApiMatch(null);
    } finally {
      setIsThinking(false);
    }
  };

  const activeDisplay = apiMatch || {
    title: currentPreset.recommendation.title,
    description: currentPreset.recommendation.description,
    image: currentPreset.recommendation.image,
    matchScore: currentPreset.recommendation.matchScore,
    matchLabel: currentPreset.recommendation.matchLabel,
    price: currentPreset.recommendation.price,
  };

  return (
    <section id="ai-assistant" className="ai-assistant-section">
      <div className="ai-assistant-container">
        <TiltCard maxTilt={3} glare={true} className="ai-card-wrapper">
          {/* Card Header */}
          <div className="ai-header">
            {/* AI Assistant Badge */}
            <div className="ai-badge-pill">
              <AppIcon name="sparkle" size={14} />
              <span className="ai-badge-text">
                Trợ lý hành trình LocalCraft AI
              </span>
            </div>

            <h2 className="ai-title">
              Tìm trải nghiệm dành riêng cho bạn
            </h2>

            <p className="ai-description">
              Mô tả kỳ nghỉ hoặc mong muốn thủ công bằng ngôn ngữ tự nhiên. Hệ thống sẽ kết nối bạn với nghệ nhân chuẩn xác nhất.
            </p>
          </div>

          {/* Interactive AI Query Box */}
          <div className="ai-query-box">
            <div className="ai-query-top-row">
              <div className="ai-sparkle-icon-box">
                <AppIcon name="sparkle" size={18} />
              </div>

              <div className="ai-query-input-col">
                <span className="ai-query-label">
                  Yêu cầu tìm kiếm của bạn:
                </span>

                <form onSubmit={handleSearchSubmit}>
                  <div className="ai-query-bubble">
                    “{customInput || currentPreset.query}”
                  </div>
                </form>
              </div>
            </div>

            {/* Quick Prompt Presets / Tags */}
            <div className="ai-presets-row">
              <span className="ai-presets-label">
                Gợi ý phổ biến:
              </span>
              {AI_PRESETS.map((preset, idx) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(idx)}
                  className={`ai-preset-tag-btn ${activePresetIndex === idx ? 'active' : ''}`}
                >
                  {preset.tags[0]}
                </button>
              ))}
            </div>
          </div>

          {/* AI Matched Result Card */}
          <div
            className="ai-match-result-card"
            style={{ opacity: isThinking ? 0.4 : 1 }}
          >
            <div className="ai-match-details-wrapper">
              {/* Thumbnail */}
              <div className="ai-match-thumb">
                <img
                  src={activeDisplay.image}
                  alt={activeDisplay.title}
                />
              </div>

              {/* Match Details */}
              <div className="ai-match-texts">
                <div className="ai-match-meta-row">
                  <span className="ai-match-score-badge">
                    ĐỘ TƯƠNG THÍCH {activeDisplay.matchScore}%
                  </span>
                  <span className="ai-match-dot" />
                  <span className="ai-match-label">
                    {activeDisplay.matchLabel}
                  </span>
                </div>

                <h3 className="ai-match-title">
                  {activeDisplay.title}
                </h3>

                <p className="ai-match-desc">
                  {activeDisplay.description}
                </p>
              </div>
            </div>

            {/* Action CTA */}
            <Button
              variant="primary"
              size="md"
              onClick={() => onBookMatch?.(activeDisplay.title)}
            >
              Xem lịch &amp; Đặt chỗ
            </Button>
          </div>
        </TiltCard>
      </div>
    </section>
  );
};

export default AIAssistantSection;
