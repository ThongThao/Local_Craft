import { VillageItem, ProductItem, WorkshopItem, MasterArtisan, AIQueryPreset } from '@/types/landing';

export const HERO_DATA = {
  badge: 'DI SẢN SỐNG · TRẢI NGHIỆM BẢN ĐỊA',
  titlePart1: 'Chạm vào',
  titleHighlight: 'Tinh hoa',
  titlePart2: 'thủ công Việt.',
  subtitle:
    'Khám phá làng nghề. Gặp gỡ nghệ nhân. Tự tay tạo nên những tác phẩm độc bản lưu giữ ngàn năm hồn cốt đất Việt.',
  ticker: 'Bát Tràng · Thủy Xuân · Vạn Phúc · Kim Bồng · Hơn 120 làng nghề đang được bảo tồn',
  stats: [
    {
      value: '4.9 / 5.0',
      label: 'Hơn 3,400 đánh giá',
      iconType: 'star',
      bgTone: 'peach',
    },
    {
      value: '1,200+',
      label: 'Nghệ nhân truyền đời',
      iconType: 'tools',
      bgTone: 'mint',
    },
    {
      value: '100%',
      label: 'Thủ công thuần khiết',
      iconType: 'craft',
      bgTone: 'peach',
    },
  ],
  heroBgImage: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1920&q=80',
};

export const VILLAGES_DATA: VillageItem[] = [
  {
    id: 'bat-trang',
    name: 'Làng Gốm Bát Tràng',
    location: 'Gia Lâm · Hà Nội',
    period: 'Từ thế kỷ 14',
    description:
      'Nghệ thuật đất nung và men ngọc ngàn năm. Nơi từng khối đất sét thô sơ hoá thành báu vật dưới lòng bàn tay nghệ nhân.',
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80',
    tags: ['Gốm sứ', 'Men rạn', 'Nung củi'],
    categoryBadge: {
      text: 'Từ thế kỷ 14',
      color: '#984628',
    },
    metrics: [
      { label: '350+ Xưởng gốm', icon: 'pottery' },
      { label: '45 phút từ trung tâm', icon: 'clock' },
    ],
  },
  {
    id: 'thuy-xuan',
    name: 'Làng Hương Thủy Xuân',
    location: 'TP. Huế',
    period: 'Hơn 700 năm',
    description:
      'Những bó hương xòe hoa ngát hương trầm tự nhiên bên dòng sông Hương thơ mộng của xứ Cố Đô.',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1000&q=80',
    tags: ['Hương trầm', 'Cố đô', 'Sắc màu'],
    categoryBadge: {
      text: 'Sắc màu trầm hương',
      color: '#40655C',
    },
    metrics: [
      { label: 'Hơn 700 năm', icon: 'clock' },
      { label: 'Hương trầm nguyên bản', icon: 'palette' },
    ],
  },
  {
    id: 'van-phuc',
    name: 'Làng Lụa Vạn Phúc',
    location: 'Hà Đông · Hà Nội',
    period: 'Hơn 1000 năm',
    description:
      'Khung cửi cổ truyền lưu giữ tấm the, tấm lụa mềm mại dâng vua triều Nguyễn và xuất khẩu bốn phương.',
    image: 'https://images.unsplash.com/photo-1617050318658-a9a3175e34cb?auto=format&fit=crop&w=1000&q=80',
    tags: ['Lụa tơ tằm', 'Dệt thủ công', 'Nhuộm tự nhiên'],
    categoryBadge: {
      text: 'Lụa tơ tằm dệt tay',
      color: '#173D35',
    },
    metrics: [
      { label: '100% Tơ tằm Bảo Lộc', icon: 'leaf' },
      { label: 'Dệt máy thủ công', icon: 'tools' },
    ],
  },
  {
    id: 'non-nuoc',
    name: 'Làng Đá Non Nước',
    location: 'Ngũ Hành Sơn · Đà Nẵng',
    period: 'Hơn 400 năm',
    description:
      'Tiếng đục đẽo vang vọng bên chân núi Ngũ Hành, thổi sinh khí vào từng phiến đá trầm tích ngàn năm tuổi.',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80',
    tags: ['Điêu khắc đá', 'Cẩm thạch', 'Di sản quốc gia'],
    categoryBadge: {
      text: 'Khắc đá cẩm thạch',
      color: '#2C3B29',
    },
    metrics: [
      { label: 'Nghề cổ 400 năm', icon: 'tools' },
      { label: 'Đá cẩm thạch tự nhiên', icon: 'shield' },
    ],
  },
];

