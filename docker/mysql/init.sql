CREATE TABLE exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    duration INT, -- in minutes

    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO exams ( title ) VALUES ('SRSMT TEST');

CREATE TABLE sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT,

    name VARCHAR(100) NOT NULL,
    instructions TEXT,

    section_order INT NOT NULL,

    FOREIGN KEY (exam_id) REFERENCES exams(id),
    UNIQUE (exam_id, section_order)
);

CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,

    question_order INT NOT NULL,
    question_text TEXT NOT NULL,
    marks INT,

    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,

    correct_option ENUM('a', 'b', 'c', 'd') NOT NULL,

    FOREIGN KEY (section_id) REFERENCES sections(id),
    UNIQUE (section_id, question_order)
);

CREATE TABLE users (
    username VARCHAR(50) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'student') NOT NULL,
    assigned_exam_id INT,
    name VARCHAR(255),
    roll_number VARCHAR(100),
    dob DATE,
    email_id VARCHAR(255),
    phone_number VARCHAR(50),
    FOREIGN KEY (assigned_exam_id) REFERENCES exams(id),
    CHECK (assigned_exam_id IS NULL OR role = 'student'),
    CHECK (
        role <> 'student' OR (
            name IS NOT NULL AND
            roll_number IS NOT NULL AND
            dob IS NOT NULL AND
            email_id IS NOT NULL AND
            phone_number IS NOT NULL
        )
    ),
    -- NULL values are allowed for non-student users and do not conflict in UNIQUE constraints.
    UNIQUE (roll_number)
);

CREATE TABLE test_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,

    student_username VARCHAR(50) NOT NULL,
    exam_id INT NOT NULL,

    total_marks INT DEFAULT NULL,
    status ENUM('in_progress', 'submitted', 'terminated') DEFAULT 'in_progress',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_username) REFERENCES users(username),
    FOREIGN KEY (exam_id) REFERENCES exams(id),
    UNIQUE (student_username, exam_id),
    CHECK (total_marks IS NULL or status = 'submitted')
);

CREATE TABLE student_response (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    test_session_id INT NOT NULL,

    selected_option ENUM('a', 'b', 'c', 'd') NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (test_session_id) REFERENCES test_sessions(id),
    UNIQUE (test_session_id, question_id)
);
