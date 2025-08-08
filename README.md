# Mentorship Platform Backend

A comprehensive backend API for a mentorship platform that connects students with mentors for subject-specific, on-demand help.

## 🚀 Features

- **User Authentication** - JWT-based authentication with email verification
- **Role-based System** - Separate profiles for mentors and students
- **Dynamic Subject Management** - Auto-fetched subjects based on branch and semester
- **Profile Management** - Complete CRUD operations for both mentors and students
- **Modular Architecture** - Built for scalability and future enhancements

## 🏗️ Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  fullName: String,
  username: String,
  email: String (required, unique),
  password: String (hashed),
  role: String (enum: ['mentor', 'student'], default: null),
  isEmailVerified: Boolean (default: false),
  isProfileComplete: Boolean (default: false),
  otp: String,
  otpExpiry: Date,
  refreshToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Mentors Collection

```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: 'User', required, unique),
  name: String (required),
  phone: String (required),
  designation: String (required),
  skills: [String] (required),
  experience_years: Number (required, min: 0),
  bio: String (required, maxlength: 500),
  available_time_slots: [{
    day: String (enum: weekdays),
    start_time: String,
    end_time: String
  }],
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Students Collection

```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: 'User', required, unique),
  name: String (required),
  phone: String (required),
  branch: String (enum: ['Computer', 'IT', 'AIML', 'ECS'], required),
  semester: Number (required, min: 1, max: 8),
  subjects: [{
    subject_id: ObjectId (ref: 'Subject'),
    subject_name: String
  }],
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Subjects Collection

```javascript
{
  _id: ObjectId,
  branch: String (enum: ['Computer', 'IT', 'AIML', 'ECS'], required),
  semester: Number (required, min: 1, max: 8),
  subject_name: String (required),
  subject_code: String,
  credits: Number (default: 3),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

## 📋 API Endpoints

### Authentication (`/api/auth`)

- `POST /register` - Register new user
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /verify-email` - Email verification
- `POST /forgot-password` - Forgot password
- `POST /reset-password` - Reset password

### Profile Management (`/api/profile`)

- `GET /status` - Check profile completion status
- `POST /role` - Set user role (mentor/student)
- `GET /me` - Get current user profile
- `PUT /me` - Update basic user info
- `DELETE /reset` - Reset user profile
- `GET /dashboard` - Get dashboard data

### Mentor Management (`/api/mentors`)

- `POST /register` - Register as mentor
- `GET /profile` - Get mentor profile
- `PUT /profile` - Update mentor profile
- `DELETE /profile` - Delete mentor profile
- `GET /all` - Get all mentors (with filters)
- `GET /:mentorId` - Get mentor by ID

### Student Management (`/api/students`)

- `POST /register` - Register as student
- `GET /profile` - Get student profile
- `PUT /profile` - Update student profile
- `DELETE /profile` - Delete student profile
- `GET /subjects/:branch/:semester` - Get subjects by branch and semester
- `GET /all` - Get all students (with filters)
- `GET /:studentId` - Get student by ID

### Subject Management (`/api/subjects`)

- `GET /` - Get all subjects
- `GET /branches` - Get all branches
- `GET /branches/:branch/semesters` - Get semesters by branch
- `GET /:branch/:semester` - Get subjects by branch and semester
- `POST /` - Create new subject (admin)
- `PUT /:subjectId` - Update subject (admin)
- `DELETE /:subjectId` - Delete subject (admin)

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB installation
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:

   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mentorship-platform?retryWrites=true&w=majority

   JWT_ACCESS_SECRET=your-access-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret-key

   NODE_ENV=development

   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password

   CLOUDINARY_CLOUD_NAME=your-cloudinary-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Seed the database with subjects**

   ```bash
   npm run seed:subjects
   ```

5. **Start the server**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

The server will run on `http://localhost:5000`

## 📊 Seeded Data

The system comes with pre-seeded subjects for all branches and odd semesters (1, 3, 5, 7):

