-- Esquema mejorado para gastos con información fiscal completa
-- Para empresas españolas que necesitan control fiscal detallado

-- Tabla de proveedores (separada para normalizar)
CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "business_name" TEXT NOT NULL,  -- Razón social
  "tax_id" TEXT,                  -- CIF/NIF
  "address" TEXT,
  "city" TEXT,
  "postal_code" TEXT,
  "country" TEXT DEFAULT 'España',
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Tabla de gastos mejorada
CREATE TABLE IF NOT EXISTS "expenses" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "expense_number" TEXT,           -- Número interno del gasto (ej: EXP-2025-001)
  
  -- Información básica
  "description" TEXT NOT NULL,
  "expense_date" TIMESTAMP NOT NULL,
  "category_id" INTEGER REFERENCES "categories"("id"),
  "payment_method" TEXT,           -- efectivo, transferencia, tarjeta, etc.
  
  -- Información del proveedor
  "supplier_id" INTEGER REFERENCES "suppliers"("id"),
  "supplier_name" TEXT,            -- Nombre si no está en la tabla suppliers
  "supplier_tax_id" TEXT,          -- CIF/NIF del proveedor
  
  -- Información fiscal detallada
  "net_amount" DECIMAL(10, 2) NOT NULL,              -- Importe neto (base imponible)
  "vat_amount" DECIMAL(10, 2) DEFAULT 0,             -- Importe del IVA
  "vat_rate" DECIMAL(5, 2) DEFAULT 0,                -- Tipo de IVA (4%, 10%, 21%)
  "vat_deductible_percent" DECIMAL(5, 2) DEFAULT 100, -- % deducible del IVA (100%, 50% para gasolina, etc.)
  "vat_deductible_amount" DECIMAL(10, 2) DEFAULT 0,   -- Importe IVA realmente deducible
  
  "irpf_amount" DECIMAL(10, 2) DEFAULT 0,            -- Retención IRPF
  "irpf_rate" DECIMAL(5, 2) DEFAULT 0,               -- Tipo de retención IRPF
  
  "other_taxes" JSONB,                               -- Otros impuestos (recargo equivalencia, etc.)
  "total_amount" DECIMAL(10, 2) NOT NULL,           -- Importe total facturado
  
  -- Deducibilidad fiscal
  "deductible_for_corporate_tax" BOOLEAN DEFAULT true,     -- ¿Es deducible en Impuesto de Sociedades?
  "deductible_for_irpf" BOOLEAN DEFAULT true,              -- ¿Es deducible en IRPF (autónomos)?
  "deductible_percent" DECIMAL(5, 2) DEFAULT 100,          -- % de deducibilidad (algunos gastos solo 50%)
  "deductible_limit" DECIMAL(10, 2),                       -- Límite de deducibilidad si aplica
  
  -- Información adicional
  "invoice_number" TEXT,           -- Número de factura del proveedor
  "notes" TEXT,
  "attachments" TEXT[],
  
  -- Campos técnicos
  "created_from_ocr" BOOLEAN DEFAULT false,  -- Si se creó desde OCR
  "ocr_confidence" DECIMAL(3, 2),            -- Confianza del OCR (0.00-1.00)
  "requires_review" BOOLEAN DEFAULT false,    -- Si necesita revisión manual
  
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Tabla para tipos de gastos fiscales (para automatizar configuraciones)
CREATE TABLE IF NOT EXISTS "expense_types" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "name" TEXT NOT NULL,                               -- Ej: "Combustible", "Comidas", "Material oficina"
  "category_id" INTEGER REFERENCES "categories"("id"),
  
  -- Configuración fiscal por defecto
  "default_vat_rate" DECIMAL(5, 2) DEFAULT 21,
  "default_vat_deductible_percent" DECIMAL(5, 2) DEFAULT 100,
  "default_deductible_for_corporate_tax" BOOLEAN DEFAULT true,
  "default_deductible_for_irpf" BOOLEAN DEFAULT true,
  "default_deductible_percent" DECIMAL(5, 2) DEFAULT 100,
  
  -- Reglas especiales
  "has_deductible_limit" BOOLEAN DEFAULT false,
  "limit_amount_per_year" DECIMAL(10, 2),
  "limit_amount_per_expense" DECIMAL(10, 2),
  
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Insertar tipos de gastos típicos con sus reglas fiscales
INSERT INTO "expense_types" ("user_id", "name", "default_vat_rate", "default_vat_deductible_percent", "default_deductible_percent") VALUES
(1, 'Combustible', 21, 50, 100),  -- Gasolina: IVA solo 50% deducible
(1, 'Comidas de negocio', 10, 100, 100),
(1, 'Material de oficina', 21, 100, 100),
(1, 'Suministros (luz, agua, gas)', 21, 100, 100),
(1, 'Telecomunicaciones', 21, 100, 100),
(1, 'Seguros', 21, 100, 100),
(1, 'Formación', 21, 100, 100),
(1, 'Asesoría y consultoría', 21, 100, 100),
(1, 'Alquiler local', 21, 100, 100),
(1, 'Mantenimiento y reparaciones', 21, 100, 100);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_total_amount ON expenses(total_amount);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_tax_id ON suppliers(user_id, tax_id);

-- Vista para calcular totales fiscales por período
CREATE OR REPLACE VIEW expense_tax_summary AS
SELECT 
  user_id,
  EXTRACT(YEAR FROM expense_date) as year,
  EXTRACT(MONTH FROM expense_date) as month,
  
  -- Totales generales
  COUNT(*) as total_expenses,
  SUM(net_amount) as total_net,
  SUM(vat_amount) as total_vat,
  SUM(vat_deductible_amount) as total_vat_deductible,
  SUM(irpf_amount) as total_irpf,
  SUM(total_amount) as total_gross,
  
  -- Deducibles en Sociedades
  SUM(CASE WHEN deductible_for_corporate_tax THEN net_amount * (deductible_percent / 100) ELSE 0 END) as deductible_corporate_tax,
  
  -- Deducibles en IRPF
  SUM(CASE WHEN deductible_for_irpf THEN net_amount * (deductible_percent / 100) ELSE 0 END) as deductible_irpf
  
FROM expenses 
GROUP BY user_id, EXTRACT(YEAR FROM expense_date), EXTRACT(MONTH FROM expense_date); 