export const PRODUCTS_DATA: ProductItem[] = [
  {
    id: 'p1',
    title: 'Bình gốm vuốt tay men rạn',
    artisan: 'NN. Nguyễn Văn Cường',
    village: 'Bát Tràng',
    category: 'pottery',
    badge: 'Gốm nung củi',
    description: 'Đất sét phù sa sông Hồng nung nhiệt độ cao 1250°C, họa tiết vân rạn phục dựng đời Lý.',
    price: 1450000,
    formattedPrice: '1.450.000₫',
    image: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80',
    material: 'Đất phù sa nung lò củi, men rạn tro trấu',
    story: 'Mỗi mẻ nung củi kéo dài 72 giờ liên tục, canh lửa ngọn để lớp men rạn nứt tự nhiên không chiếc nào giống chiếc nào.',
  },
  {
    id: 'p2',
    title: 'Khăn lụa tơ tằm nhuộm lá chàm',
    artisan: 'HTX Lụa Dệt Tay',
    village: 'Vạn Phúc',
    category: 'silk',
    badge: 'Tơ tằm 100%',
    description: 'Dệt trên khung cửi cổ truyền từ sợi tơ vàng Bảo Lộc, nhuộm lá chàm tự nhiên vùng cao.',
    price: 950000,
    formattedPrice: '950.000₫',
    image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=800&q=80',
    material: '100% Sợi tơ vàng Bảo Lộc, thuốc nhuộm thực vật',
    story: 'Khăn được phơi dưới nắng sớm và dệt mật độ sợi cao, tạo độ rủ mát và óng ả theo từng góc ánh sáng.',
  },
  {
    id: 'p3',
    title: 'Hộp trà sơn mài khảm vỏ trứng & trai',
    artisan: 'Xưởng NN Đinh Văn Ba',
    village: 'Hạ Thái',
    category: 'lacquer',
    badge: 'Sơn mài ta',
    description: 'Sử dụng nhựa cây sơn ta Phú Thọ trải qua 15 lớp mài nước thủ công và cẩn vỏ ốc xà cừ.',
    price: 2890000,
    formattedPrice: '2.890.000₫',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    material: 'Gỗ tự nhiên, sơn ta Phú Thọ, vỏ trứng vịt & xà cừ',
    story: 'Nghệ thuật sơn mài truyền thống đòi hỏi ủ khô trong buồng kín ẩm tối, kiên trì mài nước từng lớp để lộ vân lấp lánh.',
  },
  {
    id: 'p4',
    title: 'Khay mây đan họa tiết mắt cáo',
    artisan: 'Làng Nghề Mây Tre',
    village: 'Phú Vinh',
    category: 'lacquer',
    badge: 'Mây tre đan',
    description: 'Sợi mây bánh tẻ tuốt mịn thủ công, xử lý chống ẩm bằng khói rơm nếp không hóa chất.',
    price: 680000,
    formattedPrice: '680.000₫',
    image: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
    material: 'Mây rừng bánh tẻ, hun khói rơm tự nhiên',
    story: 'Những nan mây dẻo dai được bàn tay nghệ nhân chẻ đều như sợi chỉ, đan khít chặt lưu giữ nét thanh tao mộc mạc.',
  },
  {
    id: 'p5',
    title: 'Bộ ấm chén men lam hoa cúc cổ',
    artisan: 'Nghệ nhân Tô Thanh Sơn',
    village: 'Bát Tràng',
    category: 'pottery',
    badge: 'Gốm phục cổ',
    description: 'Men lam truyền thống vẽ tay thủ công hoa cúc dây triều Lê, viền bọc đồng tinh xảo.',
    price: 1850000,
    formattedPrice: '1.850.000₫',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
    material: 'Đất cao lanh tuyển chọn, men lam oxit coban',
    story: 'Màu xanh lam trầm sâu thẳm sau khi nung 1300 độ C, mang phong vị thiền trà cổ kính Việt Nam.',
  },
  {
    id: 'p6',
    title: 'Quạt lụa thêu tay phong cảnh Cố Đô',
    artisan: 'Nghệ nhân Thêu Thu Hương',
    village: 'Quất Động',
    category: 'silk',
    badge: 'Thêu tay độc bản',
    description: 'Sử dụng chỉ tơ tằm nhuộm màu tự nhiên trên nền vải sa mỏng, khung nan tre già vuốt bóng.',
    price: 1200000,
    formattedPrice: '1.200.000₫',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    material: 'Lụa tơ tằm sa mỏng, nan tre cổ',
    story: 'Hàng ngàn mũi thêu tỉ mỉ tái hiện nét trầm mặc của sông Hương, chùa Thiên Mụ.',
  },
];

