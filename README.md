#momee
App created 17-04-2025
Node Version : 22.14.0

VPS SERVER REQUIRED PACKAGES GLOBALLY 
pm2 , cross-env 

Hostinger vps server deployment steps:
1. select zip file,
2. unzip the zip file use : unzip <filename>,
3. Install packages : npm install --legacy-peer-deps
4. run command : pm2 start "npm run start" --name "momee"