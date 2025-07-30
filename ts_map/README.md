# Setup

npm init -y

npm install express mysql2
npm install -D typescript @types/express @types/node ts-node nodemon

Generate tsconfig.json:
tsc --init

fix package.json...

# Folder structure

project/
├── src/
│   └── server.ts          # Your TypeScript server file
├── dist/                  # Compiled JavaScript (auto-generated)
├── public/               # Static files
├── img/                  # Image assets
├── package.json
└── tsconfig.json

# Available Scripts

npm run build - Compile TypeScript to JavaScript
npm start - Run the compiled JavaScript
npm run dev - Run TypeScript directly with ts-node
npm run watch - Watch for changes and recompile
npm run dev:watch - Watch for changes and restart server

# Running the Server
bash# Development (with hot reload)
npm run dev:watch

# Production
npm run build
npm start

