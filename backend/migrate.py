import sqlite3

def main():
    conn = sqlite3.connect('database.db')
    try:
        conn.execute("ALTER TABLE chat ADD COLUMN level VARCHAR(4) DEFAULT 'B1'")
        conn.commit()
        print('done')
    except sqlite3.OperationalError as e:
        if 'duplicate column' in str(e):
            print('column already exists, skip')
        else:
            raise
    finally:
        conn.close()

if __name__ == '__main__':
    main()
