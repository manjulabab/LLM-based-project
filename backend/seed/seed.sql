CREATE DATABASE IF NOT EXISTS rfpdb;
USE rfpdb;

CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), email VARCHAR(100) UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT INTO users (name, email) VALUES ('user_name','your_email);

CREATE TABLE IF NOT EXISTS vendor (id INT AUTO_INCREMENT PRIMARY KEY, vendor_name VARCHAR(255), contact_person VARCHAR(128), email VARCHAR(255), phone VARCHAR(50), address TEXT, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT INTO vendor (vendor_name, contact_person, email) VALUES
('vendor_name','contact_person','your_email');

CREATE TABLE IF NOT EXISTS rfp (id INT AUTO_INCREMENT PRIMARY KEY, userId INT, title VARCHAR(255), description TEXT, structured JSON, budget DECIMAL(14,2), currency VARCHAR(10), delivery_deadline DATE, payment_terms VARCHAR(128), warranty_requirements VARCHAR(128), createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT INTO rfp (userId, title, description, structured, budget, currency, delivery_deadline, payment_terms, warranty_requirements) VALUES
(1,'Office laptops and monitors','I need to procure 20 laptops...','{\"items\":[{\"name\":\"laptop\",\"qty\":20,\"unit\":\"each\",\"specs\":{\"ram\":\"16GB\"}},{\"name\":\"monitor\",\"qty\":15,\"unit\":\"each\",\"specs\":{\"size\":\"27-inch\"}}],\"total_budget\":50000,\"currency\":\"USD\",\"delivery_days\":30,\"payment_terms\":\"net 30\",\"warranty_months\":12}',50000,'USD',DATE_ADD(CURDATE(), INTERVAL 30 DAY),'net 30','12 months');