export const WORKSHOPS_DATA: WorkshopItem[] = [
  {
    id: 'ws-1',
    title: 'Làm hương thủ công và se nén trầm cùng nghệ nhân Huế',
    tag: 'Bán chạy nhất',
    tagColor: '#984628',
    location: 'Làng Thủy Xuân, Huế',
    duration: '2.5 Giờ',
    description:
      'Tự chọn bột thảo mộc, học cách se que hương bằng tay và thưởng trà sen trong khuôn viên nhà rường cổ.',
    pricePerGuest: 350000,
    formattedPrice: '350.000₫',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=700&q=80',
    rating: 4.95,
    artisanGuide: 'Nghệ nhân Tôn Nữ Ánh Tuyết',
  },
  {
    id: 'ws-2',
    title: 'Tự tay vuốt gốm & tráng men trên bàn xoay truyền thống',
    tag: 'Gia đình yêu thích',
    tagColor: '#40655C',
    location: 'Bát Tràng, Hà Nội',
    duration: '3.0 Giờ',
    description:
      'Thao tác trực tiếp trên bàn xoay chân đạp, vẽ hoa văn màu lam và nhận sản phẩm nung hoàn chỉnh sau 3 ngày.',
    pricePerGuest: 420000,
    formattedPrice: '420.000₫',
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=700&q=80',
    rating: 4.98,
    artisanGuide: 'Nghệ nhân Bùi Văn Huy',
  },
  {
    id: 'ws-3',
    title: 'Kỹ thuật dệt sợi tơ tằm cổ và nhuộm vải mộc bản địa',
    tag: 'Độc quyền',
    tagColor: '#173D35',
    location: 'Vạn Phúc, Hà Nội',
    duration: '4.0 Giờ',
    description:
      'Làm quen với xa quay sợi, luồn thoi dệt lụa sa và tạo hoa văn nhuộm củ nâu, lá trầu không truyền thống.',
    pricePerGuest: 550000,
    formattedPrice: '550.000₫',
    image: 'https://images.unsplash.com/photo-1617050318658-a9a3175e34cb?auto=format&fit=crop&w=700&q=80',
    rating: 4.92,
    artisanGuide: 'HTX Nghệ Nhân Vạn Phúc',
  },
  {
    id: 'ws-4',
    title: 'Nghệ thuật cẩn xà cừ và mài bóng sơn mài cung đình',
    tag: 'Kỹ thuật cao',
    tagColor: '#2C3B29',
    location: 'Chuyên Mỹ, Phú Xuyên',
    duration: '3.5 Giờ',
    description:
      'Khắc hình, cẩn xà cừ óng ánh từ vỏ trai tự nhiên và thực hành mài bóng tranh sơn mài thu nhỏ mang về.',
    pricePerGuest: 680000,
    formattedPrice: '680.000₫',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=700&q=80',
    rating: 4.96,
    artisanGuide: 'Nghệ nhân Nguyễn Đình Vinh',
  },
];

