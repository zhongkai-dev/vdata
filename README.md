# VData Application

A web application for generating and managing phone numbers with admin and user panels.

## Features

### Admin Panel
- Create users with 6-digit IDs and names
- Upload phone numbers (via text input or file upload)
- Assign phone numbers to users
- View user details and statistics

### User Panel
- Login with 6-digit ID
- Generate phone numbers based on assigned quota
- Copy generated phone numbers to clipboard
- View remaining phone number allocation

## Tech Stack

- **Frontend**: React, React Bootstrap, React Router
- **Backend**: Node.js, Express.js
- **Database**: MongoDB

## Installation and Setup

### Prerequisites
- Node.js and npm
- MongoDB

### Quick Setup (Install All Dependencies)
```
npm run install-all
```

### Development Mode
```
npm run dev
```
This will start both the backend server and the React frontend concurrently.

### Backend Setup
1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm run dev
   ```

### Frontend Setup
1. Navigate to the client directory:
   ```
   cd client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the React app:
   ```
   npm start
   ```

## Initial Setup

1. Create an admin user by making a POST request to:
   ```
   http://localhost:5000/api/admin/setup
   ```

2. Login with the admin credentials:
   - User ID: 000000

## Deployment to Vercel

### Environment Variables
Set up the following environment variables in your Vercel project:

- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret key for JWT authentication
- `NODE_ENV`: Set to "production"

### Deployment Steps
1. Fork or clone this repository to your GitHub account
2. Connect your GitHub repository to Vercel
3. Configure the environment variables
4. Deploy!

The project includes a `vercel.json` configuration file that handles both the backend API and frontend static files.

## Usage

### Admin Workflow
1. Login as admin
2. Upload phone numbers
3. Create users
4. Assign phone numbers to users

### User Workflow
1. Login with provided 6-digit ID
2. Generate phone numbers as needed
3. Copy generated numbers to clipboard

## License
MIT 