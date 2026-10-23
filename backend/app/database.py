import sqlite3
DATABASE = "student_success.db"


def get_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():

    connection = get_connection()
    cursor = connection.cursor()

    # Student table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            degree TEXT,
            semester INTEGER,
            cgpa REAL,
            career_goal TEXT,
            available_hours INTEGER
        )
    """)

    # Skills table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            skill TEXT,
            FOREIGN KEY(student_id)
            REFERENCES students(id)
        )
    """)

    
    # Add proficiency column to existing skills table if missing
    cursor.execute("PRAGMA table_info(skills)")
    skill_columns = [row["name"] for row in cursor.fetchall()]

    if "proficiency" not in skill_columns:
        cursor.execute(
            "ALTER TABLE skills ADD COLUMN proficiency INTEGER DEFAULT 0"
        )


    # Tasks table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            title TEXT,
            category TEXT,
            deadline TEXT,
            priority TEXT,
            completed INTEGER DEFAULT 0,
            FOREIGN KEY(student_id)
            REFERENCES students(id)
        )
    """)

    
    # Internship listings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS internships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            company TEXT NOT NULL,
            mode TEXT NOT NULL,
            location TEXT,
            stipend TEXT,
            skills TEXT NOT NULL,
            application_url TEXT
        )
    """)

    # Saved internships for each student
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_internships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            internship_id INTEGER NOT NULL,
            UNIQUE(student_id, internship_id),
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(internship_id) REFERENCES internships(id)
        )
    """)


    connection.commit()
    connection.close()