export const ARTISAN_MASTER_DATA: MasterArtisan = {
  name: 'Bác Trần Văn Độ',
  title: 'Nghệ nhân Ưu tú Gốm sứ Bát Tràng',
  experienceYears: 48,
  honorTitle: 'Di sản Sống',
  medal: 'Huân chương Lao động Hạng Ba',
  quote:
    '“Đất sét vốn vô tri nhưng chứa đầy linh hồn của thổ nhưỡng. Đôi bàn tay người thợ không chỉ uốn nắn hình hài mà còn gửi gắm cả sự nhẫn nại và hơi thở của một đời người vào từng chiếc bình.”',
  storyParagraph1:
    'Sinh ra trong gia đình 5 đời gắn bó với lò gốm Bát Tràng, bác Độ đã dành nửa thế kỷ nghiên cứu và phục dựng lại những dòng men cổ quý hiếm thời Lý - Trần - Lê tưởng chừng đã thất truyền.',
  storyParagraph2:
    'Với LocalCraft, bác mở rộng cửa xưởng đón những người trẻ đến học nghề và lắng nghe câu chuyện của bùn đất, biến mỗi trải nghiệm thành nhịp cầu kết nối tình yêu văn hóa dân tộc.',
  image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
  metrics: [
    { value: '120+', label: 'Mẫu men cổ phục chế' },
    { value: '2,500+', label: 'Học viên đã theo học' },
  ],
};

export const AI_PRESETS: AIQueryPreset[] = [
  {
    id: 'hue-family',
    query:
      'Tôi muốn trải nghiệm làm đồ thủ công ở Huế, ngân sách 300.000–500.000đ, không khí yên bình và phù hợp đi cùng gia đình có trẻ nhỏ.',
    tags: ['# TP. Huế', '# Phù hợp gia đình', '# 300k - 500k', '# Có nghệ nhân kèm riêng'],
    recommendation: {
      title: 'Khóa làm hương Thủy Xuân kết hợp trà chiều cổ kính',
      matchScore: 98,
      matchLabel: 'Khuyên dùng hàng đầu',
      artisan: 'NN. Tôn Nữ Ánh Tuyết',
      description:
        'Hướng dẫn bởi NN. Tôn Nữ Ánh Tuyết tại sân hiên râm mát nhà rường, có bàn se hương mini an toàn cho trẻ và tặng kèm quà lưu niệm thủ công.',
      image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=400&q=80',
      price: '350.000₫ / khách',
    },
  },
  {
    id: 'hanoi-pottery',
    query:
      'Tìm trải nghiệm vuốt gốm tại Bát Tràng cho cặp đôi vào thứ Bảy, muốn tự vẽ men màu và có hướng dẫn riêng 1-1.',
    tags: ['# Hà Nội', '# Dành cho cặp đôi', '# Cuối tuần', '# Kèm 1-1'],
    recommendation: {
      title: 'Workshop Gốm Uyên Ương & Men Lam Cổ Bát Tràng',
      matchScore: 99,
      matchLabel: 'Gợi ý lý tưởng',
      artisan: 'NN. Bùi Văn Huy',
      description:
        'Trải nghiệm xoay gốm đôi trên bàn xoay chân đạp, tự tay khắc tên và tráng men ngọc trong không gian xưởng gốm cổ ven sông.',
      image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=400&q=80',
      price: '420.000₫ / khách',
    },
  },
  {
    id: 'vanphuc-silk',
    query:
      'Muốn học dệt lụa tơ tằm và nhuộm vải mộc truyền thống, tìm hiểu sâu về kỹ thuật dệt hoa văn sa cổ.',
    tags: ['# Vạn Phúc', '# Chuyên sâu', '# Lụa tơ tằm', '# Tự tay dệt'],
    recommendation: {
      title: 'Khóa dệt sa và nhuộm thảo mộc tự nhiên Vạn Phúc',
      matchScore: 96,
      matchLabel: 'Trải nghiệm độc bản',
      artisan: 'HTX Nghệ Nhân Vạn Phúc',
      description:
        'Thao tác cùng nghệ nhân trên khung cửi cổ truyền từ thế kỷ 18, nhuộm vải bằng vỏ củ nâu và mang về khăn lụa tự dệt.',
      image: 'https://images.unsplash.com/photo-1617050318658-a9a3175e34cb?auto=format&fit=crop&w=400&q=80',
      price: '550.000₫ / khách',
    },
  },
];
