import {
  User,
  InsertUser,
  Company,
  InsertCompany,
  Client,
  InsertClient,
  Invoice,
  InsertInvoice,
  InvoiceItem,
  InsertInvoiceItem,
  Category,
  InsertCategory,
  Transaction,
  InsertTransaction,
  Task,
  InsertTask,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Company operations
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByUserId(userId: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;

  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getClientsByUserId(userId: number): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;

  // Invoice operations
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoicesByUserId(userId: number): Promise<Invoice[]>;
  getRecentInvoicesByUserId(userId: number, limit: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;

  // Invoice Item operations
  getInvoiceItemsByInvoiceId(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(invoiceItem: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: number, invoiceItem: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: number): Promise<boolean>;

  // Category operations
  getCategory(id: number): Promise<Category | undefined>;
  getCategoriesByUserId(userId: number): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  getRecentTransactionsByUserId(userId: number, limit: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;

  // Task operations
  getTask(id: number): Promise<Task | undefined>;
  getTasksByUserId(userId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private companies: Map<number, Company>;
  private clients: Map<number, Client>;
  private invoices: Map<number, Invoice>;
  private invoiceItems: Map<number, InvoiceItem>;
  private categories: Map<number, Category>;
  private transactions: Map<number, Transaction>;
  private tasks: Map<number, Task>;

  private userIdCounter: number;
  private companyIdCounter: number;
  private clientIdCounter: number;
  private invoiceIdCounter: number;
  private invoiceItemIdCounter: number;
  private categoryIdCounter: number;
  private transactionIdCounter: number;
  private taskIdCounter: number;

  constructor() {
    this.users = new Map();
    this.companies = new Map();
    this.clients = new Map();
    this.invoices = new Map();
    this.invoiceItems = new Map();
    this.categories = new Map();
    this.transactions = new Map();
    this.tasks = new Map();

    this.userIdCounter = 1;
    this.companyIdCounter = 1;
    this.clientIdCounter = 1;
    this.invoiceIdCounter = 1;
    this.invoiceItemIdCounter = 1;
    this.categoryIdCounter = 1;
    this.transactionIdCounter = 1;
    this.taskIdCounter = 1;

    // Initialize with default user for development
    this.createUser({
      username: "demo",
      password: "demo",
      name: "Ana García",
      email: "ana@example.com",
      role: "admin"
    });

    // Create default categories
    this.createCategory({
      userId: 1,
      name: "Ventas",
      type: "income",
      color: "#4caf50"
    });
    
    this.createCategory({
      userId: 1,
      name: "Servicios",
      type: "income",
      color: "#2196f3"
    });
    
    this.createCategory({
      userId: 1,
      name: "Oficina",
      type: "expense",
      color: "#f44336"
    });
    
    this.createCategory({
      userId: 1,
      name: "Suministros",
      type: "expense",
      color: "#ff9800"
    });

    // Create example tasks
    this.createTask({
      userId: 1,
      title: "Presentar declaración trimestral",
      description: "Completar y presentar la declaración trimestral de IVA",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      completed: false,
      priority: "high"
    });

    this.createTask({
      userId: 1,
      title: "Actualizar datos de empresa",
      description: "Revisar y actualizar la información de la empresa",
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completed: true,
      priority: "medium"
    });

    this.createTask({
      userId: 1,
      title: "Conciliar movimientos bancarios",
      description: "Revisar y conciliar los últimos movimientos bancarios",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      completed: false,
      priority: "medium"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  // Company operations
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getCompanyByUserId(userId: number): Promise<Company | undefined> {
    return Array.from(this.companies.values()).find(
      (company) => company.userId === userId
    );
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const id = this.companyIdCounter++;
    const newCompany: Company = { ...company, id };
    this.companies.set(id, newCompany);
    return newCompany;
  }

  async updateCompany(id: number, companyData: Partial<InsertCompany>): Promise<Company | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;

    const updatedCompany = { ...company, ...companyData };
    this.companies.set(id, updatedCompany);
    return updatedCompany;
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientsByUserId(userId: number): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId
    );
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = this.clientIdCounter++;
    const newClient: Client = { ...client, id };
    this.clients.set(id, newClient);
    return newClient;
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const updatedClient = { ...client, ...clientData };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }

  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoicesByUserId(userId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter((invoice) => invoice.userId === userId)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }

  async getRecentInvoicesByUserId(userId: number, limit: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter((invoice) => invoice.userId === userId)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, limit);
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceIdCounter++;
    const newInvoice: Invoice = { ...invoice, id };
    this.invoices.set(id, newInvoice);
    return newInvoice;
  }

  async updateInvoice(id: number, invoiceData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;

    const updatedInvoice = { ...invoice, ...invoiceData };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    return this.invoices.delete(id);
  }

  // Invoice Item operations
  async getInvoiceItemsByInvoiceId(invoiceId: number): Promise<InvoiceItem[]> {
    return Array.from(this.invoiceItems.values()).filter(
      (item) => item.invoiceId === invoiceId
    );
  }

  async createInvoiceItem(invoiceItem: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = this.invoiceItemIdCounter++;
    const newInvoiceItem: InvoiceItem = { ...invoiceItem, id };
    this.invoiceItems.set(id, newInvoiceItem);
    return newInvoiceItem;
  }

  async updateInvoiceItem(id: number, itemData: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    const invoiceItem = this.invoiceItems.get(id);
    if (!invoiceItem) return undefined;

    const updatedItem = { ...invoiceItem, ...itemData };
    this.invoiceItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteInvoiceItem(id: number): Promise<boolean> {
    return this.invoiceItems.delete(id);
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoriesByUserId(userId: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      (category) => category.userId === userId
    );
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;

    const updatedCategory = { ...category, ...categoryData };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Transaction operations
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getRecentTransactionsByUserId(userId: number, limit: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const newTransaction: Transaction = { ...transaction, id };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: number, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    const updatedTransaction = { ...transaction, ...transactionData };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByUserId(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter((task) => task.userId === userId)
      .sort((a, b) => {
        // Sort by completed (incomplete first), then by due date
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        
        return 0;
      });
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const newTask: Task = { ...task, id };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updatedTask = { ...task, ...taskData };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }
}

export const storage = new MemStorage();
