
# NEXORA
Condotel Management System

## Project Architecture

Master Blueprint: NEXORA Final Architecture v2.1

NEXORA is a web-based condotel management system
for one property.

The system contains three applications:

1. Guest Website - React and JavaScript
2. Admin Dashboard - React and JavaScript
3. Backend API - NestJS and TypeScript

## Project Folders

frontend/guest-web - Public Guest Website

frontend/admin-web - Staff Admin Dashboard

backend - NestJS REST API

docs - Project documentation

## Development Requirements

- Node.js 24 LTS
- npm
- Visual Studio Code
- Git

## Installation

Run these commands in their respective folders.

Guest Website:
cd frontend/guest-web
npm install

Admin Dashboard:
cd frontend/admin-web
npm install

Backend:
cd backend
npm install

## Environment Setup

Create a .env file using each application's
.env.example file.

Frontend API address:
VITE_API_URL=http://localhost:3000/api

Backend environment example:
PORT=3000

## Running the Applications

Open three separate terminals from the NEXORA root.

Terminal 1 - Backend:
cd backend
npm run start:dev

Terminal 2 - Guest Website:
cd frontend/guest-web
npm run dev -- --port 5173 --strictPort

Terminal 3 - Admin Dashboard:
cd frontend/admin-web
npm run dev -- --port 5174 --strictPort

## Local Addresses

Guest Website:
http://localhost:5173

Admin Dashboard:
http://localhost:5174

Backend Health Check:
http://localhost:3000/api/health

## Testing

In each application folder, run:

npm run build

For backend unit tests:

npm run test

## Current Development Status

Phase 1 - Project Foundation

Completed:
- Development environment setup
- Project folder setup
- Guest Website starter
- Admin Dashboard starter
- NestJS backend foundation
- Frontend and backend communication

Step 7:
Project standards and documentation

## Development Rules

- Keep code simple and readable.
- Build one feature at a time.
- Test before proceeding.
- Do not commit passwords or secrets.
- Keep frontend and backend separate.
- Use the approved Architecture v2.1.
- Do not change the architecture without approval.

## Future Development

Phase 2 - Database Foundation
Phase 3 - Authentication and Roles
Phase 4 - Room Management
Phase 5 - Guest Website
Phase 6 - Reservations
Phase 7 - Payments
Phase 8 - Admin Dashboard
Phase 9 - NFC Management
Phase 10 - Reports and Settings
Phase 11 - Testing and Security
Phase 12 - Production Deployment