### Branches Available:

- **Computer** - Computer Science and Engineering
- **IT** - Information Technology
- **AIML** - Artificial Intelligence and Machine Learning
- **ECS** - Electronics and Communication Systems

### Semester Coverage:

Each branch has subjects for **odd semesters only** (1, 3, 5, 7):

#### Semester 1 (All Branches):

- Mathematics-I, Physics, Chemistry
- Programming/Technical fundamentals
- English Communication
- Branch-specific introductory subjects

#### Semester 3:

- Mathematics-III
- Core branch subjects (DBMS, DSA, etc.)
- Advanced programming concepts
- Engineering subjects

#### Semester 5:

- Advanced technical subjects
- Specialization subjects
- Industry-relevant technologies

#### Semester 7:

- Cutting-edge technologies
- Major projects/capstone
- Advanced specializations
- Industry integration subjects

## 🔐 Authentication Flow

1. **User Registration** → Email verification required
2. **User Login** → JWT tokens issued
3. **Role Selection** → Choose between mentor/student
4. **Profile Completion** → Fill detailed profile based on role
5. **Access Platform** → Full access to mentorship features

## 📱 API Testing

### Using Postman

1. Import the collection from `/postman/mentorship-platform.postman_collection.json`
2. Set the `baseUrl` variable to `http://localhost:5000/api`
3. After login, copy the JWT token to the `accessToken` variable
4. Test all endpoints with proper authentication

### Sample API Calls

**Register as Student:**

```bash
curl -X POST http://localhost:5000/api/students/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "John Doe",
    "phone": "+1234567890",
    "branch": "Computer",
    "semester": 3
  }'
```

**Register as Mentor:**

```bash
curl -X POST http://localhost:5000/api/mentors/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Jane Smith",
    "phone": "+1234567891",
    "designation": "Senior Developer",
    "skills": ["JavaScript", "React", "Node.js"],
    "experience_years": 5,
    "bio": "Experienced full-stack developer"
  }'
```

## 🏗️ Project Structure

```
Backend/
├── config/
│   └── db.js                 # Database connection
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── mentorController.js   # Mentor CRUD operations
│   ├── studentController.js  # Student CRUD operations
│   ├── subjectController.js  # Subject management
│   └── profileController.js  # Profile & role management
├── middlewares/
│   └── authMiddleware.js     # JWT authentication middleware
├── models/
│   ├── user.js              # User schema
│   ├── mentor.js            # Mentor schema
│   ├── student.js           # Student schema
│   └── subject.js           # Subject schema
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── mentor.js            # Mentor routes
│   ├── student.js           # Student routes
│   ├── subject.js           # Subject routes
│   └── profile.js           # Profile routes
├── seeders/
│   └── subjectSeeder.js     # Database seeding
├── utils/
│   ├── ApiError.js          # Error handling utility
│   ├── ApiResponse.js       # Response formatting utility
│   ├── asyncHandler.js      # Async error wrapper
│   ├── cloudinary.js        # File upload utility
│   ├── emailUtils.js        # Email services
│   └── generateToken.js     # JWT token generation
├── postman/
│   └── mentorship-platform.postman_collection.json
├── .env                     # Environment variables
├── server.js               # Server entry point
└── package.json            # Dependencies and scripts
```

## 🚀 Future Enhancements

The modular architecture supports easy addition of:

1. **Real-time Chat** - Socket.io integration for mentor-student communication
2. **Session Scheduling** - Calendar integration for booking sessions
3. **Payment Integration** - Stripe/PayPal for paid mentorship
4. **Rating System** - Review and rating system for mentors
5. **Notification System** - Email/SMS notifications for sessions
6. **Video Calling** - WebRTC integration for video sessions
7. **Admin Dashboard** - Complete admin panel for platform management

## 🔧 Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run seed:subjects  # Seed database with subjects
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 📞 Support

For support, email your-email@example.com or create an issue in the repository.

---

**Built with ❤️ for connecting students and mentors!**
