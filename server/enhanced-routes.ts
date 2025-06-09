import { Express, Request, Response } from "express";
import { z } from "zod";
import { db } from "./db";
import { 
  suppliers, 
  expenses, 
  expenseTypes,
  insertSupplierSchema, 
  insertExpenseSchema, 
  insertExpenseTypeSchema,
  enhancedExpenseSchema 
} from "../shared/enhanced-schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export function registerEnhancedExpenseRoutes(app: Express) {
  
  // ===================
  // ENDPOINTS DE PROVEEDORES
  // ===================
  
  // GET /api/suppliers - Obtener todos los proveedores del usuario
  app.get("/api/suppliers", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userSuppliers = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.userId, req.session.userId))
        .orderBy(suppliers.businessName);

      return res.json(userSuppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/suppliers - Crear nuevo proveedor
  app.post("/api/suppliers", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validationResult = insertSupplierSchema.safeParse({
        ...req.body,
        userId: req.session.userId,
      });

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid supplier data",
          errors: validationResult.error.errors,
        });
      }

      const newSupplier = await db
        .insert(suppliers)
        .values(validationResult.data)
        .returning();

      return res.status(201).json(newSupplier[0]);
    } catch (error) {
      console.error("Error creating supplier:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // PUT /api/suppliers/:id - Actualizar proveedor
  app.put("/api/suppliers/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const supplierId = parseInt(req.params.id);
      const validationResult = insertSupplierSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid supplier data",
          errors: validationResult.error.errors,
        });
      }

      const updatedSupplier = await db
        .update(suppliers)
        .set({ ...validationResult.data, updatedAt: new Date() })
        .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, req.session.userId)))
        .returning();

      if (updatedSupplier.length === 0) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      return res.json(updatedSupplier[0]);
    } catch (error) {
      console.error("Error updating supplier:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===================
  // ENDPOINTS DE TIPOS DE GASTOS
  // ===================

  // GET /api/expense-types - Obtener tipos de gastos del usuario
  app.get("/api/expense-types", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userExpenseTypes = await db
        .select()
        .from(expenseTypes)
        .where(eq(expenseTypes.userId, req.session.userId))
        .orderBy(expenseTypes.name);

      return res.json(userExpenseTypes);
    } catch (error) {
      console.error("Error fetching expense types:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/expense-types - Crear nuevo tipo de gasto
  app.post("/api/expense-types", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validationResult = insertExpenseTypeSchema.safeParse({
        ...req.body,
        userId: req.session.userId,
      });

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid expense type data",
          errors: validationResult.error.errors,
        });
      }

      const newExpenseType = await db
        .insert(expenseTypes)
        .values(validationResult.data)
        .returning();

      return res.status(201).json(newExpenseType[0]);
    } catch (error) {
      console.error("Error creating expense type:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===================
  // ENDPOINTS DE GASTOS
  // ===================

  // GET /api/expenses - Obtener gastos del usuario con filtros
  app.get("/api/expenses", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { year, month, category, supplier, limit = "50" } = req.query;

      let baseQuery = db
        .select({
          // Campos del gasto
          id: expenses.id,
          expenseNumber: expenses.expenseNumber,
          description: expenses.description,
          expenseDate: expenses.expenseDate,
          paymentMethod: expenses.paymentMethod,
          
          // Información del proveedor
          supplierId: expenses.supplierId,
          supplierName: expenses.supplierName,
          supplierTaxId: expenses.supplierTaxId,
          
          // Información fiscal
          netAmount: expenses.netAmount,
          vatAmount: expenses.vatAmount,
          vatRate: expenses.vatRate,
          vatDeductiblePercent: expenses.vatDeductiblePercent,
          vatDeductibleAmount: expenses.vatDeductibleAmount,
          irpfAmount: expenses.irpfAmount,
          irpfRate: expenses.irpfRate,
          totalAmount: expenses.totalAmount,
          
          // Deducibilidad
          deductibleForCorporateTax: expenses.deductibleForCorporateTax,
          deductibleForIrpf: expenses.deductibleForIrpf,
          deductiblePercent: expenses.deductiblePercent,
          
          // Información adicional
          invoiceNumber: expenses.invoiceNumber,
          notes: expenses.notes,
          attachments: expenses.attachments,
          createdFromOcr: expenses.createdFromOcr,
          requiresReview: expenses.requiresReview,
          createdAt: expenses.createdAt,
        })
        .from(expenses);

      let whereConditions = [eq(expenses.userId, req.session.userId)];

      // Aplicar filtros
      if (year) {
        const yearNum = parseInt(year as string);
        whereConditions.push(
          gte(expenses.expenseDate, new Date(`${yearNum}-01-01`)),
          lte(expenses.expenseDate, new Date(`${yearNum}-12-31`))
        );
      }

      if (month && year) {
        const yearNum = parseInt(year as string);
        const monthNum = parseInt(month as string);
        whereConditions.push(
          gte(expenses.expenseDate, new Date(yearNum, monthNum - 1, 1)),
          lte(expenses.expenseDate, new Date(yearNum, monthNum, 0))
        );
      }

      if (category) {
        whereConditions.push(eq(expenses.categoryId, parseInt(category as string)));
      }

      if (supplier) {
        whereConditions.push(eq(expenses.supplierId, parseInt(supplier as string)));
      }

      const results = await baseQuery
        .where(and(...whereConditions))
        .orderBy(desc(expenses.expenseDate))
        .limit(parseInt(limit as string));

      return res.json(results);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/expenses/:id - Obtener gasto específico
  app.get("/api/expenses/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const expenseId = parseInt(req.params.id);
      const expense = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, expenseId), eq(expenses.userId, req.session.userId)))
        .limit(1);

      if (expense.length === 0) {
        return res.status(404).json({ message: "Expense not found" });
      }

      return res.json(expense[0]);
    } catch (error) {
      console.error("Error fetching expense:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/expenses - Crear nuevo gasto
  app.post("/api/expenses", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log("Creando nuevo gasto:", JSON.stringify(req.body, null, 2));

      const validationResult = enhancedExpenseSchema.safeParse({
        ...req.body,
        userId: req.session.userId,
      });

      if (!validationResult.success) {
        console.error("Error de validación:", validationResult.error.errors);
        return res.status(400).json({
          message: "Invalid expense data",
          errors: validationResult.error.errors,
        });
      }

      // Generar número de gasto automáticamente
      const currentYear = new Date().getFullYear();
      const expenseCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(expenses)
        .where(
          and(
            eq(expenses.userId, req.session.userId),
            gte(expenses.expenseDate, new Date(`${currentYear}-01-01`))
          )
        );

      const expenseNumber = `EXP-${currentYear}-${String(expenseCount[0].count + 1).padStart(3, '0')}`;

      const newExpense = await db
        .insert(expenses)
        .values({
          ...validationResult.data,
          expenseNumber,
        })
        .returning();

      console.log("Gasto creado exitosamente:", newExpense[0]);

      return res.status(201).json(newExpense[0]);
    } catch (error) {
      console.error("Error creating expense:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // PUT /api/expenses/:id - Actualizar gasto
  app.put("/api/expenses/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const expenseId = parseInt(req.params.id);
      const validationResult = enhancedExpenseSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid expense data",
          errors: validationResult.error.errors,
        });
      }

      const updatedExpense = await db
        .update(expenses)
        .set({ ...validationResult.data, updatedAt: new Date() })
        .where(and(eq(expenses.id, expenseId), eq(expenses.userId, req.session.userId)))
        .returning();

      if (updatedExpense.length === 0) {
        return res.status(404).json({ message: "Expense not found" });
      }

      return res.json(updatedExpense[0]);
    } catch (error) {
      console.error("Error updating expense:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // DELETE /api/expenses/:id - Eliminar gasto
  app.delete("/api/expenses/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const expenseId = parseInt(req.params.id);
      const deletedExpense = await db
        .delete(expenses)
        .where(and(eq(expenses.id, expenseId), eq(expenses.userId, req.session.userId)))
        .returning();

      if (deletedExpense.length === 0) {
        return res.status(404).json({ message: "Expense not found" });
      }

      return res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Error deleting expense:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===================
  // ENDPOINTS DE RESÚMENES FISCALES
  // ===================

  // GET /api/expenses/tax-summary - Resumen fiscal por período
  app.get("/api/expenses/tax-summary", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { year, month } = req.query;
      const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

      let whereConditions = [
        eq(expenses.userId, req.session.userId),
        gte(expenses.expenseDate, new Date(`${currentYear}-01-01`)),
        lte(expenses.expenseDate, new Date(`${currentYear}-12-31`))
      ];

      if (month) {
        const monthNum = parseInt(month as string);
        whereConditions = [
          eq(expenses.userId, req.session.userId),
          gte(expenses.expenseDate, new Date(currentYear, monthNum - 1, 1)),
          lte(expenses.expenseDate, new Date(currentYear, monthNum, 0))
        ];
      }

      const summary = await db
        .select({
          totalExpenses: sql<number>`count(*)`,
          totalNet: sql<number>`sum(${expenses.netAmount})`,
          totalVat: sql<number>`sum(${expenses.vatAmount})`,
          totalVatDeductible: sql<number>`sum(${expenses.vatDeductibleAmount})`,
          totalIrpf: sql<number>`sum(${expenses.irpfAmount})`,
          totalGross: sql<number>`sum(${expenses.totalAmount})`,
          deductibleCorporateTax: sql<number>`sum(case when ${expenses.deductibleForCorporateTax} then ${expenses.netAmount} * (${expenses.deductiblePercent} / 100) else 0 end)`,
          deductibleIrpf: sql<number>`sum(case when ${expenses.deductibleForIrpf} then ${expenses.netAmount} * (${expenses.deductiblePercent} / 100) else 0 end)`,
        })
        .from(expenses)
        .where(and(...whereConditions));

      return res.json(summary[0] || {
        totalExpenses: 0,
        totalNet: 0,
        totalVat: 0,
        totalVatDeductible: 0,
        totalIrpf: 0,
        totalGross: 0,
        deductibleCorporateTax: 0,
        deductibleIrpf: 0,
      });
    } catch (error) {
      console.error("Error fetching tax summary:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  console.log("✅ Enhanced expense routes registered successfully");
} 