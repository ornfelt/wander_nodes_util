# Initialize Node.js project
npm init -y

# Install dependencies
npm install express mysql2
npm install --save-dev nodemon

# Create directories
mkdir -p img/map img/c_icons public

# Copy images...
cp -r /path/to/your/py/project/img/* ./img/

# Run the Application
Development mode (auto-restart on changes):
npm run dev

# Production mode
npm start

# Access at: http://localhost:5000

