"""
Management command to seed comprehensive, authentic sample data for ALL 31 tables in the LocalCraft database.
Usage: python manage.py seed_data --settings=config.settings.development
"""

from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

# 1. Accounts
from apps.accounts.models import Role, User, UserRole

# 2. Villages & Artisans
from apps.villages.models import CraftVillage
from apps.artisans.models import ArtisanProfile

# 3. Categories & Products
from apps.products.models import Category, Product, ProductImage, ProductVariant, Inventory

# 4. Stories
from apps.stories.models import CraftStory

# 5. Workshops & Sessions & Bookings
from apps.workshops.models import Workshop, WorkshopSession
from apps.bookings.models import WorkshopBooking

# 6. Orders & Carts
from apps.orders.models import Cart, CartItem, Order, VendorOrder, OrderItem

# 7. Payments & Refunds
from apps.payments.models import Payment, RefundPolicy, Refund

# 8. Reviews
from apps.reviews.models import Review

# 9. Recommendations & Preferences
from apps.recommendations.models import UserPreference, UserInteraction, Favorite

# 10. Chatbot & RAG Knowledge
from apps.chatbot.models import KnowledgeSource, KnowledgeChunk, ChatSession, ChatMessage

# 11. Notifications
from apps.notifications.models import Notification


class Command(BaseCommand):
    help = 'Seed realistic sample data for all 31 tables in the LocalCraft database.'

    def handle(self, *args, **options):
        now = timezone.now()

        # =========================================================================
        # 1. ROLES (Table 2: roles)
        # =========================================================================
        self.stdout.write("1. Seeding roles...")
        roles_data = [
            ('TOURIST', 'Du khách', 'Khách du lịch trải nghiệm di sản văn hóa, mua sắm sản phẩm và đặt workshop.'),
            ('CRAFT_VILLAGE', 'Làng nghề', 'Tài khoản quản lý làng nghề thủ công truyền thống.'),
            ('ADMIN', 'Quản trị viên', 'Quản trị viên toàn quyền hệ thống LocalCraft.'),
        ]
        roles = {}
        for code, name, desc in roles_data:
            role, _ = Role.objects.get_or_create(
                role_code=code,
                defaults={'role_name': name, 'description': desc}
            )
            roles[code] = role

        # =========================================================================
        # 2. USERS & USER ROLES (Table 1: users, Table 3: user_roles)
        # =========================================================================
        self.stdout.write("2. Seeding users and user_roles...")
        # Admin
        admin_user, _ = User.objects.get_or_create(
            email='admin@localcraft.vn',
            defaults={
                'full_name': 'Quản Trị Viên LocalCraft',
                'phone': '0901234567',
                'gender': 'OTHER',
                'status': User.UserStatus.ACTIVE,
                'email_verified_at': now,
            }
        )
        admin_user.set_password('Admin@123456')
        admin_user.save()
        UserRole.objects.update_or_create(user=admin_user, defaults={'role': roles['ADMIN']})

        # Village Managers
        managers_data = [
            ('manager.bat-trang@localcraft.vn', 'Ban Quản Lý Làng Gốm Bát Tràng', '0912345671', 'Xã Bát Tràng, Gia Lâm, Hà Nội'),
            ('manager.van-phuc@localcraft.vn', 'Ban Quản Lý Làng Lụa Vạn Phúc', '0912345672', 'Phường Vạn Phúc, Hà Đông, Hà Nội'),
            ('manager.thuy-xuan@localcraft.vn', 'Ban Quản Lý Làng Hương Thủy Xuân', '0912345673', 'Đường Huyền Trân Công Chúa, TP. Huế'),
            ('manager.non-nuoc@localcraft.vn', 'Ban Quản Lý Làng Đá Non Nước', '0912345674', 'Phường Hòa Hải, Ngũ Hành Sơn, Đà Nẵng'),
            ('manager.tuong-binh-hiep@localcraft.vn', 'Ban Quản Lý Làng Sơn Mài Tương Bình Hiệp', '0912345675', 'Thủ Dầu Một, Bình Dương'),
        ]
        village_managers = {}
        for email, name, phone, addr in managers_data:
            mgr, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'full_name': name,
                    'phone': phone,
                    'address': addr,
                    'gender': 'OTHER',
                    'status': User.UserStatus.ACTIVE,
                    'email_verified_at': now,
                }
            )
            mgr.set_password('Manager@123456')
            mgr.save()
            UserRole.objects.update_or_create(user=mgr, defaults={'role': roles['CRAFT_VILLAGE']})
            village_managers[email] = mgr

        # Tourist Users
        tourists_data = [
            ('tourist@localcraft.vn', 'Nguyễn Hà Tourist', '0987654321', 'MALE', 'Hoàn Kiếm, Hà Nội'),
            ('tourist.le@localcraft.vn', 'Lê Thúy An', '0987654322', 'FEMALE', 'Quận 1, TP. Hồ Chí Minh'),
            ('tourist.tran@localcraft.vn', 'Trần Quang Khải', '0987654323', 'MALE', 'Hải Châu, Đà Nẵng'),
        ]
        tourists = []
        for email, name, phone, gender, addr in tourists_data:
            u, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'full_name': name,
                    'phone': phone,
                    'gender': gender,
                    'address': addr,
                    'status': User.UserStatus.ACTIVE,
                    'email_verified_at': now,
                }
            )
            u.set_password('Tourist@123456')
            u.save()
            UserRole.objects.update_or_create(user=u, defaults={'role': roles['TOURIST']})
            tourists.append(u)

        primary_tourist = tourists[0]

        # =========================================================================
        # 3. CRAFT VILLAGES (Table 5: craft_villages)
        # =========================================================================
        self.stdout.write("3. Seeding craft_villages...")
        villages_info = [
            {
                'name': 'Làng Gốm Bát Tràng',
                'slug': 'bat-trang',
                'province': 'Hà Nội',
                'district': 'Gia Lâm',
                'address': 'Xã Bát Tràng, Huyện Gia Lâm, Hà Nội',
                'description': 'Nghệ thuật đất nung và men ngọc ngàn năm. Từng khối đất sét thô sơ hoá thành báu vật dưới bàn tay nghệ nhân.',
                'cover_image_url': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80',
                'manager': village_managers['manager.bat-trang@localcraft.vn'],
            },
            {
                'name': 'Làng Lụa Vạn Phúc',
                'slug': 'van-phuc',
                'province': 'Hà Nội',
                'district': 'Hà Đông',
                'address': 'Phường Vạn Phúc, Quận Hà Đông, Hà Nội',
                'description': 'Khung cửi cổ truyền lưu giữ tấm the, tấm lụa mềm mại dâng vua triều Nguyễn và xuất khẩu bốn phương.',
                'cover_image_url': 'https://images.unsplash.com/photo-1617050318658-a9a3175e34cb?auto=format&fit=crop&w=1000&q=80',
                'manager': village_managers['manager.van-phuc@localcraft.vn'],
            },
            {
                'name': 'Làng Hương Thủy Xuân',
                'slug': 'thuy-xuan',
                'province': 'Thừa Thiên Huế',
                'district': 'TP. Huế',
                'address': 'Đường Huyền Trân Công Chúa, Phường Thủy Xuân, TP. Huế',
                'description': 'Những bó hương xòe hoa ngát hương trầm tự nhiên bên dòng sông Hương thơ mộng của xứ Cố Đô.',
                'cover_image_url': 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1000&q=80',
                'manager': village_managers['manager.thuy-xuan@localcraft.vn'],
            },
            {
                'name': 'Làng Đá Non Nước',
                'slug': 'non-nuoc',
                'province': 'Đà Nẵng',
                'district': 'Ngũ Hành Sơn',
                'address': 'Phường Hòa Hải, Quận Ngũ Hành Sơn, Đà Nẵng',
                'description': 'Tiếng đục đẽo vang vọng bên chân núi Ngũ Hành, thổi sinh khí vào từng phiến đá trầm tích ngàn năm tuổi.',
                'cover_image_url': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80',
                'manager': village_managers['manager.non-nuoc@localcraft.vn'],
            },
            {
                'name': 'Làng Sơn Mài Tương Bình Hiệp',
                'slug': 'tuong-binh-hiep',
                'province': 'Bình Dương',
                'district': 'TP. Thủ Dầu Một',
                'address': 'Phường Tương Bình Hiệp, TP. Thủ Dầu Một, Bình Dương',
                'description': 'Nghệ thuật sơn ta đa tầng, mài nước kỳ công kết hợp cẩn ốc xà cừ tinh xảo lưu dấu qua bao thế hệ.',
                'cover_image_url': 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80',
                'manager': village_managers['manager.tuong-binh-hiep@localcraft.vn'],
            },
        ]
        villages = {}
        for v in villages_info:
            village_obj, _ = CraftVillage.objects.update_or_create(
                slug=v['slug'],
                defaults={
                    'village_name': v['name'],
                    'manager_user': v['manager'],
                    'province': v['province'],
                    'district': v['district'],
                    'address': v['address'],
                    'description': v['description'],
                    'cover_image_url': v['cover_image_url'],
                    'status': CraftVillage.VillageStatus.ACTIVE,
                }
            )
            villages[v['slug']] = village_obj

        # =========================================================================
        # 4. ARTISAN PROFILES (Table 4: artisan_profiles)
        # =========================================================================
        self.stdout.write("4. Seeding artisan_profiles...")
        artisans_data = [
            ('Nghệ nhân ưu tú Trần Văn Độ', 'bat-trang', 42, 'Người phục chế thành công các dòng men cổ Đại Việt từ thời Lý, Trần, Lê.'),
            ('Nghệ nhân Đỗ Quang Hùng', 'van-phuc', 35, 'Nghệ nhân kế thừa xưởng dệt lụa gấm vân cổ truyền đời thứ tư.'),
            ('Nghệ nhân Tôn Nữ Ánh Tuyết', 'thuy-xuan', 28, 'Bậc thầy phối chế 8 vị thảo mộc thuốc bắc cung đình cho tăm hương xứ Huế.'),
            ('Nghệ nhân Nguyễn Long Bửu', 'non-nuoc', 38, 'Nghệ nhân điêu khắc đá mỹ nghệ với nhiều tác phẩm điêu khắc tượng Phật nổi tiếng.'),
            ('Nghệ nhân Nguyễn Văn Cường', 'tuong-binh-hiep', 30, 'Bậc thầy tranh sơn mài cẩn xà cừ phản quang ánh ngũ sắc tự nhiên.'),
        ]
        artisans = {}
        for name, v_slug, yrs, bio in artisans_data:
            art, _ = ArtisanProfile.objects.update_or_create(
                display_name=name,
                defaults={
                    'village': villages[v_slug],
                    'experience_years': yrs,
                    'bio': bio,
                    'avatar_url': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
                    'verification_status': ArtisanProfile.VerificationStatus.APPROVED,
                }
            )
            artisans[v_slug] = art

        # =========================================================================
        # 5. CATEGORIES (Table 6: categories)
        # =========================================================================
        self.stdout.write("5. Seeding categories...")
        categories_data = [
            ('Gốm sứ & Men cổ', 'pottery', 'Các tác phẩm gốm đất nung, men ngọc, men rạn truyền thống.'),
            ('Lụa & Dệt thủ công', 'silk', 'Lụa tơ tằm, thổ cẩm, the lụa dệt tay.'),
            ('Sơn mài mỹ nghệ', 'lacquer', 'Tranh sơn mài, khay trà cẩn ốc, hộp quà lưu niệm.'),
            ('Mây tre & Trầm hương', 'craft', 'Hương trầm tự nhiên, mây tre đan tinh xảo.'),
        ]
        categories = {}
        for name, slug, desc in categories_data:
            cat, _ = Category.objects.update_or_create(
                slug=slug,
                defaults={'category_name': name, 'description': desc, 'status': Category.CategoryStatus.ACTIVE}
            )
            categories[slug] = cat

        # =========================================================================
        # 6. CRAFT STORIES (Table 7: craft_stories)
        # =========================================================================
        self.stdout.write("6. Seeding craft_stories...")
        stories_data = [
            (
                'bat-trang', 'tran-tich-ngan-nam-men-gom-viet',
                'Trầm tích ngàn năm men gốm Việt - Nghệ nhân ưu tú Trần Văn Độ',
                'Người phục sinh men ngọc thời Lý và ngọn lửa lò củi ngàn độ suốt bốn thập kỷ tại làng cổ Bát Tràng.',
                'Trong gian nhà cổ phảng phất mùi củi nung và hơi ẩm của đất sét ven đê sông Hồng, Nghệ nhân ưu tú Trần Văn Độ cẩn trọng nâng niu chiếc bình men tro thời Lý vừa ra lò...'
            ),
            (
                'van-phuc', 'tieng-thoi-det-lua-ngan-nam-van-phuc',
                'Tiếng thoi dệt lụa ngàn năm Vạn Phúc - Tấm the tiến vua',
                'Lịch sử nghìn năm của lụa tơ tằm sông Nhuệ, nơi những tấm the mỏng nhẹ như cánh ve từng làm say đắm khách buôn quốc tế.',
                'Làng lụa Vạn Phúc nằm nép mình bên dòng sông Nhuệ hiền hòa. Từ xa xưa, lụa Vạn Phúc đã nổi danh là cống phẩm thượng hạng cho hoàng triều...'
            ),
            (
                'thuy-xuan', 'sac-mau-huong-tram-xu-hue',
                'Sắc màu hương trầm Thủy Xuân - Ngát thơm Cố Đô',
                'Những bó chông hương rực rỡ xòe hoa dưới nắng vàng Cố Đô, lưu giữ nét đẹp tâm linh và thảo mộc tự nhiên.',
                'Đến với Thủy Xuân, du khách như lạc vào bức tranh rực rỡ của những đóa hoa hương sắc đỏ, vàng, lục, lam xòe tròn bên lề đường...'
            ),
        ]
        stories = {}
        for v_slug, s_slug, title, summary, content in stories_data:
            st, _ = CraftStory.objects.update_or_create(
                slug=s_slug,
                defaults={
                    'village': villages[v_slug],
                    'artisan': artisans[v_slug],
                    'title': title,
                    'summary': summary,
                    'content': content,
                    'cover_image_url': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80',
                    'status': CraftStory.StoryStatus.APPROVED,
                    'published_at': now,
                }
            )
            stories[s_slug] = st

        # =========================================================================
        # 7. PRODUCTS, IMAGES, VARIANTS, INVENTORY (Tables 8, 9, 10, 11)
        # =========================================================================
        self.stdout.write("7. Seeding products, product_images, product_variants, and inventory...")
        products_info = [
            {
                'title': 'Bình Gốm Men Ngọc Thăng Long',
                'slug': 'binh-gom-men-ngoc-thang-long',
                'village': villages['bat-trang'],
                'artisan': artisans['bat-trang'],
                'category': categories['pottery'],
                'price': Decimal('2850000.00'),
                'image': 'https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?auto=format&fit=crop&w=800&q=80',
                'desc': 'Tái hiện sắc xanh ngọc bích thời Lý với kỹ thuật nung củi liên tục 72 giờ tại nhiệt độ 1,300°C.',
                'variants': [
                    ('BT-POT-001', 'Men ngọc cổ (Cao 30cm)', Decimal('2850000.00'), 45),
                    ('BT-POT-002', 'Men rạn hoa lam (Cao 35cm)', Decimal('3200000.00'), 30),
                ]
            },
            {
                'title': 'Khăn Lụa Vạn Phúc Họa Tiết Mây',
                'slug': 'khan-lua-van-phuc-hoa-tiet-may',
                'village': villages['van-phuc'],
                'artisan': artisans['van-phuc'],
                'category': categories['silk'],
                'price': Decimal('650000.00'),
                'image': 'https://images.unsplash.com/photo-1607344645866-009c320b5ab8?auto=format&fit=crop&w=800&q=80',
                'desc': 'Dệt từ 100% tơ tằm tự nhiên trên khung dệt cổ, nhuộm màu tự nhiên từ lá bàng và vỏ cây rừng.',
                'variants': [
                    ('VP-SILK-001', 'Màu cánh sen (180x60cm)', Decimal('650000.00'), 60),
                    ('VP-SILK-002', 'Màu lam ngọc (180x60cm)', Decimal('650000.00'), 50),
                ]
            },
            {
                'title': 'Khay Trà Sơn Mài Khảm Trai Chu Đậu',
                'slug': 'khay-tra-son-mai-kham-trai',
                'village': villages['tuong-binh-hiep'],
                'artisan': artisans['tuong-binh-hiep'],
                'category': categories['lacquer'],
                'price': Decimal('1200000.00'),
                'image': 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
                'desc': 'Trải qua 18 lớp sơn ta mài nước thủ công, cẩn xà cừ biển tự nhiên phản quang ánh ngũ sắc.',
                'variants': [
                    ('TB-LACQ-001', 'Khay trà chữ nhật (40x25cm)', Decimal('1200000.00'), 25),
                ]
            },
            {
                'title': 'Hộp Hương Trầm Thủy Xuân Cung Đình',
                'slug': 'hop-huong-tram-thuy-xuan',
                'village': villages['thuy-xuan'],
                'artisan': artisans['thuy-xuan'],
                'category': categories['craft'],
                'price': Decimal('420000.00'),
                'image': 'https://images.unsplash.com/photo-1506806732259-39c2d0268443?auto=format&fit=crop&w=800&q=80',
                'desc': 'Hương trầm tự nhiên được se thủ công từ bột trầm dó bầu Quảng Nam kết hợp bài thuốc bắc Cố Đô.',
                'variants': [
                    ('TX-INC-001', 'Hộp gỗ 100 nén trầm cao cấp', Decimal('420000.00'), 100),
                ]
            },
        ]

        seeded_products = []
        seeded_variants = []
        for p in products_info:
            prod, _ = Product.objects.update_or_create(
                slug=p['slug'],
                defaults={
                    'village': p['village'],
                    'artisan': p['artisan'],
                    'category': p['category'],
                    'product_name': p['title'],
                    'description': p['desc'],
                    'base_price': p['price'],
                    'cover_image_url': p['image'],
                    'status': Product.ProductStatus.APPROVED,
                    'published_at': now,
                }
            )
            seeded_products.append(prod)

            # Table 9: product_images
            ProductImage.objects.update_or_create(
                product=prod,
                image_url=p['image'],
                defaults={'is_primary': True, 'alt_text': p['title']}
            )
            ProductImage.objects.update_or_create(
                product=prod,
                image_url='https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
                defaults={'is_primary': False, 'alt_text': f'{p["title"]} - Chi tiết chế tác'}
            )

            # Table 10 & 11: product_variants & inventory
            for sku, v_name, v_price, stock_qty in p['variants']:
                var_obj, _ = ProductVariant.objects.update_or_create(
                    sku=sku,
                    defaults={
                        'product': prod,
                        'variant_name': v_name,
                        'price': v_price,
                        'is_active': True,
                    }
                )
                seeded_variants.append(var_obj)

                Inventory.objects.update_or_create(
                    variant=var_obj,
                    defaults={'quantity': stock_qty, 'reserved_quantity': 0}
                )

        # =========================================================================
        # 8. WORKSHOPS & SESSIONS (Tables 12 & 13: workshops, workshop_sessions)
        # =========================================================================
        self.stdout.write("8. Seeding workshops and workshop_sessions...")
        workshops_info = [
            {
                'title': 'Vuốt gốm và nung men hỏa biến trên bàn xoay cổ',
                'slug': 'vuot-gom-nung-men-hoa-bien',
                'village': villages['bat-trang'],
                'artisan': artisans['bat-trang'],
                'category': categories['pottery'],
                'duration': 150,
                'price': Decimal('380000.00'),
                'address': 'Xưởng gốm Trần Độ, Làng Gốm Bát Tràng, Gia Lâm, Hà Nội',
                'image': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
                'desc': 'Tự tay làm quen với khối đất sét sông Hồng dẻo mịn trên bàn xoay truyền thống và mang về tác phẩm sau nung.',
            },
            {
                'title': 'Se hương trầm hoàng cung và phối hương thảo mộc',
                'slug': 'se-huong-tram-hoang-cung',
                'village': villages['thuy-xuan'],
                'artisan': artisans['thuy-xuan'],
                'category': categories['craft'],
                'duration': 90,
                'price': Decimal('260000.00'),
                'address': 'Làng Hương Thủy Xuân, Đường Huyền Trân Công Chúa, TP. Huế',
                'image': 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
                'desc': 'Trải nghiệm phối trộn 8 vị thảo mộc thuốc bắc cung đình triều Nguyễn và tự tay se tăm hương ngũ sắc.',
            },
        ]

        seeded_sessions = []
        for w in workshops_info:
            wk_obj, _ = Workshop.objects.update_or_create(
                slug=w['slug'],
                defaults={
                    'village': w['village'],
                    'artisan': w['artisan'],
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

            # Generate sessions: past session + upcoming sessions
            session_dates = [-2, 1, 3, 7]
            for day_offset in session_dates:
                start_dt = (now + timedelta(days=day_offset)).replace(hour=9, minute=0, second=0, microsecond=0)
                end_dt = start_dt + timedelta(minutes=w['duration'])
                sess_status = WorkshopSession.SessionStatus.COMPLETED if day_offset < 0 else WorkshopSession.SessionStatus.OPEN
                sess_obj, _ = WorkshopSession.objects.update_or_create(
                    workshop=wk_obj,
                    start_at=start_dt,
                    defaults={
                        'end_at': end_dt,
                        'capacity': 12,
                        'booked_participants': 2,
                        'price_per_person': w['price'],
                        'status': sess_status,
                    }
                )
                seeded_sessions.append(sess_obj)

        # =========================================================================
        # 9. WORKSHOP BOOKINGS (Table 14: workshop_bookings)
        # =========================================================================
        self.stdout.write("9. Seeding workshop_bookings...")
        booking_data = [
            ('BK-202611-001', seeded_sessions[0], primary_tourist, 2, Decimal('380000.00'), WorkshopBooking.BookingStatus.COMPLETED),
            ('BK-202611-002', seeded_sessions[1], primary_tourist, 2, Decimal('380000.00'), WorkshopBooking.BookingStatus.CONFIRMED),
            ('BK-202611-003', seeded_sessions[2], tourists[1], 1, Decimal('380000.00'), WorkshopBooking.BookingStatus.PENDING),
            ('BK-202611-004', seeded_sessions[3], tourists[2], 2, Decimal('260000.00'), WorkshopBooking.BookingStatus.CONFIRMED),
        ]
        seeded_bookings = []
        for b_code, sess, user, count, price, st in booking_data:
            total_b = price * count
            bk, _ = WorkshopBooking.objects.update_or_create(
                booking_code=b_code,
                defaults={
                    'session': sess,
                    'user': user,
                    'participant_count': count,
                    'unit_price': price,
                    'total_amount': total_b,
                    'status': st,
                    'special_request': 'Xin chuẩn bị bàn xoay góc cửa sổ' if '002' in b_code else None,
                }
            )
            seeded_bookings.append(bk)

        # =========================================================================
        # 10. CARTS & CART ITEMS (Tables 16 & 17: carts, cart_items)
        # =========================================================================
        self.stdout.write("10. Seeding carts and cart_items...")
        for u in tourists:
            cart, _ = Cart.objects.get_or_create(user=u)
            if u == primary_tourist and len(seeded_variants) >= 2:
                CartItem.objects.update_or_create(cart=cart, variant=seeded_variants[0], defaults={'quantity': 1})
                CartItem.objects.update_or_create(cart=cart, variant=seeded_variants[1], defaults={'quantity': 2})

        # =========================================================================
        # 11. ORDERS, VENDOR ORDERS, ORDER ITEMS (Tables 18, 19, 20)
        # =========================================================================
        self.stdout.write("11. Seeding orders, vendor_orders, and order_items...")
        orders_config = [
            {
                'order_code': 'ORD-202611-001',
                'user': primary_tourist,
                'status': Order.OrderStatus.COMPLETED,
                'payment_status': Order.PaymentStatus.PAID,
                'recipient_name': 'Nguyễn Hà',
                'recipient_phone': '0987654321',
                'shipping_address': 'Số 12 Tràng Tiền, Hoàn Kiếm, Hà Nội',
                'subtotal': Decimal('3500000.00'),
                'shipping_fee': Decimal('30000.00'),
                'total_amount': Decimal('3530000.00'),
                'vendor_orders': [
                    {
                        'code': 'VO-BT-001',
                        'village': villages['bat-trang'],
                        'status': VendorOrder.VendorOrderStatus.COMPLETED,
                        'payment_status': Order.PaymentStatus.PAID,
                        'subtotal': Decimal('2850000.00'),
                        'shipping_fee': Decimal('30000.00'),
                        'total_amount': Decimal('2880000.00'),
                        'tracking_code': 'VNPOST-882391',
                        'items': [
                            (seeded_variants[0], 'Bình Gốm Men Ngọc Thăng Long', 'Men ngọc cổ (Cao 30cm)', 'BT-POT-001', Decimal('2850000.00'), 1),
                        ]
                    },
                    {
                        'code': 'VO-VP-001',
                        'village': villages['van-phuc'],
                        'status': VendorOrder.VendorOrderStatus.COMPLETED,
                        'payment_status': Order.PaymentStatus.PAID,
                        'subtotal': Decimal('650000.00'),
                        'shipping_fee': Decimal('0.00'),
                        'total_amount': Decimal('650000.00'),
                        'tracking_code': 'GHN-119283',
                        'items': [
                            (seeded_variants[2], 'Khăn Lụa Vạn Phúc Họa Tiết Mây', 'Màu cánh sen (180x60cm)', 'VP-SILK-001', Decimal('650000.00'), 1),
                        ]
                    }
                ]
            },
            {
                'order_code': 'ORD-202611-002',
                'user': tourists[1],
                'status': Order.OrderStatus.SHIPPED,
                'payment_status': Order.PaymentStatus.PAID,
                'recipient_name': 'Lê Thúy An',
                'recipient_phone': '0987654322',
                'shipping_address': '45 Lê Duẩn, Bến Nghé, Quận 1, TP. HCM',
                'subtotal': Decimal('3200000.00'),
                'shipping_fee': Decimal('30000.00'),
                'total_amount': Decimal('3230000.00'),
                'vendor_orders': [
                    {
                        'code': 'VO-BT-002',
                        'village': villages['bat-trang'],
                        'status': VendorOrder.VendorOrderStatus.SHIPPED,
                        'payment_status': Order.PaymentStatus.PAID,
                        'subtotal': Decimal('3200000.00'),
                        'shipping_fee': Decimal('30000.00'),
                        'total_amount': Decimal('3230000.00'),
                        'tracking_code': 'VTP-992102',
                        'items': [
                            (seeded_variants[1], 'Bình Gốm Men Ngọc Thăng Long', 'Men rạn hoa lam (Cao 35cm)', 'BT-POT-002', Decimal('3200000.00'), 1),
                        ]
                    }
                ]
            },
            {
                'order_code': 'ORD-202611-003',
                'user': tourists[2],
                'status': Order.OrderStatus.PENDING,
                'payment_status': Order.PaymentStatus.UNPAID,
                'recipient_name': 'Trần Quang Khải',
                'recipient_phone': '0987654323',
                'shipping_address': '108 Bạch Đằng, Hải Châu, Đà Nẵng',
                'subtotal': Decimal('420000.00'),
                'shipping_fee': Decimal('30000.00'),
                'total_amount': Decimal('450000.00'),
                'vendor_orders': [
                    {
                        'code': 'VO-TX-001',
                        'village': villages['thuy-xuan'],
                        'status': VendorOrder.VendorOrderStatus.PENDING,
                        'payment_status': Order.PaymentStatus.UNPAID,
                        'subtotal': Decimal('420000.00'),
                        'shipping_fee': Decimal('30000.00'),
                        'total_amount': Decimal('450000.00'),
                        'tracking_code': None,
                        'items': [
                            (seeded_variants[4], 'Hộp Hương Trầm Thủy Xuân Cung Đình', 'Hộp gỗ 100 nén trầm cao cấp', 'TX-INC-001', Decimal('420000.00'), 1),
                        ]
                    }
                ]
            },
        ]

        seeded_orders = []
        seeded_vendor_orders = []
        for o_cfg in orders_config:
            order_obj, _ = Order.objects.update_or_create(
                order_code=o_cfg['order_code'],
                defaults={
                    'user': o_cfg['user'],
                    'subtotal': o_cfg['subtotal'],
                    'shipping_fee': o_cfg['shipping_fee'],
                    'discount_amount': Decimal('0.00'),
                    'total_amount': o_cfg['total_amount'],
                    'recipient_name': o_cfg['recipient_name'],
                    'recipient_phone': o_cfg['recipient_phone'],
                    'shipping_address': o_cfg['shipping_address'],
                    'status': o_cfg['status'],
                    'payment_status': o_cfg['payment_status'],
                    'placed_at': now - timedelta(days=2),
                }
            )
            seeded_orders.append(order_obj)

            for vo_cfg in o_cfg['vendor_orders']:
                vo_obj, _ = VendorOrder.objects.update_or_create(
                    vendor_order_code=vo_cfg['code'],
                    defaults={
                        'order': order_obj,
                        'village': vo_cfg['village'],
                        'subtotal': vo_cfg['subtotal'],
                        'shipping_fee': vo_cfg['shipping_fee'],
                        'discount_amount': Decimal('0.00'),
                        'total_amount': vo_cfg['total_amount'],
                        'status': vo_cfg['status'],
                        'payment_status': vo_cfg['payment_status'],
                        'recipient_name': o_cfg['recipient_name'],
                        'recipient_phone': o_cfg['recipient_phone'],
                        'shipping_address': o_cfg['shipping_address'],
                        'tracking_code': vo_cfg.get('tracking_code'),
                    }
                )
                seeded_vendor_orders.append(vo_obj)

                for var, p_name, v_name, sku, price, qty in vo_cfg['items']:
                    OrderItem.objects.update_or_create(
                        order=order_obj,
                        vendor_order=vo_obj,
                        variant=var,
                        defaults={
                            'product_name_snapshot': p_name,
                            'variant_name_snapshot': v_name,
                            'sku_snapshot': sku,
                            'unit_price': price,
                            'quantity': qty,
                            'line_total': price * qty,
                        }
                    )

        # =========================================================================
        # 12. PAYMENTS & REFUNDS (Tables 21, 22, 23: payments, refund_policies, refunds)
        # =========================================================================
        self.stdout.write("12. Seeding payments, refund_policies, and refunds...")
        # Refund Policies
        pol_prod, _ = RefundPolicy.objects.update_or_create(
            policy_name='Chính sách đổi trả sản phẩm thủ công 7 ngày',
            defaults={
                'applies_to': RefundPolicy.AppliesTo.PRODUCT,
                'refund_percentage': Decimal('100.00'),
                'fixed_fee': Decimal('0.00'),
                'description': 'Hoàn trả 100% giá trị đơn hàng nếu sản phẩm lỗi chế tác hoặc hư hỏng trong quá trình vận chuyển.',
                'effective_from': now - timedelta(days=30),
                'status': 'ACTIVE',
            }
        )
        pol_ws, _ = RefundPolicy.objects.update_or_create(
            policy_name='Chính sách hủy đặt lịch Workshop trước 48h',
            defaults={
                'applies_to': RefundPolicy.AppliesTo.WORKSHOP,
                'hours_before_start': 48,
                'refund_percentage': Decimal('100.00'),
                'fixed_fee': Decimal('0.00'),
                'description': 'Hủy trước 48 giờ hoàn 100% phí đăng ký tham gia workshop.',
                'effective_from': now - timedelta(days=30),
                'status': 'ACTIVE',
            }
        )

        # Payments for Orders
        pm_ord1, _ = Payment.objects.update_or_create(
            payment_code='PAY-ORD-001',
            defaults={
                'order': seeded_orders[0],
                'payment_method': 'VNPAY',
                'amount': seeded_orders[0].total_amount,
                'status': Payment.PaymentRecordStatus.SUCCESS,
                'provider_transaction_id': 'VNPAY-TRANS-9901',
                'paid_at': now - timedelta(days=2),
            }
        )
        Payment.objects.update_or_create(
            payment_code='PAY-ORD-002',
            defaults={
                'order': seeded_orders[1],
                'payment_method': 'ZALOPAY',
                'amount': seeded_orders[1].total_amount,
                'status': Payment.PaymentRecordStatus.SUCCESS,
                'provider_transaction_id': 'ZALO-TRANS-8812',
                'paid_at': now - timedelta(days=1),
            }
        )

        # Payments for Bookings
        Payment.objects.update_or_create(
            payment_code='PAY-BK-001',
            defaults={
                'booking': seeded_bookings[0],
                'payment_method': 'VNPAY',
                'amount': seeded_bookings[0].total_amount,
                'status': Payment.PaymentRecordStatus.SUCCESS,
                'provider_transaction_id': 'VNPAY-BK-1001',
                'paid_at': now - timedelta(days=3),
            }
        )

        # Refund Record
        Refund.objects.update_or_create(
            refund_code='REF-202611-001',
            defaults={
                'payment': pm_ord1,
                'vendor_order': seeded_vendor_orders[1],
                'refund_policy': pol_prod,
                'requested_by': primary_tourist,
                'amount_requested': Decimal('200000.00'),
                'amount_approved': Decimal('200000.00'),
                'reason': 'Hỗ trợ khách hàng do chậm giao hàng so với dự kiến 1 ngày.',
                'admin_note': 'Đã hoàn tiền bồi thường vào ví khách.',
                'status': Refund.RefundStatus.COMPLETED,
            }
        )

        # =========================================================================
        # 13. REVIEWS (Table 15: reviews)
        # =========================================================================
        self.stdout.write("13. Seeding reviews...")
        Review.objects.update_or_create(
            user=primary_tourist,
            product=seeded_products[0],
            defaults={
                'rating': 5,
                'title': 'Men ngọc tuyệt đẹp, đúng chuẩn cổ vật thời Lý!',
                'content': 'Tôi rất ấn tượng với sắc men ngọc bích của chiếc bình. Tác phẩm tinh xảo, đóng gói nhiều lớp mút xốp rất cẩn thận.',
                'status': Review.ReviewStatus.VISIBLE,
            }
        )
        Review.objects.update_or_create(
            user=primary_tourist,
            booking=seeded_bookings[0],
            defaults={
                'rating': 5,
                'title': 'Trải nghiệm vuốt gốm tuyệt vời cùng nghệ nhân!',
                'content': 'Bác Độ hướng dẫn từng bước rất nhiệt tình, giải thích cặn kẽ về đất sét sông Hồng. Rất đáng trải nghiệm.',
                'status': Review.ReviewStatus.VISIBLE,
            }
        )

        # =========================================================================
        # 14. RECOMMENDATIONS & PREFERENCES (Tables 24, 25, 30: preferences, interactions, favorites)
        # =========================================================================
        self.stdout.write("14. Seeding user_preferences, user_interactions, and favorites...")
        UserPreference.objects.update_or_create(
            user=primary_tourist,
            defaults={
                'preferred_categories': ['pottery', 'silk'],
                'preferred_activities': ['workshop', 'shopping'],
                'preferred_provinces': ['Hà Nội', 'Thừa Thiên Huế'],
                'min_budget': Decimal('200000.00'),
                'max_budget': Decimal('5000000.00'),
                'preferred_language': 'vi',
            }
        )

        # UserInteractions
        interactions_samples = [
            (primary_tourist, UserInteraction.TargetType.PRODUCT, seeded_products[0].product_id, UserInteraction.ActionType.VIEW),
            (primary_tourist, UserInteraction.TargetType.PRODUCT, seeded_products[0].product_id, UserInteraction.ActionType.PURCHASE),
            (primary_tourist, UserInteraction.TargetType.WORKSHOP, 1, UserInteraction.ActionType.BOOKING),
            (tourists[1], UserInteraction.TargetType.VILLAGE, villages['bat-trang'].village_id, UserInteraction.ActionType.VIEW),
        ]
        for u, t_type, t_id, a_type in interactions_samples:
            UserInteraction.objects.get_or_create(
                user=u,
                target_type=t_type,
                target_id=t_id,
                action_type=a_type,
                defaults={'metadata': {'source': 'home_feed'}}
            )

        # Favorites
        Favorite.objects.update_or_create(
            user=primary_tourist,
            target_type=Favorite.TargetType.PRODUCT,
            target_id=seeded_products[0].product_id,
        )
        Favorite.objects.update_or_create(
            user=primary_tourist,
            target_type=Favorite.TargetType.VILLAGE,
            target_id=villages['bat-trang'].village_id,
        )

        # =========================================================================
        # 15. CHATBOT (Tables 26, 27, 28, 29: chat_sessions, chat_messages, knowledge_sources, knowledge_chunks)
        # =========================================================================
        self.stdout.write("15. Seeding chatbot sessions, messages, and knowledge base...")
        ks, _ = KnowledgeSource.objects.update_or_create(
            source_title='Cẩm nang di sản làng nghề thủ công Việt Nam',
            defaults={
                'source_type': 'HERITAGE_DOC',
                'source_content': 'Tài liệu tra cứu văn hóa làng nghề truyền thống Bát Tràng, Thủy Xuân, Vạn Phúc.',
                'related_village': villages['bat-trang'],
                'related_story': stories['tran-tich-ngan-nam-men-gom-viet'],
                'status': KnowledgeSource.KnowledgeStatus.APPROVED,
                'approved_by': admin_user,
                'approved_at': now,
            }
        )

        chunks_data = [
            (1, 'Làng Gốm Bát Tràng nằm bên tả ngạn sông Hồng thuộc huyện Gia Lâm, Hà Nội. Làng có lịch sử từ thế kỷ 14 thời nhà Lý - Trần, nổi danh với các dòng men rạn, men ngọc, men lam đặc sắc.'),
            (2, 'Làng Hương Thủy Xuân tọa lạc dưới chân đồi Vọng Cảnh, TP. Huế, có tuổi đời hơn 700 năm. Hương trầm Thủy Xuân làm từ bài thuốc bắc cung đình, bột trầm dó bầu nguyên chất thơm dịu thanh khiết.'),
            (3, 'Làng Lụa Vạn Phúc (Hà Đông) đã hơn 1000 năm tuổi, nức tiếng với lụa vân mềm mại mùa hè mát mẻ, mùa đông giữ ấm, từng là vật phẩm tiến vua triều Nguyễn.'),
        ]
        for idx, text in chunks_data:
            KnowledgeChunk.objects.update_or_create(
                knowledge_source=ks,
                chunk_index=idx,
                defaults={'chunk_content': text, 'token_count': len(text.split())}
            )

        # ChatSession & Messages
        chat_sess, _ = ChatSession.objects.update_or_create(
            session_title='Tìm hiểu gốm Bát Tràng',
            user=primary_tourist,
            defaults={'status': ChatSession.SessionStatus.ACTIVE}
        )
        ChatMessage.objects.get_or_create(
            chat_session=chat_sess,
            sender_type=ChatMessage.SenderType.USER,
            message_content='Xin chào, tôi muốn hỏi về sự khác biệt giữa men rạn và men ngọc Bát Tràng?'
        )
        ChatMessage.objects.get_or_create(
            chat_session=chat_sess,
            sender_type=ChatMessage.SenderType.ASSISTANT,
            message_content='Dạ chào bạn! Men rạn là kỹ thuật nung tạo ra các đường vân nứt tinh xảo trên cốt gốm, thường có màu xám ngà hoặc lục tro. Trong khi men ngọc (celadon) tái hiện sắc xanh ngọc bích thời Lý với độ bóng sâu và mịn màng như ngọc thạch.'
        )

        # =========================================================================
        # 16. NOTIFICATIONS (Table 31: notifications)
        # =========================================================================
        self.stdout.write("16. Seeding notifications...")
        notifications_data = [
            (primary_tourist, 'ORDER_UPDATE', 'Đơn hàng ORD-202611-001 đã giao thành công', 'Tác phẩm thủ công của bạn đã được giao đến địa chỉ nhận hàng.', 'ORDER', seeded_orders[0].order_id, True),
            (primary_tourist, 'BOOKING_CONFIRMED', 'Xác nhận đặt lịch workshop thành công', 'Lịch trải nghiệm làm gốm ngày cuối tuần của bạn đã được xác nhận.', 'BOOKING', seeded_bookings[1].booking_id, False),
            (village_managers['manager.bat-trang@localcraft.vn'], 'NEW_VENDOR_ORDER', 'Đơn hàng mới VO-BT-002 cần xử lý', 'Làng nghề của bạn vừa nhận được một đơn đặt mua bình gốm mới.', 'VENDOR_ORDER', seeded_vendor_orders[0].vendor_order_id, False),
        ]
        for u, n_type, title, msg, t_type, t_id, is_read in notifications_data:
            Notification.objects.get_or_create(
                user=u,
                notification_type=n_type,
                title=title,
                defaults={
                    'message': msg,
                    'target_type': t_type,
                    'target_id': t_id,
                    'is_read': is_read,
                    'read_at': now if is_read else None,
                }
            )

        self.stdout.write(self.style.SUCCESS("All 31 LocalCraft database tables seeded successfully with authentic sample data!"))
