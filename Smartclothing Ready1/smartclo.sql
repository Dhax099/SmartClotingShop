-- SmartClo database: import this ONE file into the `smartclo` database in phpMyAdmin.
-- Keeps existing accounts, creates the admin account if missing, and (re)builds all shop tables.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS order_items, orders, product_reviews, cart_items, ootd_items, vouchers, products;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin login: admin@smartclothing.com / admin123  (change it later)
INSERT INTO users (name, email, phone, password_hash, role)
SELECT 'Shop Admin', 'admin@smartclothing.com', '', '$2y$10$zHJHaKP6PKamMIjnGN3MBuzPIiRVtrWTKWiU40gVIupmrMf2pfpya', 'admin' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@smartclothing.com');

CREATE TABLE products (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  old_price DECIMAL(10,2) NULL,
  image LONGTEXT NULL,
  badge VARCHAR(30) NULL,
  stock INT NOT NULL DEFAULT 0,
  category VARCHAR(50) NULL,
  description TEXT NULL,
  extra TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
  id VARCHAR(40) PRIMARY KEY,
  user_id INT NULL,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150) NOT NULL,
  customer_email VARCHAR(150) NOT NULL,
  city VARCHAR(100) NULL,
  address TEXT NULL,
  payment_method VARCHAR(50) NULL,
  voucher_code VARCHAR(50) NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_email (customer_email),
  INDEX idx_orders_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(40) NOT NULL,
  product_id VARCHAR(30) NOT NULL,
  name VARCHAR(150) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  image TEXT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vouchers (
  id VARCHAR(30) PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  expiration_date DATE NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE product_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(30) NOT NULL,
  user_id INT NULL,
  name VARCHAR(100) NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reviews_product (product_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE ootd_items (
  id VARCHAR(30) PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  product_ids TEXT NULL,
  product_name TEXT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cart_items (
  user_id INT NOT NULL,
  product_id VARCHAR(30) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Starting data (the same sample products, outfits and voucher your site already had)
--eto template oh sa baba
--INSERT INTO products (id,name,price,old_price,image,badge,stock,category,description) VALUES ('PH001','Oversized Basic T-Shirt',499,599,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85','NEW',25,'tops','Comfortable oversized shirt for everyday casual wear.');
--INSERT INTO products (id,name,price,old_price,image,badge,stock,category,description) VALUES ('PH002','Tatay mo',899,1099,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdtbmcgPZYUxxoG_mxkRUUVFbgJugxK3iYTS67nIvPMg&s=10','BURAT',15,'bottoms','Butas tewup mo dito.');
INSERT INTO vouchers (id,code,discount,description) VALUES ('V001','WELCOME10','10% OFF','Use on your first order.');
--INSERT INTO ootd_items (id,title,description,product_ids,product_name,price,image) VALUES ('OOTD001','Weekend Casual','A simple everyday look using pieces from Smart Clothing.','["PH001"]','Oversized Basic T-Shirt',499,'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85');
--INSERT INTO ootd_items (id,title,description,product_ids,product_name,price,image) VALUES ('OOTD002','Street Ready','A relaxed streetwear outfit for going out with friends.','["PH003"]','Lightweight Zip Hoodie',999,'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=85');