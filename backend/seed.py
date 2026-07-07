from backend.database.db import engine, SessionLocal, Base

def seed_database():
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully. No mock data inserted.")

if __name__ == "__main__":
    seed_database()
