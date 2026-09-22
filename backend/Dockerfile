FROM php:8.2-cli

RUN docker-php-ext-install pdo_mysql

WORKDIR /var/www/html

COPY . .

RUN mkdir -p /var/www/html/uploads/profiles \
	&& chmod -R 775 /var/www/html/uploads

EXPOSE 8080

CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8080} -t /var/www/html"]
