const { z } = require('zod');

// 1. Auth Schemas
const loginSchema = z.object({
  login: z.string().trim().min(2, 'Nome ou Telefone é obrigatório').optional(),
  phone: z.string().trim().optional(),
  password: z.string().min(4, 'Senha deve ter no mínimo 4 caracteres')
}).refine(data => data.login || data.phone, {
  message: 'Informe seu Nome ou Telefone.',
  path: ['login']
});

// 2. Customer Schemas
const customerSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  phone: z.string().trim().optional().nullable(),
  cep: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  number: z.string().trim().optional().nullable(),
  complement: z.string().trim().optional().nullable(),
  neighborhood: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  referred_by: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

// 3. Sale Schemas
const saleSchema = z.object({
  customer_id: z.number().int().positive('Cliente inválido'),
  product_name: z.string().trim().optional().nullable()
    .transform(val => (val && val.length > 0 ? val : 'Produto não especificado')),
  product_value: z.union([z.string(), z.number()]).transform(val => String(val)),
  interest_value: z.union([z.string(), z.number()]).optional().transform(val => val ? String(val) : '0'),
  interest_percent: z.number().nonnegative().optional().default(0),
  late_fee_percent_per_day: z.number().nonnegative().optional().default(0),
  payment_mode: z.enum(['DIARIA', 'QUINZENAL', 'MENSAL']),
  installment_count: z.number().int().min(1, 'Quantidade de parcelas deve ser no mínimo 1').max(60),
  first_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida (AAAA-MM-DD)'),
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data da venda inválida (AAAA-MM-DD)').optional().nullable()
});

// 3b. Sale Edit Schema. Changing product_value or first_due_date makes the
// route regenerate installments (fresh, unpaid) — installment_count/payment_mode
// stay fixed (changing those needs the full "novo checkout" flow). Renegotiation
// use case: seller lowers product_value (e.g. debt of 7000 renegotiated down to
// 5000, interest recalculated on the new 5000) and mark_paid_amount records the
// difference actually received (2000) as an already-paid payment on the
// freshly regenerated installments.
const saleEditSchema = z.object({
  product_name: z.string().trim().optional().nullable()
    .transform(val => (val && val.length > 0 ? val : 'Produto não especificado')),
  product_value: z.union([z.string(), z.number()]).transform(val => String(val)),
  interest_percent: z.number().nonnegative().optional().default(0),
  late_fee_percent_per_day: z.number().nonnegative().optional().default(0),
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data da venda inválida (AAAA-MM-DD)'),
  first_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida (AAAA-MM-DD)'),
  mark_paid_amount: z.union([z.string(), z.number()]).optional().nullable()
    .transform(val => (val === null || val === undefined || val === '' ? '0' : String(val)))
});

// 4. Payment Schemas
const paymentSchema = z.object({
  amount_paid: z.union([z.string(), z.number()]).optional().nullable().transform(val => (val === null || val === undefined ? undefined : String(val))),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data do pagamento inválida (AAAA-MM-DD)'),
  payment_type: z.enum(['FULL', 'INTEREST_ONLY']).optional().default('FULL'),
  notes: z.string().trim().optional().nullable()
}).refine((data) => data.payment_type === 'INTEREST_ONLY' || data.amount_paid !== undefined, {
  message: 'Informe o valor do pagamento.',
  path: ['amount_paid']
});

// 5. Expense Schemas
const expenseSchema = z.object({
  category_name: z.string().trim().min(2, 'Categoria obrigatória'),
  name: z.string().trim().min(2, 'Descrição da despesa obrigatória'),
  amount: z.union([z.string(), z.number()]).transform(val => String(val)),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data da despesa inválida (AAAA-MM-DD)'),
  expense_type: z.enum(['FIXA', 'VARIAVEL']).optional().default('VARIAVEL'),
  notes: z.string().trim().optional().nullable()
});

// 6. Super Admin Seller Creation Schema
const createSellerSchema = z.object({
  name: z.string().trim().min(2, 'Nome do vendedor obrigatório'),
  phone: z.string().trim().min(8, 'Telefone obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  subdomain: z.string().trim().max(63).optional().nullable()
});

// 7. Referral Schemas
const referrerConfigSchema = z.object({
  name: z.string().trim().min(1, 'Nome do indicador é obrigatório').max(255),
  commission_type: z.enum(['PERCENTAGE', 'FIXED']),
  commission_value: z.union([z.string(), z.number()])
    .transform(val => Number(String(val).replace(',', '.')))
    .refine(val => !isNaN(val) && val >= 0, 'Valor de comissão inválido.')
});

module.exports = {
  loginSchema,
  customerSchema,
  saleSchema,
  saleEditSchema,
  paymentSchema,
  expenseSchema,
  createSellerSchema,
  referrerConfigSchema
};
