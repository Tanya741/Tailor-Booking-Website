# TailorIt - Complete Tailor Booking Platform

A full-stack web application that connects customers with local tailors, featuring real-time booking, image uploads, payment processing, and comprehensive review system.

## 🚀 Features

### 🎯 **Core Functionality**
- **User Authentication** - Separate customer and tailor registration/login
- **Tailor Discovery** - Location-based search with geolocation support
- **Service Management** - Tailors can create and manage their services with image galleries
- **Booking System** - Real-time booking with status updates and polling
- **Payment Integration** - Secure payments via Stripe
- **Review System** - Customer reviews with star ratings and image uploads
- **Image Uploads** - Profile pictures, service galleries, and review photos

### 🛠 **Technical Stack**
- **Backend**: Django + Django REST Framework + PostgreSQL
- **Frontend**: React + Vite + TailwindCSS  
- **Authentication**: JWT (JSON Web Tokens)
- **Payments**: Stripe Integration
- **Location**: Native Geolocation API
- **File Storage**: Django ImageField with validation
- **Deployment**: Docker + Docker Compose

---

## 📋 Prerequisites

Before running this application, ensure you have:

- **Docker Desktop** installed and running
- **Git** for cloning the repository
- **Stripe Account** for payment testing (free)
- **Basic terminal/command prompt** knowledge

---

## 🛠️ Quick Start Guide

### **1. Clone the Repository**
```bash
git clone https://github.com/Tanya741/Tailor-Booking-Website.git
cd Tailor-Booking-Website
```

### **2. Environment Setup**
```bash
# Copy the example environment file
cp .env.example .env
```

### **3. Configure Environment Variables**
Edit the `.env` file with your settings:

```env
# Django Settings
DEBUG=True
SECRET_KEY=your-development-secret-key
DATABASE_URL=postgresql://postgres:postgres@db:5432/tailor_it
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8000
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://localhost:8000

# Note: Images are stored locally in development (/media/ folder)
# Production uses Cloudinary (configured in Render environment variables)

# Stripe Configuration (Get from https://stripe.com/docs/keys)
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# Frontend Configuration
NODE_ENV=development
FRONTEND_TARGET=development
FRONTEND_PORT=5173
FRONTEND_INTERNAL_PORT=5173
VITE_API_BASE=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

### **4. Start the Application**
```bash
# Build and start all services (backend + frontend + database)
docker-compose up --build
```

### **5. Initialize Database**
In a new terminal window:
```bash
# Run database migrations
docker-compose exec web python manage.py migrate

# Create a superuser account (for admin access)
docker-compose exec web python manage.py createsuperuser

# (Optional) Load sample data
docker-compose exec web python manage.py loaddata seeds/category.json
```

### **6. Access Your Application**
- **Frontend (Main App)**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

---

## 🎯 How to Use the Application

### **For Customers:**
1. **Register** as a customer with your location
2. **Browse tailors** near you or search by services
3. **View tailor profiles** with services, ratings, and reviews
4. **Book services** with preferred dates and requirements
5. **Make payments** securely via Stripe
6. **Track bookings** in real-time with status updates
7. **Leave reviews** after service completion with photos

### **For Tailors:**
1. **Register** as a tailor with shop location and details
2. **Upload shop photos** and create detailed profile
3. **Add services** with descriptions, pricing, and image galleries
4. **Manage bookings** - accept, reject, or update status
5. **Receive payments** automatically after completion
6. **Build reputation** through customer reviews and ratings

---

## 🔧 Development Workflow

### **Making Code Changes**
- **Frontend changes** (React components) are automatically detected and hot-reloaded
- **Backend changes** (Python/Django) require container restart
- **Database changes** require running migrations

### **Common Development Commands**

#### **View Logs**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web      # Backend
docker-compose logs -f frontend # Frontend  
docker-compose logs -f db       # Database
```

#### **Database Operations**
```bash
# Make migrations (after model changes)
docker-compose exec web python manage.py makemigrations

# Apply migrations
docker-compose exec web python manage.py migrate

# Access database shell
docker-compose exec db psql -U postgres -d tailor_it

# Django shell
docker-compose exec web python manage.py shell
```

#### **Container Management**
```bash
# Stop services
docker-compose down

# Rebuild specific service
docker-compose build web
docker-compose build frontend

# Reset everything (⚠️ Deletes data)
docker-compose down -v
docker-compose up --build
```

