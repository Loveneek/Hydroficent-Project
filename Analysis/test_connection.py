import sys
import re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()


url = os.environ["SUPABASE_DB_URL"]
masked = re.sub(r'://([^:]+):([^@]+)@', r'://\1:****@', url)
print("Connection string structure:", masked)

conn = psycopg2.connect(os.environ["SUPABASE_DB_URL"])
cur = conn.cursor()
cur.execute("SELECT version();")
print(cur.fetchone())
conn.close()