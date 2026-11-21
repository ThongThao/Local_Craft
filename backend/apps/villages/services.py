"""
Activity & Revenue Analytics Service for Craft Village Management (Screen V17).
Provides safe, isolated, and Cartesian-free metric calculations.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from django.db import models
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate, TruncMonth, Coalesce
from django.utils import timezone

from apps.products.models import Product, ProductVariant, Inventory
from apps.workshops.models import Workshop, WorkshopSession
from apps.bookings.models import WorkshopBooking
from apps.orders.models import VendorOrder, OrderItem, Order
from apps.payments.models import Payment, Refund


class VillageAnalyticsService:
    """
    Core analytics service calculating Screen V17 metrics strictly scoped to one CraftVillage.
    """

    @staticmethod
    def parse_time_range(time_range_param: str, from_date_str: str = None, to_date_str: str = None):
        """
        Parses time range filters and returns (start_dt, end_dt, prev_start_dt, prev_end_dt, time_range_key, error_msg).
        Uses system timezone (Asia/Ho_Chi_Minh).
        """
        now = timezone.now()
        time_range = (time_range_param or '30_DAYS').strip().upper()
        start_dt = None
        end_dt = None

        if time_range == 'TODAY':
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif time_range == '7_DAYS':
            start_dt = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
        elif time_range == '30_DAYS':
            start_dt = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
        elif time_range == 'THIS_MONTH':
            start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
        elif time_range == 'LAST_MONTH':
            first_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_day_prev_month = first_this_month - timedelta(days=1)
            start_dt = last_day_prev_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_dt = last_day_prev_month.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif time_range == 'THIS_YEAR':
            start_dt = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
        elif time_range == 'CUSTOM':
            if not from_date_str or not to_date_str:
                return None, None, None, None, time_range, "Cần cung cấp from_date và to_date khi chọn bộ lọc CUSTOM (YYYY-MM-DD)."
            try:
                from_d = datetime.strptime(from_date_str.strip(), '%Y-%m-%d')
                to_d = datetime.strptime(to_date_str.strip(), '%Y-%m-%d')
            except ValueError:
                return None, None, None, None, time_range, "Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD."

            if from_d > to_d:
                return None, None, None, None, time_range, "from_date không được lớn hơn to_date."

            start_dt = timezone.make_aware(from_d.replace(hour=0, minute=0, second=0, microsecond=0))
            end_dt = timezone.make_aware(to_d.replace(hour=23, minute=59, second=59, microsecond=999999))
        else:
            # Fallback to 30_DAYS
            time_range = '30_DAYS'
            start_dt = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now

        # Calculate previous comparison period of equal duration
        duration = end_dt - start_dt
        prev_end_dt = start_dt - timedelta(microseconds=1)
        prev_start_dt = prev_end_dt - duration

        return start_dt, end_dt, prev_start_dt, prev_end_dt, time_range, None

    @classmethod
    def get_snapshot_metrics(cls, village):
        """
        Snapshot metrics representing the current state of products and workshops (independent of date filter).
        """
        now = timezone.now()

        # 1. Products Snapshot
        products_qs = Product.objects.filter(village=village).prefetch_related('variants__inventory', 'artisan')
        total_products = products_qs.count()

        approved_count = 0
        pending_count = 0
        draft_count = 0
        rejected_count = 0
        hidden_count = 0
        selling_count = 0
        out_of_stock_count = 0
        not_ready_count = 0
        low_stock_count = 0

        for p in products_qs:
            # Lifecycle status
            if p.status == Product.ProductStatus.APPROVED:
                approved_count += 1
            elif p.status == Product.ProductStatus.PENDING:
                pending_count += 1
            elif p.status == Product.ProductStatus.DRAFT:
                draft_count += 1
            elif p.status == Product.ProductStatus.REJECTED:
                rejected_count += 1
            elif p.status == Product.ProductStatus.HIDDEN:
                hidden_count += 1

            # Business State calculation (mirroring ProductSerializer)
            if p.status == Product.ProductStatus.HIDDEN:
                pass
            elif p.status != Product.ProductStatus.APPROVED:
                not_ready_count += 1
            elif p.artisan and p.artisan.verification_status != 'APPROVED':
                not_ready_count += 1
            else:
                variants = [v for v in p.variants.all() if v.is_active]
                if not variants:
                    not_ready_count += 1
                else:
                    total_sellable = 0
                    has_inv = False
                    for v in variants:
                        inv = getattr(v, 'inventory', None)
                        if inv:
                            has_inv = True
                            sellable = max(0, inv.quantity - inv.reserved_quantity)
                            total_sellable += sellable
                    if not has_inv:
                        not_ready_count += 1
                    elif total_sellable > 0:
                        selling_count += 1
                        if total_sellable <= 5:
                            low_stock_count += 1
                    else:
                        out_of_stock_count += 1

        # 2. Workshops Snapshot
        workshops_qs = Workshop.objects.filter(village=village)
        total_workshops = workshops_qs.count()
        active_workshops = workshops_qs.filter(status=Workshop.WorkshopStatus.APPROVED).count()
        pending_workshops = workshops_qs.filter(status=Workshop.WorkshopStatus.PENDING).count()
        draft_workshops = workshops_qs.filter(status=Workshop.WorkshopStatus.DRAFT).count()

        # Sessions
        sessions_qs = WorkshopSession.objects.filter(workshop__village=village)
        total_sessions = sessions_qs.count()
        upcoming_sessions = sessions_qs.filter(
            start_at__gte=now,
            status__in=[WorkshopSession.SessionStatus.OPEN, WorkshopSession.SessionStatus.FULL]
        ).count()
        completed_sessions = sessions_qs.filter(
            Q(status=WorkshopSession.SessionStatus.COMPLETED) | Q(end_at__lt=now)
        ).exclude(status=WorkshopSession.SessionStatus.CANCELLED).count()
        cancelled_sessions = sessions_qs.filter(status=WorkshopSession.SessionStatus.CANCELLED).count()

        return {
            'products': {
                'total': total_products,
                'selling': selling_count,
                'out_of_stock': out_of_stock_count,
                'low_stock': low_stock_count,
                'not_ready': not_ready_count,
                'approved': approved_count,
                'pending': pending_count,
                'draft': draft_count,
                'rejected': rejected_count,
                'hidden': hidden_count,
            },
            'workshops': {
                'total': total_workshops,
                'active': active_workshops,
                'pending': pending_workshops,
                'draft': draft_workshops,
                'total_sessions': total_sessions,
                'upcoming_sessions': upcoming_sessions,
                'completed_sessions': completed_sessions,
                'cancelled_sessions': cancelled_sessions,
            }
        }

    @classmethod
    def get_transactional_metrics(cls, village, start_dt, end_dt):
        """
        Transactional metrics calculated strictly within [start_dt, end_dt].
        Uses separated queries to prevent Cartesian multiplication.
        """
        # 1. Vendor Orders
        vos_qs = VendorOrder.objects.filter(
            village=village,
            created_at__gte=start_dt,
            created_at__lte=end_dt,
        )
        total_orders = vos_qs.count()

        pending_orders = vos_qs.filter(status=VendorOrder.VendorOrderStatus.PENDING).count()
        confirmed_orders = vos_qs.filter(status=VendorOrder.VendorOrderStatus.CONFIRMED).count()
        processing_orders = vos_qs.filter(status=VendorOrder.VendorOrderStatus.PROCESSING).count()
        shipped_orders = vos_qs.filter(status=VendorOrder.VendorOrderStatus.SHIPPED).count()
        delivered_orders = vos_qs.filter(status=VendorOrder.VendorOrderStatus.DELIVERED).count()
        completed_orders = vos_qs.filter(status=VendorOrder.VendorOrderStatus.COMPLETED).count()
        cancelled_orders = vos_qs.filter(status=VendorOrder.VendorOrderStatus.CANCELLED).count()

        # Items quantity sold
        non_cancelled_vos = vos_qs.exclude(status=VendorOrder.VendorOrderStatus.CANCELLED)
        items_sold_agg = OrderItem.objects.filter(
            vendor_order__in=non_cancelled_vos
        ).aggregate(total_qty=Coalesce(Sum('quantity'), 0))
        total_items_sold = items_sold_agg['total_qty']

        # Product Financials
        paid_vos = non_cancelled_vos.filter(payment_status=Order.PaymentStatus.PAID)
        paid_financials = paid_vos.aggregate(
            subtotal=Coalesce(Sum('subtotal'), Decimal('0.00')),
            shipping_fee=Coalesce(Sum('shipping_fee'), Decimal('0.00')),
            discount_amount=Coalesce(Sum('discount_amount'), Decimal('0.00')),
            total_amount=Coalesce(Sum('total_amount'), Decimal('0.00')),
        )
        product_subtotal = float(paid_financials['subtotal'])
        product_shipping_fee = float(paid_financials['shipping_fee'])
        product_discount_amount = float(paid_financials['discount_amount'])
        product_gross_revenue = float(paid_financials['total_amount'])

        # Product Refunds
        product_refunds_qs = Refund.objects.filter(
            vendor_order__village=village,
            status=Refund.RefundStatus.COMPLETED,
            processed_at__gte=start_dt,
            processed_at__lte=end_dt,
        )
        product_refunds = float(product_refunds_qs.aggregate(t=Coalesce(Sum('amount_approved'), Decimal('0.00')))['t'])
        net_product_revenue = max(0.0, product_gross_revenue - product_refunds)

        # 2. Workshop Bookings & Financials
        bookings_qs = WorkshopBooking.objects.filter(
            session__workshop__village=village,
            created_at__gte=start_dt,
            created_at__lte=end_dt,
        )
        total_bookings = bookings_qs.count()

        pending_bookings = bookings_qs.filter(status=WorkshopBooking.BookingStatus.PENDING).count()
        confirmed_bookings = bookings_qs.filter(status=WorkshopBooking.BookingStatus.CONFIRMED).count()
        completed_bookings = bookings_qs.filter(status=WorkshopBooking.BookingStatus.COMPLETED).count()
        cancelled_bookings = bookings_qs.filter(status=WorkshopBooking.BookingStatus.CANCELLED).count()
        no_show_bookings = bookings_qs.filter(status=WorkshopBooking.BookingStatus.NO_SHOW).count()
        expired_bookings = bookings_qs.filter(status=WorkshopBooking.BookingStatus.EXPIRED).count()

        # Participants
        non_cancelled_bookings = bookings_qs.exclude(status=WorkshopBooking.BookingStatus.CANCELLED)
        participants_agg = non_cancelled_bookings.aggregate(
            total_registered=Coalesce(Sum('participant_count'), 0),
        )
        total_registered_participants = participants_agg['total_registered']

        attended_participants = bookings_qs.filter(
            status=WorkshopBooking.BookingStatus.COMPLETED
        ).aggregate(t=Coalesce(Sum('participant_count'), 0))['t']

        no_show_participants = bookings_qs.filter(
            status=WorkshopBooking.BookingStatus.NO_SHOW
        ).aggregate(t=Coalesce(Sum('participant_count'), 0))['t']

        attendance_base = attended_participants + no_show_participants
        attendance_rate = round((attended_participants / attendance_base) * 100, 1) if attendance_base > 0 else 0.0

        completion_base = completed_bookings + no_show_bookings
        completion_rate = round((completed_bookings / completion_base) * 100, 1) if completion_base > 0 else 0.0

        # Workshop Payments & Refunds
        payments_qs = Payment.objects.filter(
            booking__session__workshop__village=village,
            status=Payment.PaymentRecordStatus.SUCCESS,
            paid_at__gte=start_dt,
            paid_at__lte=end_dt,
        )
        workshop_gross_revenue = float(payments_qs.aggregate(t=Coalesce(Sum('amount'), Decimal('0.00')))['t'])

        wk_refunds_qs = Refund.objects.filter(
            payment__booking__session__workshop__village=village,
            status=Refund.RefundStatus.COMPLETED,
            processed_at__gte=start_dt,
            processed_at__lte=end_dt,
        )
        workshop_refunds = float(wk_refunds_qs.aggregate(t=Coalesce(Sum('amount_approved'), Decimal('0.00')))['t'])
        net_workshop_revenue = max(0.0, workshop_gross_revenue - workshop_refunds)

        # 3. Overall Net Revenue
        total_gross_revenue = product_gross_revenue + workshop_gross_revenue
        total_refunds = product_refunds + workshop_refunds
        net_revenue = max(0.0, net_product_revenue + net_workshop_revenue)

        return {
            'revenue': {
                'net_revenue': net_revenue,
                'total_gross_revenue': total_gross_revenue,
                'total_refunds': total_refunds,
                'product_gross_revenue': product_gross_revenue,
                'product_subtotal': product_subtotal,
                'product_shipping_fee': product_shipping_fee,
                'product_discount_amount': product_discount_amount,
                'product_refunds': product_refunds,
                'net_product_revenue': net_product_revenue,
                'workshop_gross_revenue': workshop_gross_revenue,
                'workshop_refunds': workshop_refunds,
                'net_workshop_revenue': net_workshop_revenue,
            },
            'orders': {
                'total_orders': total_orders,
                'total_items_sold': total_items_sold,
                'pending': pending_orders,
                'confirmed': confirmed_orders,
                'processing': processing_orders,
                'shipped': shipped_orders,
                'delivered': delivered_orders,
                'completed': completed_orders,
                'cancelled': cancelled_orders,
            },
            'bookings': {
                'total_bookings': total_bookings,
                'total_registered_participants': total_registered_participants,
                'attended_participants': attended_participants,
                'no_show_participants': no_show_participants,
                'attendance_rate': attendance_rate,
                'completion_rate': completion_rate,
                'pending': pending_bookings,
                'confirmed': confirmed_bookings,
                'completed': completed_bookings,
                'cancelled': cancelled_bookings,
                'no_show': no_show_bookings,
                'expired': expired_bookings,
            }
        }

    @classmethod
    def get_top_performers(cls, village, start_dt, end_dt):
        """
        Top 5 selling products and top 5 booked workshops in the period.
        """
        # Top 5 Products
        top_products_raw = OrderItem.objects.filter(
            vendor_order__village=village,
            vendor_order__created_at__gte=start_dt,
            vendor_order__created_at__lte=end_dt,
        ).exclude(
            vendor_order__status=VendorOrder.VendorOrderStatus.CANCELLED
        ).values(
            'variant__product_id',
            'product_name_snapshot',
        ).annotate(
            total_sold=Sum('quantity'),
            total_revenue=Sum('line_total'),
        ).order_by('-total_sold')[:5]

        # Bulk fetch image & category
        product_ids = [item['variant__product_id'] for item in top_products_raw if item['variant__product_id']]
        products_map = {
            p.product_id: p
            for p in Product.objects.filter(pk__in=product_ids).select_related('category')
        }

        top_products = []
        for idx, item in enumerate(top_products_raw, 1):
            pid = item['variant__product_id']
            p_obj = products_map.get(pid)
            top_products.append({
                'rank': idx,
                'product_id': pid,
                'product_name': item['product_name_snapshot'],
                'cover_image_url': p_obj.cover_image_url if p_obj else None,
                'category_name': p_obj.category.category_name if (p_obj and p_obj.category) else 'Thủ công mỹ nghệ',
                'total_sold': item['total_sold'],
                'total_revenue': float(item['total_revenue'] or 0),
            })

        # Top 5 Workshops
        top_workshops_raw = WorkshopBooking.objects.filter(
            session__workshop__village=village,
            created_at__gte=start_dt,
            created_at__lte=end_dt,
        ).exclude(
            status=WorkshopBooking.BookingStatus.CANCELLED
        ).values(
            'session__workshop_id',
            'session__workshop__workshop_name',
            'session__workshop__cover_image_url',
            'session__workshop__price_per_person',
            'session__workshop__artisan__display_name',
        ).annotate(
            total_bookings=Count('booking_id'),
            total_participants=Sum('participant_count'),
            total_revenue=Sum('total_amount'),
        ).order_by('-total_bookings')[:5]

        top_workshops = []
        for idx, item in enumerate(top_workshops_raw, 1):
            top_workshops.append({
                'rank': idx,
                'workshop_id': item['session__workshop_id'],
                'workshop_name': item['session__workshop__workshop_name'],
                'cover_image_url': item['session__workshop__cover_image_url'],
                'artisan_name': item['session__workshop__artisan__display_name'] or 'Nghệ nhân làng nghề',
                'price_per_person': float(item['session__workshop__price_per_person'] or 0),
                'total_bookings': item['total_bookings'],
                'total_participants': item['total_participants'] or 0,
                'total_revenue': float(item['total_revenue'] or 0),
            })

        return {
            'top_products': top_products,
            'top_workshops': top_workshops,
        }

    @classmethod
    def get_time_series_chart_data(cls, village, start_dt, end_dt):
        """
        Continuous time-series revenue and volume data points for chart rendering.
        Buckets by DAY if <= 35 days, by MONTH if > 35 days.
        Uses Python-level timezone-aware bucketing to avoid MySQL CONVERT_TZ NULL issues on Windows.
        """
        span_days = (end_dt - start_dt).days
        is_daily = span_days <= 35

        # 1. Product revenue from paid vendor orders in period
        prod_rows = VendorOrder.objects.filter(
            village=village,
            payment_status=Order.PaymentStatus.PAID,
            created_at__gte=start_dt,
            created_at__lte=end_dt,
        ).exclude(
            status=VendorOrder.VendorOrderStatus.CANCELLED
        ).values('created_at', 'total_amount')

        prod_rev_map = {}
        prod_count_map = {}
        for row in prod_rows:
            dt = row.get('created_at')
            if not dt:
                continue
            if timezone.is_aware(dt):
                dt = timezone.localtime(dt)
            b_key = dt.strftime('%Y-%m-%d' if is_daily else '%Y-%m')
            prod_rev_map[b_key] = prod_rev_map.get(b_key, 0.0) + float(row.get('total_amount') or 0)
            prod_count_map[b_key] = prod_count_map.get(b_key, 0) + 1

        # 2. Workshop revenue from successful payments in period
        wk_rows = Payment.objects.filter(
            booking__session__workshop__village=village,
            status=Payment.PaymentRecordStatus.SUCCESS,
            paid_at__gte=start_dt,
            paid_at__lte=end_dt,
        ).values('paid_at', 'amount')

        wk_rev_map = {}
        wk_count_map = {}
        for row in wk_rows:
            dt = row.get('paid_at')
            if not dt:
                continue
            if timezone.is_aware(dt):
                dt = timezone.localtime(dt)
            b_key = dt.strftime('%Y-%m-%d' if is_daily else '%Y-%m')
            wk_rev_map[b_key] = wk_rev_map.get(b_key, 0.0) + float(row.get('amount') or 0)
            wk_count_map[b_key] = wk_count_map.get(b_key, 0) + 1

        # 3. Generate seamless points from start to end
        chart_points = []
        if is_daily:
            curr = start_dt.date()
            end_date = end_dt.date()
            while curr <= end_date:
                k = curr.strftime('%Y-%m-%d')
                label = curr.strftime('%d/%m')
                p_rev = prod_rev_map.get(k, 0.0)
                w_rev = wk_rev_map.get(k, 0.0)
                o_cnt = prod_count_map.get(k, 0)
                b_cnt = wk_count_map.get(k, 0)
                chart_points.append({
                    'period': k,
                    'label': label,
                    'product_revenue': p_rev,
                    'workshop_revenue': w_rev,
                    'total_revenue': p_rev + w_rev,
                    'orders_count': o_cnt,
                    'bookings_count': b_cnt,
                })
                curr += timedelta(days=1)
        else:
            # Monthly buckets
            curr = start_dt.replace(day=1)
            while curr <= end_dt:
                k = curr.strftime('%Y-%m')
                label = f"T{curr.month}/{curr.strftime('%y')}"
                p_rev = prod_rev_map.get(k, 0.0)
                w_rev = wk_rev_map.get(k, 0.0)
                o_cnt = prod_count_map.get(k, 0)
                b_cnt = wk_count_map.get(k, 0)
                chart_points.append({
                    'period': k,
                    'label': label,
                    'product_revenue': p_rev,
                    'workshop_revenue': w_rev,
                    'total_revenue': p_rev + w_rev,
                    'orders_count': o_cnt,
                    'bookings_count': b_cnt,
                })
                # Move to next month
                if curr.month == 12:
                    curr = curr.replace(year=curr.year + 1, month=1)
                else:
                    curr = curr.replace(month=curr.month + 1)

        return chart_points

    @classmethod
    def calculate_growth_rate(cls, current_val, prev_val):
        """
        Calculates percentage growth between previous and current period.
        Returns float percentage or None if previous has no data.
        """
        if prev_val is None or prev_val <= 0:
            return 100.0 if (current_val and current_val > 0) else None
        return round(((float(current_val) - float(prev_val)) / float(prev_val)) * 100, 1)

    @classmethod
    def get_village_activity_dashboard(cls, village, time_range_param: str = '30_DAYS', from_date_str: str = None, to_date_str: str = None):
        """
        Master orchestrator compiling the full Screen V17 dashboard data.
        """
        start_dt, end_dt, prev_start_dt, prev_end_dt, time_range, error_msg = cls.parse_time_range(
            time_range_param, from_date_str, to_date_str
        )
        if error_msg:
            return None, error_msg

        # Current period transactional metrics
        curr_trans = cls.get_transactional_metrics(village, start_dt, end_dt)

        # Previous period for growth comparison
        prev_trans = cls.get_transactional_metrics(village, prev_start_dt, prev_end_dt)

        # Growth rates
        growth = {
            'revenue_growth': cls.calculate_growth_rate(
                curr_trans['revenue']['net_revenue'],
                prev_trans['revenue']['net_revenue']
            ),
            'orders_growth': cls.calculate_growth_rate(
                curr_trans['orders']['total_orders'],
                prev_trans['orders']['total_orders']
            ),
            'bookings_growth': cls.calculate_growth_rate(
                curr_trans['bookings']['total_bookings'],
                prev_trans['bookings']['total_bookings']
            ),
            'participants_growth': cls.calculate_growth_rate(
                curr_trans['bookings']['attended_participants'],
                prev_trans['bookings']['attended_participants']
            ),
        }

        # Snapshot current status
        snapshot = cls.get_snapshot_metrics(village)

        # Top performers
        top_performers = cls.get_top_performers(village, start_dt, end_dt)

        # Chart time-series
        chart_data = cls.get_time_series_chart_data(village, start_dt, end_dt)

        data = {
            'village': {
                'village_id': village.village_id,
                'village_name': village.village_name,
                'province': village.province,
            },
            'filter': {
                'time_range': time_range,
                'from_date': start_dt.strftime('%Y-%m-%d'),
                'to_date': end_dt.strftime('%Y-%m-%d'),
                'comparison_from_date': prev_start_dt.strftime('%Y-%m-%d'),
                'comparison_to_date': prev_end_dt.strftime('%Y-%m-%d'),
            },
            'kpis': {
                'net_revenue': curr_trans['revenue']['net_revenue'],
                'product_gross_revenue': curr_trans['revenue']['product_gross_revenue'],
                'workshop_gross_revenue': curr_trans['revenue']['workshop_gross_revenue'],
                'total_orders': curr_trans['orders']['total_orders'],
                'total_items_sold': curr_trans['orders']['total_items_sold'],
                'total_bookings': curr_trans['bookings']['total_bookings'],
                'attended_participants': curr_trans['bookings']['attended_participants'],
                'total_registered_participants': curr_trans['bookings']['total_registered_participants'],
                'attendance_rate': curr_trans['bookings']['attendance_rate'],
                'completion_rate': curr_trans['bookings']['completion_rate'],
                'growth': growth,
            },
            'revenue_breakdown': curr_trans['revenue'],
            'orders_summary': curr_trans['orders'],
            'bookings_summary': curr_trans['bookings'],
            'products_snapshot': snapshot['products'],
            'workshops_snapshot': snapshot['workshops'],
            'top_products': top_performers['top_products'],
            'top_workshops': top_performers['top_workshops'],
            'chart_data': chart_data,
        }

        return data, None

