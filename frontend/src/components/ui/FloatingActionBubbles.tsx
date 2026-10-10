import React, { useState, useEffect, useRef } from 'react';

interface CartItem {
  id: string;
  name: string;
  sub: string;
  price: number;
  qty: number;
  image: string;
}

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
}

export const FloatingActionBubbles: React.FC = () => {
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [inputMsg, setInputMsg] = useState<string>('');

  const chatRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);

  // Initial cart demo items
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 'item-1',
      name: 'Bình Gốm Men Rạn Cổ Bát Tràng',
      sub: 'Kèm chứng thư phả hệ di sản & triện vàng',
      price: 1250000,
      qty: 1,
      image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=180&q=80',
    },
    {
      id: 'item-2',
      name: 'Suất Trải Nghiệm Gốm Vuốt Tay',
      sub: 'Workshop cùng Nghệ nhân Bát Tràng (Cuối tuần)',
      price: 450000,
      qty: 1,
      image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=180&q=80',
    },
  ]);

  // Initial chat conversation
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: 'Dạ xin chào! Em là Trợ lý Di sản LocalCraft. Quý khách đang tìm kiếm tác phẩm thủ công độc bản, muốn tìm hiểu về nghệ nhân hay muốn đặt lịch trải nghiệm làng nghề ạ?',
    },
  ]);

  // Track scroll position to display Back to Top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 280);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        setChatOpen(false);
      }
      if (cartRef.current && !cartRef.current.contains(e.target as Node)) {
        setCartOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleChat = () => {
    setCartOpen(false);
    setChatOpen(!chatOpen);
  };

  const toggleCart = () => {
    setChatOpen(false);
    setCartOpen(!cartOpen);
  };

  // Cart actions
  const updateQty = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);
  const totalAmount = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);

  // Chat message sending
  const handleSendMessage = (customText?: string) => {
    const textToSend = customText || inputMsg.trim();
    if (!textToSend) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMsg('');

    // Simulated knowledgeable heritage assistant response
    setTimeout(() => {
      let reply = 'Cảm ơn quý khách! Em đã ghi nhận câu hỏi và kết nối trực tiếp với ban tư vấn nghệ nhân làng nghề.';
      const lower = textToSend.toLowerCase();

      if (lower.includes('bát tràng') || lower.includes('men rạn')) {
        reply = 'Men rạn Bát Tràng đạt chuẩn nung ở 1,250°C trong lò bầu 72 giờ. Lớp rạn tự nhiên từ tro trấu và thạch anh sông Hồng, có độ bóng sâu và tiếng gõ thanh trong như chuông!';
      } else if (lower.includes('gần hà nội') || lower.includes('làng nghề')) {
        reply = 'Gần Hà Nội có Làng gốm Bát Tràng (Gia Lâm, ~14km), Làng lụa Vạn Phúc (Hà Đông, ~10km) và Làng nón Chuông (Thanh Oai, ~30km) rất thích hợp trải nghiệm trong ngày!';
      } else if (lower.includes('đặt lịch') || lower.includes('workshop')) {
        reply = 'Suất trải nghiệm vuốt gốm và làm nón lá cuối tuần này đang mở đăng ký. Em có thể giữ suất và xác nhận qua số điện thoại của quý khách ngay bây giờ ạ!';
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: reply,
        },
      ]);
    }, 600);
  };

  return (
    <div className="floating-action-dock" aria-label="Công cụ tiện ích nổi">
      {/* 1. BACK TO TOP BUBBLE */}
      <div className="floating-bubble-item">
        <button
          type="button"
          onClick={handleScrollToTop}
          className={`floating-bubble-btn bubble-top ${showScrollTop ? 'visible' : ''}`}
          title="Trở về đầu trang"
          aria-label="Trở về đầu trang"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <span className="floating-bubble-tooltip">Về đầu trang</span>
      </div>

      {/* 2. CART BUBBLE & POPOVER */}
      <div ref={cartRef} className="floating-bubble-item">
        <button
          type="button"
          onClick={toggleCart}
          className={`floating-bubble-btn ${cartOpen ? 'active' : ''}`}
          title="Giỏ hàng di sản"
          aria-label="Mở giỏ hàng di sản"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          {totalCartCount > 0 && <span className="cart-badge-count">{totalCartCount}</span>}
        </button>
        <span className="floating-bubble-tooltip">Giỏ hàng ({totalCartCount})</span>

        {/* Floating Cart Popover */}
        {cartOpen && (
          <div className="floating-cart-popover" role="dialog" aria-label="Chi tiết giỏ hàng">
            <div className="cart-popover-header">
              <div className="cart-header-title">
                <span>🛍️ Giỏ hàng Di sản</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#717A76' }}>
                  ({totalCartCount} mục)
                </span>
              </div>
              <button
                type="button"
                className="chat-close-btn"
                onClick={() => setCartOpen(false)}
                title="Đóng giỏ hàng"
              >
                ✕
              </button>
            </div>

            <div className="cart-popover-items">
              {cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 12px', color: '#717A76' }}>
                  <p style={{ fontSize: '28px', margin: '0 0 8px' }}>🏺</p>
                  <p style={{ fontSize: '14px', margin: 0, fontWeight: 600 }}>Giỏ hàng chưa có tác phẩm nào</p>
                  <p style={{ fontSize: '12px', margin: '4px 0 0' }}>Hãy khám phá các làng nghề và tác phẩm độc bản!</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="cart-item-card">
                    <img src={item.image} alt={item.name} className="cart-item-thumb" />
                    <div className="cart-item-details">
                      <div>
                        <div className="cart-item-name">{item.name}</div>
                        <div className="cart-item-sub">{item.sub}</div>
                      </div>
                      <div className="cart-item-bottom">
                        <span className="cart-item-price">
                          {(item.price * item.qty).toLocaleString('vi-VN')}đ
                        </span>
                        <div className="cart-qty-controls">
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => updateQty(item.id, -1)}
                            title="Giảm số lượng"
                          >
                            −
                          </button>
                          <span className="cart-qty-num">{item.qty}</span>
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => updateQty(item.id, 1)}
                            title="Tăng số lượng"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="cart-popover-footer">
                <div className="cart-subtotal-row">
                  <span>Tạm tính di sản:</span>
                  <span className="cart-subtotal-amount">
                    {totalAmount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <button
                  type="button"
                  className="cart-checkout-btn"
                  onClick={() => {
                    alert('Chuyển đến cổng thanh toán an toàn LocalCraft...');
                  }}
                >
                  Tiến hành thanh toán ➔
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. CHAT BUBBLE & POPOVER */}
      <div ref={chatRef} className="floating-bubble-item">
        <button
          type="button"
          onClick={toggleChat}
          className={`floating-bubble-btn bubble-chat ${chatOpen ? 'active' : ''}`}
          title="Trò chuyện tư vấn di sản"
          aria-label="Mở khung trò chuyện tư vấn"
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="chat-live-indicator" />
        </button>
        <span className="floating-bubble-tooltip">Tư vấn di sản 24/7</span>

        {/* Floating Chat Popover */}
        {chatOpen && (
          <div className="floating-chat-popover" role="dialog" aria-label="Tư vấn di sản trực tuyến">
            <div className="chat-popover-header">
              <div className="chat-header-info">
                <div className="chat-avatar-emblem">🏺</div>
                <div>
                  <div className="chat-header-title">Trợ Lý Di Sản LocalCraft</div>
                  <div className="chat-header-status">
                    <span className="status-dot-green" />
                    Trực tuyến cùng Nghệ nhân
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="chat-close-btn"
                onClick={() => setChatOpen(false)}
                title="Đóng hộp thoại"
              >
                ✕
              </button>
            </div>

            <div className="chat-popover-body">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message-bubble ${msg.sender}`}
                >
                  {msg.text}
                </div>
              ))}

              <div className="chat-quick-suggestions">
                <button
                  type="button"
                  className="chat-suggestion-chip"
                  onClick={() => handleSendMessage('Gợi ý làng nghề gần Hà Nội?')}
                >
                  📍 Làng nghề gần Hà Nội?
                </button>
                <button
                  type="button"
                  className="chat-suggestion-chip"
                  onClick={() => handleSendMessage('Cách nhận biết men rạn Bát Tràng?')}
                >
                  🏺 Nhận biết men rạn chuẩn?
                </button>
                <button
                  type="button"
                  className="chat-suggestion-chip"
                  onClick={() => handleSendMessage('Đặt lịch workshop cuối tuần?')}
                >
                  📅 Đặt lịch workshop nghệ nhân?
                </button>
              </div>
            </div>

            <div className="chat-popover-footer">
              <input
                type="text"
                placeholder="Nhập câu hỏi về di sản, làng nghề..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                className="chat-input-field"
              />
              <button
                type="button"
                className="chat-send-btn"
                onClick={() => handleSendMessage()}
                title="Gửi tin nhắn"
                aria-label="Gửi tin nhắn"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingActionBubbles;
