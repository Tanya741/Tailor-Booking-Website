from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from faker import Faker
import random
from decimal import Decimal

from marketplace.models import Specialization, TailorProfile, Service, Booking, Review

fake = Faker()
User = get_user_model()

SPECIALIZATIONS = [
    'Alterations', 'Custom Suits', 'Bridal Wear', 'Embroidery', 'Casual Tailoring',
    'Men Formal', 'Women Ethnic', 'Kids Wear', 'Repairs', 'Costumes'
]

SERVICES = [
    ('Pant Hemming', Decimal('150.00'), 30),
    ('Blouse Stitching', Decimal('500.00'), 120),
    ('Suit Fitting', Decimal('800.00'), 90),
    ('Saree Fall & Pico', Decimal('250.00'), 45),
    ('Dress Alteration', Decimal('400.00'), 80),
]

class Command(BaseCommand):
    help = "Seed demo data (superuser, tailors, customers, services, bookings, reviews)."

    def add_arguments(self, parser):
        parser.add_argument('--tailors', type=int, default=5)
        parser.add_argument('--customers', type=int, default=10)
        parser.add_argument('--bookings', type=int, default=25)
        parser.add_argument('--reviews', type=int, default=15)
        parser.add_argument('--no-superuser', action='store_true')

    def handle(self, *args, **options):
        tailors_count = options['tailors']
        customers_count = options['customers']
        bookings_target = options['bookings']
        reviews_target = options['reviews']

        self.stdout.write(self.style.NOTICE('Seeding data...'))

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
        for name in SPECIALIZATIONS:
            spec, _ = Specialization.objects.get_or_create(name=name, defaults={'slug': name.lower().replace(' ', '-')})
            spec_objs.append(spec)
        self.stdout.write(f'Specializations ready: {len(spec_objs)}')

        # Tailors
        tailor_users = []
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

        # Services
        all_services = []
        for tailor_user in tailor_users:
            profile = tailor_user.tailor_profile
            existing_names = set(profile.services.values_list('name', flat=True))
            for name, price, duration in SERVICES:
                if name in existing_names:
                    continue
                svc = Service.objects.create(
                    tailor=profile,
                    name=name,
                    description=fake.sentence(),
                    price=price + Decimal(random.randint(-50, 50)),
                    duration_minutes=duration,
                )
                all_services.append(svc)
        self.stdout.write(f'Services created: {len(all_services)}')

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
