"""
Management command to seed initial roles, craft villages, artisans, products, workshops, stories, and RAG knowledge.
Usage: python manage.py seed_data
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import Role, User, UserRole
from apps.villages.models import CraftVillage
from apps.artisans.models import ArtisanProfile
from apps.stories.models import CraftStory
from apps.products.models import Category, Product, ProductImage, ProductVariant, Inventory
from apps.workshops.models import Workshop, WorkshopSession
from apps.chatbot.models import KnowledgeSource, KnowledgeChunk


class Command(BaseCommand):
    help = 'Seed initial LocalCraft data: Roles, Villages, Artisans, Products, Workshops, Stories, Knowledge Base'

    def handle(self, *args, **options):
        self.stdout.write("1. Seeding roles...")
        roles_data = [
            ('TOURIST', 'Du khách', 'Khách du lịch trải nghiệm di sản văn hóa và đặt workshop.'),
            ('ARTISAN', 'Nghệ nhân', 'Nghệ nhân làng nghề truyền thống và chủ workshop.'),
            ('ADMIN', 'Quản trị viên', 'Quản trị viên toàn quyền hệ thống LocalCraft.'),
        ]
        roles = {}
        for code, name, desc in roles_data:
            role, _ = Role.objects.get_or_create(
                role_code=code,
                defaults={'role_name': name, 'description': desc}
            )
            roles[code] = role

        self.stdout.write("2. Seeding users & artisan...")
        # Admin
        admin_user, created = User.objects.get_or_create(
            email='admin@localcraft.vn',
            defaults={
                'full_name': 'Quản Trị Viên LocalCraft',
                'phone': '0901234567',
                'gender': 'OTHER',
                'status': User.UserStatus.ACTIVE,
                'email_verified_at': timezone.now(),
            }
        )
        if created:
            admin_user.set_password('Admin@123456')
            admin_user.save()
            UserRole.objects.get_or_create(user=admin_user, role=roles['ADMIN'])

        # Master Artisan Tran Van Do
        artisan_user, created = User.objects.get_or_create(
            email='tranvando.bat-trang@localcraft.vn',
            defaults={
                'full_name': 'Trần Văn Độ',
                'phone': '0912345678',
                'gender': 'MALE',
                'status': User.UserStatus.ACTIVE,
                'avatar_url': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
                'email_verified_at': timezone.now(),
            }
        )
        if created:
            artisan_user.set_password('Artisan@123456')
            artisan_user.save()
            UserRole.objects.get_or_create(user=artisan_user, role=roles['ARTISAN'])

        self.stdout.write("3. Seeding craft villages...")
        villages_info = [
            {
                'name': 'Làng Gốm Bát Tràng',
                'slug': 'bat-trang',
                'province': 'Hà Nội',
                'district': 'Gia Lâm',
                'address': 'Xã Bát Tràng, Huyện Gia Lâm, Hà Nội',
                'description': 'Nghệ thuật đất nung và men ngọc ngàn năm. Nơi từng khối đất sét thô sơ hoá thành báu vật dưới lòng bàn tay nghệ nhân.',
                'cover_image_url': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80',
            },
            {
                'name': 'Làng Hương Thủy Xuân',
                'slug': 'thuy-xuan',
                'province': 'Thừa Thiên Huế',
                'district': 'TP. Huế',
                'address': 'Đường Huyền Trân Công Chúa, Phường Thủy Xuân, TP. Huế',
                'description': 'Những bó hương xòe hoa ngát hương trầm tự nhiên bên dòng sông Hương thơ mộng của xứ Cố Đô.',
                'cover_image_url': 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1000&q=80',
            },
            {
                'name': 'Làng Lụa Vạn Phúc',
                'slug': 'van-phuc',
                'province': 'Hà Nội',
                'district': 'Hà Đông',
                'address': 'Phường Vạn Phúc, Quận Hà Đông, Hà Nội',
                'description': 'Khung cửi cổ truyền lưu giữ tấm the, tấm lụa mềm mại dâng vua triều Nguyễn và xuất khẩu bốn phương.',
                'cover_image_url': 'https://images.unsplash.com/photo-1617050318658-a9a3175e34cb?auto=format&fit=crop&w=1000&q=80',
            },
            {
                'name': 'Làng Đá Non Nước',
                'slug': 'non-nuoc',
                'province': 'Đà Nẵng',
                'district': 'Ngũ Hành Sơn',
                'address': 'Phường Hòa Hải, Quận Ngũ Hành Sơn, Đà Nẵng',
                'description': 'Tiếng đục đẽo vang vọng bên chân núi Ngũ Hành, thổi sinh khí vào từng phiến đá trầm tích ngàn năm tuổi.',
                'cover_image_url': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80',
            },
            {
                'name': 'Làng Chiếu Định Yên',
                'slug': 'dinh-yen',
                'province': 'Đồng Tháp',
                'district': 'Lấp Vò',
                'address': 'Xã Định Yên, Huyện Lấp Vò, Tỉnh Đồng Tháp',
                'description': 'Huyền thoại "chợ ma" họp giữa đêm thanh vắng, rực rỡ sắc cói nhuộm thắm đượm tình đất phương Nam.',
                'cover_image_url': 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1000&q=80',
            },
            {
                'name': 'Làng Sơn Mài Tương Bình Hiệp',
                'slug': 'tuong-binh-hiep',
                'province': 'Bình Dương',
                'district': 'TP. Thủ Dầu Một',
                'address': 'Phường Tương Bình Hiệp, TP. Thủ Dầu Một, Bình Dương',
                'description': 'Nghệ thuật sơn ta đa tầng, mài nước kỳ công kết hợp cẩn ốc xà cừ tinh xảo lưu dấu qua bao thế hệ.',
                'cover_image_url': 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80',
            },
        ]

        villages = {}
        for v in villages_info:
            village_obj, _ = CraftVillage.objects.get_or_create(
                slug=v['slug'],
                defaults={
                    'village_name': v['name'],
                    'province': v['province'],
                    'district': v['district'],
                    'address': v['address'],
                    'description': v['description'],
                    'cover_image_url': v['cover_image_url'],
                    'status': CraftVillage.VillageStatus.ACTIVE,
                }
            )
            villages[v['slug']] = village_obj

        # Artisan Profile for Tran Van Do
        artisan_profile, _ = ArtisanProfile.objects.get_or_create(
            user=artisan_user,
            defaults={
                'village': villages['bat-trang'],
                'display_name': 'Nghệ nhân ưu tú Trần Văn Độ',
                'bio': 'Người phục chế thành công các dòng men cổ Đại Việt từ thời Lý, Trần, Lê. Hơn 40 năm gắn bó với lò nung củi truyền thống Bát Tràng.',
                'experience_years': 42,
                'verification_status': ArtisanProfile.VerificationStatus.APPROVED,
            }
        )

        self.stdout.write("4. Seeding categories...")
        categories_data = [
            ('Gốm sứ & Men cổ', 'pottery', 'Các tác phẩm gốm đất nung, men ngọc, men rạn truyền thống.'),
            ('Lụa & Dệt thủ công', 'silk', 'Lụa tơ tằm, thổ cẩm, the lụa dệt tay.'),
            ('Sơn mài mỹ nghệ', 'lacquer', 'Tranh sơn mài, khay trà cẩn ốc, hộp quà lưu niệm.'),
            ('Mây tre & Trầm hương', 'craft', 'Hương trầm tự nhiên, mây tre đan tinh xảo.'),
        ]
        categories = {}
        for name, slug, desc in categories_data:
            cat, _ = Category.objects.get_or_create(
                slug=slug,
                defaults={'category_name': name, 'description': desc, 'status': Category.CategoryStatus.ACTIVE}
            )
            categories[slug] = cat

        self.stdout.write("5. Seeding products & variants...")
        products_info = [
            {
                'title': 'Bình Gốm Men Ngọc Thăng Long',
                'slug': 'binh-gom-men-ngoc-thang-long',
                'category': categories['pottery'],
                'price': Decimal('2850000.00'),
                'image': 'https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?auto=format&fit=crop&w=800&q=80',
                'desc': 'Tái hiện sắc xanh ngọc bích thời Lý với kỹ thuật nung củi liên tục 72 giờ tại nhiệt độ 1,300°C.',
                'sku': 'BT-POT-001',
            },
            {
                'title': 'Khăn Lụa Vạn Phúc Họa Tiết Mây',
                'slug': 'khan-lua-van-phuc-hoa-tiet-may',
                'category': categories['silk'],
                'price': Decimal('650000.00'),
                'image': 'https://images.unsplash.com/photo-1607344645866-009c320b5ab8?auto=format&fit=crop&w=800&q=80',
                'desc': 'Dệt từ 100% tơ tằm tự nhiên Bảo Lộc trên khung dệt cổ, nhuộm màu từ lá bàng và vỏ cây rừng.',
                'sku': 'VP-SILK-001',
            },
            {
                'title': 'Khay Trà Sơn Mài Khảm Trai Chu Đậu',
                'slug': 'khay-tra-son-mai-kham-trai',
                'category': categories['lacquer'],
                'price': Decimal('1200000.00'),
                'image': 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
                'desc': 'Trải qua 18 lớp sơn ta mài nước thủ công, cẩn xà cừ biển tự nhiên phản quang ánh ngũ sắc.',
                'sku': 'TB-LACQ-001',
            },
            {
                'title': 'Hộp Hương Trầm Thủy Xuân Cung Đình',
                'slug': 'hop-huong-tram-thuy-xuan',
                'category': categories['craft'],
                'price': Decimal('420000.00'),
                'image': 'https://images.unsplash.com/photo-1506806732259-39c2d0268443?auto=format&fit=crop&w=800&q=80',
                'desc': 'Hương trầm tự nhiên được se thủ công từ bột trầm dó bầu Quảng Nam kết hợp bài thuốc bắc Cố Đô.',
                'sku': 'TX-INC-001',
            },
        ]

        for p in products_info:
            prod, _ = Product.objects.get_or_create(
                slug=p['slug'],
                defaults={
                    'artisan': artisan_profile,
                    'category': p['category'],
                    'product_name': p['title'],
                    'description': p['desc'],
                    'base_price': p['price'],
                    'cover_image_url': p['image'],
                    'status': Product.ProductStatus.APPROVED,
                    'published_at': timezone.now(),
                }
            )
            ProductImage.objects.get_or_create(
                product=prod,
                image_url=p['image'],
                defaults={'is_primary': True, 'alt_text': p['title']}
            )
            variant, _ = ProductVariant.objects.get_or_create(
                product=prod,
                sku=p['sku'],
                defaults={
                    'variant_name': 'Tiêu chuẩn thủ công',
                    'price': p['price'],
                    'is_active': True,
                }
            )
            Inventory.objects.get_or_create(
                variant=variant,
                defaults={'quantity': 50, 'reserved_quantity': 0}
            )

        self.stdout.write("6. Seeding workshops & sessions...")
        workshops_info = [
            {
                'title': 'Vuốt gốm và nung men hỏa biến trên bàn xoay cổ',
                'slug': 'vuot-gom-nung-men-hoa-bien',
                'category': categories['pottery'],
                'duration': 150,
                'price': Decimal('380000.00'),
                'address': 'Xưởng gốm Trần Độ, Làng Gốm Bát Tràng, Gia Lâm, Hà Nội',
                'image': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
                'desc': 'Tự tay làm quen với khối đất sét sông Hồng dẻo mịn trên bàn xoay truyền thống, tạo dáng bình hoa độc bản và mang về tác phẩm sau khi nung men ngọc.',
            },
            {
                'title': 'Se hương trầm hoàng cung và phối hương thảo mộc',
                'slug': 'se-huong-tram-hoang-cung',
                'category': categories['craft'],
                'duration': 90,
                'price': Decimal('260000.00'),
                'address': 'Làng Hương Thủy Xuân, Đường Huyền Trân Công Chúa, TP. Huế',
                'image': 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
                'desc': 'Trải nghiệm phối trộn 8 vị thảo mộc thuốc bắc cung đình triều Nguyễn, tự tay se tăm hương ngũ sắc rực rỡ và đóng gói hộp trầm hương mang về.',
            },
            {
                'title': 'Dệt lụa tơ tằm cổ truyền & Nhuộm lá tự nhiên',
                'slug': 'det-lua-to-tam-co-truyen',
                'category': categories['silk'],
                'duration': 180,
                'price': Decimal('450000.00'),
                'address': 'Khu dệt thủ công làng lụa Vạn Phúc, Hà Đông, Hà Nội',
                'image': 'https://images.unsplash.com/photo-1617050318658-a9a3175e34cb?auto=format&fit=crop&w=800&q=80',
                'desc': 'Tìm hiểu vòng đời con tằm nhả tơ, trải nghiệm ngồi vào khung cửi cổ điều khiển thoi dệt và tự tay nhuộm khăn lụa tơ tằm bằng sắc tố thảo mộc tự nhiên.',
            },
            {
                'title': 'Kỹ thuật mài nước sơn ta và khảm xà cừ',
                'slug': 'ky-thuat-mai-nuoc-son-ta',
                'category': categories['lacquer'],
                'duration': 120,
                'price': Decimal('320000.00'),
                'address': 'Xưởng mỹ nghệ Tương Bình Hiệp, Thủ Dầu Một, Bình Dương',
                'image': 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
                'desc': 'Cảm nhận từng lớp sơn ta đa tầng dưới dòng nước trong veo, dùng giấy ráp mài nổi đường nét óng ả của vỏ ốc xà cừ dưới sự dìu dắt tận tình của nghệ nhân.',
            },
        ]

        now = timezone.now()
        for w in workshops_info:
            wk_obj, _ = Workshop.objects.get_or_create(
                slug=w['slug'],
                defaults={
                    'artisan': artisan_profile,
                    'category': w['category'],
                    'workshop_name': w['title'],
                    'description': w['desc'],
                    'duration_minutes': w['duration'],
                    'price_per_person': w['price'],
                    'location_address': w['address'],
                    'cover_image_url': w['image'],
                    'status': Workshop.WorkshopStatus.APPROVED,
                }
            )

            # Generate sessions for upcoming weekends
            for days_ahead in [1, 2, 7, 8]:
                start_dt = (now + timedelta(days=days_ahead)).replace(hour=9, minute=0, second=0, microsecond=0)
                end_dt = start_dt + timedelta(minutes=w['duration'])
                WorkshopSession.objects.get_or_create(
                    workshop=wk_obj,
                    start_at=start_dt,
                    defaults={
                        'end_at': end_dt,
                        'capacity': 12,
                        'booked_participants': 2,
                        'price_per_person': w['price'],
                        'status': WorkshopSession.SessionStatus.OPEN,
                    }
                )

        self.stdout.write("7. Seeding craft stories & RAG knowledge base...")
        story, _ = CraftStory.objects.get_or_create(
            slug='tran-tich-ngan-nam-men-gom-viet',
            defaults={
                'village': villages['bat-trang'],
                'artisan': artisan_profile,
                'title': 'Trầm tích ngàn năm men gốm Việt - Nghệ nhân ưu tú Trần Văn Độ',
                'summary': 'Người phục sinh men ngọc thời Lý và ngọn lửa lò củi ngàn độ suốt bốn thập kỷ tại làng cổ Bát Tràng.',
                'content': (
                    'Trong gian nhà cổ phảng phất mùi củi nung và hơi ẩm của đất sét ven đê sông Hồng, '
                    'Nghệ nhân ưu tú Trần Văn Độ cẩn trọng nâng niu chiếc bình men tro thời Lý vừa ra lò. '
                    'Gần nửa thế kỷ qua, đôi bàn tay gân guốc ấy chưa bao giờ ngơi nghỉ trong hành trình tìm lại '
                    'hồn cốt của gốm Việt cổ...'
                ),
                'cover_image_url': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80',
                'status': CraftStory.StoryStatus.APPROVED,
                'published_at': timezone.now(),
            }
        )

        # Knowledge Source & Chunks for RAG
        ks, _ = KnowledgeSource.objects.get_or_create(
            source_title='Cẩm nang di sản làng nghề thủ công Việt Nam',
            defaults={
                'source_type': 'HERITAGE_DOC',
                'source_content': 'Tài liệu tra cứu văn hóa làng nghề truyền thống Bát Tràng, Thủy Xuân, Vạn Phúc.',
                'related_village': villages['bat-trang'],
                'related_story': story,
                'status': KnowledgeSource.KnowledgeStatus.APPROVED,
                'approved_by': admin_user,
                'approved_at': timezone.now(),
            }
        )

        chunks_data = [
            (1, 'Làng Gốm Bát Tràng nằm bên tả ngạn sông Hồng thuộc huyện Gia Lâm, Hà Nội. Làng có lịch sử từ thế kỷ 14 thời nhà Lý - Trần, nổi danh với các dòng men rạn, men ngọc, men lam đặc sắc.'),
            (2, 'Làng Hương Thủy Xuân tọa lạc dưới chân đồi Vọng Cảnh, TP. Huế, có tuổi đời hơn 700 năm. Hương trầm Thủy Xuân làm từ bài thuốc bắc cung đình, bột trầm dó bầu nguyên chất thơm dịu thanh khiết.'),
            (3, 'Làng Lụa Vạn Phúc (Hà Đông) đã hơn 1000 năm tuổi, nức tiếng với lụa vân mềm mại mùa hè mát mẻ, mùa đông giữ ấm, từng là vật phẩm tiến vua triều Nguyễn.'),
        ]
        for idx, text in chunks_data:
            KnowledgeChunk.objects.get_or_create(
                knowledge_source=ks,
                chunk_index=idx,
                defaults={'chunk_content': text, 'token_count': len(text.split())}
            )

        self.stdout.write(self.style.SUCCESS("All LocalCraft data seeded successfully!"))