---

## 📡 API Reference

### **Authentication**
```
POST  /api/users/session/           # Unified register/login (action: 'register'|'login')
GET   /api/users/me/               # Current user profile
```

### **Tailors & Profiles**
```
GET   /api/marketplace/            # List all tailors (public)
GET   /api/marketplace/me/         # Get/update current tailor profile
GET   /api/marketplace/{username}/ # Tailor profile detail
```

### **Services**
```
GET   /api/marketplace/me/services/              # List my services (tailor)
POST  /api/marketplace/me/services/              # Create service (tailor)
GET   /api/marketplace/{username}/services/      # Public services of a tailor
```

### **Bookings**
```
GET   /api/marketplace/bookings/                 # List bookings
POST  /api/marketplace/bookings/                 # Create booking (customer)
PATCH /api/marketplace/bookings/{id}/            # Update booking status (tailor)
```

### **Reviews**
```
GET   /api/marketplace/reviews/                  # My reviews (customer)
POST  /api/marketplace/reviews/                  # Create review (customer)
GET   /api/marketplace/{username}/reviews/       # Tailor's reviews (public)
```

### **Payments**
```
POST  /api/marketplace/create-payment-intent/    # Create Stripe payment
POST  /api/marketplace/confirm-payment/          # Confirm payment
```

---

## 🖼️ Image Upload System

### **Supported Image Types**
- **Profile Pictures**: Tailor shop photos
- **Service Images**: Up to 10 images per service
- **Review Images**: Up to 5 images per customer review

### **Specifications**
- **Max File Size**: 5MB per image
- **Supported Formats**: JPEG, PNG, WebP
- **Auto Optimization**: Images are automatically optimized for web
- **Validation**: Client and server-side validation

---

## 🔒 Security Features

### **Authentication & Authorization**
- JWT-based authentication with refresh tokens
- Role-based access control (Customer vs Tailor)
- Protected routes and API endpoints

### **Data Protection**
- Environment variable management
- CORS protection
- CSRF protection
- SQL injection prevention
- XSS protection

### **Payment Security**
- Stripe PCI compliance
- Secure payment processing
- No card data storage

---

## 🚀 Production Deployment

### **Environment Configuration**
For production deployment, update your `.env` file:
```env
DEBUG=False
SECRET_KEY=your-super-secret-production-key
DATABASE_URL=your-production-database-url
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_live_key
STRIPE_SECRET_KEY=sk_live_your_stripe_live_key
```

### **Deployment Platforms**
- **Render**: Direct deployment from GitHub
- **Railway**: CLI-based deployment
- **Heroku**: Container registry deployment
- **VPS**: Docker Compose with reverse proxy

---

## 🐛 Troubleshooting

### **Common Issues**

#### **Port Already in Use**
```bash
# Find what's using the port
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# Kill the process (Windows)
taskkill /PID <PID> /F
```

#### **Database Connection Issues**
```bash
# Check database status
docker-compose logs db

# Reset database
docker-compose down
docker volume rm tailor_it_postgres_data
docker-compose up -d db
```

#### **Image Upload Issues**
```bash
# Check media directory permissions
docker-compose exec web ls -la /app/media/
docker-compose exec web chmod -R 755 /app/media/
```

#### **CORS Errors**
- Verify `CORS_ALLOWED_ORIGINS` in `.env` file
- Ensure frontend URL is included in CORS settings
- Check browser developer tools for specific errors

---

## 🧪 Testing

### **Stripe Test Cards**
Use these test card numbers for payment testing:
- **Success**: 4242 4242 4242 4242
- **Declined**: 4000 0000 0000 0002
- **Requires 3D Secure**: 4000 0027 6000 3184

### **Test Users**
After running migrations, you can create test accounts:
1. **Admin User**: Via `createsuperuser` command
2. **Test Tailor**: Register through frontend
3. **Test Customer**: Register through frontend

---

## 📱 Mobile Responsive

The application is fully responsive and works seamlessly on:
- **Desktop**: Full feature set with optimal layout
- **Tablet**: Adapted interface for medium screens  
- **Mobile**: Touch-optimized interface for smartphones

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- **Django REST Framework** for robust API development
- **React & Vite** for modern frontend development
- **Stripe** for secure payment processing
- **Docker** for containerization and deployment
- **TailwindCSS** for responsive design

---