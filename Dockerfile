FROM php:8.2-apache

# Copy all your frontend and backend files into the web server directory
COPY . /var/www/html/

# Expose port 80 for web traffic
EXPOSE 80