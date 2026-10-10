import React, { useState } from 'react';
import AppIcon from '@/components/ui/AppIcon';
import Button from '@/components/ui/Button';

interface AIStorytellerTeaserProps {
  onOpenFullAssistant?: () => void;
}

export const AIStorytellerTeaser: React.FC<AIStorytellerTeaserProps> = ({
  onOpenFullAssistant,
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<number>(0);

  const sampleChats = [
    {
      question: 'Men rạn Bát Tràng thời Lý có gì đặc biệt so với men thường?',
      answer:
        'Men rạn Bát Tràng được chế tác từ tro trấu cổ, đá thạch anh sông Hồng và nung ở nhiệt độ 1,250°C. Điểm kỳ diệu nằm ở độ co ngót khác nhau giữa xương đất và áo men khi hạ nhiệt độ, tạo nên những đường nứt mạng nhện tự nhiên, được nghệ nhân ngâm thảo mộc để tạo sắc rạn mực trầm mặc.',
    },
    {
      question: 'Làm sao phân biệt lụa tơ tằm Vạn Phúc tự nhiên với sợi tổng hợp?',
      answer:
        'Lụa Vạn Phúc dệt từ 100% tơ tằm tự nhiên có độ rủ mềm, mát vào mùa hè, ấm vào mùa đông và bắt sáng ngũ sắc óng ánh dưới ánh nắng. Khi đốt thử một sợi tơ nhỏ, tơ tằm cháy có mùi khét như tóc cháy, tro vỡ vụn giòn tan chứ không vón cục như sợi nilon nhân tạo.',
    },
    {
      question: 'Người mới chưa có kinh nghiệm có thể tham gia workshop làm gốm không?',
      answer:
        'Hoàn toàn có thể! Mỗi buổi trải nghiệm tại LocalCraft đều có nghệ nhân ưu tú cầm tay chỉ việc từ khâu nhào đất sét mịn, đặt lên bàn xoay tạo hình, đến cắt dây và vẽ men rạn. Tác phẩm của bạn sẽ được phơi mộc, nung lò và chuyển phát tận nhà.',
    },
  ];

  return (
    <section className="story-section ai-teaser-section">
      <div className="story-container">
        <div className="ai-teaser-card">
          {/* Left Column */}
          <div>
            <div className="story-badge-pill">
              <span className="story-badge-dot" />
              <span>Trợ Lý Di Sản RAG</span>
            </div>

            <h2 className="story-title" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)' }}>
              Người Kể Chuyện <br />
              <span className="story-title-italic">Thấu Hiểu Ngàn Năm Làng Nghề</span>
            </h2>

            <p className="story-subtitle">
              Ứng dụng mô hình AI kết hợp kho tri thức văn hóa được số hóa độc quyền cùng nghệ nhân. 
              Giải đáp mọi thắc mắc về lịch sử làng nghề, kỹ thuật nung, dòng men và gợi ý hành trình cá nhân hóa.
            </p>

            <div className="ai-chips-row">
              {sampleChats.map((chat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedQuestion(idx)}
                  className="ai-chip-btn"
                  style={{
                    background: selectedQuestion === idx ? 'var(--color-clay)' : undefined,
                    color: selectedQuestion === idx ? '#FFFFFF' : undefined,
                  }}
                >
                  💬 {chat.question.slice(0, 32)}...
                </button>
              ))}
            </div>

            <div style={{ marginTop: '32px' }}>
              <Button
                variant="primary"
                size="md"
                onClick={onOpenFullAssistant}
                icon={<AppIcon name="sparkle" size={16} />}
                iconPosition="left"
              >
                Trò chuyện cùng LocalCraft AI
              </Button>
            </div>
          </div>

          {/* Right Column: Live Chat Demo */}
          <div className="ai-chat-preview">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,39,32,0.06)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--color-forest)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFDBCF',
                  fontSize: '14px',
                }}
              >
                ✨
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-forest)' }}>LocalCraft Heritage Assistant</div>
                <div style={{ fontSize: '11px', color: '#717A76' }}>Đang hoạt động · RAG Knowledge Base v2.4</div>
              </div>
            </div>

            <div className="ai-bubble-user">
              {sampleChats[selectedQuestion].question}
            </div>

            <div className="ai-bubble-bot">
              <span style={{ color: 'var(--color-clay)', fontWeight: 700 }}>🌿 LocalCraft AI: </span>
              {sampleChats[selectedQuestion].answer}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIStorytellerTeaser;
