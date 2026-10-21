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

    connection.commit()
    connection.close()