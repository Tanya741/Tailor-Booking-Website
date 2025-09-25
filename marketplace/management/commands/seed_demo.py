from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from faker import Faker
import random
import math
from decimal import Decimal

from marketplace.models import Specialization, TailorProfile, Service, Booking, Review

fake = Faker()
User = get_user_model()

# Canonical specialization set
SPECIALIZATIONS = [
    { 'label': 'Blouse Tailoring', 'slug': 'blouse-tailoring' },
    { 'label': 'Lehenga Tailoring', 'slug': 'lehenga-tailoring' },
    { 'label': 'Kurti Tailoring', 'slug': 'kurti-tailoring' },
    { 'label': 'Dress Tailoring', 'slug': 'dress-tailoring' },
    { 'label': 'Skirt Tailoring', 'slug': 'skirt-tailoring' },
    { 'label': 'Saree Stitching (ready-to-wear, pre-stitched)', 'slug': 'saree-stitching' },
    { 'label': 'Fall / Pico Work', 'slug': 'fall-pico-work' },
    { 'label': 'Top/Western Wear Tailoring', 'slug': 'top-western-wear-tailoring' },
]

class Command(BaseCommand):
    help = "Seed demo data aligned to canonical specializations (superuser, tailors, customers, services, bookings, reviews)."

    def add_arguments(self, parser):
        parser.add_argument('--tailors', type=int, default=5)
        parser.add_argument('--customers', type=int, default=10)
        parser.add_argument('--bookings', type=int, default=25)
        parser.add_argument('--reviews', type=int, default=15)
        parser.add_argument('--no-superuser', action='store_true')
        parser.add_argument('--reset', action='store_true', help='Delete marketplace data before seeding (reviews, bookings, services, profiles, specializations)')

    def handle(self, *args, **options):
        tailors_count = options['tailors']
        customers_count = options['customers']
        bookings_target = options['bookings']
        reviews_target = options['reviews']

        self.stdout.write(self.style.NOTICE('Seeding data...'))

        if options.get('reset'):
            self.stdout.write('Resetting marketplace data (reviews, bookings, services, profiles, specializations)...')
            Review.objects.all().delete()
            Booking.objects.all().delete()
            Service.objects.all().delete()
            TailorProfile.objects.all().delete()
            Specialization.objects.all().delete()

        # Superuser
        if not options['no_superuser']:
            if not User.objects.filter(is_superuser=True).exists():
                admin = User.objects.create_superuser(
                    username='admin', password='adminpass', email='admin@example.com'
                )
                admin.role = 'tailor'
                admin.save()
                self.stdout.write(self.style.SUCCESS('Created superuser admin/adminpass'))
            else:
                self.stdout.write('Superuser already exists.')

        # Specializations
        spec_objs = []
        for item in SPECIALIZATIONS:
            spec, _ = Specialization.objects.get_or_create(slug=item['slug'], defaults={'name': item['label']})
            if spec.name != item['label']:
                spec.name = item['label']
                spec.save(update_fields=['name'])
            spec_objs.append(spec)
        self.stdout.write(f'Specializations ready: {len(spec_objs)}')

        # Tailors
        tailor_users = []
        IITG_LAT = 26.1878
        IITG_LNG = 91.6913

        def random_point_near(lat, lng, max_km=8.0):
            # Pick a random distance (km) and bearing; convert to lat/lng delta
            r = random.random()  # 0..1
            d = r * max_km
            theta = random.uniform(0, 2 * math.pi)
            # Convert km to degrees
            d_lat = d / 111.32
            d_lng = d / (111.32 * max(0.1, math.cos(math.radians(lat))))
            return lat + d_lat * math.sin(theta), lng + d_lng * math.cos(theta)

        for i in range(tailors_count):
            username = f"tailor{i+1}"
            if User.objects.filter(username=username).exists():
                user = User.objects.get(username=username)
            else:
                user = User.objects.create_user(
                    username=username,
                    password='password',
                    role='tailor',
                )
            # Ensure geolocation around IIT Guwahati
            lat, lng = random_point_near(IITG_LAT, IITG_LNG, max_km=8.0)
            user.latitude = round(lat, 6)
            user.longitude = round(lng, 6)
            user.save(update_fields=['latitude', 'longitude'])
            # Ensure profile (signal might not have fired earlier in legacy data)
            profile, _ = TailorProfile.objects.get_or_create(user=user)
            profile.bio = fake.paragraph(nb_sentences=3)
            profile.years_experience = random.randint(1, 20)
            choices = random.sample(spec_objs, k=random.randint(1, 3))
            profile.save()
            profile.specializations.set(choices)
            tailor_users.append(user)
        self.stdout.write(f'Tailors ready: {len(tailor_users)}')

        # Customers
        customer_users = []
        for i in range(customers_count):
            username = f"customer{i+1}"
            if User.objects.filter(username=username).exists():
                user = User.objects.get(username=username)
            else:
                user = User.objects.create_user(
                    username=username,
                    password='password',
                    role='customer',
                )
            customer_users.append(user)
        self.stdout.write(f'Customers ready: {len(customer_users)}')

        # Services: create one per assigned specialization so it matches the search specialization
        all_services = []
        for tailor_user in tailor_users:
            profile = tailor_user.tailor_profile
            assigned_specs = list(profile.specializations.all())
            existing_names = set(profile.services.values_list('name', flat=True))
            for spec in assigned_specs:
                name = spec.name
                if name in existing_names:
                    continue
                base_price = Decimal('499.00')
                svc = Service.objects.create(
                    tailor=profile,
                    name=name,
                    description=f"{name} by {tailor_user.username}",
                    price=base_price + Decimal(random.randint(-100, 200)),
                    duration_minutes=random.choice([45, 60, 90, 120]),
                )
                all_services.append(svc)
        self.stdout.write(f'Services created or ensured: {len(all_services)}')

        # Bookings
        possible_services = list(Service.objects.filter(is_active=True))
        bookings = []
        for _ in range(bookings_target):
            service = random.choice(possible_services)
            customer = random.choice(customer_users)
            # Schedule in future hours
            scheduled_time = timezone.now() + timezone.timedelta(hours=random.randint(1, 240))
            booking = Booking.objects.create(
                customer=customer,
                tailor=service.tailor.user,
                service=service,
                scheduled_time=scheduled_time,
                price_snapshot=service.price,
            )
            # Randomly accept/reject some
            if random.random() < 0.7:
                booking.status = 'accepted'
            if random.random() < 0.5 and booking.status == 'accepted':
                booking.status = 'completed'
            booking.save()
            bookings.append(booking)
        self.stdout.write(f'Bookings created: {len(bookings)}')

        # Reviews
        completed_bookings = [b for b in bookings if b.status == 'completed']
        random.shuffle(completed_bookings)
        reviews_created = 0
        for booking in completed_bookings[:reviews_target]:
            Review.objects.create(
                booking=booking,
                customer=booking.customer,
                tailor=booking.tailor,
                rating=random.randint(3, 5),
                comment=fake.sentence(),
            )
            reviews_created += 1
        self.stdout.write(f'Reviews created: {reviews_created}')

        self.stdout.write(self.style.SUCCESS('Seeding complete.'))
