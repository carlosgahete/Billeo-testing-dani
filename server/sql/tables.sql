CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'user',
  "profile_image" TEXT
);

CREATE TABLE IF NOT EXISTS "companies" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "name" TEXT NOT NULL,
  "tax_id" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "postal_code" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "logo" TEXT
);

CREATE TABLE IF NOT EXISTS "clients" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "name" TEXT NOT NULL,
  "tax_id" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT,
  "postal_code" TEXT,
  "country" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "invoice_number" TEXT NOT NULL,
  "client_id" INTEGER NOT NULL REFERENCES "clients"("id"),
  "issue_date" TIMESTAMP NOT NULL,
  "due_date" TIMESTAMP NOT NULL,
  "subtotal" DECIMAL(10, 2) NOT NULL,
  "tax" DECIMAL(10, 2) NOT NULL,
  "total" DECIMAL(10, 2) NOT NULL,
  "additional_taxes" JSONB,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "attachments" TEXT[]
);

CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" SERIAL PRIMARY KEY,
  "invoice_id" INTEGER NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(10, 2) NOT NULL,
  "unit_price" DECIMAL(10, 2) NOT NULL,
  "tax_rate" DECIMAL(5, 2) NOT NULL,
  "subtotal" DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "color" TEXT
);

CREATE TABLE IF NOT EXISTS "transactions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "description" TEXT NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "date" TIMESTAMP NOT NULL,
  "type" TEXT NOT NULL,
  "category_id" INTEGER REFERENCES "categories"("id"),
  "payment_method" TEXT,
  "notes" TEXT,
  "attachments" TEXT[],
  "invoice_id" INTEGER REFERENCES "invoices"("id")
);

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "due_date" TIMESTAMP,
  "completed" BOOLEAN NOT NULL DEFAULT FALSE,
  "priority" TEXT DEFAULT 'medium'
);