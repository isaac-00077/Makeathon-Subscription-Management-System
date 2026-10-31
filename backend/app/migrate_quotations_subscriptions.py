from app.database import engine, Base
from sqlalchemy import text
import app.models

def run_migration():
    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS template_name VARCHAR(150) DEFAULT 'Standard Template';"))
        conn.execute(text("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms TEXT;"))
        conn.execute(text("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'percentage';"))
        conn.execute(text("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) DEFAULT 0.00;"))
        conn.execute(text("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0.00;"))
        conn.execute(text("ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS product_variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL;"))
        conn.execute(text("ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS history JSON DEFAULT '[]';"))
        conn.commit()
        print("DB schema migration / sync completed successfully!")

if __name__ == "__main__":
    run_migration()
