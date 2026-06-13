FROM php:8.2-apache

# Copy all your frontend and backend files into the web server directory
COPY . /var/www/html/

RUN echo "DirectoryIndex songo.html songo.php" >> /etc/apache2/apache2.conf

RUN touch /var/www/html/games.json && chown -R www-data:www-data /var/www/html/

# Expose port 80 for web traffic
EXPOSE 80