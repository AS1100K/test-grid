CREATE TABLE users (
    user_id VARCHAR(80) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'student'),
    assigned_exam_id INT,
    CHECK (assigned_exam_id IS NULL OR role = 'student')
)
