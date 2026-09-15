export interface Transaction {
  id: string;
  date: string;
  category: string;
  subcategory: string;
  value: number;
  status: 'Previsto' | 'OK';
  type: 'Fixo' | 'Variável';
  sqlTable: 'Fluxo_Casa' | 'Categoria_Despesas';
  description: string;
  defaultValue?: number;
  useDefaultValue?: boolean;
  paymentMethod?: 'Pix' | 'Dinheiro' | 'Crédito' | 'Débito' | 'Boleto' | '';
  paymentDate?: string;
  excludeFromTotal?: boolean; // Avoid doubling expenses paid with Credit Card
}

export interface AdditionalIncome {
  id: string;
  description: string;
  value: number;
  date?: string;
}

export interface MonthCompetence {
  monthYear: string; // e.g. "Junho 2026" or "Janeiro 2026"
  transactions: Transaction[];
  income: number; // default income is R$ 4000.00
  additionalIncomes?: AdditionalIncome[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
